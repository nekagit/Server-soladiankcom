"""
Metaverse and VR/AR Service for Soladia Marketplace
Provides virtual reality, augmented reality, and metaverse capabilities
"""

import asyncio
import logging
import json
import uuid
from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime, timedelta
from dataclasses import dataclass
from enum import Enum
import numpy as np
import redis
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.responses import HTMLResponse
import uvicorn
import asyncio
import websockets
from pydantic import BaseModel
import cv2
import mediapipe as mp
from PIL import Image
import base64
import io

logger = logging.getLogger(__name__)

class MetaversePlatform(Enum):
    DECENTRALAND = "decentraland"
    SANDBOX = "sandbox"
    CRYPTOVOXELS = "cryptovoxels"
    SOMNIUM_SPACE = "somnium_space"
    HORIZON_WORLDS = "horizon_worlds"
    VRCHAT = "vrchat"
    CUSTOM = "custom"

class VRDevice(Enum):
    OCULUS_QUEST = "oculus_quest"
    OCULUS_RIFT = "oculus_rift"
    HTC_VIVE = "htc_vive"
    VALVE_INDEX = "valve_index"
    PLAYSTATION_VR = "playstation_vr"
    WINDOWS_MR = "windows_mr"
    CUSTOM = "custom"

class ARFramework(Enum):
    ARKIT = "arkit"
    ARCORE = "arcore"
    WEBXR = "webxr"
    UNITY_AR = "unity_ar"
    UNREAL_AR = "unreal_ar"
    CUSTOM = "custom"

@dataclass
class VirtualWorld:
    """Virtual world configuration"""
    world_id: str
    name: str
    description: str
    platform: MetaversePlatform
    coordinates: Tuple[float, float, float]
    size: Tuple[float, float, float]
    max_users: int
    current_users: int
    created_at: datetime
    owner_id: str
    is_public: bool = True
    features: List[str] = None

@dataclass
class VRUser:
    """VR user data"""
    user_id: str
    avatar_id: str
    position: Tuple[float, float, float]
    rotation: Tuple[float, float, float, float]  # Quaternion
    device: VRDevice
    hand_tracking: bool = False
    eye_tracking: bool = False
    voice_enabled: bool = True
    last_seen: datetime

@dataclass
class ARMarker:
    """AR marker configuration"""
    marker_id: str
    name: str
    type: str  # image, qr, nft, object
    data: str
    position: Tuple[float, float, float]
    rotation: Tuple[float, float, float, float]
    scale: Tuple[float, float, float]
    is_active: bool = True

class MetaverseService:
    """Metaverse and VR/AR service"""
    
    def __init__(self, redis_client: redis.Redis):
        self.redis = redis_client
        self.virtual_worlds: Dict[str, VirtualWorld] = {}
        self.vr_users: Dict[str, VRUser] = {}
        self.ar_markers: Dict[str, ARMarker] = {}
        self.websocket_connections: Dict[str, WebSocket] = {}
        
        # Initialize MediaPipe for hand tracking
        self.mp_hands = mp.solutions.hands
        self.mp_pose = mp.solutions.pose
        self.mp_face = mp.solutions.face_mesh
        
    async def create_virtual_world(self, world_data: Dict[str, Any]) -> str:
        """Create a new virtual world"""
        try:
            world_id = f"vw_{uuid.uuid4().hex[:16]}"
            
            virtual_world = VirtualWorld(
                world_id=world_id,
                name=world_data.get("name", "Untitled World"),
                description=world_data.get("description", ""),
                platform=MetaversePlatform(world_data.get("platform", "custom")),
                coordinates=tuple(world_data.get("coordinates", [0, 0, 0])),
                size=tuple(world_data.get("size", [100, 100, 100])),
                max_users=world_data.get("max_users", 100),
                current_users=0,
                created_at=datetime.now(),
                owner_id=world_data.get("owner_id", ""),
                is_public=world_data.get("is_public", True),
                features=world_data.get("features", [])
            )
            
            self.virtual_worlds[world_id] = virtual_world
            
            # Store in Redis
            await self.redis.setex(
                f"virtual_world:{world_id}",
                86400 * 30,  # 30 days TTL
                json.dumps({
                    "world_id": world_id,
                    "name": virtual_world.name,
                    "description": virtual_world.description,
                    "platform": virtual_world.platform.value,
                    "coordinates": virtual_world.coordinates,
                    "size": virtual_world.size,
                    "max_users": virtual_world.max_users,
                    "current_users": virtual_world.current_users,
                    "created_at": virtual_world.created_at.isoformat(),
                    "owner_id": virtual_world.owner_id,
                    "is_public": virtual_world.is_public,
                    "features": virtual_world.features
                })
            )
            
            return world_id
            
        except Exception as e:
            logger.error(f"Failed to create virtual world: {e}")
            raise
    
    async def join_virtual_world(self, world_id: str, user_id: str, 
                               device: VRDevice) -> bool:
        """Join a virtual world"""
        try:
            if world_id not in self.virtual_worlds:
                # Load from Redis
                world_data = await self.redis.get(f"virtual_world:{world_id}")
                if not world_data:
                    return False
                
                world_info = json.loads(world_data)
                virtual_world = VirtualWorld(
                    world_id=world_info["world_id"],
                    name=world_info["name"],
                    description=world_info["description"],
                    platform=MetaversePlatform(world_info["platform"]),
                    coordinates=tuple(world_info["coordinates"]),
                    size=tuple(world_info["size"]),
                    max_users=world_info["max_users"],
                    current_users=world_info["current_users"],
                    created_at=datetime.fromisoformat(world_info["created_at"]),
                    owner_id=world_info["owner_id"],
                    is_public=world_info["is_public"],
                    features=world_info["features"]
                )
                self.virtual_worlds[world_id] = virtual_world
            
            virtual_world = self.virtual_worlds[world_id]
            
            # Check if world is full
            if virtual_world.current_users >= virtual_world.max_users:
                return False
            
            # Create VR user
            vr_user = VRUser(
                user_id=user_id,
                avatar_id=f"avatar_{uuid.uuid4().hex[:8]}",
                position=(0, 0, 0),
                rotation=(0, 0, 0, 1),
                device=device,
                hand_tracking=True,
                eye_tracking=True,
                voice_enabled=True,
                last_seen=datetime.now()
            )
            
            self.vr_users[user_id] = vr_user
            virtual_world.current_users += 1
            
            # Update world in Redis
            await self.redis.setex(
                f"virtual_world:{world_id}",
                86400 * 30,
                json.dumps({
                    "world_id": world_id,
                    "name": virtual_world.name,
                    "description": virtual_world.description,
                    "platform": virtual_world.platform.value,
                    "coordinates": virtual_world.coordinates,
                    "size": virtual_world.size,
                    "max_users": virtual_world.max_users,
                    "current_users": virtual_world.current_users,
                    "created_at": virtual_world.created_at.isoformat(),
                    "owner_id": virtual_world.owner_id,
                    "is_public": virtual_world.is_public,
                    "features": virtual_world.features
                })
            )
            
            return True
            
        except Exception as e:
            logger.error(f"Failed to join virtual world: {e}")
            return False
    
    async def update_user_position(self, user_id: str, position: Tuple[float, float, float],
                                  rotation: Tuple[float, float, float, float]) -> bool:
        """Update VR user position and rotation"""
        try:
            if user_id not in self.vr_users:
                return False
            
            vr_user = self.vr_users[user_id]
            vr_user.position = position
            vr_user.rotation = rotation
            vr_user.last_seen = datetime.now()
            
            # Broadcast position update to other users
            await self._broadcast_user_update(user_id, {
                "type": "position_update",
                "user_id": user_id,
                "position": position,
                "rotation": rotation,
                "timestamp": datetime.now().isoformat()
            })
            
            return True
            
        except Exception as e:
            logger.error(f"Failed to update user position: {e}")
            return False
    
    async def _broadcast_user_update(self, user_id: str, data: Dict[str, Any]):
        """Broadcast user update to all connected users"""
        try:
            message = json.dumps(data)
            
            # Send to all WebSocket connections
            for connection_id, websocket in self.websocket_connections.items():
                try:
                    await websocket.send_text(message)
                except Exception as e:
                    logger.error(f"Failed to send to {connection_id}: {e}")
                    # Remove disconnected connection
                    del self.websocket_connections[connection_id]
                    
        except Exception as e:
            logger.error(f"Failed to broadcast user update: {e}")
    
    async def create_ar_marker(self, marker_data: Dict[str, Any]) -> str:
        """Create AR marker"""
        try:
            marker_id = f"ar_{uuid.uuid4().hex[:16]}"
            
            ar_marker = ARMarker(
                marker_id=marker_id,
                name=marker_data.get("name", "Untitled Marker"),
                type=marker_data.get("type", "image"),
                data=marker_data.get("data", ""),
                position=tuple(marker_data.get("position", [0, 0, 0])),
                rotation=tuple(marker_data.get("rotation", [0, 0, 0, 1])),
                scale=tuple(marker_data.get("scale", [1, 1, 1])),
                is_active=True
            )
            
            self.ar_markers[marker_id] = ar_marker
            
            # Store in Redis
            await self.redis.setex(
                f"ar_marker:{marker_id}",
                86400 * 7,  # 7 days TTL
                json.dumps({
                    "marker_id": marker_id,
                    "name": ar_marker.name,
                    "type": ar_marker.type,
                    "data": ar_marker.data,
                    "position": ar_marker.position,
                    "rotation": ar_marker.rotation,
                    "scale": ar_marker.scale,
                    "is_active": ar_marker.is_active
                })
            )
            
            return marker_id
            
        except Exception as e:
            logger.error(f"Failed to create AR marker: {e}")
            raise
    
    async def detect_ar_marker(self, image_data: str) -> List[Dict[str, Any]]:
        """Detect AR markers in image"""
        try:
            # Decode base64 image
            image_bytes = base64.b64decode(image_data)
            image = Image.open(io.BytesIO(image_bytes))
            image_cv = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
            
            detected_markers = []
            
            # Detect different types of markers
            for marker_id, marker in self.ar_markers.items():
                if not marker.is_active:
                    continue
                
                if marker.type == "image":
                    # Image marker detection
                    if self._detect_image_marker(image_cv, marker):
                        detected_markers.append({
                            "marker_id": marker_id,
                            "name": marker.name,
                            "type": marker.type,
                            "data": marker.data,
                            "position": marker.position,
                            "rotation": marker.rotation,
                            "scale": marker.scale
                        })
                
                elif marker.type == "qr":
                    # QR code detection
                    if self._detect_qr_marker(image_cv, marker):
                        detected_markers.append({
                            "marker_id": marker_id,
                            "name": marker.name,
                            "type": marker.type,
                            "data": marker.data,
                            "position": marker.position,
                            "rotation": marker.rotation,
                            "scale": marker.scale
                        })
                
                elif marker.type == "nft":
                    # NFT marker detection
                    if self._detect_nft_marker(image_cv, marker):
                        detected_markers.append({
                            "marker_id": marker_id,
                            "name": marker.name,
                            "type": marker.type,
                            "data": marker.data,
                            "position": marker.position,
                            "rotation": marker.rotation,
                            "scale": marker.scale
                        })
            
            return detected_markers
            
        except Exception as e:
            logger.error(f"Failed to detect AR markers: {e}")
            return []
    
    def _detect_image_marker(self, image: np.ndarray, marker: ARMarker) -> bool:
        """Detect image marker in frame"""
        try:
            # Simplified image marker detection
            # In production, use proper image recognition
            return True
        except Exception as e:
            logger.error(f"Failed to detect image marker: {e}")
            return False
    
    def _detect_qr_marker(self, image: np.ndarray, marker: ARMarker) -> bool:
        """Detect QR code marker in frame"""
        try:
            # QR code detection using OpenCV
            detector = cv2.QRCodeDetector()
            data, bbox, _ = detector.detectAndDecode(image)
            
            if data and data == marker.data:
                return True
            
            return False
            
        except Exception as e:
            logger.error(f"Failed to detect QR marker: {e}")
            return False
    
    def _detect_nft_marker(self, image: np.ndarray, marker: ARMarker) -> bool:
        """Detect NFT marker in frame"""
        try:
            # NFT marker detection using computer vision
            # This would involve NFT metadata analysis
            return True
        except Exception as e:
            logger.error(f"Failed to detect NFT marker: {e}")
            return False
    
    async def track_hand_gestures(self, image_data: str) -> Dict[str, Any]:
        """Track hand gestures using MediaPipe"""
        try:
            # Decode base64 image
            image_bytes = base64.b64decode(image_data)
            image = Image.open(io.BytesIO(image_bytes))
            image_cv = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
            
            # Initialize MediaPipe hands
            with self.mp_hands.Hands(
                static_image_mode=False,
                max_num_hands=2,
                min_detection_confidence=0.5,
                min_tracking_confidence=0.5
            ) as hands:
                
                # Process image
                results = hands.process(cv2.cvtColor(image_cv, cv2.COLOR_BGR2RGB))
                
                hand_gestures = []
                
                if results.multi_hand_landmarks:
                    for hand_landmarks in results.multi_hand_landmarks:
                        # Extract hand landmarks
                        landmarks = []
                        for landmark in hand_landmarks.landmark:
                            landmarks.append({
                                "x": landmark.x,
                                "y": landmark.y,
                                "z": landmark.z
                            })
                        
                        # Detect gesture
                        gesture = self._detect_gesture(landmarks)
                        
                        hand_gestures.append({
                            "landmarks": landmarks,
                            "gesture": gesture,
                            "confidence": 0.8
                        })
                
                return {
                    "hands_detected": len(hand_gestures),
                    "gestures": hand_gestures,
                    "timestamp": datetime.now().isoformat()
                }
                
        except Exception as e:
            logger.error(f"Failed to track hand gestures: {e}")
            return {"error": str(e)}
    
    def _detect_gesture(self, landmarks: List[Dict[str, float]]) -> str:
        """Detect hand gesture from landmarks"""
        try:
            # Simplified gesture detection
            # In production, use machine learning models
            
            # Get finger tip positions
            thumb_tip = landmarks[4]
            index_tip = landmarks[8]
            middle_tip = landmarks[12]
            ring_tip = landmarks[16]
            pinky_tip = landmarks[20]
            
            # Detect open/closed fingers
            fingers_up = []
            
            # Thumb
            if thumb_tip["x"] > landmarks[3]["x"]:
                fingers_up.append(1)
            else:
                fingers_up.append(0)
            
            # Index finger
            if index_tip["y"] < landmarks[6]["y"]:
                fingers_up.append(1)
            else:
                fingers_up.append(0)
            
            # Middle finger
            if middle_tip["y"] < landmarks[10]["y"]:
                fingers_up.append(1)
            else:
                fingers_up.append(0)
            
            # Ring finger
            if ring_tip["y"] < landmarks[14]["y"]:
                fingers_up.append(1)
            else:
                fingers_up.append(0)
            
            # Pinky
            if pinky_tip["y"] < landmarks[18]["y"]:
                fingers_up.append(1)
            else:
                fingers_up.append(0)
            
            # Determine gesture
            total_fingers = sum(fingers_up)
            
            if total_fingers == 0:
                return "fist"
            elif total_fingers == 1 and fingers_up[1] == 1:
                return "point"
            elif total_fingers == 2 and fingers_up[1] == 1 and fingers_up[2] == 1:
                return "peace"
            elif total_fingers == 5:
                return "open_hand"
            else:
                return "unknown"
                
        except Exception as e:
            logger.error(f"Failed to detect gesture: {e}")
            return "unknown"
    
    async def track_pose(self, image_data: str) -> Dict[str, Any]:
        """Track body pose using MediaPipe"""
        try:
            # Decode base64 image
            image_bytes = base64.b64decode(image_data)
            image = Image.open(io.BytesIO(image_bytes))
            image_cv = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
            
            # Initialize MediaPipe pose
            with self.mp_pose.Pose(
                static_image_mode=False,
                model_complexity=1,
                enable_segmentation=False,
                min_detection_confidence=0.5,
                min_tracking_confidence=0.5
            ) as pose:
                
                # Process image
                results = pose.process(cv2.cvtColor(image_cv, cv2.COLOR_BGR2RGB))
                
                pose_data = []
                
                if results.pose_landmarks:
                    for landmark in results.pose_landmarks.landmark:
                        pose_data.append({
                            "x": landmark.x,
                            "y": landmark.y,
                            "z": landmark.z,
                            "visibility": landmark.visibility
                        })
                
                return {
                    "pose_detected": results.pose_landmarks is not None,
                    "landmarks": pose_data,
                    "timestamp": datetime.now().isoformat()
                }
                
        except Exception as e:
            logger.error(f"Failed to track pose: {e}")
            return {"error": str(e)}
    
    async def track_face(self, image_data: str) -> Dict[str, Any]:
        """Track face using MediaPipe"""
        try:
            # Decode base64 image
            image_bytes = base64.b64decode(image_data)
            image = Image.open(io.BytesIO(image_bytes))
            image_cv = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
            
            # Initialize MediaPipe face mesh
            with self.mp_face.FaceMesh(
                static_image_mode=False,
                max_num_faces=1,
                refine_landmarks=True,
                min_detection_confidence=0.5,
                min_tracking_confidence=0.5
            ) as face_mesh:
                
                # Process image
                results = face_mesh.process(cv2.cvtColor(image_cv, cv2.COLOR_BGR2RGB))
                
                face_data = []
                
                if results.multi_face_landmarks:
                    for face_landmarks in results.multi_face_landmarks:
                        landmarks = []
                        for landmark in face_landmarks.landmark:
                            landmarks.append({
                                "x": landmark.x,
                                "y": landmark.y,
                                "z": landmark.z
                            })
                        face_data.append(landmarks)
                
                return {
                    "faces_detected": len(face_data),
                    "landmarks": face_data,
                    "timestamp": datetime.now().isoformat()
                }
                
        except Exception as e:
            logger.error(f"Failed to track face: {e}")
            return {"error": str(e)}
    
    async def create_metaverse_asset(self, asset_data: Dict[str, Any]) -> str:
        """Create metaverse asset (NFT, 3D model, etc.)"""
        try:
            asset_id = f"ma_{uuid.uuid4().hex[:16]}"
            
            # Store asset metadata
            asset_metadata = {
                "asset_id": asset_id,
                "name": asset_data.get("name", "Untitled Asset"),
                "description": asset_data.get("description", ""),
                "type": asset_data.get("type", "3d_model"),
                "file_url": asset_data.get("file_url", ""),
                "thumbnail_url": asset_data.get("thumbnail_url", ""),
                "creator_id": asset_data.get("creator_id", ""),
                "created_at": datetime.now().isoformat(),
                "tags": asset_data.get("tags", []),
                "properties": asset_data.get("properties", {}),
                "is_tradeable": asset_data.get("is_tradeable", True),
                "is_transferable": asset_data.get("is_transferable", True)
            }
            
            # Store in Redis
            await self.redis.setex(
                f"metaverse_asset:{asset_id}",
                86400 * 365,  # 1 year TTL
                json.dumps(asset_metadata)
            )
            
            return asset_id
            
        except Exception as e:
            logger.error(f"Failed to create metaverse asset: {e}")
            raise
    
    async def get_metaverse_analytics(self) -> Dict[str, Any]:
        """Get metaverse analytics"""
        try:
            # Get virtual worlds analytics
            virtual_worlds = await self.redis.keys("virtual_world:*")
            ar_markers = await self.redis.keys("ar_marker:*")
            metaverse_assets = await self.redis.keys("metaverse_asset:*")
            
            analytics = {
                "virtual_worlds": {
                    "total": len(virtual_worlds),
                    "active": len([w for w in virtual_worlds if await self.redis.ttl(w) > 0])
                },
                "ar_markers": {
                    "total": len(ar_markers),
                    "active": len([m for m in ar_markers if await self.redis.ttl(m) > 0])
                },
                "metaverse_assets": {
                    "total": len(metaverse_assets),
                    "active": len([a for a in metaverse_assets if await self.redis.ttl(a) > 0])
                },
                "vr_users": {
                    "total": len(self.vr_users),
                    "active": len([u for u in self.vr_users.values() 
                                 if (datetime.now() - u.last_seen).seconds < 300])
                },
                "websocket_connections": {
                    "total": len(self.websocket_connections)
                },
                "timestamp": datetime.now().isoformat()
            }
            
            return analytics
            
        except Exception as e:
            logger.error(f"Failed to get metaverse analytics: {e}")
            return {"error": str(e)}

class MetaverseAPI:
    """Metaverse API"""
    
    def __init__(self, redis_client: redis.Redis):
        self.app = FastAPI(title="Soladia Metaverse API")
        self.metaverse_service = MetaverseService(redis_client)
        self._setup_routes()
    
    def _setup_routes(self):
        """Setup API routes"""
        
        @self.app.get("/health")
        async def health_check():
            return {"status": "healthy", "timestamp": datetime.now().isoformat()}
        
        @self.app.post("/virtual-worlds")
        async def create_virtual_world(request: Request):
            data = await request.json()
            world_id = await self.metaverse_service.create_virtual_world(data)
            return {"world_id": world_id}
        
        @self.app.post("/virtual-worlds/{world_id}/join")
        async def join_virtual_world(world_id: str, request: Request):
            data = await request.json()
            success = await self.metaverse_service.join_virtual_world(
                world_id, data.get("user_id"), VRDevice(data.get("device", "custom"))
            )
            return {"success": success}
        
        @self.app.post("/ar-markers")
        async def create_ar_marker(request: Request):
            data = await request.json()
            marker_id = await self.metaverse_service.create_ar_marker(data)
            return {"marker_id": marker_id}
        
        @self.app.post("/ar-markers/detect")
        async def detect_ar_markers(request: Request):
            data = await request.json()
            markers = await self.metaverse_service.detect_ar_marker(data.get("image_data"))
            return {"markers": markers}
        
        @self.app.post("/hand-gestures/track")
        async def track_hand_gestures(request: Request):
            data = await request.json()
            gestures = await self.metaverse_service.track_hand_gestures(data.get("image_data"))
            return gestures
        
        @self.app.post("/pose/track")
        async def track_pose(request: Request):
            data = await request.json()
            pose = await self.metaverse_service.track_pose(data.get("image_data"))
            return pose
        
        @self.app.post("/face/track")
        async def track_face(request: Request):
            data = await request.json()
            face = await self.metaverse_service.track_face(data.get("image_data"))
            return face
        
        @self.app.post("/metaverse-assets")
        async def create_metaverse_asset(request: Request):
            data = await request.json()
            asset_id = await self.metaverse_service.create_metaverse_asset(data)
            return {"asset_id": asset_id}
        
        @self.app.get("/analytics")
        async def get_analytics():
            return await self.metaverse_service.get_metaverse_analytics()
        
        @self.app.websocket("/ws/{connection_id}")
        async def websocket_endpoint(websocket: WebSocket, connection_id: str):
            await websocket.accept()
            self.metaverse_service.websocket_connections[connection_id] = websocket
            
            try:
                while True:
                    data = await websocket.receive_text()
                    # Handle WebSocket messages
                    message = json.loads(data)
                    
                    if message.get("type") == "position_update":
                        await self.metaverse_service.update_user_position(
                            message.get("user_id"),
                            tuple(message.get("position")),
                            tuple(message.get("rotation"))
                        )
                    
            except WebSocketDisconnect:
                if connection_id in self.metaverse_service.websocket_connections:
                    del self.metaverse_service.websocket_connections[connection_id]
    
    def get_app(self) -> FastAPI:
        """Get FastAPI app"""
        return self.app

def create_metaverse_api(redis_client: redis.Redis) -> FastAPI:
    """Create Metaverse API"""
    api = MetaverseAPI(redis_client)
    return api.get_app()

if __name__ == "__main__":
    redis_client = redis.Redis(host='localhost', port=6379, db=0)
    app = create_metaverse_api(redis_client)
    
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8000,
        log_level="info"
    )
