"""
Advanced API Gateway for Soladia Marketplace
Provides routing, rate limiting, authentication, and monitoring
"""

import asyncio
import logging
import time
import json
import hashlib
import hmac
from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime, timedelta
from dataclasses import dataclass
from enum import Enum
import redis
import jwt
from fastapi import FastAPI, Request, Response, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response as StarletteResponse
import httpx
import uvicorn
from pydantic import BaseModel, Field
import yaml
import os

logger = logging.getLogger(__name__)

class RateLimitStrategy(Enum):
    FIXED_WINDOW = "fixed_window"
    SLIDING_WINDOW = "sliding_window"
    TOKEN_BUCKET = "token_bucket"
    LEAKY_BUCKET = "leaky_bucket"

class AuthMethod(Enum):
    JWT = "jwt"
    API_KEY = "api_key"
    OAUTH2 = "oauth2"
    BASIC = "basic"

@dataclass
class RouteConfig:
    """Configuration for API routes"""
    path: str
    methods: List[str]
    target_service: str
    target_url: str
    rate_limit: Optional[Dict[str, Any]] = None
    auth_required: bool = True
    auth_method: AuthMethod = AuthMethod.JWT
    timeout: int = 30
    retry_count: int = 3
    circuit_breaker: bool = True
    caching: bool = False
    cache_ttl: int = 300
    transformation: Optional[Dict[str, Any]] = None

@dataclass
class RateLimitConfig:
    """Rate limiting configuration"""
    strategy: RateLimitStrategy
    requests_per_minute: int
    burst_limit: int
    window_size: int = 60
    key_prefix: str = "rate_limit"

@dataclass
class CircuitBreakerConfig:
    """Circuit breaker configuration"""
    failure_threshold: int = 5
    recovery_timeout: int = 60
    half_open_max_calls: int = 3

class CircuitBreaker:
    """Circuit breaker implementation"""
    
    def __init__(self, config: CircuitBreakerConfig):
        self.config = config
        self.failure_count = 0
        self.last_failure_time = None
        self.state = "CLOSED"  # CLOSED, OPEN, HALF_OPEN
        self.half_open_calls = 0
    
    def can_execute(self) -> bool:
        """Check if request can be executed"""
        if self.state == "CLOSED":
            return True
        elif self.state == "OPEN":
            if time.time() - self.last_failure_time > self.config.recovery_timeout:
                self.state = "HALF_OPEN"
                self.half_open_calls = 0
                return True
            return False
        elif self.state == "HALF_OPEN":
            if self.half_open_calls < self.config.half_open_max_calls:
                self.half_open_calls += 1
                return True
            return False
        return False
    
    def on_success(self):
        """Handle successful request"""
        if self.state == "HALF_OPEN":
            self.state = "CLOSED"
            self.failure_count = 0
            self.half_open_calls = 0
    
    def on_failure(self):
        """Handle failed request"""
        self.failure_count += 1
        self.last_failure_time = time.time()
        
        if self.failure_count >= self.config.failure_threshold:
            self.state = "OPEN"

class RateLimiter:
    """Rate limiting implementation"""
    
    def __init__(self, redis_client: redis.Redis, config: RateLimitConfig):
        self.redis = redis_client
        self.config = config
    
    async def is_allowed(self, key: str) -> Tuple[bool, Dict[str, Any]]:
        """Check if request is allowed based on rate limit"""
        try:
            if self.config.strategy == RateLimitStrategy.FIXED_WINDOW:
                return await self._fixed_window_check(key)
            elif self.config.strategy == RateLimitStrategy.SLIDING_WINDOW:
                return await self._sliding_window_check(key)
            elif self.config.strategy == RateLimitStrategy.TOKEN_BUCKET:
                return await self._token_bucket_check(key)
            elif self.config.strategy == RateLimitStrategy.LEAKY_BUCKET:
                return await self._leaky_bucket_check(key)
            else:
                return True, {}
        except Exception as e:
            logger.error(f"Rate limiting error: {e}")
            return True, {}
    
    async def _fixed_window_check(self, key: str) -> Tuple[bool, Dict[str, Any]]:
        """Fixed window rate limiting"""
        current_window = int(time.time() // self.config.window_size)
        redis_key = f"{self.config.key_prefix}:{key}:{current_window}"
        
        current_count = await self.redis.incr(redis_key)
        if current_count == 1:
            await self.redis.expire(redis_key, self.config.window_size)
        
        allowed = current_count <= self.config.requests_per_minute
        
        return allowed, {
            "limit": self.config.requests_per_minute,
            "remaining": max(0, self.config.requests_per_minute - current_count),
            "reset": (current_window + 1) * self.config.window_size
        }
    
    async def _sliding_window_check(self, key: str) -> Tuple[bool, Dict[str, Any]]:
        """Sliding window rate limiting"""
        now = time.time()
        window_start = now - self.config.window_size
        
        redis_key = f"{self.config.key_prefix}:{key}"
        
        # Remove old entries
        await self.redis.zremrangebyscore(redis_key, 0, window_start)
        
        # Count current requests
        current_count = await self.redis.zcard(redis_key)
        
        if current_count < self.config.requests_per_minute:
            # Add current request
            await self.redis.zadd(redis_key, {str(now): now})
            await self.redis.expire(redis_key, self.config.window_size)
            
            return True, {
                "limit": self.config.requests_per_minute,
                "remaining": self.config.requests_per_minute - current_count - 1,
                "reset": int(now + self.config.window_size)
            }
        else:
            return False, {
                "limit": self.config.requests_per_minute,
                "remaining": 0,
                "reset": int(now + self.config.window_size)
            }
    
    async def _token_bucket_check(self, key: str) -> Tuple[bool, Dict[str, Any]]:
        """Token bucket rate limiting"""
        redis_key = f"{self.config.key_prefix}:{key}"
        
        # Get current bucket state
        bucket_data = await self.redis.hmget(redis_key, "tokens", "last_refill")
        
        if not bucket_data[0]:
            # Initialize bucket
            tokens = self.config.burst_limit
            last_refill = time.time()
        else:
            tokens = float(bucket_data[0])
            last_refill = float(bucket_data[1])
        
        # Refill tokens
        now = time.time()
        time_passed = now - last_refill
        tokens_to_add = time_passed * (self.config.requests_per_minute / 60)
        tokens = min(self.config.burst_limit, tokens + tokens_to_add)
        
        if tokens >= 1:
            tokens -= 1
            await self.redis.hmset(redis_key, {
                "tokens": tokens,
                "last_refill": now
            })
            await self.redis.expire(redis_key, self.config.window_size)
            
            return True, {
                "limit": self.config.requests_per_minute,
                "remaining": int(tokens),
                "reset": int(now + 60)
            }
        else:
            return False, {
                "limit": self.config.requests_per_minute,
                "remaining": 0,
                "reset": int(now + 60)
            }
    
    async def _leaky_bucket_check(self, key: str) -> Tuple[bool, Dict[str, Any]]:
        """Leaky bucket rate limiting"""
        redis_key = f"{self.config.key_prefix}:{key}"
        
        # Get current bucket state
        bucket_data = await self.redis.hmget(redis_key, "level", "last_leak")
        
        if not bucket_data[0]:
            # Initialize bucket
            level = 0
            last_leak = time.time()
        else:
            level = float(bucket_data[0])
            last_leak = float(bucket_data[1])
        
        # Leak tokens
        now = time.time()
        time_passed = now - last_leak
        leak_rate = self.config.requests_per_minute / 60
        level = max(0, level - time_passed * leak_rate)
        
        if level < self.config.burst_limit:
            level += 1
            await self.redis.hmset(redis_key, {
                "level": level,
                "last_leak": now
            })
            await self.redis.expire(redis_key, self.config.window_size)
            
            return True, {
                "limit": self.config.requests_per_minute,
                "remaining": int(self.config.burst_limit - level),
                "reset": int(now + 60)
            }
        else:
            return False, {
                "limit": self.config.requests_per_minute,
                "remaining": 0,
                "reset": int(now + 60)
            }

class AuthenticationService:
    """Authentication service for API Gateway"""
    
    def __init__(self, redis_client: redis.Redis, jwt_secret: str):
        self.redis = redis_client
        self.jwt_secret = jwt_secret
        self.api_keys = {}  # In production, load from database
    
    async def authenticate_request(self, request: Request, auth_method: AuthMethod) -> Optional[Dict[str, Any]]:
        """Authenticate incoming request"""
        try:
            if auth_method == AuthMethod.JWT:
                return await self._authenticate_jwt(request)
            elif auth_method == AuthMethod.API_KEY:
                return await self._authenticate_api_key(request)
            elif auth_method == AuthMethod.OAUTH2:
                return await self._authenticate_oauth2(request)
            elif auth_method == AuthMethod.BASIC:
                return await self._authenticate_basic(request)
            else:
                return None
        except Exception as e:
            logger.error(f"Authentication error: {e}")
            return None
    
    async def _authenticate_jwt(self, request: Request) -> Optional[Dict[str, Any]]:
        """Authenticate JWT token"""
        try:
            auth_header = request.headers.get("Authorization")
            if not auth_header or not auth_header.startswith("Bearer "):
                return None
            
            token = auth_header.split(" ")[1]
            
            # Check if token is blacklisted
            if await self.redis.get(f"blacklist:{token}"):
                return None
            
            # Decode and verify token
            payload = jwt.decode(token, self.jwt_secret, algorithms=["HS256"])
            
            # Check token expiration
            if payload.get("exp", 0) < time.time():
                return None
            
            return {
                "user_id": payload.get("user_id"),
                "roles": payload.get("roles", []),
                "permissions": payload.get("permissions", []),
                "token_type": "jwt"
            }
        except jwt.InvalidTokenError:
            return None
    
    async def _authenticate_api_key(self, request: Request) -> Optional[Dict[str, Any]]:
        """Authenticate API key"""
        try:
            api_key = request.headers.get("X-API-Key")
            if not api_key:
                return None
            
            # Check if API key exists and is valid
            key_data = await self.redis.get(f"api_key:{api_key}")
            if not key_data:
                return None
            
            key_info = json.loads(key_data)
            
            # Check if key is active
            if not key_info.get("active", False):
                return None
            
            # Check expiration
            if key_info.get("expires_at") and key_info["expires_at"] < time.time():
                return None
            
            return {
                "user_id": key_info.get("user_id"),
                "roles": key_info.get("roles", []),
                "permissions": key_info.get("permissions", []),
                "token_type": "api_key"
            }
        except Exception as e:
            logger.error(f"API key authentication error: {e}")
            return None
    
    async def _authenticate_oauth2(self, request: Request) -> Optional[Dict[str, Any]]:
        """Authenticate OAuth2 token"""
        try:
            auth_header = request.headers.get("Authorization")
            if not auth_header or not auth_header.startswith("Bearer "):
                return None
            
            token = auth_header.split(" ")[1]
            
            # Validate OAuth2 token with provider
            # This would typically make a request to the OAuth2 provider
            # For now, return mock data
            return {
                "user_id": "oauth2_user",
                "roles": ["user"],
                "permissions": ["read", "write"],
                "token_type": "oauth2"
            }
        except Exception as e:
            logger.error(f"OAuth2 authentication error: {e}")
            return None
    
    async def _authenticate_basic(self, request: Request) -> Optional[Dict[str, Any]]:
        """Authenticate Basic Auth"""
        try:
            auth_header = request.headers.get("Authorization")
            if not auth_header or not auth_header.startswith("Basic "):
                return None
            
            import base64
            credentials = base64.b64decode(auth_header.split(" ")[1]).decode("utf-8")
            username, password = credentials.split(":", 1)
            
            # Validate credentials
            # This would typically check against a user database
            if username == "admin" and password == "password":
                return {
                    "user_id": "admin",
                    "roles": ["admin"],
                    "permissions": ["read", "write", "admin"],
                    "token_type": "basic"
                }
            
            return None
        except Exception as e:
            logger.error(f"Basic authentication error: {e}")
            return None

class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """Middleware for logging requests"""
    
    def __init__(self, app, redis_client: redis.Redis):
        super().__init__(app)
        self.redis = redis_client
    
    async def dispatch(self, request: Request, call_next):
        start_time = time.time()
        
        # Log request
        request_id = hashlib.md5(f"{request.url}{start_time}".encode()).hexdigest()
        
        request_data = {
            "request_id": request_id,
            "method": request.method,
            "url": str(request.url),
            "headers": dict(request.headers),
            "client_ip": request.client.host,
            "user_agent": request.headers.get("user-agent"),
            "timestamp": start_time
        }
        
        await self.redis.lpush("api_logs", json.dumps(request_data))
        await self.redis.ltrim("api_logs", 0, 1000)  # Keep last 1000 logs
        
        # Process request
        response = await call_next(request)
        
        # Log response
        process_time = time.time() - start_time
        
        response_data = {
            "request_id": request_id,
            "status_code": response.status_code,
            "process_time": process_time,
            "timestamp": time.time()
        }
        
        await self.redis.lpush("api_logs", json.dumps(response_data))
        
        # Add headers
        response.headers["X-Request-ID"] = request_id
        response.headers["X-Process-Time"] = str(process_time)
        
        return response

class APIGateway:
    """Main API Gateway class"""
    
    def __init__(self, config_path: str = "gateway_config.yaml"):
        self.app = FastAPI(
            title="Soladia API Gateway",
            description="Advanced API Gateway for Soladia Marketplace",
            version="1.0.0"
        )
        
        # Initialize Redis
        self.redis = redis.Redis(host='localhost', port=6379, db=0)
        
        # Load configuration
        self.config = self._load_config(config_path)
        
        # Initialize services
        self.auth_service = AuthenticationService(
            self.redis, 
            self.config.get("jwt_secret", "your-secret-key")
        )
        
        self.rate_limiter = RateLimiter(
            self.redis,
            RateLimitConfig(
                strategy=RateLimitStrategy.SLIDING_WINDOW,
                requests_per_minute=1000,
                burst_limit=100
            )
        )
        
        self.circuit_breakers = {}
        
        # Setup middleware
        self._setup_middleware()
        
        # Setup routes
        self._setup_routes()
    
    def _load_config(self, config_path: str) -> Dict[str, Any]:
        """Load gateway configuration"""
        try:
            if os.path.exists(config_path):
                with open(config_path, 'r') as f:
                    return yaml.safe_load(f)
            else:
                return self._get_default_config()
        except Exception as e:
            logger.error(f"Failed to load config: {e}")
            return self._get_default_config()
    
    def _get_default_config(self) -> Dict[str, Any]:
        """Get default configuration"""
        return {
            "jwt_secret": "your-secret-key",
            "cors_origins": ["*"],
            "trusted_hosts": ["*"],
            "rate_limiting": {
                "enabled": True,
                "strategy": "sliding_window",
                "requests_per_minute": 1000,
                "burst_limit": 100
            },
            "circuit_breaker": {
                "enabled": True,
                "failure_threshold": 5,
                "recovery_timeout": 60
            },
            "routes": [
                {
                    "path": "/api/v1/auth/*",
                    "methods": ["GET", "POST", "PUT", "DELETE"],
                    "target_service": "auth-service",
                    "target_url": "http://localhost:8001",
                    "auth_required": False
                },
                {
                    "path": "/api/v1/products/*",
                    "methods": ["GET", "POST", "PUT", "DELETE"],
                    "target_service": "product-service",
                    "target_url": "http://localhost:8002",
                    "auth_required": True
                },
                {
                    "path": "/api/v1/orders/*",
                    "methods": ["GET", "POST", "PUT", "DELETE"],
                    "target_service": "order-service",
                    "target_url": "http://localhost:8003",
                    "auth_required": True
                }
            ]
        }
    
    def _setup_middleware(self):
        """Setup middleware"""
        # CORS
        self.app.add_middleware(
            CORSMiddleware,
            allow_origins=self.config.get("cors_origins", ["*"]),
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"]
        )
        
        # Trusted hosts
        self.app.add_middleware(
            TrustedHostMiddleware,
            allowed_hosts=self.config.get("trusted_hosts", ["*"])
        )
        
        # Gzip compression
        self.app.add_middleware(GZipMiddleware, minimum_size=1000)
        
        # Request logging
        self.app.add_middleware(RequestLoggingMiddleware, redis_client=self.redis)
    
    def _setup_routes(self):
        """Setup API routes"""
        # Health check
        @self.app.get("/health")
        async def health_check():
            return {"status": "healthy", "timestamp": datetime.now().isoformat()}
        
        # Metrics endpoint
        @self.app.get("/metrics")
        async def get_metrics():
            return await self._get_metrics()
        
        # Proxy routes
        for route_config in self.config.get("routes", []):
            self._create_proxy_route(route_config)
    
    def _create_proxy_route(self, route_config: Dict[str, Any]):
        """Create proxy route for service"""
        path = route_config["path"]
        methods = route_config["methods"]
        target_url = route_config["target_url"]
        auth_required = route_config.get("auth_required", True)
        auth_method = AuthMethod(route_config.get("auth_method", "jwt"))
        timeout = route_config.get("timeout", 30)
        retry_count = route_config.get("retry_count", 3)
        circuit_breaker_enabled = route_config.get("circuit_breaker", True)
        caching_enabled = route_config.get("caching", False)
        cache_ttl = route_config.get("cache_ttl", 300)
        
        # Create circuit breaker if enabled
        if circuit_breaker_enabled:
            cb_config = CircuitBreakerConfig(
                failure_threshold=self.config.get("circuit_breaker", {}).get("failure_threshold", 5),
                recovery_timeout=self.config.get("circuit_breaker", {}).get("recovery_timeout", 60)
            )
            self.circuit_breakers[path] = CircuitBreaker(cb_config)
        
        async def proxy_handler(request: Request):
            # Check circuit breaker
            if circuit_breaker_enabled and path in self.circuit_breakers:
                if not self.circuit_breakers[path].can_execute():
                    raise HTTPException(status_code=503, detail="Service temporarily unavailable")
            
            # Authentication
            auth_data = None
            if auth_required:
                auth_data = await self.auth_service.authenticate_request(request, auth_method)
                if not auth_data:
                    raise HTTPException(status_code=401, detail="Authentication required")
            
            # Rate limiting
            if self.config.get("rate_limiting", {}).get("enabled", True):
                client_ip = request.client.host
                rate_limit_key = f"{client_ip}:{path}"
                
                allowed, rate_info = await self.rate_limiter.is_allowed(rate_limit_key)
                if not allowed:
                    raise HTTPException(
                        status_code=429, 
                        detail="Rate limit exceeded",
                        headers={
                            "X-RateLimit-Limit": str(rate_info.get("limit", 0)),
                            "X-RateLimit-Remaining": str(rate_info.get("remaining", 0)),
                            "X-RateLimit-Reset": str(rate_info.get("reset", 0))
                        }
                    )
            
            # Check cache
            if caching_enabled and request.method == "GET":
                cache_key = f"cache:{path}:{hashlib.md5(str(request.url).encode()).hexdigest()}"
                cached_response = await self.redis.get(cache_key)
                if cached_response:
                    return JSONResponse(content=json.loads(cached_response))
            
            # Forward request
            try:
                async with httpx.AsyncClient(timeout=timeout) as client:
                    # Prepare request
                    headers = dict(request.headers)
                    if auth_data:
                        headers["X-User-ID"] = auth_data.get("user_id", "")
                        headers["X-User-Roles"] = ",".join(auth_data.get("roles", []))
                    
                    # Make request
                    response = await client.request(
                        method=request.method,
                        url=f"{target_url}{request.url.path}",
                        headers=headers,
                        params=request.query_params,
                        content=await request.body()
                    )
                    
                    # Handle response
                    response_content = response.content
                    response_headers = dict(response.headers)
                    
                    # Cache response if enabled
                    if caching_enabled and request.method == "GET" and response.status_code == 200:
                        await self.redis.setex(cache_key, cache_ttl, response_content)
                    
                    # Update circuit breaker
                    if circuit_breaker_enabled and path in self.circuit_breakers:
                        self.circuit_breakers[path].on_success()
                    
                    return Response(
                        content=response_content,
                        status_code=response.status_code,
                        headers=response_headers
                    )
                    
            except Exception as e:
                # Update circuit breaker
                if circuit_breaker_enabled and path in self.circuit_breakers:
                    self.circuit_breakers[path].on_failure()
                
                logger.error(f"Proxy request failed: {e}")
                raise HTTPException(status_code=502, detail="Bad Gateway")
        
        # Register route
        for method in methods:
            self.app.add_api_route(
                path=path,
                endpoint=proxy_handler,
                methods=[method]
            )
    
    async def _get_metrics(self) -> Dict[str, Any]:
        """Get gateway metrics"""
        try:
            # Get request logs
            logs = await self.redis.lrange("api_logs", 0, 100)
            
            # Calculate metrics
            total_requests = len(logs)
            successful_requests = sum(1 for log in logs if json.loads(log).get("status_code", 0) < 400)
            error_requests = total_requests - successful_requests
            
            # Response time statistics
            response_times = []
            for log in logs:
                log_data = json.loads(log)
                if "process_time" in log_data:
                    response_times.append(log_data["process_time"])
            
            avg_response_time = sum(response_times) / len(response_times) if response_times else 0
            
            # Circuit breaker status
            circuit_breaker_status = {}
            for path, cb in self.circuit_breakers.items():
                circuit_breaker_status[path] = {
                    "state": cb.state,
                    "failure_count": cb.failure_count
                }
            
            return {
                "total_requests": total_requests,
                "successful_requests": successful_requests,
                "error_requests": error_requests,
                "success_rate": (successful_requests / total_requests * 100) if total_requests > 0 else 0,
                "average_response_time": avg_response_time,
                "circuit_breakers": circuit_breaker_status,
                "timestamp": datetime.now().isoformat()
            }
        except Exception as e:
            logger.error(f"Failed to get metrics: {e}")
            return {"error": str(e)}

def create_gateway(config_path: str = "gateway_config.yaml") -> APIGateway:
    """Create API Gateway instance"""
    return APIGateway(config_path)

if __name__ == "__main__":
    gateway = create_gateway()
    uvicorn.run(
        gateway.app,
        host="0.0.0.0",
        port=8000,
        log_level="info"
    )
