"""
Rate limiting middleware for FastAPI
Implements sliding window rate limiting with Redis backend
"""

import time
import json
from typing import Dict, Optional, Tuple
from fastapi import Request, HTTPException, status
from fastapi.responses import JSONResponse
import redis
from collections import defaultdict, deque
import asyncio
import logging

logger = logging.getLogger(__name__)

class RateLimiter:
    """Rate limiter with sliding window algorithm"""
    
    def __init__(
        self,
        redis_url: str = "redis://localhost:6379",
        default_rate: int = 100,  # requests per minute
        burst_rate: int = 200,    # burst requests per minute
        window_size: int = 60,    # window size in seconds
        block_duration: int = 300  # block duration in seconds
    ):
        self.redis_client = redis.from_url(redis_url, decode_responses=True)
        self.default_rate = default_rate
        self.burst_rate = burst_rate
        self.window_size = window_size
        self.block_duration = block_duration
        
        # In-memory fallback for when Redis is unavailable
        self.memory_store: Dict[str, deque] = defaultdict(lambda: deque())
        self.blocked_ips: Dict[str, float] = {}
        
        # Rate limit rules for different endpoints
        self.rate_limits = {
            "/api/auth/login": {"rate": 5, "window": 60},      # 5 login attempts per minute
            "/api/auth/register": {"rate": 3, "window": 60},    # 3 registrations per minute
            "/api/solana/": {"rate": 50, "window": 60},        # 50 Solana API calls per minute
            "/api/products/": {"rate": 200, "window": 60},      # 200 product API calls per minute
            "/api/search": {"rate": 100, "window": 60},         # 100 search requests per minute
            "default": {"rate": default_rate, "window": window_size}
        }

    def get_client_ip(self, request: Request) -> str:
        """Extract client IP address from request"""
        # Check for forwarded IP first (for load balancers)
        forwarded_for = request.headers.get("X-Forwarded-For")
        if forwarded_for:
            return forwarded_for.split(",")[0].strip()
        
        # Check for real IP header
        real_ip = request.headers.get("X-Real-IP")
        if real_ip:
            return real_ip
        
        # Fallback to direct client IP
        return request.client.host if request.client else "unknown"

    def get_rate_limit_key(self, ip: str, endpoint: str) -> str:
        """Generate Redis key for rate limiting"""
        return f"rate_limit:{ip}:{endpoint}"

    def get_block_key(self, ip: str) -> str:
        """Generate Redis key for IP blocking"""
        return f"blocked_ip:{ip}"

    def is_ip_blocked(self, ip: str) -> bool:
        """Check if IP is currently blocked"""
        try:
            # Check Redis first
            block_data = self.redis_client.get(self.get_block_key(ip))
            if block_data:
                block_info = json.loads(block_data)
                if time.time() < block_info["expires_at"]:
                    return True
            
            # Check memory store as fallback
            if ip in self.blocked_ips:
                if time.time() < self.blocked_ips[ip]:
                    return True
                else:
                    del self.blocked_ips[ip]
            
            return False
        except Exception as e:
            logger.warning(f"Error checking IP block status: {e}")
            return False

    def block_ip(self, ip: str, reason: str = "Rate limit exceeded") -> None:
        """Block an IP address"""
        block_until = time.time() + self.block_duration
        block_info = {
            "ip": ip,
            "blocked_at": time.time(),
            "expires_at": block_until,
            "reason": reason
        }
        
        try:
            # Store in Redis
            self.redis_client.setex(
                self.get_block_key(ip),
                self.block_duration,
                json.dumps(block_info)
            )
        except Exception as e:
            logger.warning(f"Error blocking IP in Redis: {e}")
            # Fallback to memory store
            self.blocked_ips[ip] = block_until
        
        logger.warning(f"Blocked IP {ip} until {block_until} - Reason: {reason}")

    def get_rate_limit_for_endpoint(self, endpoint: str) -> Tuple[int, int]:
        """Get rate limit for specific endpoint"""
        for pattern, limits in self.rate_limits.items():
            if endpoint.startswith(pattern):
                return limits["rate"], limits["window"]
        return self.rate_limits["default"]["rate"], self.rate_limits["default"]["window"]

    def check_rate_limit_redis(self, ip: str, endpoint: str) -> Tuple[bool, Dict]:
        """Check rate limit using Redis sliding window"""
        try:
            rate, window = self.get_rate_limit_for_endpoint(endpoint)
            key = self.get_rate_limit_key(ip, endpoint)
            current_time = time.time()
            
            # Use Redis pipeline for atomic operations
            pipe = self.redis_client.pipeline()
            
            # Remove old entries
            pipe.zremrangebyscore(key, 0, current_time - window)
            
            # Count current requests
            pipe.zcard(key)
            
            # Add current request
            pipe.zadd(key, {str(current_time): current_time})
            
            # Set expiration
            pipe.expire(key, window)
            
            results = pipe.execute()
            current_requests = results[1]
            
            if current_requests >= rate:
                return False, {
                    "limit": rate,
                    "remaining": 0,
                    "reset_time": current_time + window,
                    "retry_after": window
                }
            
            return True, {
                "limit": rate,
                "remaining": rate - current_requests - 1,
                "reset_time": current_time + window,
                "retry_after": 0
            }
            
        except Exception as e:
            logger.warning(f"Redis rate limit check failed: {e}")
            return self.check_rate_limit_memory(ip, endpoint)

    def check_rate_limit_memory(self, ip: str, endpoint: str) -> Tuple[bool, Dict]:
        """Check rate limit using in-memory sliding window"""
        try:
            rate, window = self.get_rate_limit_for_endpoint(endpoint)
            key = f"{ip}:{endpoint}"
            current_time = time.time()
            
            # Clean old entries
            while self.memory_store[key] and self.memory_store[key][0] <= current_time - window:
                self.memory_store[key].popleft()
            
            # Check if limit exceeded
            if len(self.memory_store[key]) >= rate:
                return False, {
                    "limit": rate,
                    "remaining": 0,
                    "reset_time": current_time + window,
                    "retry_after": window
                }
            
            # Add current request
            self.memory_store[key].append(current_time)
            
            return True, {
                "limit": rate,
                "remaining": rate - len(self.memory_store[key]),
                "reset_time": current_time + window,
                "retry_after": 0
            }
            
        except Exception as e:
            logger.error(f"Memory rate limit check failed: {e}")
            return True, {"limit": 1000, "remaining": 999, "reset_time": 0, "retry_after": 0}

    async def check_rate_limit(self, request: Request) -> Tuple[bool, Dict]:
        """Main rate limit check method"""
        ip = self.get_client_ip(request)
        endpoint = request.url.path
        
        # Check if IP is blocked
        if self.is_ip_blocked(ip):
            return False, {
                "limit": 0,
                "remaining": 0,
                "reset_time": 0,
                "retry_after": self.block_duration,
                "blocked": True
            }
        
        # Check rate limit
        allowed, info = self.check_rate_limit_redis(ip, endpoint)
        
        if not allowed:
            # Block IP if rate limit exceeded multiple times
            self.block_ip(ip, f"Rate limit exceeded for {endpoint}")
        
        return allowed, info

    def get_rate_limit_headers(self, info: Dict) -> Dict[str, str]:
        """Generate rate limit headers for response"""
        headers = {
            "X-RateLimit-Limit": str(info["limit"]),
            "X-RateLimit-Remaining": str(info["remaining"]),
            "X-RateLimit-Reset": str(int(info["reset_time"]))
        }
        
        if info.get("retry_after", 0) > 0:
            headers["Retry-After"] = str(info["retry_after"])
        
        return headers

# Global rate limiter instance
rate_limiter = RateLimiter()

async def rate_limit_middleware(request: Request, call_next):
    """Rate limiting middleware"""
    try:
        allowed, info = await rate_limiter.check_rate_limit(request)
        
        if not allowed:
            headers = rate_limiter.get_rate_limit_headers(info)
            
            if info.get("blocked"):
                return JSONResponse(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    content={
                        "error": "IP address blocked",
                        "message": "Your IP address has been temporarily blocked due to excessive requests",
                        "retry_after": info["retry_after"]
                    },
                    headers=headers
                )
            else:
                return JSONResponse(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    content={
                        "error": "Rate limit exceeded",
                        "message": "Too many requests. Please try again later.",
                        "retry_after": info["retry_after"]
                    },
                    headers=headers
                )
        
        # Add rate limit headers to successful responses
        response = await call_next(request)
        headers = rate_limiter.get_rate_limit_headers(info)
        for key, value in headers.items():
            response.headers[key] = value
        
        return response
        
    except Exception as e:
        logger.error(f"Rate limiting middleware error: {e}")
        # Allow request to proceed if rate limiting fails
        return await call_next(request)
