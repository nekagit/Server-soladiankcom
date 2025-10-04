"""
WebSocket endpoints for real-time Solana updates
"""

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, Query
from typing import Optional, List
import json
import logging

from websocket_service import manager, websocket_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ws", tags=["websocket"])

@router.websocket("/solana")
async def websocket_endpoint(websocket: WebSocket, user_id: Optional[str] = Query(None)):
    """Main WebSocket endpoint for Solana real-time updates"""
    client_id = None
    try:
        # Accept connection
        client_id = await manager.connect(websocket, user_id)
        
        # Send welcome message
        welcome_message = {
            "type": "connection_established",
            "data": {
                "client_id": client_id,
                "user_id": user_id,
                "available_topics": list(manager.subscriptions.keys()),
                "message": "Connected to Solana real-time updates"
            }
        }
        await manager.send_personal_message(json.dumps(welcome_message), websocket)
        
        # Handle incoming messages
        while True:
            try:
                data = await websocket.receive_text()
                message = json.loads(data)
                await handle_websocket_message(websocket, message)
                
            except WebSocketDisconnect:
                break
            except json.JSONDecodeError:
                error_message = {
                    "type": "error",
                    "data": {
                        "message": "Invalid JSON format",
                        "timestamp": "2024-01-20T10:30:00Z"
                    }
                }
                await manager.send_personal_message(json.dumps(error_message), websocket)
            except Exception as e:
                logger.error(f"Error handling WebSocket message: {e}")
                error_message = {
                    "type": "error",
                    "data": {
                        "message": f"Error processing message: {str(e)}",
                        "timestamp": "2024-01-20T10:30:00Z"
                    }
                }
                await manager.send_personal_message(json.dumps(error_message), websocket)
    
    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected: {client_id}")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
    finally:
        manager.disconnect(websocket)

async def handle_websocket_message(websocket: WebSocket, message: dict):
    """Handle incoming WebSocket messages"""
    message_type = message.get("type")
    data = message.get("data", {})
    
    if message_type == "subscribe":
        topic = data.get("topic")
        if topic and topic in manager.subscriptions:
            await manager.subscribe_to_topic(websocket, topic)
            response = {
                "type": "subscription_confirmed",
                "data": {
                    "topic": topic,
                    "status": "subscribed",
                    "message": f"Successfully subscribed to {topic}"
                }
            }
            await manager.send_personal_message(json.dumps(response), websocket)
        else:
            error_response = {
                "type": "subscription_error",
                "data": {
                    "topic": topic,
                    "status": "failed",
                    "message": f"Invalid topic: {topic}"
                }
            }
            await manager.send_personal_message(json.dumps(error_response), websocket)
    
    elif message_type == "unsubscribe":
        topic = data.get("topic")
        if topic and topic in manager.subscriptions:
            await manager.unsubscribe_from_topic(websocket, topic)
            response = {
                "type": "unsubscription_confirmed",
                "data": {
                    "topic": topic,
                    "status": "unsubscribed",
                    "message": f"Successfully unsubscribed from {topic}"
                }
            }
            await manager.send_personal_message(json.dumps(response), websocket)
    
    elif message_type == "ping":
        pong_response = {
            "type": "pong",
            "data": {
                "timestamp": "2024-01-20T10:30:00Z",
                "message": "Pong!"
            }
        }
        await manager.send_personal_message(json.dumps(pong_response), websocket)
    
    elif message_type == "get_stats":
        stats = manager.get_stats()
        stats_response = {
            "type": "stats",
            "data": stats
        }
        await manager.send_personal_message(json.dumps(stats_response), websocket)
    
    elif message_type == "get_connection_info":
        connection_info = manager.get_connection_info(websocket)
        info_response = {
            "type": "connection_info",
            "data": connection_info
        }
        await manager.send_personal_message(json.dumps(info_response), websocket)
    
    else:
        error_response = {
            "type": "error",
            "data": {
                "message": f"Unknown message type: {message_type}",
                "supported_types": ["subscribe", "unsubscribe", "ping", "get_stats", "get_connection_info"]
            }
        }
        await manager.send_personal_message(json.dumps(error_response), websocket)

@router.websocket("/solana/wallet/{wallet_address}")
async def wallet_websocket_endpoint(websocket: WebSocket, wallet_address: str):
    """WebSocket endpoint for specific wallet updates"""
    client_id = None
    try:
        # Accept connection
        client_id = await manager.connect(websocket)
        
        # Subscribe to wallet updates
        await manager.subscribe_to_topic(websocket, "wallet_updates")
        
        # Send wallet-specific welcome message
        welcome_message = {
            "type": "wallet_connection_established",
            "data": {
                "client_id": client_id,
                "wallet_address": wallet_address,
                "message": f"Connected to wallet updates for {wallet_address}"
            }
        }
        await manager.send_personal_message(json.dumps(welcome_message), websocket)
        
        # Handle incoming messages
        while True:
            try:
                data = await websocket.receive_text()
                message = json.loads(data)
                await handle_websocket_message(websocket, message)
                
            except WebSocketDisconnect:
                break
            except Exception as e:
                logger.error(f"Error in wallet WebSocket: {e}")
                break
    
    except WebSocketDisconnect:
        logger.info(f"Wallet WebSocket disconnected: {client_id}")
    except Exception as e:
        logger.error(f"Wallet WebSocket error: {e}")
    finally:
        manager.disconnect(websocket)

@router.websocket("/solana/transactions")
async def transactions_websocket_endpoint(websocket: WebSocket):
    """WebSocket endpoint for transaction updates"""
    client_id = None
    try:
        # Accept connection
        client_id = await manager.connect(websocket)
        
        # Subscribe to transaction updates
        await manager.subscribe_to_topic(websocket, "transaction_updates")
        
        # Send transaction-specific welcome message
        welcome_message = {
            "type": "transaction_connection_established",
            "data": {
                "client_id": client_id,
                "message": "Connected to transaction updates"
            }
        }
        await manager.send_personal_message(json.dumps(welcome_message), websocket)
        
        # Handle incoming messages
        while True:
            try:
                data = await websocket.receive_text()
                message = json.loads(data)
                await handle_websocket_message(websocket, message)
                
            except WebSocketDisconnect:
                break
            except Exception as e:
                logger.error(f"Error in transaction WebSocket: {e}")
                break
    
    except WebSocketDisconnect:
        logger.info(f"Transaction WebSocket disconnected: {client_id}")
    except Exception as e:
        logger.error(f"Transaction WebSocket error: {e}")
    finally:
        manager.disconnect(websocket)

@router.websocket("/solana/nfts")
async def nfts_websocket_endpoint(websocket: WebSocket):
    """WebSocket endpoint for NFT updates"""
    client_id = None
    try:
        # Accept connection
        client_id = await manager.connect(websocket)
        
        # Subscribe to NFT updates
        await manager.subscribe_to_topic(websocket, "nft_updates")
        
        # Send NFT-specific welcome message
        welcome_message = {
            "type": "nft_connection_established",
            "data": {
                "client_id": client_id,
                "message": "Connected to NFT updates"
            }
        }
        await manager.send_personal_message(json.dumps(welcome_message), websocket)
        
        # Handle incoming messages
        while True:
            try:
                data = await websocket.receive_text()
                message = json.loads(data)
                await handle_websocket_message(websocket, message)
                
            except WebSocketDisconnect:
                break
            except Exception as e:
                logger.error(f"Error in NFT WebSocket: {e}")
                break
    
    except WebSocketDisconnect:
        logger.info(f"NFT WebSocket disconnected: {client_id}")
    except Exception as e:
        logger.error(f"NFT WebSocket error: {e}")
    finally:
        manager.disconnect(websocket)

@router.websocket("/solana/market")
async def market_websocket_endpoint(websocket: WebSocket):
    """WebSocket endpoint for market updates"""
    client_id = None
    try:
        # Accept connection
        client_id = await manager.connect(websocket)
        
        # Subscribe to market updates
        await manager.subscribe_to_topic(websocket, "market_updates")
        
        # Send market-specific welcome message
        welcome_message = {
            "type": "market_connection_established",
            "data": {
                "client_id": client_id,
                "message": "Connected to market updates"
            }
        }
        await manager.send_personal_message(json.dumps(welcome_message), websocket)
        
        # Handle incoming messages
        while True:
            try:
                data = await websocket.receive_text()
                message = json.loads(data)
                await handle_websocket_message(websocket, message)
                
            except WebSocketDisconnect:
                break
            except Exception as e:
                logger.error(f"Error in market WebSocket: {e}")
                break
    
    except WebSocketDisconnect:
        logger.info(f"Market WebSocket disconnected: {client_id}")
    except Exception as e:
        logger.error(f"Market WebSocket error: {e}")
    finally:
        manager.disconnect(websocket)
