"""
Enterprise API Management for Soladia Marketplace
Implements API keys, rate limiting, webhooks, and enterprise integrations
"""

import hashlib
import hmac
import json
import time
import uuid
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass, asdict
from datetime import datetime, timezone, timedelta
from enum import Enum
import asyncio
import logging
import aiohttp
from collections import defaultdict, deque

logger = logging.getLogger(__name__)

class APIKeyStatus(Enum):
    """API key status"""
    ACTIVE = "active"
    INACTIVE = "inactive"
    SUSPENDED = "suspended"
    EXPIRED = "expired"

class WebhookEvent(Enum):
    """Webhook event types"""
    WALLET_CONNECTED = "wallet.connected"
    WALLET_DISCONNECTED = "wallet.disconnected"
    TRANSACTION_CREATED = "transaction.created"
    TRANSACTION_CONFIRMED = "transaction.confirmed"
    TRANSACTION_FAILED = "transaction.failed"
    NFT_MINTED = "nft.minted"
    NFT_LISTED = "nft.listed"
    NFT_SOLD = "nft.sold"
    NFT_DELISTED = "nft.delisted"
    AUCTION_CREATED = "auction.created"
    AUCTION_ENDED = "auction.ended"
    BID_PLACED = "bid.placed"
    USER_REGISTERED = "user.registered"
    USER_UPDATED = "user.updated"

class IntegrationType(Enum):
    """Integration types"""
    WEBHOOK = "webhook"
    API = "api"
    SDK = "sdk"
    PLUGIN = "plugin"

@dataclass
class APIKey:
    """API key data structure"""
    key_id: str
    user_id: str
    name: str
    key_hash: str
    permissions: List[str]
    rate_limit: int  # requests per minute
    status: APIKeyStatus
    created_at: str
    expires_at: Optional[str]
    last_used: Optional[str]
    usage_count: int
    metadata: Dict[str, Any]

@dataclass
class WebhookEndpoint:
    """Webhook endpoint data structure"""
    webhook_id: str
    user_id: str
    name: str
    url: str
    events: List[WebhookEvent]
    secret: str
    status: str
    created_at: str
    last_triggered: Optional[str]
    failure_count: int
    retry_policy: Dict[str, Any]

@dataclass
class RateLimit:
    """Rate limit data structure"""
    key_id: str
    requests: int
    window_start: float
    blocked_requests: int

@dataclass
class WebhookDelivery:
    """Webhook delivery data structure"""
    delivery_id: str
    webhook_id: str
    event_type: WebhookEvent
    payload: Dict[str, Any]
    status: str
    response_code: Optional[int]
    response_body: Optional[str]
    created_at: str
    delivered_at: Optional[str]
    retry_count: int

class APIKeyManager:
    """Manages API keys and authentication"""
    
    def __init__(self):
        self.api_keys: Dict[str, APIKey] = {}
        self.key_hashes: Dict[str, str] = {}  # hash -> key_id mapping
        self.rate_limits: Dict[str, RateLimit] = {}
    
    def generate_api_key(self, user_id: str, name: str, permissions: List[str], 
                        rate_limit: int = 1000, expires_days: Optional[int] = None) -> Tuple[str, APIKey]:
        """Generate a new API key"""
        try:
            # Generate unique key ID
            key_id = str(uuid.uuid4())
            
            # Generate API key
            api_key = f"sk_{hashlib.sha256(f'{key_id}{time.time()}'.encode()).hexdigest()[:32]}"
            key_hash = hashlib.sha256(api_key.encode()).hexdigest()
            
            # Calculate expiration
            expires_at = None
            if expires_days:
                expires_at = (datetime.now(timezone.utc) + timedelta(days=expires_days)).isoformat()
            
            # Create API key object
            api_key_obj = APIKey(
                key_id=key_id,
                user_id=user_id,
                name=name,
                key_hash=key_hash,
                permissions=permissions,
                rate_limit=rate_limit,
                status=APIKeyStatus.ACTIVE,
                created_at=datetime.now(timezone.utc).isoformat(),
                expires_at=expires_at,
                last_used=None,
                usage_count=0,
                metadata={}
            )
            
            # Store API key
            self.api_keys[key_id] = api_key_obj
            self.key_hashes[key_hash] = key_id
            
            logger.info(f"API key generated for user {user_id}: {key_id}")
            return api_key, api_key_obj
            
        except Exception as e:
            logger.error(f"Failed to generate API key: {str(e)}")
            raise Exception(f"Failed to generate API key: {str(e)}")
    
    def validate_api_key(self, api_key: str) -> Optional[APIKey]:
        """Validate API key and return key object"""
        try:
            key_hash = hashlib.sha256(api_key.encode()).hexdigest()
            key_id = self.key_hashes.get(key_hash)
            
            if not key_id:
                return None
            
            api_key_obj = self.api_keys.get(key_id)
            if not api_key_obj:
                return None
            
            # Check if key is active
            if api_key_obj.status != APIKeyStatus.ACTIVE:
                return None
            
            # Check if key is expired
            if api_key_obj.expires_at:
                expires_at = datetime.fromisoformat(api_key_obj.expires_at.replace('Z', '+00:00'))
                if datetime.now(timezone.utc) > expires_at:
                    api_key_obj.status = APIKeyStatus.EXPIRED
                    return None
            
            # Update usage
            api_key_obj.usage_count += 1
            api_key_obj.last_used = datetime.now(timezone.utc).isoformat()
            
            return api_key_obj
            
        except Exception as e:
            logger.error(f"Failed to validate API key: {str(e)}")
            return None
    
    def check_rate_limit(self, key_id: str) -> Tuple[bool, Dict[str, Any]]:
        """Check if API key is within rate limits"""
        try:
            current_time = time.time()
            api_key = self.api_keys.get(key_id)
            
            if not api_key:
                return False, {"error": "Invalid API key"}
            
            # Get or create rate limit record
            rate_limit = self.rate_limits.get(key_id)
            if not rate_limit:
                rate_limit = RateLimit(
                    key_id=key_id,
                    requests=0,
                    window_start=current_time,
                    blocked_requests=0
                )
                self.rate_limits[key_id] = rate_limit
            
            # Check if we're in a new time window
            window_duration = 60  # 1 minute
            if current_time - rate_limit.window_start >= window_duration:
                rate_limit.requests = 0
                rate_limit.window_start = current_time
                rate_limit.blocked_requests = 0
            
            # Check rate limit
            if rate_limit.requests >= api_key.rate_limit:
                rate_limit.blocked_requests += 1
                return False, {
                    "error": "Rate limit exceeded",
                    "limit": api_key.rate_limit,
                    "remaining": 0,
                    "reset_time": rate_limit.window_start + window_duration
                }
            
            # Increment request count
            rate_limit.requests += 1
            
            return True, {
                "limit": api_key.rate_limit,
                "remaining": api_key.rate_limit - rate_limit.requests,
                "reset_time": rate_limit.window_start + window_duration
            }
            
        except Exception as e:
            logger.error(f"Failed to check rate limit: {str(e)}")
            return False, {"error": "Rate limit check failed"}
    
    def revoke_api_key(self, key_id: str) -> bool:
        """Revoke an API key"""
        try:
            if key_id in self.api_keys:
                self.api_keys[key_id].status = APIKeyStatus.INACTIVE
                logger.info(f"API key revoked: {key_id}")
                return True
            return False
        except Exception as e:
            logger.error(f"Failed to revoke API key: {str(e)}")
            return False
    
    def get_user_api_keys(self, user_id: str) -> List[APIKey]:
        """Get all API keys for a user"""
        return [key for key in self.api_keys.values() if key.user_id == user_id]

class WebhookManager:
    """Manages webhook endpoints and deliveries"""
    
    def __init__(self):
        self.webhooks: Dict[str, WebhookEndpoint] = {}
        self.deliveries: List[WebhookDelivery] = []
        self.event_queue = asyncio.Queue()
    
    def create_webhook(self, user_id: str, name: str, url: str, 
                      events: List[WebhookEvent], retry_policy: Dict[str, Any] = None) -> WebhookEndpoint:
        """Create a new webhook endpoint"""
        try:
            webhook_id = str(uuid.uuid4())
            secret = hashlib.sha256(f'{webhook_id}{time.time()}'.encode()).hexdigest()[:32]
            
            webhook = WebhookEndpoint(
                webhook_id=webhook_id,
                user_id=user_id,
                name=name,
                url=url,
                events=events,
                secret=secret,
                status="active",
                created_at=datetime.now(timezone.utc).isoformat(),
                last_triggered=None,
                failure_count=0,
                retry_policy=retry_policy or {
                    "max_retries": 3,
                    "retry_delay": 60,
                    "backoff_multiplier": 2
                }
            )
            
            self.webhooks[webhook_id] = webhook
            logger.info(f"Webhook created: {webhook_id} for user {user_id}")
            return webhook
            
        except Exception as e:
            logger.error(f"Failed to create webhook: {str(e)}")
            raise Exception(f"Failed to create webhook: {str(e)}")
    
    async def trigger_webhook(self, event_type: WebhookEvent, payload: Dict[str, Any]) -> List[str]:
        """Trigger webhooks for an event"""
        try:
            triggered_webhooks = []
            
            for webhook in self.webhooks.values():
                if webhook.status != "active":
                    continue
                
                if event_type in webhook.events:
                    delivery_id = await self._deliver_webhook(webhook, event_type, payload)
                    if delivery_id:
                        triggered_webhooks.append(delivery_id)
                        webhook.last_triggered = datetime.now(timezone.utc).isoformat()
            
            logger.info(f"Triggered {len(triggered_webhooks)} webhooks for event {event_type.value}")
            return triggered_webhooks
            
        except Exception as e:
            logger.error(f"Failed to trigger webhooks: {str(e)}")
            return []
    
    async def _deliver_webhook(self, webhook: WebhookEndpoint, event_type: WebhookEvent, 
                              payload: Dict[str, Any]) -> Optional[str]:
        """Deliver webhook to endpoint"""
        try:
            delivery_id = str(uuid.uuid4())
            
            # Create webhook payload
            webhook_payload = {
                "id": delivery_id,
                "event": event_type.value,
                "data": payload,
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
            
            # Generate signature
            signature = self._generate_signature(webhook.secret, json.dumps(webhook_payload))
            
            # Create delivery record
            delivery = WebhookDelivery(
                delivery_id=delivery_id,
                webhook_id=webhook.webhook_id,
                event_type=event_type,
                payload=webhook_payload,
                status="pending",
                response_code=None,
                response_body=None,
                created_at=datetime.now(timezone.utc).isoformat(),
                delivered_at=None,
                retry_count=0
            )
            
            self.deliveries.append(delivery)
            
            # Send webhook
            success = await self._send_webhook(webhook, webhook_payload, signature, delivery)
            
            if success:
                delivery.status = "delivered"
                delivery.delivered_at = datetime.now(timezone.utc).isoformat()
            else:
                delivery.status = "failed"
                webhook.failure_count += 1
            
            return delivery_id
            
        except Exception as e:
            logger.error(f"Failed to deliver webhook: {str(e)}")
            return None
    
    async def _send_webhook(self, webhook: WebhookEndpoint, payload: Dict[str, Any], 
                           signature: str, delivery: WebhookDelivery) -> bool:
        """Send webhook HTTP request"""
        try:
            headers = {
                "Content-Type": "application/json",
                "X-Soladia-Signature": signature,
                "X-Soladia-Event": payload["event"],
                "X-Soladia-Delivery": delivery.delivery_id,
                "User-Agent": "Soladia-Webhook/1.0"
            }
            
            timeout = aiohttp.ClientTimeout(total=30)
            
            async with aiohttp.ClientSession(timeout=timeout) as session:
                async with session.post(
                    webhook.url,
                    json=payload,
                    headers=headers
                ) as response:
                    delivery.response_code = response.status
                    delivery.response_body = await response.text()
                    
                    return 200 <= response.status < 300
                    
        except Exception as e:
            logger.error(f"Webhook delivery failed: {str(e)}")
            delivery.response_body = str(e)
            return False
    
    def _generate_signature(self, secret: str, payload: str) -> str:
        """Generate webhook signature"""
        return hmac.new(
            secret.encode(),
            payload.encode(),
            hashlib.sha256
        ).hexdigest()
    
    def get_webhook_deliveries(self, webhook_id: str, limit: int = 100) -> List[WebhookDelivery]:
        """Get webhook delivery history"""
        deliveries = [d for d in self.deliveries if d.webhook_id == webhook_id]
        return sorted(deliveries, key=lambda x: x.created_at, reverse=True)[:limit]
    
    def get_user_webhooks(self, user_id: str) -> List[WebhookEndpoint]:
        """Get all webhooks for a user"""
        return [w for w in self.webhooks.values() if w.user_id == user_id]

class IntegrationManager:
    """Manages third-party integrations"""
    
    def __init__(self):
        self.integrations: Dict[str, Dict[str, Any]] = {}
        self.integration_templates = {
            "discord": {
                "name": "Discord Bot",
                "description": "Send notifications to Discord channels",
                "config": {
                    "webhook_url": {"type": "string", "required": True},
                    "channel_id": {"type": "string", "required": True}
                }
            },
            "slack": {
                "name": "Slack Integration",
                "description": "Send notifications to Slack channels",
                "config": {
                    "webhook_url": {"type": "string", "required": True},
                    "channel": {"type": "string", "required": True}
                }
            },
            "telegram": {
                "name": "Telegram Bot",
                "description": "Send notifications to Telegram channels",
                "config": {
                    "bot_token": {"type": "string", "required": True},
                    "chat_id": {"type": "string", "required": True}
                }
            },
            "email": {
                "name": "Email Notifications",
                "description": "Send email notifications",
                "config": {
                    "smtp_server": {"type": "string", "required": True},
                    "smtp_port": {"type": "number", "required": True},
                    "username": {"type": "string", "required": True},
                    "password": {"type": "string", "required": True}
                }
            }
        }
    
    def create_integration(self, user_id: str, integration_type: str, 
                          name: str, config: Dict[str, Any]) -> str:
        """Create a new integration"""
        try:
            if integration_type not in self.integration_templates:
                raise Exception(f"Unknown integration type: {integration_type}")
            
            integration_id = str(uuid.uuid4())
            
            # Validate configuration
            template = self.integration_templates[integration_type]
            self._validate_config(template["config"], config)
            
            integration = {
                "integration_id": integration_id,
                "user_id": user_id,
                "type": integration_type,
                "name": name,
                "config": config,
                "status": "active",
                "created_at": datetime.now(timezone.utc).isoformat(),
                "last_used": None,
                "usage_count": 0
            }
            
            self.integrations[integration_id] = integration
            logger.info(f"Integration created: {integration_id} ({integration_type})")
            return integration_id
            
        except Exception as e:
            logger.error(f"Failed to create integration: {str(e)}")
            raise Exception(f"Failed to create integration: {str(e)}")
    
    def _validate_config(self, template: Dict[str, Any], config: Dict[str, Any]) -> None:
        """Validate integration configuration"""
        for key, spec in template.items():
            if spec.get("required", False) and key not in config:
                raise Exception(f"Required configuration key missing: {key}")
            
            if key in config:
                expected_type = spec.get("type", "string")
                actual_type = type(config[key]).__name__
                
                if expected_type == "number" and actual_type not in ["int", "float"]:
                    raise Exception(f"Configuration key {key} must be a number")
                elif expected_type == "string" and actual_type != "str":
                    raise Exception(f"Configuration key {key} must be a string")
    
    async def execute_integration(self, integration_id: str, event_data: Dict[str, Any]) -> bool:
        """Execute an integration"""
        try:
            integration = self.integrations.get(integration_id)
            if not integration or integration["status"] != "active":
                return False
            
            integration_type = integration["type"]
            config = integration["config"]
            
            # Execute based on integration type
            if integration_type == "discord":
                return await self._execute_discord_integration(config, event_data)
            elif integration_type == "slack":
                return await self._execute_slack_integration(config, event_data)
            elif integration_type == "telegram":
                return await self._execute_telegram_integration(config, event_data)
            elif integration_type == "email":
                return await self._execute_email_integration(config, event_data)
            
            return False
            
        except Exception as e:
            logger.error(f"Failed to execute integration: {str(e)}")
            return False
    
    async def _execute_discord_integration(self, config: Dict[str, Any], event_data: Dict[str, Any]) -> bool:
        """Execute Discord integration"""
        try:
            webhook_url = config["webhook_url"]
            
            # Format message for Discord
            message = {
                "content": f"**{event_data.get('title', 'Soladia Event')}**",
                "embeds": [{
                    "title": event_data.get("title", "Event"),
                    "description": event_data.get("description", ""),
                    "color": 0x3b82f6,
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "fields": [
                        {"name": "Event Type", "value": event_data.get("event_type", "unknown"), "inline": True},
                        {"name": "User", "value": event_data.get("user_id", "unknown"), "inline": True}
                    ]
                }]
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.post(webhook_url, json=message) as response:
                    return response.status == 204
            
        except Exception as e:
            logger.error(f"Discord integration failed: {str(e)}")
            return False
    
    async def _execute_slack_integration(self, config: Dict[str, Any], event_data: Dict[str, Any]) -> bool:
        """Execute Slack integration"""
        try:
            webhook_url = config["webhook_url"]
            
            # Format message for Slack
            message = {
                "text": f"*{event_data.get('title', 'Soladia Event')}*",
                "blocks": [
                    {
                        "type": "section",
                        "text": {
                            "type": "mrkdwn",
                            "text": f"*{event_data.get('title', 'Event')}*\n{event_data.get('description', '')}"
                        }
                    }
                ]
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.post(webhook_url, json=message) as response:
                    return response.status == 200
            
        except Exception as e:
            logger.error(f"Slack integration failed: {str(e)}")
            return False
    
    async def _execute_telegram_integration(self, config: Dict[str, Any], event_data: Dict[str, Any]) -> bool:
        """Execute Telegram integration"""
        try:
            bot_token = config["bot_token"]
            chat_id = config["chat_id"]
            
            # Format message for Telegram
            text = f"*{event_data.get('title', 'Soladia Event')}*\n\n{event_data.get('description', '')}"
            
            url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
            data = {
                "chat_id": chat_id,
                "text": text,
                "parse_mode": "Markdown"
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.post(url, data=data) as response:
                    return response.status == 200
            
        except Exception as e:
            logger.error(f"Telegram integration failed: {str(e)}")
            return False
    
    async def _execute_email_integration(self, config: Dict[str, Any], event_data: Dict[str, Any]) -> bool:
        """Execute email integration"""
        try:
            # In a real implementation, this would send actual emails
            # For now, just log the email content
            logger.info(f"Email integration: {event_data.get('title', 'Event')}")
            return True
            
        except Exception as e:
            logger.error(f"Email integration failed: {str(e)}")
            return False
    
    def get_integration_templates(self) -> Dict[str, Any]:
        """Get available integration templates"""
        return self.integration_templates
    
    def get_user_integrations(self, user_id: str) -> List[Dict[str, Any]]:
        """Get all integrations for a user"""
        return [i for i in self.integrations.values() if i["user_id"] == user_id]

class EnterpriseService:
    """Main enterprise service that coordinates all enterprise features"""
    
    def __init__(self):
        self.api_key_manager = APIKeyManager()
        self.webhook_manager = WebhookManager()
        self.integration_manager = IntegrationManager()
    
    async def process_event(self, event_type: WebhookEvent, event_data: Dict[str, Any]) -> None:
        """Process an event and trigger all relevant webhooks and integrations"""
        try:
            # Trigger webhooks
            webhook_deliveries = await self.webhook_manager.trigger_webhook(event_type, event_data)
            
            # Execute integrations
            for integration in self.integration_manager.integrations.values():
                if integration["status"] == "active":
                    await self.integration_manager.execute_integration(
                        integration["integration_id"], event_data
                    )
            
            logger.info(f"Processed event {event_type.value}: {len(webhook_deliveries)} webhooks triggered")
            
        except Exception as e:
            logger.error(f"Failed to process event: {str(e)}")
    
    def get_enterprise_stats(self) -> Dict[str, Any]:
        """Get enterprise statistics"""
        return {
            "api_keys": {
                "total": len(self.api_key_manager.api_keys),
                "active": len([k for k in self.api_key_manager.api_keys.values() if k.status == APIKeyStatus.ACTIVE])
            },
            "webhooks": {
                "total": len(self.webhook_manager.webhooks),
                "active": len([w for w in self.webhook_manager.webhooks.values() if w.status == "active"])
            },
            "integrations": {
                "total": len(self.integration_manager.integrations),
                "active": len([i for i in self.integration_manager.integrations.values() if i["status"] == "active"])
            },
            "deliveries": {
                "total": len(self.webhook_manager.deliveries),
                "successful": len([d for d in self.webhook_manager.deliveries if d.status == "delivered"])
            }
        }
