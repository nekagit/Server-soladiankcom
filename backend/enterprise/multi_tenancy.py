"""
Multi-Tenancy System for Soladia Marketplace
Enterprise-grade multi-tenant architecture with tenant isolation
"""

from typing import Optional, Dict, Any, List
from datetime import datetime, timedelta
from enum import Enum
import uuid
import hashlib
import secrets
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, JSON, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship, sessionmaker
from sqlalchemy import create_engine
from fastapi import HTTPException, Depends, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt
from pydantic import BaseModel, Field
import redis
import json

Base = declarative_base()

class TenantStatus(str, Enum):
    ACTIVE = "active"
    SUSPENDED = "suspended"
    PENDING = "pending"
    EXPIRED = "expired"

class TenantTier(str, Enum):
    STARTER = "starter"
    PROFESSIONAL = "professional"
    ENTERPRISE = "enterprise"
    CUSTOM = "custom"

class Tenant(Base):
    __tablename__ = "tenants"
    
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(String(36), unique=True, index=True, nullable=False)
    name = Column(String(255), nullable=False)
    domain = Column(String(255), unique=True, index=True, nullable=False)
    subdomain = Column(String(100), unique=True, index=True, nullable=True)
    status = Column(String(20), default=TenantStatus.PENDING)
    tier = Column(String(20), default=TenantTier.STARTER)
    
    # Branding and customization
    logo_url = Column(String(500), nullable=True)
    primary_color = Column(String(7), default="#E60012")
    secondary_color = Column(String(7), default="#0066CC")
    custom_css = Column(Text, nullable=True)
    custom_js = Column(Text, nullable=True)
    favicon_url = Column(String(500), nullable=True)
    
    # Configuration
    settings = Column(JSON, default=dict)
    features = Column(JSON, default=dict)
    limits = Column(JSON, default=dict)
    
    # Billing and subscription
    subscription_id = Column(String(100), nullable=True)
    billing_email = Column(String(255), nullable=True)
    trial_ends_at = Column(DateTime, nullable=True)
    subscription_ends_at = Column(DateTime, nullable=True)
    
    # Security
    api_key = Column(String(64), unique=True, index=True, nullable=False)
    webhook_secret = Column(String(64), nullable=True)
    encryption_key = Column(String(64), nullable=True)
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    # Relationships
    users = relationship("User", back_populates="tenant")
    products = relationship("Product", back_populates="tenant")
    orders = relationship("Order", back_populates="tenant")

class TenantUser(Base):
    __tablename__ = "tenant_users"
    
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(String(36), ForeignKey("tenants.tenant_id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    role = Column(String(50), default="member")
    permissions = Column(JSON, default=dict)
    joined_at = Column(DateTime, default=datetime.utcnow)
    is_active = Column(Boolean, default=True)

class TenantInvitation(Base):
    __tablename__ = "tenant_invitations"
    
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(String(36), ForeignKey("tenants.tenant_id"), nullable=False)
    email = Column(String(255), nullable=False)
    role = Column(String(50), default="member")
    token = Column(String(64), unique=True, index=True, nullable=False)
    expires_at = Column(DateTime, nullable=False)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    accepted_at = Column(DateTime, nullable=True)

# Pydantic models
class TenantCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    domain: str = Field(..., min_length=3, max_length=255)
    subdomain: Optional[str] = Field(None, min_length=3, max_length=100)
    tier: TenantTier = TenantTier.STARTER
    billing_email: str = Field(..., min_length=5, max_length=255)
    settings: Dict[str, Any] = Field(default_factory=dict)
    features: Dict[str, Any] = Field(default_factory=dict)

class TenantUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    logo_url: Optional[str] = Field(None, max_length=500)
    primary_color: Optional[str] = Field(None, regex=r"^#[0-9A-Fa-f]{6}$")
    secondary_color: Optional[str] = Field(None, regex=r"^#[0-9A-Fa-f]{6}$")
    custom_css: Optional[str] = None
    custom_js: Optional[str] = None
    favicon_url: Optional[str] = Field(None, max_length=500)
    settings: Optional[Dict[str, Any]] = None
    features: Optional[Dict[str, Any]] = None

class TenantResponse(BaseModel):
    id: int
    tenant_id: str
    name: str
    domain: str
    subdomain: Optional[str]
    status: TenantStatus
    tier: TenantTier
    logo_url: Optional[str]
    primary_color: str
    secondary_color: str
    custom_css: Optional[str]
    custom_js: Optional[str]
    favicon_url: Optional[str]
    settings: Dict[str, Any]
    features: Dict[str, Any]
    limits: Dict[str, Any]
    created_at: datetime
    updated_at: datetime

class TenantInvitationCreate(BaseModel):
    email: str = Field(..., min_length=5, max_length=255)
    role: str = Field(default="member", max_length=50)
    expires_in_days: int = Field(default=7, ge=1, le=30)

class TenantInvitationResponse(BaseModel):
    id: int
    tenant_id: str
    email: str
    role: str
    token: str
    expires_at: datetime
    created_at: datetime

class MultiTenancyService:
    def __init__(self, db_session, redis_client):
        self.db = db_session
        self.redis = redis_client
        self.cache_ttl = 3600  # 1 hour
    
    async def create_tenant(self, tenant_data: TenantCreate, created_by: int) -> TenantResponse:
        """Create a new tenant"""
        # Generate unique tenant ID
        tenant_id = str(uuid.uuid4())
        
        # Generate API key
        api_key = self._generate_api_key()
        
        # Check domain uniqueness
        existing_tenant = self.db.query(Tenant).filter(
            (Tenant.domain == tenant_data.domain) | 
            (Tenant.subdomain == tenant_data.subdomain)
        ).first()
        
        if existing_tenant:
            raise HTTPException(
                status_code=400,
                detail="Domain or subdomain already exists"
            )
        
        # Create tenant
        tenant = Tenant(
            tenant_id=tenant_id,
            name=tenant_data.name,
            domain=tenant_data.domain,
            subdomain=tenant_data.subdomain,
            tier=tenant_data.tier,
            billing_email=tenant_data.billing_email,
            api_key=api_key,
            settings=tenant_data.settings,
            features=tenant_data.features,
            limits=self._get_tenant_limits(tenant_data.tier),
            created_by=created_by,
            trial_ends_at=datetime.utcnow() + timedelta(days=14)
        )
        
        self.db.add(tenant)
        self.db.commit()
        self.db.refresh(tenant)
        
        # Add creator as admin
        await self.add_user_to_tenant(tenant_id, created_by, "admin")
        
        # Cache tenant data
        await self._cache_tenant(tenant)
        
        return TenantResponse.from_orm(tenant)
    
    async def get_tenant(self, tenant_id: str) -> Optional[TenantResponse]:
        """Get tenant by ID"""
        # Try cache first
        cached_tenant = await self._get_cached_tenant(tenant_id)
        if cached_tenant:
            return cached_tenant
        
        # Query database
        tenant = self.db.query(Tenant).filter(Tenant.tenant_id == tenant_id).first()
        if not tenant:
            return None
        
        # Cache result
        await self._cache_tenant(tenant)
        
        return TenantResponse.from_orm(tenant)
    
    async def get_tenant_by_domain(self, domain: str) -> Optional[TenantResponse]:
        """Get tenant by domain or subdomain"""
        # Try cache first
        cached_tenant = await self._get_cached_tenant_by_domain(domain)
        if cached_tenant:
            return cached_tenant
        
        # Query database
        tenant = self.db.query(Tenant).filter(
            (Tenant.domain == domain) | (Tenant.subdomain == domain)
        ).first()
        
        if not tenant:
            return None
        
        # Cache result
        await self._cache_tenant(tenant)
        
        return TenantResponse.from_orm(tenant)
    
    async def update_tenant(self, tenant_id: str, update_data: TenantUpdate) -> TenantResponse:
        """Update tenant configuration"""
        tenant = self.db.query(Tenant).filter(Tenant.tenant_id == tenant_id).first()
        if not tenant:
            raise HTTPException(status_code=404, detail="Tenant not found")
        
        # Update fields
        for field, value in update_data.dict(exclude_unset=True).items():
            setattr(tenant, field, value)
        
        tenant.updated_at = datetime.utcnow()
        
        self.db.commit()
        self.db.refresh(tenant)
        
        # Update cache
        await self._cache_tenant(tenant)
        
        return TenantResponse.from_orm(tenant)
    
    async def add_user_to_tenant(self, tenant_id: str, user_id: int, role: str = "member") -> bool:
        """Add user to tenant"""
        # Check if user is already in tenant
        existing = self.db.query(TenantUser).filter(
            TenantUser.tenant_id == tenant_id,
            TenantUser.user_id == user_id
        ).first()
        
        if existing:
            return False
        
        # Add user to tenant
        tenant_user = TenantUser(
            tenant_id=tenant_id,
            user_id=user_id,
            role=role,
            permissions=self._get_role_permissions(role)
        )
        
        self.db.add(tenant_user)
        self.db.commit()
        
        return True
    
    async def remove_user_from_tenant(self, tenant_id: str, user_id: int) -> bool:
        """Remove user from tenant"""
        tenant_user = self.db.query(TenantUser).filter(
            TenantUser.tenant_id == tenant_id,
            TenantUser.user_id == user_id
        ).first()
        
        if not tenant_user:
            return False
        
        self.db.delete(tenant_user)
        self.db.commit()
        
        return True
    
    async def create_tenant_invitation(self, tenant_id: str, invitation_data: TenantInvitationCreate, created_by: int) -> TenantInvitationResponse:
        """Create tenant invitation"""
        # Generate invitation token
        token = secrets.token_urlsafe(32)
        expires_at = datetime.utcnow() + timedelta(days=invitation_data.expires_in_days)
        
        # Create invitation
        invitation = TenantInvitation(
            tenant_id=tenant_id,
            email=invitation_data.email,
            role=invitation_data.role,
            token=token,
            expires_at=expires_at,
            created_by=created_by
        )
        
        self.db.add(invitation)
        self.db.commit()
        self.db.refresh(invitation)
        
        return TenantInvitationResponse.from_orm(invitation)
    
    async def accept_tenant_invitation(self, token: str, user_id: int) -> bool:
        """Accept tenant invitation"""
        invitation = self.db.query(TenantInvitation).filter(
            TenantInvitation.token == token,
            TenantInvitation.accepted_at.is_(None)
        ).first()
        
        if not invitation or invitation.expires_at < datetime.utcnow():
            return False
        
        # Add user to tenant
        success = await self.add_user_to_tenant(invitation.tenant_id, user_id, invitation.role)
        
        if success:
            invitation.accepted_at = datetime.utcnow()
            self.db.commit()
        
        return success
    
    async def get_tenant_users(self, tenant_id: str, skip: int = 0, limit: int = 100) -> List[Dict[str, Any]]:
        """Get tenant users"""
        users = self.db.query(TenantUser, User).join(User).filter(
            TenantUser.tenant_id == tenant_id,
            TenantUser.is_active == True
        ).offset(skip).limit(limit).all()
        
        return [
            {
                "user_id": user.id,
                "email": user.email,
                "username": user.username,
                "full_name": user.full_name,
                "role": tenant_user.role,
                "permissions": tenant_user.permissions,
                "joined_at": tenant_user.joined_at
            }
            for tenant_user, user in users
        ]
    
    async def get_user_tenants(self, user_id: int) -> List[TenantResponse]:
        """Get user's tenants"""
        tenant_users = self.db.query(TenantUser).filter(
            TenantUser.user_id == user_id,
            TenantUser.is_active == True
        ).all()
        
        tenant_ids = [tu.tenant_id for tu in tenant_users]
        tenants = self.db.query(Tenant).filter(Tenant.tenant_id.in_(tenant_ids)).all()
        
        return [TenantResponse.from_orm(tenant) for tenant in tenants]
    
    def _generate_api_key(self) -> str:
        """Generate secure API key"""
        return secrets.token_urlsafe(32)
    
    def _get_tenant_limits(self, tier: TenantTier) -> Dict[str, Any]:
        """Get tenant limits based on tier"""
        limits = {
            TenantTier.STARTER: {
                "max_users": 10,
                "max_products": 100,
                "max_orders_per_month": 1000,
                "storage_gb": 1,
                "api_calls_per_month": 10000,
                "custom_domain": False,
                "white_label": False,
                "priority_support": False
            },
            TenantTier.PROFESSIONAL: {
                "max_users": 50,
                "max_products": 1000,
                "max_orders_per_month": 10000,
                "storage_gb": 10,
                "api_calls_per_month": 100000,
                "custom_domain": True,
                "white_label": False,
                "priority_support": True
            },
            TenantTier.ENTERPRISE: {
                "max_users": 500,
                "max_products": 10000,
                "max_orders_per_month": 100000,
                "storage_gb": 100,
                "api_calls_per_month": 1000000,
                "custom_domain": True,
                "white_label": True,
                "priority_support": True
            },
            TenantTier.CUSTOM: {
                "max_users": -1,  # Unlimited
                "max_products": -1,
                "max_orders_per_month": -1,
                "storage_gb": -1,
                "api_calls_per_month": -1,
                "custom_domain": True,
                "white_label": True,
                "priority_support": True
            }
        }
        
        return limits.get(tier, limits[TenantTier.STARTER])
    
    def _get_role_permissions(self, role: str) -> Dict[str, Any]:
        """Get role permissions"""
        permissions = {
            "admin": {
                "manage_tenant": True,
                "manage_users": True,
                "manage_products": True,
                "manage_orders": True,
                "view_analytics": True,
                "manage_billing": True,
                "manage_settings": True
            },
            "manager": {
                "manage_tenant": False,
                "manage_users": True,
                "manage_products": True,
                "manage_orders": True,
                "view_analytics": True,
                "manage_billing": False,
                "manage_settings": False
            },
            "member": {
                "manage_tenant": False,
                "manage_users": False,
                "manage_products": False,
                "manage_orders": False,
                "view_analytics": False,
                "manage_billing": False,
                "manage_settings": False
            }
        }
        
        return permissions.get(role, permissions["member"])
    
    async def _cache_tenant(self, tenant: Tenant):
        """Cache tenant data"""
        tenant_data = TenantResponse.from_orm(tenant).dict()
        await self.redis.setex(
            f"tenant:{tenant.tenant_id}",
            self.cache_ttl,
            json.dumps(tenant_data, default=str)
        )
        await self.redis.setex(
            f"tenant:domain:{tenant.domain}",
            self.cache_ttl,
            json.dumps(tenant_data, default=str)
        )
        if tenant.subdomain:
            await self.redis.setex(
                f"tenant:subdomain:{tenant.subdomain}",
                self.cache_ttl,
                json.dumps(tenant_data, default=str)
            )
    
    async def _get_cached_tenant(self, tenant_id: str) -> Optional[TenantResponse]:
        """Get cached tenant"""
        cached = await self.redis.get(f"tenant:{tenant_id}")
        if cached:
            return TenantResponse.parse_raw(cached)
        return None
    
    async def _get_cached_tenant_by_domain(self, domain: str) -> Optional[TenantResponse]:
        """Get cached tenant by domain"""
        cached = await self.redis.get(f"tenant:domain:{domain}")
        if cached:
            return TenantResponse.parse_raw(cached)
        
        cached = await self.redis.get(f"tenant:subdomain:{domain}")
        if cached:
            return TenantResponse.parse_raw(cached)
        
        return None

# Dependency injection
def get_current_tenant(request: Request) -> Optional[str]:
    """Get current tenant from request"""
    # Check subdomain
    host = request.headers.get("host", "")
    if "." in host:
        subdomain = host.split(".")[0]
        return subdomain
    
    # Check custom header
    return request.headers.get("x-tenant-id")

def get_tenant_service(db_session = Depends(get_db), redis_client = Depends(get_redis)) -> MultiTenancyService:
    """Get multi-tenancy service"""
    return MultiTenancyService(db_session, redis_client)