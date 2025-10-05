"""
Advanced CORS Middleware for Soladia
Comprehensive CORS configuration with security and performance optimizations
"""

import logging
from typing import List, Optional, Dict, Any, Set
from datetime import datetime, timedelta
from enum import Enum
import re
from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import asyncio
import json
from urllib.parse import urlparse

logger = logging.getLogger(__name__)

class CORSConfig:
    """CORS configuration class"""
    
    def __init__(
        self,
        allowed_origins: List[str],
        allowed_methods: List[str] = None,
        allowed_headers: List[str] = None,
        exposed_headers: List[str] = None,
        allow_credentials: bool = True,
        max_age: int = 3600,
        allow_wildcard_subdomains: bool = False,
        allowed_origin_regex: Optional[str] = None
    ):
        self.allowed_origins = allowed_origins
        self.allowed_methods = allowed_methods or [
            "GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS", "HEAD"
        ]
        self.allowed_headers = allowed_headers or [
            "Accept",
            "Accept-Language",
            "Content-Language",
            "Content-Type",
            "Authorization",
            "X-Requested-With",
            "X-CSRF-Token",
            "X-API-Key",
            "X-Soladia-Signature",
            "X-Soladia-Event"
        ]
        self.exposed_headers = exposed_headers or [
            "X-Total-Count",
            "X-Page-Count",
            "X-Current-Page",
            "X-Rate-Limit-Remaining",
            "X-Rate-Limit-Reset"
        ]
        self.allow_credentials = allow_credentials
        self.max_age = max_age
        self.allow_wildcard_subdomains = allow_wildcard_subdomains
        self.allowed_origin_regex = allowed_origin_regex
        
        # Compile regex if provided
        self.origin_regex = None
        if allowed_origin_regex:
            try:
                self.origin_regex = re.compile(allowed_origin_regex)
            except re.error as e:
                logger.error(f"Invalid origin regex: {e}")
                self.origin_regex = None

class CORSEnvironment(Enum):
    DEVELOPMENT = "development"
    STAGING = "staging"
    PRODUCTION = "production"

class AdvancedCORSMiddleware:
    """Advanced CORS middleware with security and performance features"""
    
    def __init__(
        self,
        app: FastAPI,
        environment: CORSEnvironment = CORSEnvironment.DEVELOPMENT,
        config: Optional[CORSConfig] = None
    ):
        self.app = app
        self.environment = environment
        self.config = config or self._get_default_config()
        
        # Security features
        self.origin_whitelist: Set[str] = set()
        self.origin_blacklist: Set[str] = set()
        self.rate_limited_origins: Dict[str, Dict[str, Any]] = {}
        
        # Performance tracking
        self.cors_requests: Dict[str, int] = {}
        self.blocked_requests: Dict[str, int] = {}
        
        # Initialize middleware
        self._setup_cors_middleware()
        self._setup_security_features()
        
    def _get_default_config(self) -> CORSConfig:
        """Get default CORS configuration based on environment"""
        if self.environment == CORSEnvironment.DEVELOPMENT:
            return CORSConfig(
                allowed_origins=[
                    "http://localhost:3000",
                    "http://localhost:5173",
                    "http://localhost:8081",
                    "http://127.0.0.1:3000",
                    "http://127.0.0.1:5173",
                    "http://127.0.0.1:8081"
                ],
                allow_credentials=True,
                max_age=3600
            )
        elif self.environment == CORSEnvironment.STAGING:
            return CORSConfig(
                allowed_origins=[
                    "https://staging.soladia.com",
                    "https://staging-api.soladia.com"
                ],
                allow_credentials=True,
                max_age=1800
            )
        else:  # PRODUCTION
            return CORSConfig(
                allowed_origins=[
                    "https://soladia.com",
                    "https://www.soladia.com",
                    "https://api.soladia.com"
                ],
                allow_credentials=True,
                max_age=7200,
                allowed_origin_regex=r"^https://[a-zA-Z0-9-]+\.soladia\.com$"
            )
    
    def _setup_cors_middleware(self):
        """Setup FastAPI CORS middleware"""
        try:
            self.app.add_middleware(
                CORSMiddleware,
                allow_origins=self.config.allowed_origins,
                allow_credentials=self.config.allow_credentials,
                allow_methods=self.config.allowed_methods,
                allow_headers=self.config.allowed_headers,
                expose_headers=self.config.exposed_headers,
                max_age=self.config.max_age
            )
            
            logger.info("CORS middleware configured successfully")
            
        except Exception as e:
            logger.error(f"Failed to setup CORS middleware: {e}")
            raise
    
    def _setup_security_features(self):
        """Setup additional security features"""
        try:
            # Add custom middleware for advanced CORS handling
            @self.app.middleware("http")
            async def advanced_cors_middleware(request: Request, call_next):
                return await self._handle_cors_request(request, call_next)
            
            logger.info("Advanced CORS security features configured")
            
        except Exception as e:
            logger.error(f"Failed to setup security features: {e}")
    
    async def _handle_cors_request(self, request: Request, call_next):
        """Handle CORS request with advanced security"""
        try:
            # Get origin from request
            origin = request.headers.get("origin")
            method = request.method
            
            # Log CORS request
            await self._log_cors_request(origin, method)
            
            # Check for preflight requests
            if method == "OPTIONS":
                return await self._handle_preflight_request(request, origin)
            
            # Validate origin
            if origin and not await self._is_origin_allowed(origin):
                return await self._handle_invalid_origin(request, origin)
            
            # Check rate limiting
            if origin and await self._is_origin_rate_limited(origin):
                return await self._handle_rate_limited_origin(request, origin)
            
            # Process request
            response = await call_next(request)
            
            # Add CORS headers to response
            await self._add_cors_headers(response, origin)
            
            return response
            
        except Exception as e:
            logger.error(f"CORS request handling failed: {e}")
            return JSONResponse(
                content={"error": "CORS processing failed"},
                status_code=500
            )
    
    async def _handle_preflight_request(self, request: Request, origin: str):
        """Handle CORS preflight requests"""
        try:
            # Validate origin for preflight
            if origin and not await self._is_origin_allowed(origin):
                return await self._handle_invalid_origin(request, origin)
            
            # Get requested method and headers
            requested_method = request.headers.get("access-control-request-method")
            requested_headers = request.headers.get("access-control-request-headers")
            
            # Validate requested method
            if requested_method and requested_method not in self.config.allowed_methods:
                return JSONResponse(
                    content={"error": "Method not allowed"},
                    status_code=405
                )
            
            # Validate requested headers
            if requested_headers:
                requested_headers_list = [h.strip() for h in requested_headers.split(",")]
                for header in requested_headers_list:
                    if header.lower() not in [h.lower() for h in self.config.allowed_headers]:
                        return JSONResponse(
                            content={"error": "Header not allowed"},
                            status_code=400
                        )
            
            # Create preflight response
            response = JSONResponse(content={}, status_code=200)
            await self._add_cors_headers(response, origin)
            
            return response
            
        except Exception as e:
            logger.error(f"Preflight request handling failed: {e}")
            return JSONResponse(
                content={"error": "Preflight request failed"},
                status_code=500
            )
    
    async def _is_origin_allowed(self, origin: str) -> bool:
        """Check if origin is allowed"""
        try:
            # Check blacklist first
            if origin in self.origin_blacklist:
                return False
            
            # Check whitelist
            if origin in self.origin_whitelist:
                return True
            
            # Check configured allowed origins
            if origin in self.config.allowed_origins:
                return True
            
            # Check wildcard subdomains
            if self.config.allow_wildcard_subdomains:
                if await self._is_wildcard_subdomain_allowed(origin):
                    return True
            
            # Check regex pattern
            if self.config.origin_regex:
                if self.config.origin_regex.match(origin):
                    return True
            
            return False
            
        except Exception as e:
            logger.error(f"Origin validation failed: {e}")
            return False
    
    async def _is_wildcard_subdomain_allowed(self, origin: str) -> bool:
        """Check if origin matches wildcard subdomain pattern"""
        try:
            # Parse origin
            parsed = urlparse(origin)
            if not parsed.hostname:
                return False
            
            # Check against configured domains
            for allowed_origin in self.config.allowed_origins:
                if allowed_origin.startswith("*."):
                    domain = allowed_origin[2:]  # Remove "*.", prefix
                    if origin.endswith(domain):
                        return True
            
            return False
            
        except Exception as e:
            logger.error(f"Wildcard subdomain check failed: {e}")
            return False
    
    async def _is_origin_rate_limited(self, origin: str) -> bool:
        """Check if origin is rate limited"""
        try:
            if origin not in self.rate_limited_origins:
                return False
            
            origin_data = self.rate_limited_origins[origin]
            current_time = datetime.now()
            
            # Check if rate limit has expired
            if current_time > origin_data["expires_at"]:
                del self.rate_limited_origins[origin]
                return False
            
            return True
            
        except Exception as e:
            logger.error(f"Rate limit check failed: {e}")
            return False
    
    async def _handle_invalid_origin(self, request: Request, origin: str):
        """Handle requests from invalid origins"""
        try:
            # Log blocked request
            self.blocked_requests[origin] = self.blocked_requests.get(origin, 0) + 1
            
            logger.warning(f"Blocked request from invalid origin: {origin}")
            
            return JSONResponse(
                content={"error": "Origin not allowed"},
                status_code=403,
                headers={
                    "Access-Control-Allow-Origin": "null",
                    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
                    "Access-Control-Allow-Headers": "Content-Type, Authorization",
                    "Access-Control-Max-Age": "0"
                }
            )
            
        except Exception as e:
            logger.error(f"Invalid origin handling failed: {e}")
            return JSONResponse(
                content={"error": "CORS error"},
                status_code=500
            )
    
    async def _handle_rate_limited_origin(self, request: Request, origin: str):
        """Handle rate limited origins"""
        try:
            logger.warning(f"Rate limited request from origin: {origin}")
            
            return JSONResponse(
                content={"error": "Rate limit exceeded"},
                status_code=429,
                headers={
                    "Retry-After": "60",
                    "Access-Control-Allow-Origin": "null"
                }
            )
            
        except Exception as e:
            logger.error(f"Rate limit handling failed: {e}")
            return JSONResponse(
                content={"error": "Rate limit error"},
                status_code=500
            )
    
    async def _add_cors_headers(self, response: Response, origin: str):
        """Add CORS headers to response"""
        try:
            if origin and await self._is_origin_allowed(origin):
                response.headers["Access-Control-Allow-Origin"] = origin
            else:
                response.headers["Access-Control-Allow-Origin"] = "null"
            
            response.headers["Access-Control-Allow-Methods"] = ", ".join(self.config.allowed_methods)
            response.headers["Access-Control-Allow-Headers"] = ", ".join(self.config.allowed_headers)
            response.headers["Access-Control-Expose-Headers"] = ", ".join(self.config.exposed_headers)
            response.headers["Access-Control-Max-Age"] = str(self.config.max_age)
            
            if self.config.allow_credentials:
                response.headers["Access-Control-Allow-Credentials"] = "true"
            
        except Exception as e:
            logger.error(f"Failed to add CORS headers: {e}")
    
    async def _log_cors_request(self, origin: str, method: str):
        """Log CORS request for monitoring"""
        try:
            # Track request count
            if origin:
                self.cors_requests[origin] = self.cors_requests.get(origin, 0) + 1
            
            # Log request details
            logger.debug(f"CORS request: {method} from {origin}")
            
        except Exception as e:
            logger.error(f"Failed to log CORS request: {e}")
    
    def add_origin_to_whitelist(self, origin: str):
        """Add origin to whitelist"""
        self.origin_whitelist.add(origin)
        logger.info(f"Added origin to whitelist: {origin}")
    
    def add_origin_to_blacklist(self, origin: str):
        """Add origin to blacklist"""
        self.origin_blacklist.add(origin)
        logger.info(f"Added origin to blacklist: {origin}")
    
    def rate_limit_origin(self, origin: str, duration_minutes: int = 60):
        """Rate limit an origin"""
        try:
            expires_at = datetime.now() + timedelta(minutes=duration_minutes)
            self.rate_limited_origins[origin] = {
                "expires_at": expires_at,
                "reason": "Rate limit exceeded"
            }
            logger.info(f"Rate limited origin: {origin} for {duration_minutes} minutes")
            
        except Exception as e:
            logger.error(f"Failed to rate limit origin: {e}")
    
    def get_cors_statistics(self) -> Dict[str, Any]:
        """Get CORS statistics"""
        return {
            "cors_requests": self.cors_requests,
            "blocked_requests": self.blocked_requests,
            "rate_limited_origins": list(self.rate_limited_origins.keys()),
            "whitelist_size": len(self.origin_whitelist),
            "blacklist_size": len(self.origin_blacklist),
            "config": {
                "allowed_origins": self.config.allowed_origins,
                "allowed_methods": self.config.allowed_methods,
                "allowed_headers": self.config.allowed_headers,
                "allow_credentials": self.config.allow_credentials,
                "max_age": self.config.max_age
            }
        }
    
    def update_config(self, new_config: CORSConfig):
        """Update CORS configuration"""
        try:
            self.config = new_config
            logger.info("CORS configuration updated")
            
        except Exception as e:
            logger.error(f"Failed to update CORS configuration: {e}")

# Global CORS middleware instance
_cors_middleware: Optional[AdvancedCORSMiddleware] = None

def get_cors_middleware() -> Optional[AdvancedCORSMiddleware]:
    """Get the global CORS middleware instance"""
    return _cors_middleware

def setup_cors_middleware(
    app: FastAPI,
    environment: CORSEnvironment = CORSEnvironment.DEVELOPMENT,
    config: Optional[CORSConfig] = None
) -> AdvancedCORSMiddleware:
    """Setup CORS middleware for the application"""
    global _cors_middleware
    _cors_middleware = AdvancedCORSMiddleware(app, environment, config)
    return _cors_middleware
