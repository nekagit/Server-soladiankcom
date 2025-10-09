"""
Advanced WebSocket Service
Implements sophisticated real-time features for the marketplace
"""

import asyncio
import json
import logging
from typing import Dict, Any, Optional, List, Set, Callable
from dataclasses import dataclass, asdict
from datetime import datetime, timedelta
from enum import Enum
import uuid
from fastapi import WebSocket, WebSocketDisconnect
from fastapi.websockets import WebSocketState
import redis.asyncio as redis
from collections import defaultdict, deque
import hashlib

logger = logging.getLogger(__name__)

class EventType(Enum):
    """Types of real-time events"""
    NFT_LISTED = "nft_listed"
    NFT_SOLD = "nft_sold"
    NFT_UPDATED = "nft_updated"
    PRICE_CHANGED = "price_changed"
    BID_PLACED = "bid_placed"
    AUCTION_ENDED = "auction_ended"
    USER_ACTIVITY = "user_activity"
    MARKET_UPDATE = "market_update"
    SOCIAL_ACTIVITY = "social_activity"
    SYSTEM_NOTIFICATION = "system_notification"

class SubscriptionType(Enum):
    """Types of subscriptions"""
    USER_SPECIFIC = "user_specific"
    NFT_SPECIFIC = "nft_specific"
    COLLECTION_SPECIFIC = "collection_specific"
    CATEGORY_SPECIFIC = "category_specific"
    GLOBAL = "global"
    MARKET_DATA = "market_data"
    SOCIAL_FEED = "social_feed"

@dataclass
class WebSocketEvent:
    """WebSocket event structure"""
    event_id: str
    event_type: EventType
    data: Dict[str, Any]
    timestamp: datetime
    user_id: Optional[str] = None
    nft_id: Optional[str] = None
    collection_id: Optional[str] = None
    category: Optional[str] = None
    priority: int = 1  # 1=low, 2=medium, 3=high, 4=critical

@dataclass
class WebSocketConnection:
    """WebSocket connection metadata"""
    connection_id: str
    websocket: WebSocket
    user_id: Optional[str]
    subscriptions: Set[SubscriptionType]
    last_activity: datetime
    ip_address: str
    user_agent: str
    is_authenticated: bool = False

class AdvancedWebSocketService:
    """Advanced WebSocket service with sophisticated features"""
    
    def __init__(self, redis_url: str = "redis://localhost:6379"):
        self.redis_url = redis_url
        self.redis_client: Optional[redis.Redis] = None
        self.active_connections: Dict[str, WebSocketConnection] = {}
        self.subscription_groups: Dict[SubscriptionType, Set[str]] = defaultdict(set)
        self.event_handlers: Dict[EventType, List[Callable]] = defaultdict(list)
        self.event_queue: deque = deque(maxlen=10000)
        self.rate_limits: Dict[str, Dict[str, Any]] = {}
        self.message_history: Dict[str, deque] = defaultdict(lambda: deque(maxlen=100))
        
        # Performance metrics
        self.metrics = {
            'total_connections': 0,
            'active_connections': 0,
            'messages_sent': 0,
            'messages_received': 0,
            'events_processed': 0,
            'subscriptions_created': 0
        }
        
    async def initialize(self):
        """Initialize the WebSocket service"""
        try:
            self.redis_client = await redis.from_url(self.redis_url)
            await self._setup_event_handlers()
            await self._start_background_tasks()
            logger.info("Advanced WebSocket service initialized")
        except Exception as e:
            logger.error(f"Failed to initialize WebSocket service: {str(e)}")
            
    async def close(self):
        """Close the WebSocket service"""
        if self.redis_client:
            await self.redis_client.close()
            
    async def connect(self, websocket: WebSocket, user_id: Optional[str] = None, 
                     ip_address: str = "unknown", user_agent: str = "unknown") -> str:
        """Accept a new WebSocket connection"""
        try:
            await websocket.accept()
            
            connection_id = str(uuid.uuid4())
            connection = WebSocketConnection(
                connection_id=connection_id,
                websocket=websocket,
                user_id=user_id,
                subscriptions=set(),
                last_activity=datetime.utcnow(),
                ip_address=ip_address,
                user_agent=user_agent,
                is_authenticated=user_id is not None
            )
            
            self.active_connections[connection_id] = connection
            self.metrics['total_connections'] += 1
            self.metrics['active_connections'] += 1
            
            # Send welcome message
            await self._send_to_connection(connection_id, {
                'type': 'connection_established',
                'connection_id': connection_id,
                'timestamp': datetime.utcnow().isoformat(),
                'features': {
                    'real_time_updates': True,
                    'ai_recommendations': True,
                    'social_feed': True,
                    'market_analytics': True
                }
            })
            
            logger.info(f"WebSocket connection established: {connection_id}")
            return connection_id
            
        except Exception as e:
            logger.error(f"Failed to establish WebSocket connection: {str(e)}")
            raise
            
    async def disconnect(self, connection_id: str):
        """Disconnect a WebSocket connection"""
        try:
            if connection_id in self.active_connections:
                connection = self.active_connections[connection_id]
                
                # Remove from subscription groups
                for subscription_type in connection.subscriptions:
                    self.subscription_groups[subscription_type].discard(connection_id)
                    
                # Close WebSocket
                if connection.websocket.client_state == WebSocketState.CONNECTED:
                    await connection.websocket.close()
                    
                del self.active_connections[connection_id]
                self.metrics['active_connections'] -= 1
                
                logger.info(f"WebSocket connection closed: {connection_id}")
                
        except Exception as e:
            logger.error(f"Failed to close WebSocket connection: {str(e)}")
            
    async def subscribe(self, connection_id: str, subscription_type: SubscriptionType, 
                      target_id: Optional[str] = None) -> bool:
        """Subscribe to a specific type of events"""
        try:
            if connection_id not in self.active_connections:
                return False
                
            connection = self.active_connections[connection_id]
            connection.subscriptions.add(subscription_type)
            
            # Add to subscription group
            self.subscription_groups[subscription_type].add(connection_id)
            
            # Store subscription metadata
            subscription_key = f"subscription:{connection_id}:{subscription_type.value}"
            if target_id:
                subscription_key += f":{target_id}"
                
            await self.redis_client.hset(subscription_key, mapping={
                'connection_id': connection_id,
                'subscription_type': subscription_type.value,
                'target_id': target_id or '',
                'created_at': datetime.utcnow().isoformat()
            })
            
            self.metrics['subscriptions_created'] += 1
            
            # Send subscription confirmation
            await self._send_to_connection(connection_id, {
                'type': 'subscription_created',
                'subscription_type': subscription_type.value,
                'target_id': target_id,
                'timestamp': datetime.utcnow().isoformat()
            })
            
            logger.info(f"Subscription created: {connection_id} -> {subscription_type.value}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to create subscription: {str(e)}")
            return False
            
    async def unsubscribe(self, connection_id: str, subscription_type: SubscriptionType) -> bool:
        """Unsubscribe from a specific type of events"""
        try:
            if connection_id not in self.active_connections:
                return False
                
            connection = self.active_connections[connection_id]
            connection.subscriptions.discard(subscription_type)
            
            # Remove from subscription group
            self.subscription_groups[subscription_type].discard(connection_id)
            
            # Remove subscription metadata
            subscription_key = f"subscription:{connection_id}:{subscription_type.value}"
            await self.redis_client.delete(subscription_key)
            
            # Send unsubscription confirmation
            await self._send_to_connection(connection_id, {
                'type': 'subscription_removed',
                'subscription_type': subscription_type.value,
                'timestamp': datetime.utcnow().isoformat()
            })
            
            logger.info(f"Subscription removed: {connection_id} -> {subscription_type.value}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to remove subscription: {str(e)}")
            return False
            
    async def broadcast_event(self, event: WebSocketEvent):
        """Broadcast an event to relevant subscribers"""
        try:
            # Add to event queue
            self.event_queue.append(event)
            self.metrics['events_processed'] += 1
            
            # Determine target connections based on event type and data
            target_connections = await self._get_target_connections(event)
            
            # Send event to target connections
            for connection_id in target_connections:
                await self._send_to_connection(connection_id, {
                    'type': 'event',
                    'event_type': event.event_type.value,
                    'event_id': event.event_id,
                    'data': event.data,
                    'timestamp': event.timestamp.isoformat(),
                    'priority': event.priority
                })
                
            # Store event in Redis for persistence
            await self._store_event(event)
            
            logger.debug(f"Event broadcasted: {event.event_type.value} to {len(target_connections)} connections")
            
        except Exception as e:
            logger.error(f"Failed to broadcast event: {str(e)}")
            
    async def send_to_user(self, user_id: str, event_type: EventType, data: Dict[str, Any]):
        """Send an event to a specific user"""
        try:
            # Find connections for the user
            user_connections = [
                conn_id for conn_id, conn in self.active_connections.items()
                if conn.user_id == user_id
            ]
            
            if not user_connections:
                return
                
            event = WebSocketEvent(
                event_id=str(uuid.uuid4()),
                event_type=event_type,
                data=data,
                timestamp=datetime.utcnow(),
                user_id=user_id
            )
            
            for connection_id in user_connections:
                await self._send_to_connection(connection_id, {
                    'type': 'event',
                    'event_type': event.event_type.value,
                    'event_id': event.event_id,
                    'data': event.data,
                    'timestamp': event.timestamp.isoformat(),
                    'priority': event.priority
                })
                
            logger.info(f"Event sent to user {user_id}: {event_type.value}")
            
        except Exception as e:
            logger.error(f"Failed to send event to user: {str(e)}")
            
    async def handle_message(self, connection_id: str, message: Dict[str, Any]):
        """Handle incoming WebSocket message"""
        try:
            if connection_id not in self.active_connections:
                return
                
            connection = self.active_connections[connection_id]
            connection.last_activity = datetime.utcnow()
            self.metrics['messages_received'] += 1
            
            # Store message in history
            self.message_history[connection_id].append({
                'message': message,
                'timestamp': datetime.utcnow().isoformat()
            })
            
            message_type = message.get('type')
            
            if message_type == 'subscribe':
                subscription_type = SubscriptionType(message.get('subscription_type'))
                target_id = message.get('target_id')
                await self.subscribe(connection_id, subscription_type, target_id)
                
            elif message_type == 'unsubscribe':
                subscription_type = SubscriptionType(message.get('subscription_type'))
                await self.unsubscribe(connection_id, subscription_type)
                
            elif message_type == 'ping':
                await self._send_to_connection(connection_id, {
                    'type': 'pong',
                    'timestamp': datetime.utcnow().isoformat()
                })
                
            elif message_type == 'get_metrics':
                await self._send_to_connection(connection_id, {
                    'type': 'metrics',
                    'data': self.metrics,
                    'timestamp': datetime.utcnow().isoformat()
                })
                
            else:
                logger.warning(f"Unknown message type: {message_type}")
                
        except Exception as e:
            logger.error(f"Failed to handle message: {str(e)}")
            
    async def _send_to_connection(self, connection_id: str, data: Dict[str, Any]):
        """Send data to a specific connection"""
        try:
            if connection_id not in self.active_connections:
                return False
                
            connection = self.active_connections[connection_id]
            
            if connection.websocket.client_state != WebSocketState.CONNECTED:
                return False
                
            await connection.websocket.send_text(json.dumps(data))
            self.metrics['messages_sent'] += 1
            return True
            
        except Exception as e:
            logger.error(f"Failed to send to connection {connection_id}: {str(e)}")
            return False
            
    async def _get_target_connections(self, event: WebSocketEvent) -> Set[str]:
        """Get target connections for an event"""
        target_connections = set()
        
        # Global events
        if event.event_type in [EventType.MARKET_UPDATE, EventType.SYSTEM_NOTIFICATION]:
            target_connections.update(self.subscription_groups[SubscriptionType.GLOBAL])
            
        # User-specific events
        if event.user_id:
            user_connections = [
                conn_id for conn_id, conn in self.active_connections.items()
                if conn.user_id == event.user_id
            ]
            target_connections.update(user_connections)
            
        # NFT-specific events
        if event.nft_id:
            target_connections.update(self.subscription_groups[SubscriptionType.NFT_SPECIFIC])
            
        # Collection-specific events
        if event.collection_id:
            target_connections.update(self.subscription_groups[SubscriptionType.COLLECTION_SPECIFIC])
            
        # Category-specific events
        if event.category:
            target_connections.update(self.subscription_groups[SubscriptionType.CATEGORY_SPECIFIC])
            
        # Social feed events
        if event.event_type == EventType.SOCIAL_ACTIVITY:
            target_connections.update(self.subscription_groups[SubscriptionType.SOCIAL_FEED])
            
        return target_connections
        
    async def _store_event(self, event: WebSocketEvent):
        """Store event in Redis for persistence"""
        try:
            if not self.redis_client:
                return
                
            event_key = f"event:{event.event_id}"
            event_data = {
                'event_id': event.event_id,
                'event_type': event.event_type.value,
                'data': json.dumps(event.data),
                'timestamp': event.timestamp.isoformat(),
                'user_id': event.user_id or '',
                'nft_id': event.nft_id or '',
                'collection_id': event.collection_id or '',
                'category': event.category or '',
                'priority': event.priority
            }
            
            await self.redis_client.hset(event_key, mapping=event_data)
            await self.redis_client.expire(event_key, 86400)  # 24 hours
            
        except Exception as e:
            logger.error(f"Failed to store event: {str(e)}")
            
    async def _setup_event_handlers(self):
        """Setup event handlers for different event types"""
        # NFT event handlers
        self.event_handlers[EventType.NFT_LISTED].append(self._handle_nft_listed)
        self.event_handlers[EventType.NFT_SOLD].append(self._handle_nft_sold)
        self.event_handlers[EventType.PRICE_CHANGED].append(self._handle_price_changed)
        
        # Social event handlers
        self.event_handlers[EventType.SOCIAL_ACTIVITY].append(self._handle_social_activity)
        
        # Market event handlers
        self.event_handlers[EventType.MARKET_UPDATE].append(self._handle_market_update)
        
    async def _handle_nft_listed(self, event: WebSocketEvent):
        """Handle NFT listed event"""
        # Update market statistics
        await self._update_market_stats('nft_listed')
        
    async def _handle_nft_sold(self, event: WebSocketEvent):
        """Handle NFT sold event"""
        # Update market statistics
        await self._update_market_stats('nft_sold')
        
    async def _handle_price_changed(self, event: WebSocketEvent):
        """Handle price changed event"""
        # Update price tracking
        await self._update_price_tracking(event.data)
        
    async def _handle_social_activity(self, event: WebSocketEvent):
        """Handle social activity event"""
        # Update social feed
        await self._update_social_feed(event.data)
        
    async def _handle_market_update(self, event: WebSocketEvent):
        """Handle market update event"""
        # Update market data
        await self._update_market_data(event.data)
        
    async def _update_market_stats(self, stat_type: str):
        """Update market statistics"""
        try:
            if not self.redis_client:
                return
                
            stats_key = f"market_stats:{stat_type}"
            await self.redis_client.incr(stats_key)
            await self.redis_client.expire(stats_key, 86400)
            
        except Exception as e:
            logger.error(f"Failed to update market stats: {str(e)}")
            
    async def _update_price_tracking(self, data: Dict[str, Any]):
        """Update price tracking data"""
        try:
            if not self.redis_client:
                return
                
            nft_id = data.get('nft_id')
            if not nft_id:
                return
                
            price_key = f"price_tracking:{nft_id}"
            price_data = {
                'nft_id': nft_id,
                'old_price': data.get('old_price', 0),
                'new_price': data.get('new_price', 0),
                'change_percent': data.get('change_percent', 0),
                'timestamp': datetime.utcnow().isoformat()
            }
            
            await self.redis_client.hset(price_key, mapping=price_data)
            await self.redis_client.expire(price_key, 604800)  # 7 days
            
        except Exception as e:
            logger.error(f"Failed to update price tracking: {str(e)}")
            
    async def _update_social_feed(self, data: Dict[str, Any]):
        """Update social feed data"""
        try:
            if not self.redis_client:
                return
                
            feed_key = "social_feed:recent"
            feed_item = {
                'id': str(uuid.uuid4()),
                'user_id': data.get('user_id'),
                'activity_type': data.get('activity_type'),
                'data': json.dumps(data),
                'timestamp': datetime.utcnow().isoformat()
            }
            
            await self.redis_client.lpush(feed_key, json.dumps(feed_item))
            await self.redis_client.ltrim(feed_key, 0, 999)  # Keep last 1000 items
            await self.redis_client.expire(feed_key, 86400)
            
        except Exception as e:
            logger.error(f"Failed to update social feed: {str(e)}")
            
    async def _update_market_data(self, data: Dict[str, Any]):
        """Update market data"""
        try:
            if not self.redis_client:
                return
                
            market_key = "market_data:current"
            await self.redis_client.hset(market_key, mapping={
                'total_volume': data.get('total_volume', 0),
                'floor_price': data.get('floor_price', 0),
                'active_listings': data.get('active_listings', 0),
                'last_updated': datetime.utcnow().isoformat()
            })
            await self.redis_client.expire(market_key, 3600)  # 1 hour
            
        except Exception as e:
            logger.error(f"Failed to update market data: {str(e)}")
            
    async def _start_background_tasks(self):
        """Start background tasks"""
        # Clean up inactive connections
        asyncio.create_task(self._cleanup_inactive_connections())
        
        # Send periodic heartbeats
        asyncio.create_task(self._send_heartbeats())
        
        # Process event queue
        asyncio.create_task(self._process_event_queue())
        
    async def _cleanup_inactive_connections(self):
        """Clean up inactive connections"""
        while True:
            try:
                current_time = datetime.utcnow()
                inactive_connections = []
                
                for connection_id, connection in self.active_connections.items():
                    if (current_time - connection.last_activity).seconds > 300:  # 5 minutes
                        inactive_connections.append(connection_id)
                        
                for connection_id in inactive_connections:
                    await self.disconnect(connection_id)
                    
                await asyncio.sleep(60)  # Check every minute
                
            except Exception as e:
                logger.error(f"Failed to cleanup inactive connections: {str(e)}")
                await asyncio.sleep(60)
                
    async def _send_heartbeats(self):
        """Send periodic heartbeats to all connections"""
        while True:
            try:
                for connection_id in list(self.active_connections.keys()):
                    await self._send_to_connection(connection_id, {
                        'type': 'heartbeat',
                        'timestamp': datetime.utcnow().isoformat()
                    })
                    
                await asyncio.sleep(30)  # Send heartbeat every 30 seconds
                
            except Exception as e:
                logger.error(f"Failed to send heartbeats: {str(e)}")
                await asyncio.sleep(30)
                
    async def _process_event_queue(self):
        """Process event queue"""
        while True:
            try:
                if self.event_queue:
                    event = self.event_queue.popleft()
                    
                    # Call event handlers
                    for handler in self.event_handlers[event.event_type]:
                        try:
                            await handler(event)
                        except Exception as e:
                            logger.error(f"Event handler failed: {str(e)}")
                            
                await asyncio.sleep(0.1)  # Small delay to prevent busy waiting
                
            except Exception as e:
                logger.error(f"Failed to process event queue: {str(e)}")
                await asyncio.sleep(1)

# Create singleton instance
advanced_websocket_service = AdvancedWebSocketService()




