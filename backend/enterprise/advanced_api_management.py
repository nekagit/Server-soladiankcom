"""
Advanced API Management System for Soladia Marketplace
Enterprise-grade API management, rate limiting, and analytics
"""

from typing import Optional, Dict, Any, List, Tuple
from datetime import datetime, timedelta
from enum import Enum
import uuid
import hashlib
import secrets
import json
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, JSON, ForeignKey, BigInteger, Float
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from fastapi import HTTPException, Depends, Request, Response
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, Field, validator
import redis
import asyncio
from collections import defaultdict
import time

Base = declarative_base()

class APITier(str, Enum):
    FREE = "free"
    BASIC = "basic"
    PREMIUM = "premium"
    ENTERPRISE = "enterprise"

class APIKeyStatus(str, Enum):
    ACTIVE = "active"
    SUSPENDED = "suspended"
    EXPIRED = "expired"
    REVOKED = "revoked"

class RateLimitType(str, Enum):
    PER_MINUTE = "per_minute"
    PER_HOUR = "per_hour"
    PER_DAY = "per_day"
    PER_MONTH = "per_month"

class APIKey(Base):
    __tablename__ = "api_keys"
    
    id = Column(Integer, primary_key=True, index=True)
    key_id = Column(String(36), unique=True, index=True, nullable=False)
    tenant_id = Column(String(36), ForeignKey("tenants.tenant_id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Key details
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    key_hash = Column(String(64), nullable=False)  # Hashed version of the key
    key_prefix = Column(String(8), nullable=False)  # First 8 chars for identification
    
    # Access control
    tier = Column(String(20), default=APITier.FREE)
    status = Column(String(20), default=APIKeyStatus.ACTIVE)
    permissions = Column(JSON, default=dict)
    allowed_ips = Column(JSON, default=list)  # IP whitelist
    blocked_ips = Column(JSON, default=list)  # IP blacklist
    
    # Rate limiting
    rate_limit = Column(Integer, default=1000)  # requests per period
    rate_limit_type = Column(String(20), default=RateLimitType.PER_HOUR)
    burst_limit = Column(Integer, default=100)  # burst requests
    
    # Usage tracking
    total_requests = Column(BigInteger, default=0)
    successful_requests = Column(BigInteger, default=0)
    failed_requests = Column(BigInteger, default=0)
    last_used_at = Column(DateTime, nullable=True)
    
    # Billing
    cost_per_request = Column(Float, default=0.0)
    monthly_cost = Column(Float, default=0.0)
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime, nullable=True)
    revoked_at = Column(DateTime, nullable=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)

class APIUsage(Base):
    __tablename__ = "api_usage"
    
    id = Column(Integer, primary_key=True, index=True)
    key_id = Column(String(36), ForeignKey("api_keys.key_id"), nullable=False)
    tenant_id = Column(String(36), ForeignKey("tenants.tenant_id"), nullable=False)
    
    # Request details
    endpoint = Column(String(500), nullable=False)
    method = Column(String(10), nullable=False)
    status_code = Column(Integer, nullable=False)
    response_time = Column(Integer, nullable=False)  # milliseconds
    
    # Client details
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(Text, nullable=True)
    referer = Column(String(500), nullable=True)
    
    # Request/Response data
    request_size = Column(Integer, default=0)  # bytes
    response_size = Column(Integer, default=0)  # bytes
    error_message = Column(Text, nullable=True)
    
    # Metadata
    timestamp = Column(DateTime, default=datetime.utcnow)
    metadata = Column(JSON, default=dict)

class APIRateLimit(Base):
    __tablename__ = "api_rate_limits"
    
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(String(36), ForeignKey("tenants.tenant_id"), nullable=False)
    
    # Rate limit configuration
    endpoint_pattern = Column(String(500), nullable=False)
    method = Column(String(10), nullable=True)  # null means all methods
    tier = Column(String(20), nullable=True)  # null means all tiers
    
    # Limits
    requests_per_minute = Column(Integer, default=60)
    requests_per_hour = Column(Integer, default=1000)
    requests_per_day = Column(Integer, default=10000)
    requests_per_month = Column(Integer, default=100000)
    
    # Burst limits
    burst_requests = Column(Integer, default=10)
    burst_window = Column(Integer, default=60)  # seconds
    
    # Advanced settings
    sliding_window = Column(Boolean, default=True)
    distributed = Column(Boolean, default=True)
    
    # Metadata
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class APIAnalytics(Base):
    __tablename__ = "api_analytics"
    
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(String(36), ForeignKey("tenants.tenant_id"), nullable=False)
    key_id = Column(String(36), ForeignKey("api_keys.key_id"), nullable=True)
    
    # Time period
    period_start = Column(DateTime, nullable=False)
    period_end = Column(DateTime, nullable=False)
    period_type = Column(String(20), nullable=False)  # hour, day, week, month
    
    # Metrics
    total_requests = Column(BigInteger, default=0)
    successful_requests = Column(BigInteger, default=0)
    failed_requests = Column(BigInteger, default=0)
    unique_users = Column(Integer, default=0)
    unique_ips = Column(Integer, default=0)
    
    # Performance metrics
    avg_response_time = Column(Float, default=0.0)
    min_response_time = Column(Integer, default=0)
    max_response_time = Column(Integer, default=0)
    p95_response_time = Column(Float, default=0.0)
    p99_response_time = Column(Float, default=0.0)
    
    # Error metrics
    error_rate = Column(Float, default=0.0)
    timeout_rate = Column(Float, default=0.0)
    
    # Data transfer
    total_request_size = Column(BigInteger, default=0)
    total_response_size = Column(BigInteger, default=0)
    
    # Endpoint breakdown
    endpoint_stats = Column(JSON, default=dict)
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)

class APIGateway(Base):
    __tablename__ = "api_gateways"
    
    id = Column(Integer, primary_key=True, index=True)
    gateway_id = Column(String(36), unique=True, index=True, nullable=False)
    tenant_id = Column(String(36), ForeignKey("tenants.tenant_id"), nullable=False)
    
    # Gateway configuration
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    base_url = Column(String(500), nullable=False)
    health_check_url = Column(String(500), nullable=True)
    
    # Load balancing
    is_active = Column(Boolean, default=True)
    weight = Column(Integer, default=100)
    max_connections = Column(Integer, default=1000)
    timeout = Column(Integer, default=30)  # seconds
    
    # Health monitoring
    last_health_check = Column(DateTime, nullable=True)
    health_status = Column(String(20), default="unknown")
    response_time = Column(Integer, nullable=True)  # milliseconds
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

# Pydantic models
class APIKeyCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    tier: APITier = APITier.FREE
    permissions: Dict[str, Any] = Field(default_factory=dict)
    allowed_ips: List[str] = Field(default_factory=list)
    rate_limit: int = Field(1000, ge=1)
    rate_limit_type: RateLimitType = RateLimitType.PER_HOUR
    expires_in_days: Optional[int] = Field(None, ge=1, le=365)

class APIKeyResponse(BaseModel):
    id: int
    key_id: str
    name: str
    description: Optional[str]
    key_prefix: str
    tier: APITier
    status: APIKeyStatus
    permissions: Dict[str, Any]
    allowed_ips: List[str]
    rate_limit: int
    rate_limit_type: RateLimitType
    total_requests: int
    successful_requests: int
    failed_requests: int
    last_used_at: Optional[datetime]
    created_at: datetime
    expires_at: Optional[datetime]

class APIKeyUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    permissions: Optional[Dict[str, Any]] = None
    allowed_ips: Optional[List[str]] = None
    rate_limit: Optional[int] = Field(None, ge=1)
    rate_limit_type: Optional[RateLimitType] = None

class RateLimitCreate(BaseModel):
    endpoint_pattern: str = Field(..., min_length=1, max_length=500)
    method: Optional[str] = Field(None, max_length=10)
    tier: Optional[APITier] = None
    requests_per_minute: int = Field(60, ge=1)
    requests_per_hour: int = Field(1000, ge=1)
    requests_per_day: int = Field(10000, ge=1)
    requests_per_month: int = Field(100000, ge=1)
    burst_requests: int = Field(10, ge=1)
    burst_window: int = Field(60, ge=1, le=3600)

class APIUsageResponse(BaseModel):
    id: int
    key_id: str
    endpoint: str
    method: str
    status_code: int
    response_time: int
    ip_address: Optional[str]
    user_agent: Optional[str]
    request_size: int
    response_size: int
    error_message: Optional[str]
    timestamp: datetime

class APIAnalyticsResponse(BaseModel):
    period_start: datetime
    period_end: datetime
    period_type: str
    total_requests: int
    successful_requests: int
    failed_requests: int
    unique_users: int
    unique_ips: int
    avg_response_time: float
    error_rate: float
    total_request_size: int
    total_response_size: int
    endpoint_stats: Dict[str, Any]

class AdvancedAPIManagementService:
    def __init__(self, db_session, redis_client):
        self.db = db_session
        self.redis = redis_client
        self.rate_limiters = defaultdict(lambda: defaultdict(list))
        self.analytics_cache = {}
    
    async def create_api_key(self, tenant_id: str, user_id: int, key_data: APIKeyCreate) -> Tuple[str, APIKeyResponse]:
        """Create a new API key"""
        key_id = str(uuid.uuid4())
        
        # Generate API key
        api_key = self._generate_api_key()
        key_hash = hashlib.sha256(api_key.encode()).hexdigest()
        key_prefix = api_key[:8]
        
        # Calculate expiry date
        expires_at = None
        if key_data.expires_in_days:
            expires_at = datetime.utcnow() + timedelta(days=key_data.expires_in_days)
        
        # Create API key record
        api_key_record = APIKey(
            key_id=key_id,
            tenant_id=tenant_id,
            user_id=user_id,
            name=key_data.name,
            description=key_data.description,
            key_hash=key_hash,
            key_prefix=key_prefix,
            tier=key_data.tier,
            permissions=key_data.permissions,
            allowed_ips=key_data.allowed_ips,
            rate_limit=key_data.rate_limit,
            rate_limit_type=key_data.rate_limit_type,
            expires_at=expires_at,
            created_by=user_id
        )
        
        self.db.add(api_key_record)
        self.db.commit()
        self.db.refresh(api_key_record)
        
        # Cache API key for fast lookup
        await self._cache_api_key(api_key_record)
        
        return api_key, APIKeyResponse.from_orm(api_key_record)
    
    async def validate_api_key(self, api_key: str, request: Request) -> Optional[APIKey]:
        """Validate API key and check permissions"""
        # Get key prefix for lookup
        if len(api_key) < 8:
            return None
        
        key_prefix = api_key[:8]
        key_hash = hashlib.sha256(api_key.encode()).hexdigest()
        
        # Try cache first
        cached_key = await self._get_cached_api_key(key_prefix)
        if cached_key and cached_key.key_hash == key_hash:
            api_key_record = cached_key
        else:
            # Query database
            api_key_record = self.db.query(APIKey).filter(
                APIKey.key_prefix == key_prefix,
                APIKey.key_hash == key_hash,
                APIKey.status == APIKeyStatus.ACTIVE
            ).first()
            
            if not api_key_record:
                return None
            
            # Cache for future use
            await self._cache_api_key(api_key_record)
        
        # Check expiry
        if api_key_record.expires_at and api_key_record.expires_at < datetime.utcnow():
            return None
        
        # Check IP whitelist
        client_ip = self._get_client_ip(request)
        if api_key_record.allowed_ips and client_ip not in api_key_record.allowed_ips:
            return None
        
        # Check IP blacklist
        if client_ip in api_key_record.blocked_ips:
            return None
        
        # Check rate limit
        if not await self._check_rate_limit(api_key_record, request):
            return None
        
        # Update usage stats
        await self._update_usage_stats(api_key_record, request)
        
        return api_key_record
    
    async def get_api_keys(self, tenant_id: str, user_id: Optional[int] = None, skip: int = 0, limit: int = 100) -> List[APIKeyResponse]:
        """Get API keys for tenant"""
        query = self.db.query(APIKey).filter(APIKey.tenant_id == tenant_id)
        
        if user_id:
            query = query.filter(APIKey.user_id == user_id)
        
        api_keys = query.offset(skip).limit(limit).all()
        
        return [APIKeyResponse.from_orm(key) for key in api_keys]
    
    async def update_api_key(self, key_id: str, update_data: APIKeyUpdate) -> APIKeyResponse:
        """Update API key"""
        api_key = self.db.query(APIKey).filter(APIKey.key_id == key_id).first()
        if not api_key:
            raise HTTPException(status_code=404, detail="API key not found")
        
        # Update fields
        for field, value in update_data.dict(exclude_unset=True).items():
            setattr(api_key, field, value)
        
        self.db.commit()
        self.db.refresh(api_key)
        
        # Update cache
        await self._cache_api_key(api_key)
        
        return APIKeyResponse.from_orm(api_key)
    
    async def revoke_api_key(self, key_id: str) -> bool:
        """Revoke API key"""
        api_key = self.db.query(APIKey).filter(APIKey.key_id == key_id).first()
        if not api_key:
            return False
        
        api_key.status = APIKeyStatus.REVOKED
        api_key.revoked_at = datetime.utcnow()
        
        self.db.commit()
        
        # Remove from cache
        await self._remove_cached_api_key(api_key.key_prefix)
        
        return True
    
    async def log_api_usage(self, key_id: str, tenant_id: str, request: Request, response: Response, response_time: int):
        """Log API usage"""
        # Extract request details
        endpoint = str(request.url.path)
        method = request.method
        status_code = response.status_code
        ip_address = self._get_client_ip(request)
        user_agent = request.headers.get("user-agent")
        referer = request.headers.get("referer")
        
        # Calculate sizes (simplified)
        request_size = len(str(request.url).encode())
        response_size = len(str(response.body) if hasattr(response, 'body') else b'')
        
        # Create usage record
        usage = APIUsage(
            key_id=key_id,
            tenant_id=tenant_id,
            endpoint=endpoint,
            method=method,
            status_code=status_code,
            response_time=response_time,
            ip_address=ip_address,
            user_agent=user_agent,
            referer=referer,
            request_size=request_size,
            response_size=response_size
        )
        
        self.db.add(usage)
        self.db.commit()
        
        # Update API key stats
        await self._update_api_key_stats(key_id, status_code)
        
        # Update analytics cache
        await self._update_analytics_cache(tenant_id, key_id, usage)
    
    async def get_api_analytics(self, tenant_id: str, key_id: Optional[str] = None, 
                               period_type: str = "day", days: int = 7) -> APIAnalyticsResponse:
        """Get API analytics"""
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=days)
        
        # Query usage data
        query = self.db.query(APIUsage).filter(
            APIUsage.tenant_id == tenant_id,
            APIUsage.timestamp >= start_date,
            APIUsage.timestamp <= end_date
        )
        
        if key_id:
            query = query.filter(APIUsage.key_id == key_id)
        
        usage_records = query.all()
        
        if not usage_records:
            return APIAnalyticsResponse(
                period_start=start_date,
                period_end=end_date,
                period_type=period_type,
                total_requests=0,
                successful_requests=0,
                failed_requests=0,
                unique_users=0,
                unique_ips=0,
                avg_response_time=0.0,
                error_rate=0.0,
                total_request_size=0,
                total_response_size=0,
                endpoint_stats={}
            )
        
        # Calculate metrics
        total_requests = len(usage_records)
        successful_requests = len([r for r in usage_records if 200 <= r.status_code < 300])
        failed_requests = total_requests - successful_requests
        
        unique_ips = len(set(r.ip_address for r in usage_records if r.ip_address))
        unique_users = len(set(r.key_id for r in usage_records))
        
        response_times = [r.response_time for r in usage_records if r.response_time]
        avg_response_time = sum(response_times) / len(response_times) if response_times else 0.0
        
        error_rate = (failed_requests / total_requests) * 100 if total_requests > 0 else 0.0
        
        total_request_size = sum(r.request_size for r in usage_records)
        total_response_size = sum(r.response_size for r in usage_records)
        
        # Endpoint statistics
        endpoint_stats = {}
        for record in usage_records:
            endpoint = record.endpoint
            if endpoint not in endpoint_stats:
                endpoint_stats[endpoint] = {
                    "requests": 0,
                    "successful_requests": 0,
                    "failed_requests": 0,
                    "avg_response_time": 0.0
                }
            
            endpoint_stats[endpoint]["requests"] += 1
            if 200 <= record.status_code < 300:
                endpoint_stats[endpoint]["successful_requests"] += 1
            else:
                endpoint_stats[endpoint]["failed_requests"] += 1
        
        # Calculate average response times per endpoint
        for endpoint, stats in endpoint_stats.items():
            endpoint_records = [r for r in usage_records if r.endpoint == endpoint and r.response_time]
            if endpoint_records:
                stats["avg_response_time"] = sum(r.response_time for r in endpoint_records) / len(endpoint_records)
        
        return APIAnalyticsResponse(
            period_start=start_date,
            period_end=end_date,
            period_type=period_type,
            total_requests=total_requests,
            successful_requests=successful_requests,
            failed_requests=failed_requests,
            unique_users=unique_users,
            unique_ips=unique_ips,
            avg_response_time=avg_response_time,
            error_rate=error_rate,
            total_request_size=total_request_size,
            total_response_size=total_response_size,
            endpoint_stats=endpoint_stats
        )
    
    async def create_rate_limit(self, tenant_id: str, rate_limit_data: RateLimitCreate) -> str:
        """Create rate limit rule"""
        rate_limit = APIRateLimit(
            tenant_id=tenant_id,
            endpoint_pattern=rate_limit_data.endpoint_pattern,
            method=rate_limit_data.method,
            tier=rate_limit_data.tier,
            requests_per_minute=rate_limit_data.requests_per_minute,
            requests_per_hour=rate_limit_data.requests_per_hour,
            requests_per_day=rate_limit_data.requests_per_day,
            requests_per_month=rate_limit_data.requests_per_month,
            burst_requests=rate_limit_data.burst_requests,
            burst_window=rate_limit_data.burst_window
        )
        
        self.db.add(rate_limit)
        self.db.commit()
        self.db.refresh(rate_limit)
        
        return str(rate_limit.id)
    
    async def check_rate_limit(self, api_key: APIKey, request: Request) -> bool:
        """Check if request is within rate limits"""
        # Check API key specific rate limit
        if not await self._check_api_key_rate_limit(api_key, request):
            return False
        
        # Check endpoint specific rate limits
        if not await self._check_endpoint_rate_limit(api_key, request):
            return False
        
        return True
    
    def _generate_api_key(self) -> str:
        """Generate secure API key"""
        return f"sk_{secrets.token_urlsafe(32)}"
    
    def _get_client_ip(self, request: Request) -> str:
        """Get client IP address"""
        forwarded_for = request.headers.get("x-forwarded-for")
        if forwarded_for:
            return forwarded_for.split(",")[0].strip()
        
        real_ip = request.headers.get("x-real-ip")
        if real_ip:
            return real_ip
        
        return request.client.host if request.client else "unknown"
    
    async def _cache_api_key(self, api_key: APIKey):
        """Cache API key for fast lookup"""
        key_data = {
            "key_id": api_key.key_id,
            "key_hash": api_key.key_hash,
            "tenant_id": api_key.tenant_id,
            "user_id": api_key.user_id,
            "tier": api_key.tier,
            "permissions": api_key.permissions,
            "allowed_ips": api_key.allowed_ips,
            "blocked_ips": api_key.blocked_ips,
            "rate_limit": api_key.rate_limit,
            "rate_limit_type": api_key.rate_limit_type,
            "expires_at": api_key.expires_at.isoformat() if api_key.expires_at else None
        }
        
        await self.redis.setex(
            f"api_key:{api_key.key_prefix}",
            3600,  # 1 hour
            json.dumps(key_data, default=str)
        )
    
    async def _get_cached_api_key(self, key_prefix: str) -> Optional[APIKey]:
        """Get cached API key"""
        cached = await self.redis.get(f"api_key:{key_prefix}")
        if not cached:
            return None
        
        key_data = json.loads(cached)
        
        # Create APIKey object from cached data
        api_key = APIKey()
        api_key.key_id = key_data["key_id"]
        api_key.key_hash = key_data["key_hash"]
        api_key.tenant_id = key_data["tenant_id"]
        api_key.user_id = key_data["user_id"]
        api_key.tier = key_data["tier"]
        api_key.permissions = key_data["permissions"]
        api_key.allowed_ips = key_data["allowed_ips"]
        api_key.blocked_ips = key_data["blocked_ips"]
        api_key.rate_limit = key_data["rate_limit"]
        api_key.rate_limit_type = key_data["rate_limit_type"]
        api_key.expires_at = datetime.fromisoformat(key_data["expires_at"]) if key_data["expires_at"] else None
        
        return api_key
    
    async def _remove_cached_api_key(self, key_prefix: str):
        """Remove API key from cache"""
        await self.redis.delete(f"api_key:{key_prefix}")
    
    async def _check_rate_limit(self, api_key: APIKey, request: Request) -> bool:
        """Check rate limit for API key"""
        # Check API key specific rate limit
        if not await self._check_api_key_rate_limit(api_key, request):
            return False
        
        # Check endpoint specific rate limits
        if not await self._check_endpoint_rate_limit(api_key, request):
            return False
        
        return True
    
    async def _check_api_key_rate_limit(self, api_key: APIKey, request: Request) -> bool:
        """Check API key specific rate limit"""
        identifier = f"api_key:{api_key.key_id}"
        limit = api_key.rate_limit
        window = self._get_rate_limit_window(api_key.rate_limit_type)
        
        return await self._check_rate_limit_window(identifier, limit, window)
    
    async def _check_endpoint_rate_limit(self, api_key: APIKey, request: Request) -> bool:
        """Check endpoint specific rate limits"""
        endpoint = str(request.url.path)
        method = request.method
        
        # Get applicable rate limits
        rate_limits = self.db.query(APIRateLimit).filter(
            APIRateLimit.tenant_id == api_key.tenant_id,
            APIRateLimit.is_active == True,
            (APIRateLimit.method == method) | (APIRateLimit.method.is_(None)),
            (APIRateLimit.tier == api_key.tier) | (APIRateLimit.tier.is_(None))
        ).all()
        
        for rate_limit in rate_limits:
            if self._endpoint_matches_pattern(endpoint, rate_limit.endpoint_pattern):
                # Check each rate limit window
                windows = [
                    ("minute", rate_limit.requests_per_minute, 60),
                    ("hour", rate_limit.requests_per_hour, 3600),
                    ("day", rate_limit.requests_per_day, 86400),
                    ("month", rate_limit.requests_per_month, 2592000)
                ]
                
                for window_name, limit, seconds in windows:
                    if limit > 0:
                        identifier = f"rate_limit:{api_key.tenant_id}:{endpoint}:{window_name}"
                        if not await self._check_rate_limit_window(identifier, limit, seconds):
                            return False
        
        return True
    
    async def _check_rate_limit_window(self, identifier: str, limit: int, window: int) -> bool:
        """Check rate limit for a specific window"""
        now = time.time()
        cutoff = now - window
        
        # Get recent requests
        recent_requests = await self.redis.lrange(f"rate_limit:{identifier}", 0, -1)
        
        # Filter out old requests
        valid_requests = []
        for req_time_str in recent_requests:
            req_time = float(req_time_str.decode())
            if req_time > cutoff:
                valid_requests.append(req_time)
        
        # Check if limit exceeded
        if len(valid_requests) >= limit:
            return False
        
        # Add current request
        await self.redis.lpush(f"rate_limit:{identifier}", str(now))
        await self.redis.expire(f"rate_limit:{identifier}", window)
        
        return True
    
    def _get_rate_limit_window(self, rate_limit_type: RateLimitType) -> int:
        """Get rate limit window in seconds"""
        windows = {
            RateLimitType.PER_MINUTE: 60,
            RateLimitType.PER_HOUR: 3600,
            RateLimitType.PER_DAY: 86400,
            RateLimitType.PER_MONTH: 2592000
        }
        
        return windows.get(rate_limit_type, 3600)
    
    def _endpoint_matches_pattern(self, endpoint: str, pattern: str) -> bool:
        """Check if endpoint matches pattern"""
        import re
        
        # Convert pattern to regex
        regex_pattern = pattern.replace("*", ".*")
        return bool(re.match(f"^{regex_pattern}$", endpoint))
    
    async def _update_usage_stats(self, api_key: APIKey, request: Request):
        """Update API key usage statistics"""
        api_key.total_requests += 1
        api_key.last_used_at = datetime.utcnow()
        
        self.db.commit()
    
    async def _update_api_key_stats(self, key_id: str, status_code: int):
        """Update API key success/failure stats"""
        api_key = self.db.query(APIKey).filter(APIKey.key_id == key_id).first()
        if not api_key:
            return
        
        if 200 <= status_code < 300:
            api_key.successful_requests += 1
        else:
            api_key.failed_requests += 1
        
        self.db.commit()
    
    async def _update_analytics_cache(self, tenant_id: str, key_id: str, usage: APIUsage):
        """Update analytics cache"""
        # This would update real-time analytics cache
        # Implementation depends on specific requirements
        pass

# Dependency injection
def get_api_management_service(db_session = Depends(get_db), redis_client = Depends(get_redis)) -> AdvancedAPIManagementService:
    """Get advanced API management service"""
    return AdvancedAPIManagementService(db_session, redis_client)