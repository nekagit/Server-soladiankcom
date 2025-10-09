"""
Multi-tenancy support for Soladia Enterprise
"""
from typing import Optional, List, Dict, Any
from sqlalchemy import Column, String, Integer, Boolean, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime
import uuid

Base = declarative_base()

class Tenant(Base):
    """Tenant model for multi-tenancy support"""
    __tablename__ = "tenants"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(255), nullable=False)
    slug = Column(String(100), unique=True, nullable=False)
    domain = Column(String(255), unique=True, nullable=True)
    subdomain = Column(String(100), unique=True, nullable=True)
    
    # Tenant configuration
    logo_url = Column(String(500), nullable=True)
    primary_color = Column(String(7), default="#E60012")
    secondary_color = Column(String(7), default="#0066CC")
    custom_css = Column(Text, nullable=True)
    custom_js = Column(Text, nullable=True)
    
    # Feature flags
    features = Column(Text, nullable=True)  # JSON string of enabled features
    max_users = Column(Integer, default=1000)
    max_listings = Column(Integer, default=10000)
    max_storage_gb = Column(Integer, default=100)
    
    # Billing and subscription
    subscription_plan = Column(String(50), default="basic")
    subscription_status = Column(String(20), default="active")
    billing_email = Column(String(255), nullable=True)
    
    # Status
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    users = relationship("TenantUser", back_populates="tenant")
    listings = relationship("TenantListing", back_populates="tenant")
    settings = relationship("TenantSettings", back_populates="tenant", uselist=False)

class TenantUser(Base):
    """User model with tenant association"""
    __tablename__ = "tenant_users"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id = Column(String, ForeignKey("tenants.id"), nullable=False)
    user_id = Column(String, nullable=False)  # Reference to main user table
    
    # Tenant-specific user data
    role = Column(String(50), default="user")
    permissions = Column(Text, nullable=True)  # JSON string of permissions
    is_active = Column(Boolean, default=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    tenant = relationship("Tenant", back_populates="users")

class TenantListing(Base):
    """Listing model with tenant association"""
    __tablename__ = "tenant_listings"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id = Column(String, ForeignKey("tenants.id"), nullable=False)
    listing_id = Column(String, nullable=False)  # Reference to main listing table
    
    # Tenant-specific listing data
    is_featured = Column(Boolean, default=False)
    custom_fields = Column(Text, nullable=True)  # JSON string of custom fields
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    tenant = relationship("Tenant", back_populates="listings")

class TenantSettings(Base):
    """Tenant-specific settings"""
    __tablename__ = "tenant_settings"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id = Column(String, ForeignKey("tenants.id"), nullable=False)
    
    # Marketplace settings
    marketplace_name = Column(String(255), nullable=True)
    marketplace_description = Column(Text, nullable=True)
    currency = Column(String(3), default="USD")
    timezone = Column(String(50), default="UTC")
    language = Column(String(5), default="en")
    
    # Payment settings
    payment_methods = Column(Text, nullable=True)  # JSON string of enabled payment methods
    fee_percentage = Column(Integer, default=250)  # 2.5% in basis points
    minimum_payout = Column(Integer, default=10000)  # $100 in cents
    
    # Solana settings
    solana_network = Column(String(20), default="mainnet-beta")
    solana_rpc_url = Column(String(500), nullable=True)
    solana_ws_url = Column(String(500), nullable=True)
    
    # API settings
    api_rate_limit = Column(Integer, default=1000)  # requests per hour
    webhook_url = Column(String(500), nullable=True)
    webhook_secret = Column(String(255), nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    tenant = relationship("Tenant", back_populates="settings")

class MultiTenancyService:
    """Service for managing multi-tenancy"""
    
    def __init__(self, db_session):
        self.db = db_session
    
    async def create_tenant(
        self,
        name: str,
        slug: str,
        domain: Optional[str] = None,
        subdomain: Optional[str] = None,
        **kwargs
    ) -> Tenant:
        """Create a new tenant"""
        tenant = Tenant(
            name=name,
            slug=slug,
            domain=domain,
            subdomain=subdomain,
            **kwargs
        )
        
        self.db.add(tenant)
        self.db.commit()
        self.db.refresh(tenant)
        
        # Create default settings
        settings = TenantSettings(tenant_id=tenant.id)
        self.db.add(settings)
        self.db.commit()
        
        return tenant
    
    async def get_tenant_by_domain(self, domain: str) -> Optional[Tenant]:
        """Get tenant by domain"""
        return self.db.query(Tenant).filter(
            Tenant.domain == domain,
            Tenant.is_active == True
        ).first()
    
    async def get_tenant_by_subdomain(self, subdomain: str) -> Optional[Tenant]:
        """Get tenant by subdomain"""
        return self.db.query(Tenant).filter(
            Tenant.subdomain == subdomain,
            Tenant.is_active == True
        ).first()
    
    async def get_tenant_by_slug(self, slug: str) -> Optional[Tenant]:
        """Get tenant by slug"""
        return self.db.query(Tenant).filter(
            Tenant.slug == slug,
            Tenant.is_active == True
        ).first()
    
    async def update_tenant_settings(
        self,
        tenant_id: str,
        settings_data: Dict[str, Any]
    ) -> TenantSettings:
        """Update tenant settings"""
        settings = self.db.query(TenantSettings).filter(
            TenantSettings.tenant_id == tenant_id
        ).first()
        
        if not settings:
            settings = TenantSettings(tenant_id=tenant_id)
            self.db.add(settings)
        
        for key, value in settings_data.items():
            if hasattr(settings, key):
                setattr(settings, key, value)
        
        self.db.commit()
        self.db.refresh(settings)
        
        return settings
    
    async def add_user_to_tenant(
        self,
        tenant_id: str,
        user_id: str,
        role: str = "user",
        permissions: Optional[List[str]] = None
    ) -> TenantUser:
        """Add user to tenant"""
        tenant_user = TenantUser(
            tenant_id=tenant_id,
            user_id=user_id,
            role=role,
            permissions=permissions
        )
        
        self.db.add(tenant_user)
        self.db.commit()
        self.db.refresh(tenant_user)
        
        return tenant_user
    
    async def get_tenant_users(self, tenant_id: str) -> List[TenantUser]:
        """Get all users for a tenant"""
        return self.db.query(TenantUser).filter(
            TenantUser.tenant_id == tenant_id,
            TenantUser.is_active == True
        ).all()
    
    async def get_user_tenants(self, user_id: str) -> List[Tenant]:
        """Get all tenants for a user"""
        tenant_users = self.db.query(TenantUser).filter(
            TenantUser.user_id == user_id,
            TenantUser.is_active == True
        ).all()
        
        tenant_ids = [tu.tenant_id for tu in tenant_users]
        return self.db.query(Tenant).filter(Tenant.id.in_(tenant_ids)).all()
    
    async def check_tenant_limits(self, tenant_id: str) -> Dict[str, Any]:
        """Check if tenant has exceeded limits"""
        tenant = self.db.query(Tenant).filter(Tenant.id == tenant_id).first()
        if not tenant:
            return {"error": "Tenant not found"}
        
        # Get current usage
        user_count = self.db.query(TenantUser).filter(
            TenantUser.tenant_id == tenant_id,
            TenantUser.is_active == True
        ).count()
        
        listing_count = self.db.query(TenantListing).filter(
            TenantListing.tenant_id == tenant_id
        ).count()
        
        # Check limits
        limits = {
            "users": {
                "current": user_count,
                "limit": tenant.max_users,
                "exceeded": user_count >= tenant.max_users
            },
            "listings": {
                "current": listing_count,
                "limit": tenant.max_listings,
                "exceeded": listing_count >= tenant.max_listings
            }
        }
        
        return limits
    
    async def get_tenant_analytics(self, tenant_id: str) -> Dict[str, Any]:
        """Get analytics for a tenant"""
        # This would integrate with the analytics service
        # For now, return mock data
        return {
            "total_users": 150,
            "active_users": 45,
            "total_listings": 320,
            "active_listings": 280,
            "total_revenue": 12500.50,
            "monthly_revenue": 2500.75,
            "conversion_rate": 3.2
        }
    
    async def update_tenant_subscription(
        self,
        tenant_id: str,
        plan: str,
        status: str
    ) -> Tenant:
        """Update tenant subscription"""
        tenant = self.db.query(Tenant).filter(Tenant.id == tenant_id).first()
        if not tenant:
            raise ValueError("Tenant not found")
        
        tenant.subscription_plan = plan
        tenant.subscription_status = status
        
        self.db.commit()
        self.db.refresh(tenant)
        
        return tenant