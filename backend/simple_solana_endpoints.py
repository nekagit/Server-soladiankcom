"""
Simplified Solana API endpoints for testing
"""

from fastapi import APIRouter, HTTPException
from typing import Dict, Any
import json

router = APIRouter(prefix="/api/solana", tags=["solana"])

@router.get("/health")
async def solana_health_check():
    """Check Solana service health"""
    return {
        "status": "healthy",
        "rpc_url": "https://api.devnet.solana.com",
        "network": "devnet",
        "message": "Solana services are running"
    }

@router.get("/wallets/{wallet_address}/info")
async def get_wallet_info(wallet_address: str):
    """Get wallet information (mock)"""
    return {
        "public_key": wallet_address,
        "balance": 1.5,
        "is_valid": True,
        "is_active": True,
        "lamports": 1500000000,
        "owner": None,
        "executable": False,
        "rent_epoch": None
    }

@router.get("/wallets/{wallet_address}/balance")
async def get_wallet_balance(wallet_address: str):
    """Get wallet balance (mock)"""
    return {
        "balance": 1.5,
        "currency": "SOL"
    }

@router.get("/transactions/{signature}/status")
async def get_transaction_status(signature: str):
    """Get transaction status (mock)"""
    return {
        "signature": signature,
        "status": "confirmed",
        "confirmation_status": "confirmed",
        "slot": 12345,
        "block_time": "2024-01-01T00:00:00Z",
        "error": None,
        "confirmations": 32
    }

@router.get("/nfts/{mint}/metadata")
async def get_nft_metadata(mint: str):
    """Get NFT metadata (mock)"""
    return {
        "mint": mint,
        "name": f"NFT #{mint[:8]}",
        "symbol": "NFT",
        "description": "A unique digital asset on Solana",
        "image": "https://via.placeholder.com/300x300",
        "external_url": f"https://soladia.com/nft/{mint}",
        "attributes": [
            {"trait_type": "Rarity", "value": "Common"},
            {"trait_type": "Color", "value": "Blue"}
        ],
        "collection": "Soladia Collection",
        "seller_fee_basis_points": 250
    }

@router.get("/tokens/{mint}/info")
async def get_token_info(mint: str):
    """Get token information (mock)"""
    return {
        "mint": mint,
        "name": f"Token {mint[:8]}",
        "symbol": "TOKEN",
        "decimals": 9,
        "supply": 1000000000,
        "ui_supply": 1000000.0,
        "is_native": False
    }

@router.post("/payments")
async def process_payment(payment_data: Dict[str, Any]):
    """Process a payment (mock)"""
    return {
        "success": True,
        "transaction_signature": "mock_signature_123456789",
        "error_message": None,
        "escrow_address": None,
        "confirmation_status": "confirmed"
    }

@router.get("/")
async def solana_root():
    """Solana API root"""
    return {
        "message": "Solana API is running",
        "version": "1.0.0",
        "endpoints": [
            "/health",
            "/wallets/{address}/info",
            "/wallets/{address}/balance", 
            "/transactions/{signature}/status",
            "/nfts/{mint}/metadata",
            "/tokens/{mint}/info",
            "/payments"
        ]
    }
