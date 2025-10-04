"""
WebSocket service for real-time Solana updates
"""

import asyncio
import json
import logging
from typing import Dict, List, Set, Any, Optional
from fastapi import WebSocket, WebSocketDisconnect
from datetime import datetime, timezone
import uuid

logger = logging.getLogger(__name__)

class ConnectionManager:
    """Manages WebSocket connections for real-time updates"""
    
    def __init__(self):
        # Active connections by user ID
        self.active_connections: Dict[str, Set[WebSocket]] = {}
        # Connection metadata
        self.connection_metadata: Dict[WebSocket, Dict[str, Any]] = {}
        # Subscription topics
        self.subscriptions: Dict[str, Set[WebSocket]] = {
            "wallet_updates": set(),
            "transaction_updates": set(),
            "nft_updates": set(),
            "market_updates": set(),
            "system_updates": set()
        }
    
    async def connect(self, websocket: WebSocket, user_id: str = None, client_id: str = None):
        """Accept a new WebSocket connection"""
        await websocket.accept()
        
        if not client_id:
            client_id = str(uuid.uuid4())
        
        # Store connection metadata
        self.connection_metadata[websocket] = {
            "user_id": user_id,
            "client_id": client_id,
            "connected_at": datetime.now(timezone.utc),
            "subscriptions": set()
        }
        
        # Add to user connections if user_id provided
        if user_id:
            if user_id not in self.active_connections:
                self.active_connections[user_id] = set()
            self.active_connections[user_id].add(websocket)
        
        logger.info(f"WebSocket connected: {client_id} (user: {user_id})")
        return client_id
    
    def disconnect(self, websocket: WebSocket):
        """Remove a WebSocket connection"""
        metadata = self.connection_metadata.get(websocket, {})
        user_id = metadata.get("user_id")
        client_id = metadata.get("client_id")
        
        # Remove from user connections
        if user_id and user_id in self.active_connections:
            self.active_connections[user_id].discard(websocket)
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]
        
        # Remove from subscriptions
        subscriptions = metadata.get("subscriptions", set())
        for topic in subscriptions:
            self.subscriptions[topic].discard(websocket)
        
        # Remove metadata
        if websocket in self.connection_metadata:
            del self.connection_metadata[websocket]
        
        logger.info(f"WebSocket disconnected: {client_id} (user: {user_id})")
    
    async def send_personal_message(self, message: str, websocket: WebSocket):
        """Send a message to a specific WebSocket connection"""
        try:
            await websocket.send_text(message)
        except Exception as e:
            logger.error(f"Failed to send personal message: {e}")
            self.disconnect(websocket)
    
    async def send_to_user(self, message: str, user_id: str):
        """Send a message to all connections for a specific user"""
        if user_id in self.active_connections:
            connections = self.active_connections[user_id].copy()
            for connection in connections:
                await self.send_personal_message(message, connection)
    
    async def broadcast_to_topic(self, message: str, topic: str):
        """Broadcast a message to all connections subscribed to a topic"""
        if topic in self.subscriptions:
            connections = self.subscriptions[topic].copy()
            for connection in connections:
                await self.send_personal_message(message, connection)
    
    async def subscribe_to_topic(self, websocket: WebSocket, topic: str):
        """Subscribe a connection to a topic"""
        if topic in self.subscriptions:
            self.subscriptions[topic].add(websocket)
            if websocket in self.connection_metadata:
                self.connection_metadata[websocket]["subscriptions"].add(topic)
            logger.info(f"Subscribed to topic: {topic}")
    
    async def unsubscribe_from_topic(self, websocket: WebSocket, topic: str):
        """Unsubscribe a connection from a topic"""
        if topic in self.subscriptions:
            self.subscriptions[topic].discard(websocket)
            if websocket in self.connection_metadata:
                self.connection_metadata[websocket]["subscriptions"].discard(topic)
            logger.info(f"Unsubscribed from topic: {topic}")
    
    def get_connection_info(self, websocket: WebSocket) -> Dict[str, Any]:
        """Get connection information"""
        return self.connection_metadata.get(websocket, {})
    
    def get_stats(self) -> Dict[str, Any]:
        """Get connection statistics"""
        total_connections = len(self.connection_metadata)
        total_users = len(self.active_connections)
        
        topic_stats = {}
        for topic, connections in self.subscriptions.items():
            topic_stats[topic] = len(connections)
        
        return {
            "total_connections": total_connections,
            "total_users": total_users,
            "topic_subscriptions": topic_stats,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }

# Global connection manager instance
manager = ConnectionManager()

class SolanaWebSocketService:
    """Service for handling Solana-specific WebSocket operations"""
    
    def __init__(self, connection_manager: ConnectionManager):
        self.manager = connection_manager
        self.running = False
        self.tasks = []
    
    async def start(self):
        """Start the WebSocket service"""
        self.running = True
        # Start background tasks for real-time updates
        self.tasks = [
            asyncio.create_task(self._wallet_monitor()),
            asyncio.create_task(self._transaction_monitor()),
            asyncio.create_task(self._system_monitor())
        ]
        logger.info("Solana WebSocket service started")
    
    async def stop(self):
        """Stop the WebSocket service"""
        self.running = False
        for task in self.tasks:
            task.cancel()
        logger.info("Solana WebSocket service stopped")
    
    async def _wallet_monitor(self):
        """Monitor wallet changes and broadcast updates"""
        while self.running:
            try:
                # In a real implementation, this would monitor blockchain events
                # For now, we'll simulate periodic updates
                await asyncio.sleep(30)  # Check every 30 seconds
                
                if self.manager.subscriptions["wallet_updates"]:
                    message = {
                        "type": "wallet_update",
                        "data": {
                            "message": "Wallet balance updated",
                            "timestamp": datetime.now(timezone.utc).isoformat()
                        }
                    }
                    await self.manager.broadcast_to_topic(json.dumps(message), "wallet_updates")
                
            except Exception as e:
                logger.error(f"Error in wallet monitor: {e}")
                await asyncio.sleep(5)
    
    async def _transaction_monitor(self):
        """Monitor transaction changes and broadcast updates"""
        while self.running:
            try:
                await asyncio.sleep(15)  # Check every 15 seconds
                
                if self.manager.subscriptions["transaction_updates"]:
                    message = {
                        "type": "transaction_update",
                        "data": {
                            "message": "New transaction detected",
                            "timestamp": datetime.now(timezone.utc).isoformat()
                        }
                    }
                    await self.manager.broadcast_to_topic(json.dumps(message), "transaction_updates")
                
            except Exception as e:
                logger.error(f"Error in transaction monitor: {e}")
                await asyncio.sleep(5)
    
    async def _system_monitor(self):
        """Monitor system health and broadcast updates"""
        while self.running:
            try:
                await asyncio.sleep(60)  # Check every minute
                
                if self.manager.subscriptions["system_updates"]:
                    stats = self.manager.get_stats()
                    message = {
                        "type": "system_update",
                        "data": {
                            "stats": stats,
                            "timestamp": datetime.now(timezone.utc).isoformat()
                        }
                    }
                    await self.manager.broadcast_to_topic(json.dumps(message), "system_updates")
                
            except Exception as e:
                logger.error(f"Error in system monitor: {e}")
                await asyncio.sleep(10)
    
    async def notify_wallet_change(self, user_id: str, wallet_address: str, balance: float):
        """Notify about wallet balance changes"""
        message = {
            "type": "wallet_balance_change",
            "data": {
                "wallet_address": wallet_address,
                "balance": balance,
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
        }
        await self.manager.send_to_user(json.dumps(message), user_id)
    
    async def notify_transaction_update(self, signature: str, status: str, user_id: str = None):
        """Notify about transaction status changes"""
        message = {
            "type": "transaction_status_change",
            "data": {
                "signature": signature,
                "status": status,
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
        }
        
        if user_id:
            await self.manager.send_to_user(json.dumps(message), user_id)
        else:
            await self.manager.broadcast_to_topic(json.dumps(message), "transaction_updates")
    
    async def notify_nft_update(self, nft_id: str, event_type: str, user_id: str = None):
        """Notify about NFT events"""
        message = {
            "type": "nft_update",
            "data": {
                "nft_id": nft_id,
                "event_type": event_type,
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
        }
        
        if user_id:
            await self.manager.send_to_user(json.dumps(message), user_id)
        else:
            await self.manager.broadcast_to_topic(json.dumps(message), "nft_updates")
    
    async def notify_market_update(self, product_id: str, event_type: str, data: Dict[str, Any]):
        """Notify about market events"""
        message = {
            "type": "market_update",
            "data": {
                "product_id": product_id,
                "event_type": event_type,
                "data": data,
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
        }
        await self.manager.broadcast_to_topic(json.dumps(message), "market_updates")

# Global WebSocket service instance
websocket_service = SolanaWebSocketService(manager)
