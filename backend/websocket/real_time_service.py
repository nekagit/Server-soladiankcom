"""
Real-time WebSocket service for Soladia
"""
import asyncio
import json
import logging
from typing import Dict, List, Set, Any, Optional, Callable
from datetime import datetime
from dataclasses import dataclass, asdict
from enum import Enum
import uuid
from fastapi import WebSocket, WebSocketDisconnect
from fastapi.websockets import WebSocketState

logger = logging.getLogger(__name__)

class MessageType(Enum):
    """WebSocket message types"""
    CONNECTION = "connection"
    DISCONNECTION = "disconnection"
    HEARTBEAT = "heartbeat"
    NOTIFICATION = "notification"
    TRADE_UPDATE = "trade_update"
    PRICE_UPDATE = "price_update"
    USER_ACTIVITY = "user_activity"
    CHAT_MESSAGE = "chat_message"
    SYSTEM_ALERT = "system_alert"
    CUSTOM = "custom"

@dataclass
class WebSocketMessage:
    """WebSocket message structure"""
    id: str
    type: MessageType
    data: Dict[str, Any]
    timestamp: datetime
    user_id: Optional[str] = None
    room: Optional[str] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return {
            "id": self.id,
            "type": self.type.value,
            "data": self.data,
            "timestamp": self.timestamp.isoformat(),
            "user_id": self.user_id,
            "room": self.room
        }

class ConnectionManager:
    """Manage WebSocket connections"""
    
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
        self.user_connections: Dict[str, Set[str]] = {}
        self.room_connections: Dict[str, Set[str]] = {}
        self.connection_metadata: Dict[str, Dict[str, Any]] = {}
        self.message_handlers: Dict[MessageType, List[Callable]] = {}
        self.heartbeat_interval = 30  # seconds
        self.heartbeat_task = None
        
    async def start_heartbeat(self):
        """Start heartbeat task"""
        if not self.heartbeat_task:
            self.heartbeat_task = asyncio.create_task(self._heartbeat_loop())
    
    async def stop_heartbeat(self):
        """Stop heartbeat task"""
        if self.heartbeat_task:
            self.heartbeat_task.cancel()
            try:
                await self.heartbeat_task
            except asyncio.CancelledError:
                pass
            self.heartbeat_task = None
    
    async def _heartbeat_loop(self):
        """Heartbeat loop to keep connections alive"""
        while True:
            try:
                await asyncio.sleep(self.heartbeat_interval)
                await self._send_heartbeat()
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Heartbeat error: {e}")
    
    async def _send_heartbeat(self):
        """Send heartbeat to all connections"""
        message = WebSocketMessage(
            id=str(uuid.uuid4()),
            type=MessageType.HEARTBEAT,
            data={"timestamp": datetime.utcnow().isoformat()},
            timestamp=datetime.utcnow()
        )
        
        await self.broadcast_message(message)
    
    async def connect(self, websocket: WebSocket, connection_id: str, user_id: Optional[str] = None):
        """Accept WebSocket connection"""
        await websocket.accept()
        
        self.active_connections[connection_id] = websocket
        self.connection_metadata[connection_id] = {
            "user_id": user_id,
            "connected_at": datetime.utcnow(),
            "last_activity": datetime.utcnow(),
            "rooms": set()
        }
        
        if user_id:
            if user_id not in self.user_connections:
                self.user_connections[user_id] = set()
            self.user_connections[user_id].add(connection_id)
        
        # Send connection confirmation
        message = WebSocketMessage(
            id=str(uuid.uuid4()),
            type=MessageType.CONNECTION,
            data={"connection_id": connection_id, "status": "connected"},
            timestamp=datetime.utcnow(),
            user_id=user_id
        )
        
        await self.send_to_connection(connection_id, message)
        logger.info(f"WebSocket connected: {connection_id}")
    
    async def disconnect(self, connection_id: str):
        """Disconnect WebSocket"""
        if connection_id in self.active_connections:
            websocket = self.active_connections[connection_id]
            
            # Send disconnection message
            message = WebSocketMessage(
                id=str(uuid.uuid4()),
                type=MessageType.DISCONNECTION,
                data={"connection_id": connection_id, "status": "disconnected"},
                timestamp=datetime.utcnow()
            )
            
            try:
                await self.send_to_connection(connection_id, message)
            except:
                pass  # Connection might already be closed
            
            # Clean up
            metadata = self.connection_metadata.get(connection_id, {})
            user_id = metadata.get("user_id")
            
            if user_id and user_id in self.user_connections:
                self.user_connections[user_id].discard(connection_id)
                if not self.user_connections[user_id]:
                    del self.user_connections[user_id]
            
            # Remove from rooms
            rooms = metadata.get("rooms", set())
            for room in rooms:
                if room in self.room_connections:
                    self.room_connections[room].discard(connection_id)
                    if not self.room_connections[room]:
                        del self.room_connections[room]
            
            del self.active_connections[connection_id]
            del self.connection_metadata[connection_id]
            
            logger.info(f"WebSocket disconnected: {connection_id}")
    
    async def join_room(self, connection_id: str, room: str):
        """Join a room"""
        if connection_id in self.active_connections:
            if room not in self.room_connections:
                self.room_connections[room] = set()
            
            self.room_connections[room].add(connection_id)
            self.connection_metadata[connection_id]["rooms"].add(room)
            
            logger.info(f"Connection {connection_id} joined room {room}")
    
    async def leave_room(self, connection_id: str, room: str):
        """Leave a room"""
        if connection_id in self.active_connections:
            if room in self.room_connections:
                self.room_connections[room].discard(connection_id)
                if not self.room_connections[room]:
                    del self.room_connections[room]
            
            self.connection_metadata[connection_id]["rooms"].discard(room)
            logger.info(f"Connection {connection_id} left room {room}")
    
    async def send_to_connection(self, connection_id: str, message: WebSocketMessage):
        """Send message to specific connection"""
        if connection_id in self.active_connections:
            websocket = self.active_connections[connection_id]
            try:
                if websocket.client_state == WebSocketState.CONNECTED:
                    await websocket.send_text(json.dumps(message.to_dict()))
                    self.connection_metadata[connection_id]["last_activity"] = datetime.utcnow()
            except Exception as e:
                logger.error(f"Error sending message to {connection_id}: {e}")
                await self.disconnect(connection_id)
    
    async def send_to_user(self, user_id: str, message: WebSocketMessage):
        """Send message to all connections of a user"""
        if user_id in self.user_connections:
            for connection_id in self.user_connections[user_id]:
                await self.send_to_connection(connection_id, message)
    
    async def send_to_room(self, room: str, message: WebSocketMessage):
        """Send message to all connections in a room"""
        if room in self.room_connections:
            for connection_id in self.room_connections[room]:
                await self.send_to_connection(connection_id, message)
    
    async def broadcast_message(self, message: WebSocketMessage):
        """Broadcast message to all connections"""
        for connection_id in list(self.active_connections.keys()):
            await self.send_to_connection(connection_id, message)
    
    async def send_notification(
        self,
        user_id: str,
        title: str,
        message: str,
        notification_type: str = "info"
    ):
        """Send notification to user"""
        notification_message = WebSocketMessage(
            id=str(uuid.uuid4()),
            type=MessageType.NOTIFICATION,
            data={
                "title": title,
                "message": message,
                "type": notification_type,
                "timestamp": datetime.utcnow().isoformat()
            },
            timestamp=datetime.utcnow(),
            user_id=user_id
        )
        
        await self.send_to_user(user_id, notification_message)
    
    async def send_trade_update(
        self,
        trade_id: str,
        trade_data: Dict[str, Any],
        user_id: Optional[str] = None,
        room: Optional[str] = None
    ):
        """Send trade update"""
        message = WebSocketMessage(
            id=str(uuid.uuid4()),
            type=MessageType.TRADE_UPDATE,
            data={
                "trade_id": trade_id,
                "trade_data": trade_data,
                "timestamp": datetime.utcnow().isoformat()
            },
            timestamp=datetime.utcnow(),
            user_id=user_id,
            room=room
        )
        
        if user_id:
            await self.send_to_user(user_id, message)
        elif room:
            await self.send_to_room(room, message)
        else:
            await self.broadcast_message(message)
    
    async def send_price_update(
        self,
        asset_id: str,
        price_data: Dict[str, Any],
        room: str = "price_updates"
    ):
        """Send price update"""
        message = WebSocketMessage(
            id=str(uuid.uuid4()),
            type=MessageType.PRICE_UPDATE,
            data={
                "asset_id": asset_id,
                "price_data": price_data,
                "timestamp": datetime.utcnow().isoformat()
            },
            timestamp=datetime.utcnow(),
            room=room
        )
        
        await self.send_to_room(room, message)
    
    async def send_user_activity(
        self,
        user_id: str,
        activity: str,
        data: Dict[str, Any]
    ):
        """Send user activity update"""
        message = WebSocketMessage(
            id=str(uuid.uuid4()),
            type=MessageType.USER_ACTIVITY,
            data={
                "user_id": user_id,
                "activity": activity,
                "data": data,
                "timestamp": datetime.utcnow().isoformat()
            },
            timestamp=datetime.utcnow(),
            user_id=user_id
        )
        
        await self.send_to_user(user_id, message)
    
    async def send_chat_message(
        self,
        room: str,
        user_id: str,
        message_text: str,
        message_data: Optional[Dict[str, Any]] = None
    ):
        """Send chat message to room"""
        message = WebSocketMessage(
            id=str(uuid.uuid4()),
            type=MessageType.CHAT_MESSAGE,
            data={
                "user_id": user_id,
                "message": message_text,
                "data": message_data or {},
                "timestamp": datetime.utcnow().isoformat()
            },
            timestamp=datetime.utcnow(),
            user_id=user_id,
            room=room
        )
        
        await self.send_to_room(room, message)
    
    def register_message_handler(self, message_type: MessageType, handler: Callable):
        """Register message handler"""
        if message_type not in self.message_handlers:
            self.message_handlers[message_type] = []
        self.message_handlers[message_type].append(handler)
    
    async def handle_message(self, connection_id: str, message_data: Dict[str, Any]):
        """Handle incoming message"""
        try:
            message_type = MessageType(message_data.get("type"))
            data = message_data.get("data", {})
            
            # Update last activity
            if connection_id in self.connection_metadata:
                self.connection_metadata[connection_id]["last_activity"] = datetime.utcnow()
            
            # Call registered handlers
            if message_type in self.message_handlers:
                for handler in self.message_handlers[message_type]:
                    try:
                        await handler(connection_id, data)
                    except Exception as e:
                        logger.error(f"Error in message handler: {e}")
            
        except Exception as e:
            logger.error(f"Error handling message: {e}")
    
    def get_connection_stats(self) -> Dict[str, Any]:
        """Get connection statistics"""
        return {
            "total_connections": len(self.active_connections),
            "total_users": len(self.user_connections),
            "total_rooms": len(self.room_connections),
            "connections_per_user": {
                user_id: len(connections) 
                for user_id, connections in self.user_connections.items()
            },
            "connections_per_room": {
                room: len(connections) 
                for room, connections in self.room_connections.items()
            }
        }
    
    def get_connection_info(self, connection_id: str) -> Optional[Dict[str, Any]]:
        """Get connection information"""
        if connection_id in self.connection_metadata:
            metadata = self.connection_metadata[connection_id].copy()
            metadata["rooms"] = list(metadata["rooms"])
            return metadata
        return None

class RealTimeService:
    """Real-time service for managing WebSocket connections and events"""
    
    def __init__(self):
        self.connection_manager = ConnectionManager()
        self.event_handlers = {}
    
    async def start(self):
        """Start the real-time service"""
        await self.connection_manager.start_heartbeat()
        logger.info("Real-time service started")
    
    async def stop(self):
        """Stop the real-time service"""
        await self.connection_manager.stop_heartbeat()
        logger.info("Real-time service stopped")
    
    async def handle_connection(self, websocket: WebSocket, connection_id: str, user_id: Optional[str] = None):
        """Handle new WebSocket connection"""
        await self.connection_manager.connect(websocket, connection_id, user_id)
        
        try:
            while True:
                # Receive message
                data = await websocket.receive_text()
                message_data = json.loads(data)
                
                # Handle message
                await self.connection_manager.handle_message(connection_id, message_data)
                
        except WebSocketDisconnect:
            await self.connection_manager.disconnect(connection_id)
        except Exception as e:
            logger.error(f"WebSocket error: {e}")
            await self.connection_manager.disconnect(connection_id)
    
    async def send_notification_to_user(
        self,
        user_id: str,
        title: str,
        message: str,
        notification_type: str = "info"
    ):
        """Send notification to user"""
        await self.connection_manager.send_notification(
            user_id, title, message, notification_type
        )
    
    async def broadcast_trade_update(
        self,
        trade_id: str,
        trade_data: Dict[str, Any]
    ):
        """Broadcast trade update to all users"""
        await self.connection_manager.send_trade_update(trade_id, trade_data)
    
    async def send_price_update(
        self,
        asset_id: str,
        price_data: Dict[str, Any]
    ):
        """Send price update to price room"""
        await self.connection_manager.send_price_update(asset_id, price_data)
    
    async def join_user_to_room(self, user_id: str, room: str):
        """Join user to room"""
        if user_id in self.connection_manager.user_connections:
            for connection_id in self.connection_manager.user_connections[user_id]:
                await self.connection_manager.join_room(connection_id, room)
    
    async def leave_user_from_room(self, user_id: str, room: str):
        """Remove user from room"""
        if user_id in self.connection_manager.user_connections:
            for connection_id in self.connection_manager.user_connections[user_id]:
                await self.connection_manager.leave_room(connection_id, room)
    
    def get_stats(self) -> Dict[str, Any]:
        """Get service statistics"""
        return self.connection_manager.get_connection_stats()

# Global real-time service instance
real_time_service = RealTimeService()
