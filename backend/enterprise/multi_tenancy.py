"""
Multi-tenancy Service for Soladia Marketplace
Provides enterprise-grade multi-tenant architecture
"""

import asyncio
import json
import hashlib
import secrets
from typing import Dict, Any, Optional, List, Tuple
from dataclasses import dataclass
from datetime import datetime, timedelta
import logging
from enum import Enum
import uuid

logger = logging.getLogger(__name__)

class TenantTier(Enum):
    """Tenant subscription tiers"""
    FREE = "free"
    BASIC = "basic"
    PROFESSIONAL = "professional"
    ENTERPRISE = "enterprise"
    CUSTOM = "custom"

class TenantStatus(Enum):
    """Tenant status"""
    ACTIVE = "active"
    SUSPENDED = "suspended"
    PENDING = "pending"
    CANCELLED = "cancelled"

@dataclass
class TenantConfig:
    """Tenant configuration"""
    tenant_id: str
    name: str
    domain: str
    tier: TenantTier
    status: TenantStatus
    max_users: int
    max_storage: int  # in GB
    max_api_calls: int
    custom_domain: Optional[str] = None
    white_label: bool = False
    custom_branding: Optional[Dict[str, Any]] = None
    features: List[str] = None
    created_at: datetime = None
    updated_at: datetime = None

@dataclass
class TenantLimits:
    """Tenant usage limits and current usage"""
    max_users: int
    current_users: int
    max_storage: int
    current_storage: int
    max_api_calls: int
    current_api_calls: int
    max_nft_listings: int
    current_nft_listings: int
    max_transactions: int
    current_transactions: int

@dataclass
class TenantBilling:
    """Tenant billing information"""
    tenant_id: str
    subscription_id: str
    plan_name: str
    amount: float
    currency: str
    billing_cycle: str  # monthly, yearly
    next_billing_date: datetime
    payment_method: str
    status: str

class MultiTenancyService:
    """Multi-tenancy service for enterprise features"""
    
    def __init__(self, database_connection=None):
        self.db = database_connection
        self.tenant_cache = {}
        self.tenant_limits_cache = {}
        
    async def create_tenant(self, 
                           name: str,
                           domain: str,
                           tier: TenantTier = TenantTier.BASIC,
                           admin_user_id: str = None,
                           custom_config: Optional[Dict[str, Any]] = None) -> TenantConfig:
        """Create a new tenant"""
        try:
            tenant_id = str(uuid.uuid4())
            
            # Generate tenant-specific configuration
            tenant_config = TenantConfig(
                tenant_id=tenant_id,
                name=name,
                domain=domain,
                tier=tier,
                status=TenantStatus.PENDING,
                max_users=self._get_tier_limits(tier)['max_users'],
                max_storage=self._get_tier_limits(tier)['max_storage'],
                max_api_calls=self._get_tier_limits(tier)['max_api_calls'],
                features=self._get_tier_features(tier),
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            )
            
            # Apply custom configuration if provided
            if custom_config:
                tenant_config = self._apply_custom_config(tenant_config, custom_config)
            
            # Save tenant to database
            await self._save_tenant(tenant_config)
            
            # Initialize tenant limits
            await self._initialize_tenant_limits(tenant_id)
            
            # Create admin user if provided
            if admin_user_id:
                await self._create_tenant_admin(tenant_id, admin_user_id)
            
            # Cache tenant configuration
            self.tenant_cache[tenant_id] = tenant_config
            
            logger.info(f"Created tenant {tenant_id} for {name}")
            return tenant_config
            
        except Exception as e:
            logger.error(f"Failed to create tenant: {str(e)}")
            raise
            
    async def get_tenant(self, tenant_id: str) -> Optional[TenantConfig]:
        """Get tenant configuration"""
        try:
            # Check cache first
            if tenant_id in self.tenant_cache:
                return self.tenant_cache[tenant_id]
            
            # Load from database
            tenant_config = await self._load_tenant(tenant_id)
            if tenant_config:
                self.tenant_cache[tenant_id] = tenant_config
            
            return tenant_config
            
        except Exception as e:
            logger.error(f"Failed to get tenant {tenant_id}: {str(e)}")
            return None
            
    async def update_tenant(self, 
                           tenant_id: str,
                           updates: Dict[str, Any]) -> Optional[TenantConfig]:
        """Update tenant configuration"""
        try:
            tenant_config = await self.get_tenant(tenant_id)
            if not tenant_config:
                return None
            
            # Apply updates
            for key, value in updates.items():
                if hasattr(tenant_config, key):
                    setattr(tenant_config, key, value)
            
            tenant_config.updated_at = datetime.utcnow()
            
            # Save updated configuration
            await self._save_tenant(tenant_config)
            
            # Update cache
            self.tenant_cache[tenant_id] = tenant_config
            
            logger.info(f"Updated tenant {tenant_id}")
            return tenant_config
            
        except Exception as e:
            logger.error(f"Failed to update tenant {tenant_id}: {str(e)}")
            return None
            
    async def delete_tenant(self, tenant_id: str) -> bool:
        """Delete tenant and all associated data"""
        try:
            # Get tenant configuration
            tenant_config = await self.get_tenant(tenant_id)
            if not tenant_config:
                return False
            
            # Soft delete - mark as cancelled
            tenant_config.status = TenantStatus.CANCELLED
            tenant_config.updated_at = datetime.utcnow()
            
            await self._save_tenant(tenant_config)
            
            # Remove from cache
            if tenant_id in self.tenant_cache:
                del self.tenant_cache[tenant_id]
            
            # Clean up tenant data (implement based on requirements)
            await self._cleanup_tenant_data(tenant_id)
            
            logger.info(f"Deleted tenant {tenant_id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to delete tenant {tenant_id}: {str(e)}")
            return False
            
    async def get_tenant_limits(self, tenant_id: str) -> Optional[TenantLimits]:
        """Get tenant usage limits and current usage"""
        try:
            # Check cache first
            if tenant_id in self.tenant_limits_cache:
                return self.tenant_limits_cache[tenant_id]
            
            # Get tenant configuration
            tenant_config = await self.get_tenant(tenant_id)
            if not tenant_config:
                return None
            
            # Get current usage
            current_usage = await self._get_tenant_usage(tenant_id)
            
            # Create limits object
            limits = TenantLimits(
                max_users=tenant_config.max_users,
                current_users=current_usage.get('users', 0),
                max_storage=tenant_config.max_storage,
                current_storage=current_usage.get('storage', 0),
                max_api_calls=tenant_config.max_api_calls,
                current_api_calls=current_usage.get('api_calls', 0),
                max_nft_listings=self._get_tier_limits(tenant_config.tier)['max_nft_listings'],
                current_nft_listings=current_usage.get('nft_listings', 0),
                max_transactions=self._get_tier_limits(tenant_config.tier)['max_transactions'],
                current_transactions=current_usage.get('transactions', 0)
            )
            
            # Cache limits
            self.tenant_limits_cache[tenant_id] = limits
            
            return limits
            
        except Exception as e:
            logger.error(f"Failed to get tenant limits {tenant_id}: {str(e)}")
            return None
            
    async def check_tenant_limit(self, 
                                tenant_id: str,
                                limit_type: str,
                                increment: int = 1) -> bool:
        """Check if tenant can perform an action within limits"""
        try:
            limits = await self.get_tenant_limits(tenant_id)
            if not limits:
                return False
            
            # Check specific limit
            if limit_type == 'users':
                return limits.current_users + increment <= limits.max_users
            elif limit_type == 'storage':
                return limits.current_storage + increment <= limits.max_storage
            elif limit_type == 'api_calls':
                return limits.current_api_calls + increment <= limits.max_api_calls
            elif limit_type == 'nft_listings':
                return limits.current_nft_listings + increment <= limits.max_nft_listings
            elif limit_type == 'transactions':
                return limits.current_transactions + increment <= limits.max_transactions
            else:
                return False
                
        except Exception as e:
            logger.error(f"Failed to check tenant limit {tenant_id}: {str(e)}")
            return False
            
    async def increment_tenant_usage(self, 
                                   tenant_id: str,
                                   usage_type: str,
                                   amount: int = 1) -> bool:
        """Increment tenant usage counter"""
        try:
            # Check if within limits
            if not await self.check_tenant_limit(tenant_id, usage_type, amount):
                return False
            
            # Increment usage
            await self._increment_usage(tenant_id, usage_type, amount)
            
            # Clear cache to force refresh
            if tenant_id in self.tenant_limits_cache:
                del self.tenant_limits_cache[tenant_id]
            
            return True
            
        except Exception as e:
            logger.error(f"Failed to increment tenant usage {tenant_id}: {str(e)}")
            return False
            
    async def upgrade_tenant_tier(self, 
                                 tenant_id: str,
                                 new_tier: TenantTier) -> bool:
        """Upgrade tenant to new tier"""
        try:
            tenant_config = await self.get_tenant(tenant_id)
            if not tenant_config:
                return False
            
            # Update tier and limits
            tenant_config.tier = new_tier
            tenant_config.max_users = self._get_tier_limits(new_tier)['max_users']
            tenant_config.max_storage = self._get_tier_limits(new_tier)['max_storage']
            tenant_config.max_api_calls = self._get_tier_limits(new_tier)['max_api_calls']
            tenant_config.features = self._get_tier_features(new_tier)
            tenant_config.updated_at = datetime.utcnow()
            
            # Save updated configuration
            await self._save_tenant(tenant_config)
            
            # Update cache
            self.tenant_cache[tenant_id] = tenant_config
            
            # Clear limits cache
            if tenant_id in self.tenant_limits_cache:
                del self.tenant_limits_cache[tenant_id]
            
            logger.info(f"Upgraded tenant {tenant_id} to {new_tier.value}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to upgrade tenant {tenant_id}: {str(e)}")
            return False
            
    async def get_tenant_billing(self, tenant_id: str) -> Optional[TenantBilling]:
        """Get tenant billing information"""
        try:
            # Load billing information from database
            billing_data = await self._load_tenant_billing(tenant_id)
            if not billing_data:
                return None
            
            return TenantBilling(
                tenant_id=billing_data['tenant_id'],
                subscription_id=billing_data['subscription_id'],
                plan_name=billing_data['plan_name'],
                amount=billing_data['amount'],
                currency=billing_data['currency'],
                billing_cycle=billing_data['billing_cycle'],
                next_billing_date=datetime.fromisoformat(billing_data['next_billing_date']),
                payment_method=billing_data['payment_method'],
                status=billing_data['status']
            )
            
        except Exception as e:
            logger.error(f"Failed to get tenant billing {tenant_id}: {str(e)}")
            return None
            
    async def update_tenant_billing(self, 
                                   tenant_id: str,
                                   billing_data: Dict[str, Any]) -> bool:
        """Update tenant billing information"""
        try:
            # Save billing information to database
            await self._save_tenant_billing(tenant_id, billing_data)
            
            logger.info(f"Updated billing for tenant {tenant_id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to update tenant billing {tenant_id}: {str(e)}")
            return False
            
    async def get_tenant_analytics(self, tenant_id: str) -> Dict[str, Any]:
        """Get tenant-specific analytics"""
        try:
            # Get tenant configuration
            tenant_config = await self.get_tenant(tenant_id)
            if not tenant_config:
                return {}
            
            # Get usage statistics
            usage_stats = await self._get_tenant_usage_stats(tenant_id)
            
            # Get performance metrics
            performance_metrics = await self._get_tenant_performance(tenant_id)
            
            # Get user activity
            user_activity = await self._get_tenant_user_activity(tenant_id)
            
            return {
                'tenant_id': tenant_id,
                'tenant_name': tenant_config.name,
                'tier': tenant_config.tier.value,
                'status': tenant_config.status.value,
                'usage_stats': usage_stats,
                'performance_metrics': performance_metrics,
                'user_activity': user_activity,
                'generated_at': datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Failed to get tenant analytics {tenant_id}: {str(e)}")
            return {}
            
    def _get_tier_limits(self, tier: TenantTier) -> Dict[str, int]:
        """Get limits for tenant tier"""
        limits = {
            TenantTier.FREE: {
                'max_users': 5,
                'max_storage': 1,  # GB
                'max_api_calls': 1000,
                'max_nft_listings': 10,
                'max_transactions': 100
            },
            TenantTier.BASIC: {
                'max_users': 25,
                'max_storage': 10,
                'max_api_calls': 10000,
                'max_nft_listings': 100,
                'max_transactions': 1000
            },
            TenantTier.PROFESSIONAL: {
                'max_users': 100,
                'max_storage': 50,
                'max_api_calls': 100000,
                'max_nft_listings': 1000,
                'max_transactions': 10000
            },
            TenantTier.ENTERPRISE: {
                'max_users': 1000,
                'max_storage': 500,
                'max_api_calls': 1000000,
                'max_nft_listings': 10000,
                'max_transactions': 100000
            },
            TenantTier.CUSTOM: {
                'max_users': 999999,
                'max_storage': 999999,
                'max_api_calls': 999999999,
                'max_nft_listings': 999999,
                'max_transactions': 999999
            }
        }
        
        return limits.get(tier, limits[TenantTier.FREE])
        
    def _get_tier_features(self, tier: TenantTier) -> List[str]:
        """Get features for tenant tier"""
        features = {
            TenantTier.FREE: [
                'basic_nft_marketplace',
                'wallet_integration',
                'basic_analytics'
            ],
            TenantTier.BASIC: [
                'basic_nft_marketplace',
                'wallet_integration',
                'basic_analytics',
                'api_access',
                'custom_branding'
            ],
            TenantTier.PROFESSIONAL: [
                'advanced_nft_marketplace',
                'multi_wallet_support',
                'advanced_analytics',
                'api_access',
                'custom_branding',
                'webhooks',
                'priority_support'
            ],
            TenantTier.ENTERPRISE: [
                'full_nft_marketplace',
                'multi_wallet_support',
                'advanced_analytics',
                'unlimited_api_access',
                'white_label',
                'custom_domain',
                'webhooks',
                'dedicated_support',
                'custom_integrations',
                'sla_guarantee'
            ],
            TenantTier.CUSTOM: [
                'all_features',
                'custom_development',
                'dedicated_infrastructure',
                'custom_sla'
            ]
        }
        
        return features.get(tier, features[TenantTier.FREE])
        
    def _apply_custom_config(self, 
                           tenant_config: TenantConfig,
                           custom_config: Dict[str, Any]) -> TenantConfig:
        """Apply custom configuration to tenant"""
        for key, value in custom_config.items():
            if hasattr(tenant_config, key):
                setattr(tenant_config, key, value)
        
        return tenant_config
        
    # Database operations (implement based on your database)
    async def _save_tenant(self, tenant_config: TenantConfig) -> None:
        """Save tenant configuration to database"""
        # Implementation depends on your database
        pass
        
    async def _load_tenant(self, tenant_id: str) -> Optional[TenantConfig]:
        """Load tenant configuration from database"""
        # Implementation depends on your database
        return None
        
    async def _initialize_tenant_limits(self, tenant_id: str) -> None:
        """Initialize tenant usage limits"""
        # Implementation depends on your database
        pass
        
    async def _create_tenant_admin(self, tenant_id: str, admin_user_id: str) -> None:
        """Create tenant admin user"""
        # Implementation depends on your database
        pass
        
    async def _cleanup_tenant_data(self, tenant_id: str) -> None:
        """Clean up tenant data after deletion"""
        # Implementation depends on your database
        pass
        
    async def _get_tenant_usage(self, tenant_id: str) -> Dict[str, int]:
        """Get current tenant usage"""
        # Implementation depends on your database
        return {}
        
    async def _increment_usage(self, tenant_id: str, usage_type: str, amount: int) -> None:
        """Increment tenant usage counter"""
        # Implementation depends on your database
        pass
        
    async def _load_tenant_billing(self, tenant_id: str) -> Optional[Dict[str, Any]]:
        """Load tenant billing information"""
        # Implementation depends on your database
        return None
        
    async def _save_tenant_billing(self, tenant_id: str, billing_data: Dict[str, Any]) -> None:
        """Save tenant billing information"""
        # Implementation depends on your database
        pass
        
    async def _get_tenant_usage_stats(self, tenant_id: str) -> Dict[str, Any]:
        """Get tenant usage statistics"""
        # Implementation depends on your database
        return {}
        
    async def _get_tenant_performance(self, tenant_id: str) -> Dict[str, Any]:
        """Get tenant performance metrics"""
        # Implementation depends on your database
        return {}
        
    async def _get_tenant_user_activity(self, tenant_id: str) -> Dict[str, Any]:
        """Get tenant user activity"""
        # Implementation depends on your database
        return {}

# Create singleton instance
multi_tenancy_service = MultiTenancyService()


