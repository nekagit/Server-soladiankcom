"""
Enterprise Features for Soladia
Advanced enterprise-grade features including API management, webhooks, and analytics
"""

import asyncio
import logging
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, asdict
from datetime import datetime, timedelta
from enum import Enum
import json
import uuid
import hashlib
import hmac
from collections import defaultdict
import aiohttp
from fastapi import HTTPException, status
from pydantic import BaseModel, Field
import redis
import jwt
from cryptography.fernet import Fernet

logger = logging.getLogger(__name__)

class WebhookEvent(Enum):
    TRANSACTION_CREATED = "transaction.created"
    TRANSACTION_UPDATED = "transaction.updated"
    TRANSACTION_COMPLETED = "transaction.completed"
    TRANSACTION_FAILED = "transaction.failed"
    WALLET_CONNECTED = "wallet.connected"
    WALLET_DISCONNECTED = "wallet.disconnected"
    NFT_LISTED = "nft.listed"
    NFT_SOLD = "nft.sold"
    AUCTION_STARTED = "auction.started"
    AUCTION_ENDED = "auction.ended"
    PAYMENT_RECEIVED = "payment.received"
    PAYMENT_SENT = "payment.sent"

class APIKeyStatus(Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    SUSPENDED = "suspended"
    EXPIRED = "expired"

@dataclass
class APIKey:
    """API Key data structure"""
    key_id: str
    name: str
    key_hash: str
    permissions: List[str]
    rate_limit: int
    status: APIKeyStatus
    created_at: datetime
    expires_at: Optional[datetime]
    last_used: Optional[datetime]
    usage_count: int
    metadata: Dict[str, Any]

@dataclass
class Webhook:
    """Webhook data structure"""
    webhook_id: str
    url: str
    events: List[WebhookEvent]
    secret: str
    status: str
    created_at: datetime
    last_triggered: Optional[datetime]
    failure_count: int
    retry_count: int
    metadata: Dict[str, Any]

@dataclass
class EnterpriseUser:
    """Enterprise user data structure"""
    user_id: str
    company_name: str
    contact_email: str
    plan: str
    api_keys: List[str]
    webhooks: List[str]
    usage_limits: Dict[str, int]
    current_usage: Dict[str, int]
    billing_info: Dict[str, Any]
    created_at: datetime
    last_active: datetime

class EnterpriseAPI:
    """Enterprise API management system"""
    
    def __init__(self, redis_client: redis.Redis):
        self.redis_client = redis_client
        self.api_keys: Dict[str, APIKey] = {}
        self.webhooks: Dict[str, Webhook] = {}
        self.enterprise_users: Dict[str, EnterpriseUser] = {}
        self.usage_tracking: Dict[str, Dict[str, int]] = defaultdict(lambda: defaultdict(int))
        
    async def create_api_key(
        self,
        user_id: str,
        name: str,
        permissions: List[str],
        rate_limit: int = 1000,
        expires_days: Optional[int] = None
    ) -> Tuple[str, str]:
        """Create a new API key for enterprise user"""
        try:
            # Generate API key
            api_key = self._generate_api_key()
            key_hash = self._hash_api_key(api_key)
            key_id = str(uuid.uuid4())
            
            # Set expiration
            expires_at = None
            if expires_days:
                expires_at = datetime.now() + timedelta(days=expires_days)
            
            # Create API key object
            api_key_obj = APIKey(
                key_id=key_id,
                name=name,
                key_hash=key_hash,
                permissions=permissions,
                rate_limit=rate_limit,
                status=APIKeyStatus.ACTIVE,
                created_at=datetime.now(),
                expires_at=expires_at,
                last_used=None,
                usage_count=0,
                metadata={}
            )
            
            # Store API key
            self.api_keys[key_id] = api_key_obj
            
            # Store in Redis
            await self._store_api_key(key_id, api_key_obj)
            
            # Add to user's API keys
            if user_id in self.enterprise_users:
                self.enterprise_users[user_id].api_keys.append(key_id)
            
            logger.info(f"Created API key {key_id} for user {user_id}")
            return key_id, api_key
            
        except Exception as e:
            logger.error(f"Failed to create API key: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create API key"
            )
    
    async def validate_api_key(self, api_key: str) -> Optional[APIKey]:
        """Validate API key and return key information"""
        try:
            # Find API key by hash
            key_hash = self._hash_api_key(api_key)
            
            for key_id, key_obj in self.api_keys.items():
                if key_obj.key_hash == key_hash:
                    # Check if key is active and not expired
                    if key_obj.status != APIKeyStatus.ACTIVE:
                        return None
                    
                    if key_obj.expires_at and datetime.now() > key_obj.expires_at:
                        key_obj.status = APIKeyStatus.EXPIRED
                        return None
                    
                    # Update usage
                    key_obj.last_used = datetime.now()
                    key_obj.usage_count += 1
                    
                    return key_obj
            
            return None
            
        except Exception as e:
            logger.error(f"Failed to validate API key: {e}")
            return None
    
    async def revoke_api_key(self, key_id: str, user_id: str) -> bool:
        """Revoke an API key"""
        try:
            if key_id in self.api_keys:
                key_obj = self.api_keys[key_id]
                key_obj.status = APIKeyStatus.INACTIVE
                
                # Update in Redis
                await self._store_api_key(key_id, key_obj)
                
                # Remove from user's API keys
                if user_id in self.enterprise_users:
                    if key_id in self.enterprise_users[user_id].api_keys:
                        self.enterprise_users[user_id].api_keys.remove(key_id)
                
                logger.info(f"Revoked API key {key_id}")
                return True
            
            return False
            
        except Exception as e:
            logger.error(f"Failed to revoke API key: {e}")
            return False
    
    async def get_api_key_usage(self, key_id: str) -> Dict[str, Any]:
        """Get API key usage statistics"""
        try:
            if key_id not in self.api_keys:
                return {}
            
            key_obj = self.api_keys[key_id]
            
            # Get usage data from Redis
            usage_data = await self._get_api_key_usage(key_id)
            
            return {
                "key_id": key_id,
                "name": key_obj.name,
                "usage_count": key_obj.usage_count,
                "last_used": key_obj.last_used,
                "rate_limit": key_obj.rate_limit,
                "status": key_obj.status.value,
                "usage_data": usage_data
            }
            
        except Exception as e:
            logger.error(f"Failed to get API key usage: {e}")
            return {}
    
    async def create_webhook(
        self,
        user_id: str,
        url: str,
        events: List[WebhookEvent],
        secret: Optional[str] = None
    ) -> str:
        """Create a new webhook"""
        try:
            webhook_id = str(uuid.uuid4())
            
            # Generate secret if not provided
            if not secret:
                secret = self._generate_webhook_secret()
            
            # Create webhook object
            webhook = Webhook(
                webhook_id=webhook_id,
                url=url,
                events=events,
                secret=secret,
                status="active",
                created_at=datetime.now(),
                last_triggered=None,
                failure_count=0,
                retry_count=0,
                metadata={}
            )
            
            # Store webhook
            self.webhooks[webhook_id] = webhook
            
            # Store in Redis
            await self._store_webhook(webhook_id, webhook)
            
            # Add to user's webhooks
            if user_id in self.enterprise_users:
                self.enterprise_users[user_id].webhooks.append(webhook_id)
            
            logger.info(f"Created webhook {webhook_id} for user {user_id}")
            return webhook_id
            
        except Exception as e:
            logger.error(f"Failed to create webhook: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create webhook"
            )
    
    async def trigger_webhook(
        self,
        event: WebhookEvent,
        data: Dict[str, Any],
        user_id: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Trigger webhooks for a specific event"""
        try:
            triggered_webhooks = []
            
            for webhook_id, webhook in self.webhooks.items():
                # Check if webhook is active and handles this event
                if (webhook.status == "active" and 
                    event in webhook.events and
                    (user_id is None or webhook_id in self.enterprise_users.get(user_id, {}).get('webhooks', []))):
                    
                    # Trigger webhook
                    result = await self._send_webhook(webhook, event, data)
                    triggered_webhooks.append({
                        "webhook_id": webhook_id,
                        "url": webhook.url,
                        "status": result["status"],
                        "response_time": result["response_time"]
                    })
                    
                    # Update webhook stats
                    webhook.last_triggered = datetime.now()
                    if result["status"] == "success":
                        webhook.failure_count = 0
                    else:
                        webhook.failure_count += 1
                    
                    # Store updated webhook
                    await self._store_webhook(webhook_id, webhook)
            
            return triggered_webhooks
            
        except Exception as e:
            logger.error(f"Failed to trigger webhooks: {e}")
            return []
    
    async def _send_webhook(
        self,
        webhook: Webhook,
        event: WebhookEvent,
        data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Send webhook request"""
        try:
            # Prepare payload
            payload = {
                "event": event.value,
                "data": data,
                "timestamp": datetime.now().isoformat()
            }
            
            # Create signature
            signature = self._create_webhook_signature(webhook.secret, json.dumps(payload))
            
            # Send request
            headers = {
                "Content-Type": "application/json",
                "X-Soladia-Signature": signature,
                "X-Soladia-Event": event.value
            }
            
            start_time = datetime.now()
            
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    webhook.url,
                    json=payload,
                    headers=headers,
                    timeout=aiohttp.ClientTimeout(total=30)
                ) as response:
                    response_time = (datetime.now() - start_time).total_seconds()
                    
                    if response.status == 200:
                        return {
                            "status": "success",
                            "response_time": response_time,
                            "status_code": response.status
                        }
                    else:
                        return {
                            "status": "failed",
                            "response_time": response_time,
                            "status_code": response.status
                        }
                        
        except Exception as e:
            logger.error(f"Failed to send webhook: {e}")
            return {
                "status": "failed",
                "response_time": 0,
                "status_code": 0
            }
    
    async def get_enterprise_analytics(
        self,
        user_id: str,
        time_range: str = "30d"
    ) -> Dict[str, Any]:
        """Get enterprise analytics for a user"""
        try:
            if user_id not in self.enterprise_users:
                return {}
            
            user = self.enterprise_users[user_id]
            
            # Calculate time range
            if time_range == "7d":
                start_date = datetime.now() - timedelta(days=7)
            elif time_range == "30d":
                start_date = datetime.now() - timedelta(days=30)
            elif time_range == "90d":
                start_date = datetime.now() - timedelta(days=90)
            else:
                start_date = datetime.now() - timedelta(days=30)
            
            # Get usage data
            usage_data = await self._get_usage_data(user_id, start_date)
            
            # Get API key usage
            api_key_usage = {}
            for key_id in user.api_keys:
                if key_id in self.api_keys:
                    key_obj = self.api_keys[key_id]
                    api_key_usage[key_id] = {
                        "name": key_obj.name,
                        "usage_count": key_obj.usage_count,
                        "last_used": key_obj.last_used,
                        "status": key_obj.status.value
                    }
            
            # Get webhook usage
            webhook_usage = {}
            for webhook_id in user.webhooks:
                if webhook_id in self.webhooks:
                    webhook_obj = self.webhooks[webhook_id]
                    webhook_usage[webhook_id] = {
                        "url": webhook_obj.url,
                        "events": [event.value for event in webhook_obj.events],
                        "last_triggered": webhook_obj.last_triggered,
                        "failure_count": webhook_obj.failure_count
                    }
            
            return {
                "user_id": user_id,
                "company_name": user.company_name,
                "plan": user.plan,
                "time_range": time_range,
                "usage_data": usage_data,
                "api_key_usage": api_key_usage,
                "webhook_usage": webhook_usage,
                "limits": user.usage_limits,
                "current_usage": user.current_usage
            }
            
        except Exception as e:
            logger.error(f"Failed to get enterprise analytics: {e}")
            return {}
    
    async def create_enterprise_user(
        self,
        user_id: str,
        company_name: str,
        contact_email: str,
        plan: str = "basic"
    ) -> EnterpriseUser:
        """Create a new enterprise user"""
        try:
            # Define usage limits based on plan
            limits = {
                "basic": {"api_calls": 10000, "webhooks": 5, "users": 10},
                "professional": {"api_calls": 100000, "webhooks": 25, "users": 50},
                "enterprise": {"api_calls": 1000000, "webhooks": 100, "users": 500}
            }
            
            # Create enterprise user
            enterprise_user = EnterpriseUser(
                user_id=user_id,
                company_name=company_name,
                contact_email=contact_email,
                plan=plan,
                api_keys=[],
                webhooks=[],
                usage_limits=limits.get(plan, limits["basic"]),
                current_usage={"api_calls": 0, "webhooks": 0, "users": 1},
                billing_info={},
                created_at=datetime.now(),
                last_active=datetime.now()
            )
            
            # Store enterprise user
            self.enterprise_users[user_id] = enterprise_user
            
            # Store in Redis
            await self._store_enterprise_user(user_id, enterprise_user)
            
            logger.info(f"Created enterprise user {user_id}")
            return enterprise_user
            
        except Exception as e:
            logger.error(f"Failed to create enterprise user: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create enterprise user"
            )
    
    def _generate_api_key(self) -> str:
        """Generate a new API key"""
        return f"sk_{uuid.uuid4().hex}"
    
    def _hash_api_key(self, api_key: str) -> str:
        """Hash API key for storage"""
        return hashlib.sha256(api_key.encode()).hexdigest()
    
    def _generate_webhook_secret(self) -> str:
        """Generate webhook secret"""
        return f"whsec_{uuid.uuid4().hex}"
    
    def _create_webhook_signature(self, secret: str, payload: str) -> str:
        """Create webhook signature"""
        return hmac.new(
            secret.encode(),
            payload.encode(),
            hashlib.sha256
        ).hexdigest()
    
    async def _store_api_key(self, key_id: str, api_key: APIKey):
        """Store API key in Redis"""
        try:
            key_data = asdict(api_key)
            key_data['created_at'] = api_key.created_at.isoformat()
            key_data['expires_at'] = api_key.expires_at.isoformat() if api_key.expires_at else None
            key_data['last_used'] = api_key.last_used.isoformat() if api_key.last_used else None
            key_data['status'] = api_key.status.value
            
            await self.redis_client.hset(
                f"api_key:{key_id}",
                mapping=key_data
            )
        except Exception as e:
            logger.error(f"Failed to store API key: {e}")
    
    async def _store_webhook(self, webhook_id: str, webhook: Webhook):
        """Store webhook in Redis"""
        try:
            webhook_data = asdict(webhook)
            webhook_data['created_at'] = webhook.created_at.isoformat()
            webhook_data['last_triggered'] = webhook.last_triggered.isoformat() if webhook.last_triggered else None
            webhook_data['events'] = [event.value for event in webhook.events]
            
            await self.redis_client.hset(
                f"webhook:{webhook_id}",
                mapping=webhook_data
            )
        except Exception as e:
            logger.error(f"Failed to store webhook: {e}")
    
    async def _store_enterprise_user(self, user_id: str, user: EnterpriseUser):
        """Store enterprise user in Redis"""
        try:
            user_data = asdict(user)
            user_data['created_at'] = user.created_at.isoformat()
            user_data['last_active'] = user.last_active.isoformat()
            
            await self.redis_client.hset(
                f"enterprise_user:{user_id}",
                mapping=user_data
            )
        except Exception as e:
            logger.error(f"Failed to store enterprise user: {e}")
    
    async def _get_api_key_usage(self, key_id: str) -> Dict[str, Any]:
        """Get API key usage data from Redis"""
        try:
            usage_data = await self.redis_client.hgetall(f"api_key_usage:{key_id}")
            return {k.decode(): v.decode() for k, v in usage_data.items()}
        except Exception as e:
            logger.error(f"Failed to get API key usage: {e}")
            return {}
    
    async def _get_usage_data(self, user_id: str, start_date: datetime) -> Dict[str, Any]:
        """Get usage data for enterprise user"""
        try:
            # This would query actual usage data from the database
            # For now, return mock data
            return {
                "api_calls": 1250,
                "webhook_triggers": 45,
                "active_users": 12,
                "data_transfer": "2.5GB"
            }
        except Exception as e:
            logger.error(f"Failed to get usage data: {e}")
            return {}

class EnterpriseWebhookManager:
    """Webhook management system"""
    
    def __init__(self, enterprise_api: EnterpriseAPI):
        self.enterprise_api = enterprise_api
        self.webhook_queue = asyncio.Queue()
        self.worker_tasks = []
        
    async def start_workers(self, num_workers: int = 5):
        """Start webhook workers"""
        try:
            for i in range(num_workers):
                task = asyncio.create_task(self._webhook_worker(f"worker-{i}"))
                self.worker_tasks.append(task)
            
            logger.info(f"Started {num_workers} webhook workers")
        except Exception as e:
            logger.error(f"Failed to start webhook workers: {e}")
    
    async def _webhook_worker(self, worker_id: str):
        """Webhook worker process"""
        try:
            while True:
                try:
                    # Get webhook task from queue
                    webhook_task = await asyncio.wait_for(
                        self.webhook_queue.get(),
                        timeout=1.0
                    )
                    
                    # Process webhook
                    await self._process_webhook(webhook_task)
                    
                except asyncio.TimeoutError:
                    # No tasks available, continue
                    continue
                except Exception as e:
                    logger.error(f"Webhook worker {worker_id} error: {e}")
                    
        except Exception as e:
            logger.error(f"Webhook worker {worker_id} failed: {e}")
    
    async def _process_webhook(self, webhook_task: Dict[str, Any]):
        """Process a webhook task"""
        try:
            webhook_id = webhook_task["webhook_id"]
            event = webhook_task["event"]
            data = webhook_task["data"]
            
            # Get webhook
            if webhook_id in self.enterprise_api.webhooks:
                webhook = self.enterprise_api.webhooks[webhook_id]
                
                # Send webhook
                result = await self.enterprise_api._send_webhook(webhook, event, data)
                
                # Update webhook stats
                webhook.last_triggered = datetime.now()
                if result["status"] == "success":
                    webhook.failure_count = 0
                else:
                    webhook.failure_count += 1
                
                # Store updated webhook
                await self.enterprise_api._store_webhook(webhook_id, webhook)
                
        except Exception as e:
            logger.error(f"Failed to process webhook: {e}")
    
    async def queue_webhook(
        self,
        webhook_id: str,
        event: WebhookEvent,
        data: Dict[str, Any]
    ):
        """Queue a webhook for processing"""
        try:
            webhook_task = {
                "webhook_id": webhook_id,
                "event": event,
                "data": data,
                "timestamp": datetime.now().isoformat()
            }
            
            await self.webhook_queue.put(webhook_task)
            
        except Exception as e:
            logger.error(f"Failed to queue webhook: {e}")
    
    async def stop_workers(self):
        """Stop webhook workers"""
        try:
            for task in self.worker_tasks:
                task.cancel()
            
            self.worker_tasks.clear()
            logger.info("Stopped webhook workers")
        except Exception as e:
            logger.error(f"Failed to stop webhook workers: {e}")
