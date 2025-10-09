"""
IoT Device Integration and Management Service for Soladia Marketplace
Provides IoT device connectivity, data collection, and smart device management
"""

import asyncio
import logging
import json
import uuid
import time
from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime, timedelta
from dataclasses import dataclass
from enum import Enum
import numpy as np
import redis
import paho.mqtt.client as mqtt
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
import uvicorn
import asyncio
import websockets
from pydantic import BaseModel
import cv2
import mediapipe as mp
from PIL import Image
import base64
import io
import serial
import bluetooth
import socket
import threading

logger = logging.getLogger(__name__)

class IoTDeviceType(Enum):
    SENSOR = "sensor"
    ACTUATOR = "actuator"
    CAMERA = "camera"
    SMART_HOME = "smart_home"
    WEARABLE = "wearable"
    VEHICLE = "vehicle"
    INDUSTRIAL = "industrial"
    MEDICAL = "medical"
    AGRICULTURE = "agriculture"
    ENVIRONMENTAL = "environmental"

class IoTProtocol(Enum):
    MQTT = "mqtt"
    HTTP = "http"
    COAP = "coap"
    BLUETOOTH = "bluetooth"
    ZIGBEE = "zigbee"
    Z_WAVE = "z_wave"
    LORA = "lora"
    WIFI = "wifi"
    CELLULAR = "cellular"
    SERIAL = "serial"

class IoTDataFormat(Enum):
    JSON = "json"
    XML = "xml"
    CSV = "csv"
    BINARY = "binary"
    PROTOBUF = "protobuf"
    MESSAGE_PACK = "messagepack"

@dataclass
class IoTDevice:
    """IoT device configuration"""
    device_id: str
    name: str
    type: IoTDeviceType
    protocol: IoTProtocol
    data_format: IoTDataFormat
    location: Tuple[float, float, float]
    status: str  # online, offline, error
    last_seen: datetime
    capabilities: List[str]
    metadata: Dict[str, Any]
    owner_id: str
    created_at: datetime
    is_active: bool = True

@dataclass
class IoTSensorData:
    """IoT sensor data"""
    device_id: str
    sensor_type: str
    value: float
    unit: str
    timestamp: datetime
    quality: float  # Data quality score
    location: Tuple[float, float, float]
    metadata: Dict[str, Any]

@dataclass
class IoTCommand:
    """IoT device command"""
    command_id: str
    device_id: str
    command_type: str
    parameters: Dict[str, Any]
    timestamp: datetime
    status: str  # pending, executing, completed, failed
    result: Optional[Dict[str, Any]] = None

class IoTDeviceManager:
    """IoT device management service"""
    
    def __init__(self, redis_client: redis.Redis):
        self.redis = redis_client
        self.devices: Dict[str, IoTDevice] = {}
        self.sensor_data: Dict[str, List[IoTSensorData]] = {}
        self.commands: Dict[str, IoTCommand] = {}
        self.mqtt_client: Optional[mqtt.Client] = None
        self.websocket_connections: Dict[str, WebSocket] = {}
        
        # Initialize MQTT client
        self._initialize_mqtt()
        
        # Initialize Bluetooth
        self._initialize_bluetooth()
        
        # Initialize serial connections
        self._initialize_serial()
    
    def _initialize_mqtt(self):
        """Initialize MQTT client for IoT communication"""
        try:
            self.mqtt_client = mqtt.Client()
            self.mqtt_client.on_connect = self._on_mqtt_connect
            self.mqtt_client.on_message = self._on_mqtt_message
            self.mqtt_client.on_disconnect = self._on_mqtt_disconnect
            
            # Connect to MQTT broker
            self.mqtt_client.connect("localhost", 1883, 60)
            self.mqtt_client.loop_start()
            
        except Exception as e:
            logger.error(f"Failed to initialize MQTT: {e}")
    
    def _on_mqtt_connect(self, client, userdata, flags, rc):
        """MQTT connection callback"""
        if rc == 0:
            logger.info("Connected to MQTT broker")
            # Subscribe to IoT topics
            client.subscribe("iot/+/data")
            client.subscribe("iot/+/status")
            client.subscribe("iot/+/command")
        else:
            logger.error(f"Failed to connect to MQTT broker: {rc}")
    
    def _on_mqtt_message(self, client, userdata, msg):
        """MQTT message callback"""
        try:
            topic = msg.topic
            payload = json.loads(msg.payload.decode())
            
            # Parse topic to get device ID
            topic_parts = topic.split("/")
            if len(topic_parts) >= 3:
                device_id = topic_parts[1]
                message_type = topic_parts[2]
                
                if message_type == "data":
                    asyncio.create_task(self._handle_sensor_data(device_id, payload))
                elif message_type == "status":
                    asyncio.create_task(self._handle_device_status(device_id, payload))
                elif message_type == "command":
                    asyncio.create_task(self._handle_command_response(device_id, payload))
                    
        except Exception as e:
            logger.error(f"Failed to handle MQTT message: {e}")
    
    def _on_mqtt_disconnect(self, client, userdata, rc):
        """MQTT disconnection callback"""
        logger.warning(f"Disconnected from MQTT broker: {rc}")
    
    def _initialize_bluetooth(self):
        """Initialize Bluetooth for IoT devices"""
        try:
            # Scan for nearby Bluetooth devices
            nearby_devices = bluetooth.discover_devices(lookup_names=True)
            logger.info(f"Found {len(nearby_devices)} Bluetooth devices")
            
        except Exception as e:
            logger.error(f"Failed to initialize Bluetooth: {e}")
    
    def _initialize_serial(self):
        """Initialize serial connections for IoT devices"""
        try:
            # List available serial ports
            import serial.tools.list_ports
            ports = serial.tools.list_ports.comports()
            logger.info(f"Found {len(ports)} serial ports")
            
        except Exception as e:
            logger.error(f"Failed to initialize serial: {e}")
    
    async def register_device(self, device_data: Dict[str, Any]) -> str:
        """Register new IoT device"""
        try:
            device_id = f"iot_{uuid.uuid4().hex[:16]}"
            
            iot_device = IoTDevice(
                device_id=device_id,
                name=device_data.get("name", "Untitled Device"),
                type=IoTDeviceType(device_data.get("type", "sensor")),
                protocol=IoTProtocol(device_data.get("protocol", "mqtt")),
                data_format=IoTDataFormat(device_data.get("data_format", "json")),
                location=tuple(device_data.get("location", [0, 0, 0])),
                status="offline",
                last_seen=datetime.now(),
                capabilities=device_data.get("capabilities", []),
                metadata=device_data.get("metadata", {}),
                owner_id=device_data.get("owner_id", ""),
                created_at=datetime.now(),
                is_active=True
            )
            
            self.devices[device_id] = iot_device
            
            # Store in Redis
            await self.redis.setex(
                f"iot_device:{device_id}",
                86400 * 30,  # 30 days TTL
                json.dumps({
                    "device_id": device_id,
                    "name": iot_device.name,
                    "type": iot_device.type.value,
                    "protocol": iot_device.protocol.value,
                    "data_format": iot_device.data_format.value,
                    "location": iot_device.location,
                    "status": iot_device.status,
                    "last_seen": iot_device.last_seen.isoformat(),
                    "capabilities": iot_device.capabilities,
                    "metadata": iot_device.metadata,
                    "owner_id": iot_device.owner_id,
                    "created_at": iot_device.created_at.isoformat(),
                    "is_active": iot_device.is_active
                })
            )
            
            return device_id
            
        except Exception as e:
            logger.error(f"Failed to register device: {e}")
            raise
    
    async def _handle_sensor_data(self, device_id: str, data: Dict[str, Any]):
        """Handle incoming sensor data"""
        try:
            if device_id not in self.devices:
                return
            
            device = self.devices[device_id]
            
            # Create sensor data object
            sensor_data = IoTSensorData(
                device_id=device_id,
                sensor_type=data.get("sensor_type", "unknown"),
                value=data.get("value", 0.0),
                unit=data.get("unit", ""),
                timestamp=datetime.now(),
                quality=data.get("quality", 1.0),
                location=device.location,
                metadata=data.get("metadata", {})
            )
            
            # Store sensor data
            if device_id not in self.sensor_data:
                self.sensor_data[device_id] = []
            
            self.sensor_data[device_id].append(sensor_data)
            
            # Keep only last 1000 data points
            if len(self.sensor_data[device_id]) > 1000:
                self.sensor_data[device_id] = self.sensor_data[device_id][-1000:]
            
            # Update device status
            device.status = "online"
            device.last_seen = datetime.now()
            
            # Store in Redis
            await self.redis.setex(
                f"iot_sensor_data:{device_id}",
                86400,  # 1 day TTL
                json.dumps([{
                    "device_id": sensor_data.device_id,
                    "sensor_type": sensor_data.sensor_type,
                    "value": sensor_data.value,
                    "unit": sensor_data.unit,
                    "timestamp": sensor_data.timestamp.isoformat(),
                    "quality": sensor_data.quality,
                    "location": sensor_data.location,
                    "metadata": sensor_data.metadata
                } for sensor_data in self.sensor_data[device_id][-100:]])  # Last 100 data points
            )
            
            # Broadcast to WebSocket connections
            await self._broadcast_sensor_data(device_id, sensor_data)
            
        except Exception as e:
            logger.error(f"Failed to handle sensor data: {e}")
    
    async def _handle_device_status(self, device_id: str, status_data: Dict[str, Any]):
        """Handle device status updates"""
        try:
            if device_id not in self.devices:
                return
            
            device = self.devices[device_id]
            device.status = status_data.get("status", "unknown")
            device.last_seen = datetime.now()
            
            # Update device metadata
            if "metadata" in status_data:
                device.metadata.update(status_data["metadata"])
            
            # Store updated device info
            await self.redis.setex(
                f"iot_device:{device_id}",
                86400 * 30,
                json.dumps({
                    "device_id": device_id,
                    "name": device.name,
                    "type": device.type.value,
                    "protocol": device.protocol.value,
                    "data_format": device.data_format.value,
                    "location": device.location,
                    "status": device.status,
                    "last_seen": device.last_seen.isoformat(),
                    "capabilities": device.capabilities,
                    "metadata": device.metadata,
                    "owner_id": device.owner_id,
                    "created_at": device.created_at.isoformat(),
                    "is_active": device.is_active
                })
            )
            
            # Broadcast status update
            await self._broadcast_device_status(device_id, device)
            
        except Exception as e:
            logger.error(f"Failed to handle device status: {e}")
    
    async def _handle_command_response(self, device_id: str, response_data: Dict[str, Any]):
        """Handle command response from device"""
        try:
            command_id = response_data.get("command_id")
            if command_id and command_id in self.commands:
                command = self.commands[command_id]
                command.status = response_data.get("status", "completed")
                command.result = response_data.get("result")
                
                # Broadcast command response
                await self._broadcast_command_response(command_id, command)
                
        except Exception as e:
            logger.error(f"Failed to handle command response: {e}")
    
    async def send_command(self, device_id: str, command_type: str, 
                          parameters: Dict[str, Any]) -> str:
        """Send command to IoT device"""
        try:
            if device_id not in self.devices:
                raise ValueError(f"Device {device_id} not found")
            
            device = self.devices[device_id]
            command_id = f"cmd_{uuid.uuid4().hex[:16]}"
            
            # Create command
            command = IoTCommand(
                command_id=command_id,
                device_id=device_id,
                command_type=command_type,
                parameters=parameters,
                timestamp=datetime.now(),
                status="pending"
            )
            
            self.commands[command_id] = command
            
            # Send command based on protocol
            if device.protocol == IoTProtocol.MQTT:
                await self._send_mqtt_command(device_id, command)
            elif device.protocol == IoTProtocol.HTTP:
                await self._send_http_command(device_id, command)
            elif device.protocol == IoTProtocol.BLUETOOTH:
                await self._send_bluetooth_command(device_id, command)
            elif device.protocol == IoTProtocol.SERIAL:
                await self._send_serial_command(device_id, command)
            
            return command_id
            
        except Exception as e:
            logger.error(f"Failed to send command: {e}")
            raise
    
    async def _send_mqtt_command(self, device_id: str, command: IoTCommand):
        """Send command via MQTT"""
        try:
            if self.mqtt_client:
                topic = f"iot/{device_id}/command"
                payload = {
                    "command_id": command.command_id,
                    "command_type": command.command_type,
                    "parameters": command.parameters,
                    "timestamp": command.timestamp.isoformat()
                }
                
                self.mqtt_client.publish(topic, json.dumps(payload))
                command.status = "executing"
                
        except Exception as e:
            logger.error(f"Failed to send MQTT command: {e}")
            command.status = "failed"
    
    async def _send_http_command(self, device_id: str, command: IoTCommand):
        """Send command via HTTP"""
        try:
            import aiohttp
            
            device = self.devices[device_id]
            device_url = device.metadata.get("url", f"http://{device_id}:8080")
            
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    f"{device_url}/command",
                    json={
                        "command_id": command.command_id,
                        "command_type": command.command_type,
                        "parameters": command.parameters
                    }
                ) as response:
                    if response.status == 200:
                        command.status = "executing"
                    else:
                        command.status = "failed"
                        
        except Exception as e:
            logger.error(f"Failed to send HTTP command: {e}")
            command.status = "failed"
    
    async def _send_bluetooth_command(self, device_id: str, command: IoTCommand):
        """Send command via Bluetooth"""
        try:
            device = self.devices[device_id]
            bluetooth_address = device.metadata.get("bluetooth_address")
            
            if bluetooth_address:
                # Connect to Bluetooth device
                sock = bluetooth.BluetoothSocket(bluetooth.RFCOMM)
                sock.connect((bluetooth_address, 1))
                
                # Send command
                command_data = json.dumps({
                    "command_id": command.command_id,
                    "command_type": command.command_type,
                    "parameters": command.parameters
                })
                
                sock.send(command_data.encode())
                sock.close()
                
                command.status = "executing"
            else:
                command.status = "failed"
                
        except Exception as e:
            logger.error(f"Failed to send Bluetooth command: {e}")
            command.status = "failed"
    
    async def _send_serial_command(self, device_id: str, command: IoTCommand):
        """Send command via Serial"""
        try:
            device = self.devices[device_id]
            serial_port = device.metadata.get("serial_port", "/dev/ttyUSB0")
            baud_rate = device.metadata.get("baud_rate", 9600)
            
            # Open serial connection
            ser = serial.Serial(serial_port, baud_rate, timeout=1)
            
            # Send command
            command_data = json.dumps({
                "command_id": command.command_id,
                "command_type": command.command_type,
                "parameters": command.parameters
            })
            
            ser.write(command_data.encode())
            ser.close()
            
            command.status = "executing"
            
        except Exception as e:
            logger.error(f"Failed to send serial command: {e}")
            command.status = "failed"
    
    async def get_device_data(self, device_id: str, limit: int = 100) -> List[Dict[str, Any]]:
        """Get device sensor data"""
        try:
            if device_id not in self.sensor_data:
                # Load from Redis
                data = await self.redis.get(f"iot_sensor_data:{device_id}")
                if data:
                    return json.loads(data)[-limit:]
                return []
            
            # Return recent data
            recent_data = self.sensor_data[device_id][-limit:]
            return [{
                "device_id": sensor_data.device_id,
                "sensor_type": sensor_data.sensor_type,
                "value": sensor_data.value,
                "unit": sensor_data.unit,
                "timestamp": sensor_data.timestamp.isoformat(),
                "quality": sensor_data.quality,
                "location": sensor_data.location,
                "metadata": sensor_data.metadata
            } for sensor_data in recent_data]
            
        except Exception as e:
            logger.error(f"Failed to get device data: {e}")
            return []
    
    async def get_device_analytics(self, device_id: str) -> Dict[str, Any]:
        """Get device analytics"""
        try:
            if device_id not in self.sensor_data:
                return {"error": "No data available"}
            
            data = self.sensor_data[device_id]
            if not data:
                return {"error": "No data available"}
            
            # Calculate analytics
            values = [d.value for d in data]
            timestamps = [d.timestamp for d in data]
            
            analytics = {
                "device_id": device_id,
                "total_readings": len(data),
                "time_range": {
                    "start": min(timestamps).isoformat(),
                    "end": max(timestamps).isoformat()
                },
                "statistics": {
                    "mean": float(np.mean(values)),
                    "median": float(np.median(values)),
                    "std": float(np.std(values)),
                    "min": float(np.min(values)),
                    "max": float(np.max(values))
                },
                "quality_score": float(np.mean([d.quality for d in data])),
                "sensor_types": list(set([d.sensor_type for d in data])),
                "units": list(set([d.unit for d in data if d.unit])),
                "timestamp": datetime.now().isoformat()
            }
            
            return analytics
            
        except Exception as e:
            logger.error(f"Failed to get device analytics: {e}")
            return {"error": str(e)}
    
    async def _broadcast_sensor_data(self, device_id: str, sensor_data: IoTSensorData):
        """Broadcast sensor data to WebSocket connections"""
        try:
            message = {
                "type": "sensor_data",
                "device_id": device_id,
                "sensor_type": sensor_data.sensor_type,
                "value": sensor_data.value,
                "unit": sensor_data.unit,
                "timestamp": sensor_data.timestamp.isoformat(),
                "quality": sensor_data.quality,
                "location": sensor_data.location,
                "metadata": sensor_data.metadata
            }
            
            # Send to all WebSocket connections
            for connection_id, websocket in self.websocket_connections.items():
                try:
                    await websocket.send_text(json.dumps(message))
                except Exception as e:
                    logger.error(f"Failed to send to {connection_id}: {e}")
                    # Remove disconnected connection
                    del self.websocket_connections[connection_id]
                    
        except Exception as e:
            logger.error(f"Failed to broadcast sensor data: {e}")
    
    async def _broadcast_device_status(self, device_id: str, device: IoTDevice):
        """Broadcast device status to WebSocket connections"""
        try:
            message = {
                "type": "device_status",
                "device_id": device_id,
                "name": device.name,
                "status": device.status,
                "last_seen": device.last_seen.isoformat(),
                "capabilities": device.capabilities,
                "metadata": device.metadata
            }
            
            # Send to all WebSocket connections
            for connection_id, websocket in self.websocket_connections.items():
                try:
                    await websocket.send_text(json.dumps(message))
                except Exception as e:
                    logger.error(f"Failed to send to {connection_id}: {e}")
                    # Remove disconnected connection
                    del self.websocket_connections[connection_id]
                    
        except Exception as e:
            logger.error(f"Failed to broadcast device status: {e}")
    
    async def _broadcast_command_response(self, command_id: str, command: IoTCommand):
        """Broadcast command response to WebSocket connections"""
        try:
            message = {
                "type": "command_response",
                "command_id": command_id,
                "device_id": command.device_id,
                "command_type": command.command_type,
                "status": command.status,
                "result": command.result,
                "timestamp": command.timestamp.isoformat()
            }
            
            # Send to all WebSocket connections
            for connection_id, websocket in self.websocket_connections.items():
                try:
                    await websocket.send_text(json.dumps(message))
                except Exception as e:
                    logger.error(f"Failed to send to {connection_id}: {e}")
                    # Remove disconnected connection
                    del self.websocket_connections[connection_id]
                    
        except Exception as e:
            logger.error(f"Failed to broadcast command response: {e}")
    
    async def get_iot_analytics(self) -> Dict[str, Any]:
        """Get IoT analytics"""
        try:
            # Get device analytics
            devices = await self.redis.keys("iot_device:*")
            sensor_data = await self.redis.keys("iot_sensor_data:*")
            
            analytics = {
                "devices": {
                    "total": len(devices),
                    "active": len([d for d in devices if await self.redis.ttl(d) > 0])
                },
                "sensor_data": {
                    "total": len(sensor_data),
                    "active": len([s for s in sensor_data if await self.redis.ttl(s) > 0])
                },
                "device_types": {},
                "protocols": {},
                "websocket_connections": {
                    "total": len(self.websocket_connections)
                },
                "commands": {
                    "total": len(self.commands),
                    "pending": len([c for c in self.commands.values() if c.status == "pending"]),
                    "executing": len([c for c in self.commands.values() if c.status == "executing"]),
                    "completed": len([c for c in self.commands.values() if c.status == "completed"]),
                    "failed": len([c for c in self.commands.values() if c.status == "failed"])
                },
                "timestamp": datetime.now().isoformat()
            }
            
            # Analyze device types and protocols
            for device in self.devices.values():
                device_type = device.type.value
                protocol = device.protocol.value
                
                if device_type not in analytics["device_types"]:
                    analytics["device_types"][device_type] = 0
                analytics["device_types"][device_type] += 1
                
                if protocol not in analytics["protocols"]:
                    analytics["protocols"][protocol] = 0
                analytics["protocols"][protocol] += 1
            
            return analytics
            
        except Exception as e:
            logger.error(f"Failed to get IoT analytics: {e}")
            return {"error": str(e)}

class IoTAPI:
    """IoT API"""
    
    def __init__(self, redis_client: redis.Redis):
        self.app = FastAPI(title="Soladia IoT API")
        self.iot_service = IoTDeviceManager(redis_client)
        self._setup_routes()
    
    def _setup_routes(self):
        """Setup API routes"""
        
        @self.app.get("/health")
        async def health_check():
            return {"status": "healthy", "timestamp": datetime.now().isoformat()}
        
        @self.app.post("/devices")
        async def register_device(request: Request):
            data = await request.json()
            device_id = await self.iot_service.register_device(data)
            return {"device_id": device_id}
        
        @self.app.get("/devices/{device_id}/data")
        async def get_device_data(device_id: str, limit: int = 100):
            data = await self.iot_service.get_device_data(device_id, limit)
            return {"data": data}
        
        @self.app.get("/devices/{device_id}/analytics")
        async def get_device_analytics(device_id: str):
            analytics = await self.iot_service.get_device_analytics(device_id)
            return analytics
        
        @self.app.post("/devices/{device_id}/commands")
        async def send_command(device_id: str, request: Request):
            data = await request.json()
            command_id = await self.iot_service.send_command(
                device_id, 
                data.get("command_type"), 
                data.get("parameters", {})
            )
            return {"command_id": command_id}
        
        @self.app.get("/analytics")
        async def get_analytics():
            return await self.iot_service.get_iot_analytics()
        
        @self.app.websocket("/ws/{connection_id}")
        async def websocket_endpoint(websocket: WebSocket, connection_id: str):
            await websocket.accept()
            self.iot_service.websocket_connections[connection_id] = websocket
            
            try:
                while True:
                    data = await websocket.receive_text()
                    # Handle WebSocket messages
                    message = json.loads(data)
                    
                    if message.get("type") == "subscribe_device":
                        # Subscribe to specific device updates
                        device_id = message.get("device_id")
                        # Implementation for device subscription
                    
            except WebSocketDisconnect:
                if connection_id in self.iot_service.websocket_connections:
                    del self.iot_service.websocket_connections[connection_id]
    
    def get_app(self) -> FastAPI:
        """Get FastAPI app"""
        return self.app

def create_iot_api(redis_client: redis.Redis) -> FastAPI:
    """Create IoT API"""
    api = IoTAPI(redis_client)
    return api.get_app()

if __name__ == "__main__":
    redis_client = redis.Redis(host='localhost', port=6379, db=0)
    app = create_iot_api(redis_client)
    
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8000,
        log_level="info"
    )
