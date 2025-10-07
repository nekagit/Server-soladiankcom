"""
Advanced Enterprise API Management Service
Implements sophisticated API management features for enterprise clients
"""

import asyncio
import json
import logging
from typing import Dict, Any, Optional, List, Tuple, Union
from dataclasses import dataclass
from datetime import datetime, timedelta
from enum import Enum
import hashlib
import hmac
import base64
import uuid
from collections import defaultdict, deque
import redis.asyncio as redis
from fastapi import HTTPException, status
import jwt
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import rsa, padding
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.backends import default_backend

logger = logging.getLogger(__name__)

class APITier(Enum):
    """API access tiers"""
    FREE = "free"
    BASIC = "basic"
    PROFESSIONAL = "professional"
    ENTERPRISE = "enterprise"
    CUSTOM = "custom"

class RateLimitType(Enum):
    """Rate limit types"""
    REQUESTS_PER_MINUTE = "requests_per_minute"
    REQUESTS_PER_HOUR = "requests_per_hour"
    REQUESTS_PER_DAY = "requests_per_day"
    DATA_TRANSFER_MB = "data_transfer_mb"
    CONCURRENT_REQUESTS = "concurrent_requests"

class WebhookEventType(Enum):
    """Webhook event types"""
    NFT_LISTED = "nft.listed"
    NFT_SOLD = "nft.sold"
    NFT_UPDATED = "nft.updated"
    PRICE_CHANGED = "price.changed"
    USER_REGISTERED = "user.registered"
    TRANSACTION_COMPLETED = "transaction.completed"
    PAYMENT_RECEIVED = "payment.received"
    AUCTION_STARTED = "auction.started"
    AUCTION_ENDED = "auction.ended"

@dataclass
class APIKey:
    """API key information"""
    key_id: str
    key_value: str
    name: str
    description: str
    tier: APITier
    user_id: str
    permissions: List[str]
    rate_limits: Dict[RateLimitType, int]
    created_at: datetime
    last_used: Optional[datetime]
    expires_at: Optional[datetime]
    is_active: bool = True
    usage_count: int = 0
    last_ip: Optional[str] = None

@dataclass
class WebhookEndpoint:
    """Webhook endpoint configuration"""
    webhook_id: str
    name: str
    url: str
    events: List[WebhookEventType]
    secret: str
    user_id: str
    is_active: bool = True
    retry_count: int = 3
    timeout_seconds: int = 30
    created_at: datetime
    last_triggered: Optional[datetime] = None
    success_count: int = 0
    failure_count: int = 0

@dataclass
class APIAnalytics:
    """API analytics data"""
    key_id: str
    timestamp: datetime
    endpoint: str
    method: str
    status_code: int
    response_time_ms: float
    data_transferred_bytes: int
    ip_address: str
    user_agent: str
    error_message: Optional[str] = None

class AdvancedAPIManagementService:
    """Advanced API management service for enterprise clients"""
    
    def __init__(self, redis_url: str = "redis://localhost:6379"):
        self.redis_url = redis_url
        self.redis_client: Optional[redis.Redis] = None
        self.api_keys: Dict[str, APIKey] = {}
        self.webhook_endpoints: Dict[str, WebhookEndpoint] = {}
        self.rate_limit_cache: Dict[str, Dict[str, Any]] = {}
        self.analytics_data: List[APIAnalytics] = []
        
        # API tier configurations
        self.tier_configs = {
            APITier.FREE: {
                'requests_per_minute': 60,
                'requests_per_hour': 1000,
                'requests_per_day': 10000,
                'data_transfer_mb': 100,
                'concurrent_requests': 5,
                'features': ['basic_nft_data', 'price_quotes']
            },
            APITier.BASIC: {
                'requests_per_minute': 120,
                'requests_per_hour': 5000,
                'requests_per_day': 50000,
                'data_transfer_mb': 500,
                'concurrent_requests': 10,
                'features': ['basic_nft_data', 'price_quotes', 'user_data', 'transaction_history']
            },
            APITier.PROFESSIONAL: {
                'requests_per_minute': 300,
                'requests_per_hour': 20000,
                'requests_per_day': 200000,
                'data_transfer_mb': 2000,
                'concurrent_requests': 25,
                'features': ['all_basic', 'advanced_analytics', 'webhooks', 'real_time_data']
            },
            APITier.ENTERPRISE: {
                'requests_per_minute': 1000,
                'requests_per_hour': 100000,
                'requests_per_day': 1000000,
                'data_transfer_mb': 10000,
                'concurrent_requests': 100,
                'features': ['all_professional', 'custom_endpoints', 'dedicated_support', 'sla_guarantee']
            }
        }
        
    async def initialize(self):
        """Initialize the API management service"""
        try:
            self.redis_client = await redis.from_url(self.redis_url)
            await self._load_existing_data()
            logger.info("Advanced API management service initialized")
        except Exception as e:
            logger.error(f"Failed to initialize API management service: {str(e)}")
            
    async def close(self):
        """Close the API management service"""
        if self.redis_client:
            await self.redis_client.close()
            
    async def create_api_key(self, 
                           name: str,
                           description: str,
                           tier: APITier,
                           user_id: str,
                           permissions: List[str] = None,
                           custom_rate_limits: Dict[RateLimitType, int] = None,
                           expires_at: Optional[datetime] = None) -> Dict[str, Any]:
        """Create a new API key"""
        try:
            # Generate API key
            key_id = str(uuid.uuid4())
            key_value = self._generate_api_key()
            
            # Set default permissions
            if permissions is None:
                permissions = self.tier_configs[tier]['features'].copy()
                
            # Set rate limits
            rate_limits = self.tier_configs[tier].copy()
            if custom_rate_limits:
                rate_limits.update(custom_rate_limits)
                
            # Create API key object
            api_key = APIKey(
                key_id=key_id,
                key_value=key_value,
                name=name,
                description=description,
                tier=tier,
                user_id=user_id,
                permissions=permissions,
                rate_limits=rate_limits,
                created_at=datetime.utcnow(),
                expires_at=expires_at
            )
            
            # Store API key
            self.api_keys[key_id] = api_key
            await self._store_api_key(api_key)
            
            # Initialize rate limiting
            await self._initialize_rate_limiting(key_id)
            
            return {
                'success': True,
                'key_id': key_id,
                'key_value': key_value,
                'tier': tier.value,
                'permissions': permissions,
                'rate_limits': rate_limits,
                'created_at': api_key.created_at.isoformat()
            }
            
        except Exception as e:
            logger.error(f"Failed to create API key: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }
            
    async def validate_api_key(self, 
                             api_key: str,
                             endpoint: str,
                             method: str) -> Dict[str, Any]:
        """Validate API key and check rate limits"""
        try:
            # Find API key
            api_key_obj = None
            for key in self.api_keys.values():
                if key.key_value == api_key:
                    api_key_obj = key
                    break
                    
            if not api_key_obj:
                return {
                    'valid': False,
                    'error': 'Invalid API key'
                }
                
            # Check if key is active
            if not api_key_obj.is_active:
                return {
                    'valid': False,
                    'error': 'API key is inactive'
                }
                
            # Check expiration
            if api_key_obj.expires_at and datetime.utcnow() > api_key_obj.expires_at:
                return {
                    'valid': False,
                    'error': 'API key has expired'
                }
                
            # Check rate limits
            rate_limit_check = await self._check_rate_limits(api_key_obj.key_id, endpoint, method)
            if not rate_limit_check['allowed']:
                return {
                    'valid': False,
                    'error': 'Rate limit exceeded',
                    'retry_after': rate_limit_check.get('retry_after', 60)
                }
                
            # Check permissions
            if not self._check_permissions(api_key_obj, endpoint, method):
                return {
                    'valid': False,
                    'error': 'Insufficient permissions'
                }
                
            # Update usage
            await self._update_api_key_usage(api_key_obj.key_id, endpoint, method)
            
            return {
                'valid': True,
                'key_id': api_key_obj.key_id,
                'tier': api_key_obj.tier.value,
                'permissions': api_key_obj.permissions,
                'rate_limits': api_key_obj.rate_limits
            }
            
        except Exception as e:
            logger.error(f"Failed to validate API key: {str(e)}")
            return {
                'valid': False,
                'error': str(e)
            }
            
    async def create_webhook_endpoint(self, 
                                    name: str,
                                    url: str,
                                    events: List[WebhookEventType],
                                    user_id: str,
                                    secret: Optional[str] = None) -> Dict[str, Any]:
        """Create a new webhook endpoint"""
        try:
            # Generate webhook ID and secret
            webhook_id = str(uuid.uuid4())
            if not secret:
                secret = self._generate_webhook_secret()
                
            # Create webhook endpoint
            webhook = WebhookEndpoint(
                webhook_id=webhook_id,
                name=name,
                url=url,
                events=events,
                secret=secret,
                user_id=user_id,
                created_at=datetime.utcnow()
            )
            
            # Store webhook
            self.webhook_endpoints[webhook_id] = webhook
            await self._store_webhook_endpoint(webhook)
            
            return {
                'success': True,
                'webhook_id': webhook_id,
                'secret': secret,
                'events': [event.value for event in events],
                'created_at': webhook.created_at.isoformat()
            }
            
        except Exception as e:
            logger.error(f"Failed to create webhook endpoint: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }
            
    async def trigger_webhook(self, 
                            event_type: WebhookEventType,
                            data: Dict[str, Any]) -> Dict[str, Any]:
        """Trigger webhooks for an event"""
        try:
            triggered_webhooks = []
            
            # Find webhooks for this event
            for webhook in self.webhook_endpoints.values():
                if webhook.is_active and event_type in webhook.events:
                    # Prepare webhook payload
                    payload = {
                        'event_type': event_type.value,
                        'data': data,
                        'timestamp': datetime.utcnow().isoformat(),
                        'webhook_id': webhook.webhook_id
                    }
                    
                    # Sign payload
                    signature = self._sign_webhook_payload(payload, webhook.secret)
                    headers = {
                        'Content-Type': 'application/json',
                        'X-Webhook-Signature': signature,
                        'X-Webhook-Event': event_type.value
                    }
                    
                    # Send webhook
                    success = await self._send_webhook(webhook, payload, headers)
                    
                    # Update webhook statistics
                    if success:
                        webhook.success_count += 1
                    else:
                        webhook.failure_count += 1
                    webhook.last_triggered = datetime.utcnow()
                    
                    triggered_webhooks.append({
                        'webhook_id': webhook.webhook_id,
                        'url': webhook.url,
                        'success': success
                    })
                    
            return {
                'success': True,
                'event_type': event_type.value,
                'triggered_webhooks': triggered_webhooks,
                'total_webhooks': len(triggered_webhooks)
            }
            
        except Exception as e:
            logger.error(f"Failed to trigger webhooks: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }
            
    async def get_api_analytics(self, 
                              key_id: Optional[str] = None,
                              start_date: Optional[datetime] = None,
                              end_date: Optional[datetime] = None) -> Dict[str, Any]:
        """Get API analytics"""
        try:
            # Filter analytics data
            filtered_data = self.analytics_data
            
            if key_id:
                filtered_data = [d for d in filtered_data if d.key_id == key_id]
                
            if start_date:
                filtered_data = [d for d in filtered_data if d.timestamp >= start_date]
                
            if end_date:
                filtered_data = [d for d in filtered_data if d.timestamp <= end_date]
                
            # Calculate analytics
            total_requests = len(filtered_data)
            successful_requests = len([d for d in filtered_data if 200 <= d.status_code < 300])
            failed_requests = total_requests - successful_requests
            
            # Calculate response time statistics
            response_times = [d.response_time_ms for d in filtered_data]
            avg_response_time = sum(response_times) / len(response_times) if response_times else 0
            max_response_time = max(response_times) if response_times else 0
            min_response_time = min(response_times) if response_times else 0
            
            # Calculate data transfer
            total_data_transferred = sum(d.data_transferred_bytes for d in filtered_data)
            
            # Group by endpoint
            endpoint_stats = defaultdict(lambda: {'count': 0, 'success': 0, 'avg_time': 0})
            for data in filtered_data:
                endpoint_stats[data.endpoint]['count'] += 1
                if 200 <= data.status_code < 300:
                    endpoint_stats[data.endpoint]['success'] += 1
                endpoint_stats[data.endpoint]['avg_time'] += data.response_time_ms
                
            # Calculate success rates and average times
            for endpoint in endpoint_stats:
                stats = endpoint_stats[endpoint]
                stats['success_rate'] = stats['success'] / stats['count'] if stats['count'] > 0 else 0
                stats['avg_time'] = stats['avg_time'] / stats['count'] if stats['count'] > 0 else 0
                
            # Group by status code
            status_code_stats = defaultdict(int)
            for data in filtered_data:
                status_code_stats[data.status_code] += 1
                
            return {
                'success': True,
                'analytics': {
                    'total_requests': total_requests,
                    'successful_requests': successful_requests,
                    'failed_requests': failed_requests,
                    'success_rate': successful_requests / total_requests if total_requests > 0 else 0,
                    'avg_response_time_ms': avg_response_time,
                    'max_response_time_ms': max_response_time,
                    'min_response_time_ms': min_response_time,
                    'total_data_transferred_bytes': total_data_transferred,
                    'endpoint_stats': dict(endpoint_stats),
                    'status_code_stats': dict(status_code_stats)
                },
                'period': {
                    'start': start_date.isoformat() if start_date else None,
                    'end': end_date.isoformat() if end_date else None
                }
            }
            
        except Exception as e:
            logger.error(f"Failed to get API analytics: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }
            
    async def update_api_key(self, 
                           key_id: str,
                           updates: Dict[str, Any]) -> Dict[str, Any]:
        """Update API key configuration"""
        try:
            if key_id not in self.api_keys:
                return {
                    'success': False,
                    'error': 'API key not found'
                }
                
            api_key = self.api_keys[key_id]
            
            # Update allowed fields
            if 'name' in updates:
                api_key.name = updates['name']
            if 'description' in updates:
                api_key.description = updates['description']
            if 'permissions' in updates:
                api_key.permissions = updates['permissions']
            if 'rate_limits' in updates:
                api_key.rate_limits.update(updates['rate_limits'])
            if 'is_active' in updates:
                api_key.is_active = updates['is_active']
            if 'expires_at' in updates:
                api_key.expires_at = updates['expires_at']
                
            # Store updated API key
            await self._store_api_key(api_key)
            
            return {
                'success': True,
                'key_id': key_id,
                'updated_fields': list(updates.keys())
            }
            
        except Exception as e:
            logger.error(f"Failed to update API key: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }
            
    async def revoke_api_key(self, key_id: str) -> Dict[str, Any]:
        """Revoke an API key"""
        try:
            if key_id not in self.api_keys:
                return {
                    'success': False,
                    'error': 'API key not found'
                }
                
            # Deactivate API key
            self.api_keys[key_id].is_active = False
            
            # Remove from Redis
            await self._remove_api_key(key_id)
            
            return {
                'success': True,
                'key_id': key_id,
                'revoked_at': datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Failed to revoke API key: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }
            
    async def record_api_usage(self, 
                             key_id: str,
                             endpoint: str,
                             method: str,
                             status_code: int,
                             response_time_ms: float,
                             data_transferred_bytes: int,
                             ip_address: str,
                             user_agent: str,
                             error_message: Optional[str] = None):
        """Record API usage for analytics"""
        try:
            analytics = APIAnalytics(
                key_id=key_id,
                timestamp=datetime.utcnow(),
                endpoint=endpoint,
                method=method,
                status_code=status_code,
                response_time_ms=response_time_ms,
                data_transferred_bytes=data_transferred_bytes,
                ip_address=ip_address,
                user_agent=user_agent,
                error_message=error_message
            )
            
            self.analytics_data.append(analytics)
            
            # Store in Redis for persistence
            await self._store_analytics(analytics)
            
        except Exception as e:
            logger.error(f"Failed to record API usage: {str(e)}")
            
    def _generate_api_key(self) -> str:
        """Generate a secure API key"""
        # Generate random bytes
        random_bytes = uuid.uuid4().bytes + uuid.uuid4().bytes
        # Encode as base64 and remove padding
        api_key = base64.b64encode(random_bytes).decode('utf-8').rstrip('=')
        # Add prefix
        return f"sk_{api_key}"
        
    def _generate_webhook_secret(self) -> str:
        """Generate a webhook secret"""
        random_bytes = uuid.uuid4().bytes + uuid.uuid4().bytes
        return base64.b64encode(random_bytes).decode('utf-8').rstrip('=')
        
    def _sign_webhook_payload(self, payload: Dict[str, Any], secret: str) -> str:
        """Sign webhook payload with HMAC"""
        payload_str = json.dumps(payload, sort_keys=True)
        signature = hmac.new(
            secret.encode('utf-8'),
            payload_str.encode('utf-8'),
            hashes.SHA256()
        ).hexdigest()
        return f"sha256={signature}"
        
    async def _check_rate_limits(self, key_id: str, endpoint: str, method: str) -> Dict[str, Any]:
        """Check rate limits for API key"""
        try:
            if not self.redis_client:
                return {'allowed': True}
                
            api_key = self.api_keys[key_id]
            current_time = datetime.utcnow()
            
            # Check different rate limits
            for rate_type, limit in api_key.rate_limits.items():
                if rate_type == RateLimitType.REQUESTS_PER_MINUTE:
                    window = 60
                elif rate_type == RateLimitType.REQUESTS_PER_HOUR:
                    window = 3600
                elif rate_type == RateLimitType.REQUESTS_PER_DAY:
                    window = 86400
                else:
                    continue
                    
                # Create rate limit key
                rate_key = f"rate_limit:{key_id}:{rate_type.value}:{int(current_time.timestamp() // window)}"
                
                # Check current count
                current_count = await self.redis_client.get(rate_key)
                if current_count and int(current_count) >= limit:
                    return {
                        'allowed': False,
                        'retry_after': window - (int(current_time.timestamp()) % window)
                    }
                    
                # Increment counter
                await self.redis_client.incr(rate_key)
                await self.redis_client.expire(rate_key, window)
                
            return {'allowed': True}
            
        except Exception as e:
            logger.error(f"Failed to check rate limits: {str(e)}")
            return {'allowed': True}  # Allow on error
            
    def _check_permissions(self, api_key: APIKey, endpoint: str, method: str) -> bool:
        """Check if API key has permission for endpoint"""
        # Simple permission check - in reality would be more sophisticated
        required_permission = self._get_required_permission(endpoint, method)
        return required_permission in api_key.permissions
        
    def _get_required_permission(self, endpoint: str, method: str) -> str:
        """Get required permission for endpoint"""
        # Simple mapping - in reality would be more sophisticated
        if '/nft/' in endpoint:
            return 'basic_nft_data'
        elif '/user/' in endpoint:
            return 'user_data'
        elif '/analytics/' in endpoint:
            return 'advanced_analytics'
        else:
            return 'basic_nft_data'
            
    async def _update_api_key_usage(self, key_id: str, endpoint: str, method: str):
        """Update API key usage statistics"""
        try:
            api_key = self.api_keys[key_id]
            api_key.usage_count += 1
            api_key.last_used = datetime.utcnow()
            
            # Store updated API key
            await self._store_api_key(api_key)
            
        except Exception as e:
            logger.error(f"Failed to update API key usage: {str(e)}")
            
    async def _send_webhook(self, webhook: WebhookEndpoint, payload: Dict[str, Any], headers: Dict[str, str]) -> bool:
        """Send webhook request"""
        try:
            # Mock implementation - would use httpx or similar
            # import httpx
            # async with httpx.AsyncClient() as client:
            #     response = await client.post(webhook.url, json=payload, headers=headers, timeout=webhook.timeout_seconds)
            #     return response.status_code < 400
            
            # For now, return True (success)
            return True
            
        except Exception as e:
            logger.error(f"Failed to send webhook: {str(e)}")
            return False
            
    async def _initialize_rate_limiting(self, key_id: str):
        """Initialize rate limiting for API key"""
        # Rate limiting is handled in _check_rate_limits
        pass
        
    async def _load_existing_data(self):
        """Load existing data from Redis"""
        # Mock implementation - would load from Redis
        pass
        
    async def _store_api_key(self, api_key: APIKey):
        """Store API key in Redis"""
        if self.redis_client:
            key = f"api_key:{api_key.key_id}"
            data = {
                'key_id': api_key.key_id,
                'key_value': api_key.key_value,
                'name': api_key.name,
                'description': api_key.description,
                'tier': api_key.tier.value,
                'user_id': api_key.user_id,
                'permissions': json.dumps(api_key.permissions),
                'rate_limits': json.dumps({k.value: v for k, v in api_key.rate_limits.items()}),
                'created_at': api_key.created_at.isoformat(),
                'last_used': api_key.last_used.isoformat() if api_key.last_used else None,
                'expires_at': api_key.expires_at.isoformat() if api_key.expires_at else None,
                'is_active': api_key.is_active,
                'usage_count': api_key.usage_count,
                'last_ip': api_key.last_ip
            }
            await self.redis_client.hset(key, mapping=data)
            
    async def _store_webhook_endpoint(self, webhook: WebhookEndpoint):
        """Store webhook endpoint in Redis"""
        if self.redis_client:
            key = f"webhook:{webhook.webhook_id}"
            data = {
                'webhook_id': webhook.webhook_id,
                'name': webhook.name,
                'url': webhook.url,
                'events': json.dumps([e.value for e in webhook.events]),
                'secret': webhook.secret,
                'user_id': webhook.user_id,
                'is_active': webhook.is_active,
                'retry_count': webhook.retry_count,
                'timeout_seconds': webhook.timeout_seconds,
                'created_at': webhook.created_at.isoformat(),
                'last_triggered': webhook.last_triggered.isoformat() if webhook.last_triggered else None,
                'success_count': webhook.success_count,
                'failure_count': webhook.failure_count
            }
            await self.redis_client.hset(key, mapping=data)
            
    async def _store_analytics(self, analytics: APIAnalytics):
        """Store analytics data in Redis"""
        if self.redis_client:
            key = f"analytics:{analytics.key_id}:{int(analytics.timestamp.timestamp())}"
            data = {
                'key_id': analytics.key_id,
                'timestamp': analytics.timestamp.isoformat(),
                'endpoint': analytics.endpoint,
                'method': analytics.method,
                'status_code': analytics.status_code,
                'response_time_ms': analytics.response_time_ms,
                'data_transferred_bytes': analytics.data_transferred_bytes,
                'ip_address': analytics.ip_address,
                'user_agent': analytics.user_agent,
                'error_message': analytics.error_message
            }
            await self.redis_client.hset(key, mapping=data)
            await self.redis_client.expire(key, 86400 * 30)  # 30 days
            
    async def _remove_api_key(self, key_id: str):
        """Remove API key from Redis"""
        if self.redis_client:
            key = f"api_key:{key_id}"
            await self.redis_client.delete(key)

# Create singleton instance
advanced_api_management_service = AdvancedAPIManagementService()


