"""
Enhanced Solana API endpoints with real RPC integration
"""

from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional, Dict, Any
import asyncio
import logging

from solana.enhanced_service import EnhancedSolanaService
from solana.config import solana_config

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/solana", tags=["solana"])

@router.get("/health")
async def solana_health_check():
    """Check Solana service health with real RPC integration"""
    try:
        async with EnhancedSolanaService(solana_config) as service:
            health_info = await service.get_system_health()
            return {
                "status": "healthy" if health_info["rpc_status"] == "healthy" else "unhealthy",
                "rpc_url": solana_config.rpc_url,
                "network": solana_config.network,
                "version": health_info.get("version"),
                "current_slot": health_info.get("current_slot"),
                "timestamp": health_info.get("timestamp"),
                "message": "Solana services are running with real RPC integration"
            }
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        return {
            "status": "unhealthy",
            "rpc_url": solana_config.rpc_url,
            "network": solana_config.network,
            "error": str(e),
            "message": "Solana services are experiencing issues"
        }

@router.get("/wallets/{wallet_address}/info")
async def get_wallet_info(wallet_address: str):
    """Get comprehensive wallet information"""
    try:
        async with EnhancedSolanaService(solana_config) as service:
            wallet_info = await service.get_wallet_info(wallet_address)
            return {
                "address": wallet_info.address,
                "balance": wallet_info.balance,
                "lamports": wallet_info.lamports,
                "exists": wallet_info.exists,
                "owner": wallet_info.owner,
                "executable": wallet_info.executable,
                "rent_epoch": wallet_info.rent_epoch,
                "network": solana_config.network
            }
    except Exception as e:
        logger.error(f"Failed to get wallet info for {wallet_address}: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/wallets/{wallet_address}/balance")
async def get_wallet_balance(wallet_address: str):
    """Get wallet balance"""
    try:
        async with EnhancedSolanaService(solana_config) as service:
            wallet_info = await service.get_wallet_info(wallet_address)
            return {
                "address": wallet_info.address,
                "balance": wallet_info.balance,
                "lamports": wallet_info.lamports,
                "exists": wallet_info.exists,
                "network": solana_config.network
            }
    except Exception as e:
        logger.error(f"Failed to get wallet balance for {wallet_address}: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/wallets/{wallet_address}/tokens")
async def get_wallet_tokens(wallet_address: str):
    """Get all token accounts for a wallet"""
    try:
        async with EnhancedSolanaService(solana_config) as service:
            tokens = await service.get_token_accounts(wallet_address)
            return {
                "address": wallet_address,
                "tokens": [
                    {
                        "mint": token.mint,
                        "name": token.name,
                        "symbol": token.symbol,
                        "decimals": token.decimals,
                        "balance": token.balance,
                        "ui_amount": token.ui_amount,
                        "supply": token.supply
                    }
                    for token in tokens
                ],
                "count": len(tokens),
                "network": solana_config.network
            }
    except Exception as e:
        logger.error(f"Failed to get tokens for {wallet_address}: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/transactions/{signature}/status")
async def get_transaction_status(signature: str):
    """Get transaction status"""
    try:
        async with EnhancedSolanaService(solana_config) as service:
            tx_info = await service.get_transaction_info(signature)
            return {
                "signature": tx_info.signature,
                "slot": tx_info.slot,
                "block_time": tx_info.block_time,
                "confirmation_status": tx_info.confirmation_status,
                "success": tx_info.success,
                "error": tx_info.error,
                "logs": tx_info.logs,
                "fee": tx_info.fee,
                "network": solana_config.network
            }
    except Exception as e:
        logger.error(f"Failed to get transaction status for {signature}: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/nfts/{mint}/metadata")
async def get_nft_metadata(mint: str):
    """Get NFT metadata"""
    try:
        async with EnhancedSolanaService(solana_config) as service:
            metadata = await service.get_nft_metadata(mint)
            return {
                "mint": metadata["mint"],
                "name": metadata["name"],
                "description": metadata["description"],
                "image": metadata["image"],
                "attributes": metadata["attributes"],
                "collection": metadata["collection"],
                "status": metadata["status"],
                "network": solana_config.network
            }
    except Exception as e:
        logger.error(f"Failed to get NFT metadata for {mint}: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/tokens/{mint}/info")
async def get_token_info(mint: str):
    """Get token information"""
    try:
        async with EnhancedSolanaService(solana_config) as service:
            # This would need to be implemented in the service
            return {
                "mint": mint,
                "name": f"Token {mint[:8]}",
                "symbol": "UNKNOWN",
                "decimals": 9,
                "supply": None,
                "network": solana_config.network,
                "message": "Token info endpoint (simplified implementation)"
            }
    except Exception as e:
        logger.error(f"Failed to get token info for {mint}: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/payments/simulate")
async def simulate_payment(
    from_wallet: str,
    to_wallet: str,
    amount: float,
    token: str = "SOL"
):
    """Simulate a payment transaction"""
    try:
        async with EnhancedSolanaService(solana_config) as service:
            if token == "SOL":
                result = await service.simulate_payment(from_wallet, to_wallet, amount)
            else:
                # For token payments, check token balance
                balance = await service.get_token_balance(from_wallet, token)
                result = {
                    "success": balance >= amount,
                    "from_balance": balance,
                    "amount": amount,
                    "token": token,
                    "error": None if balance >= amount else f"Insufficient {token} balance"
                }
            
            return {
                "simulation": result,
                "network": solana_config.network,
                "timestamp": asyncio.get_event_loop().time()
            }
    except Exception as e:
        logger.error(f"Failed to simulate payment: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/payments")
async def create_payment(
    from_wallet: str,
    to_wallet: str,
    amount: float,
    memo: Optional[str] = None,
    token: str = "SOL"
):
    """Create a payment transaction"""
    try:
        async with EnhancedSolanaService(solana_config) as service:
            if token == "SOL":
                result = await service.create_payment_transaction(from_wallet, to_wallet, amount, memo)
            else:
                result = {
                    "from_wallet": from_wallet,
                    "to_wallet": to_wallet,
                    "amount": amount,
                    "token": token,
                    "memo": memo,
                    "status": "created",
                    "message": "Token payment created (mock implementation)"
                }
            
            return {
                "payment": result,
                "network": solana_config.network,
                "timestamp": asyncio.get_event_loop().time()
            }
    except Exception as e:
        logger.error(f"Failed to create payment: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/network/info")
async def get_network_info():
    """Get network information"""
    try:
        async with EnhancedSolanaService(solana_config) as service:
            network_info = await service.get_network_info()
            return {
                "network": network_info["network"],
                "rpc_url": network_info["rpc_url"],
                "version": network_info["version"],
                "genesis_hash": network_info["genesis_hash"]
            }
    except Exception as e:
        logger.error(f"Failed to get network info: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/fees/estimate")
async def estimate_transaction_fee(transaction_size: int = Query(1232, description="Transaction size in bytes")):
    """Estimate transaction fee"""
    try:
        async with EnhancedSolanaService(solana_config) as service:
            fee_info = await service.estimate_transaction_fee(transaction_size)
            return {
                "fee_estimation": fee_info,
                "network": solana_config.network
            }
    except Exception as e:
        logger.error(f"Failed to estimate transaction fee: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/")
async def solana_root():
    """Root Solana API endpoint"""
    return {
        "message": "Soladia Solana API",
        "version": "2.0.0",
        "network": solana_config.network,
        "rpc_url": solana_config.rpc_url,
        "endpoints": [
            "/health",
            "/wallets/{address}/info",
            "/wallets/{address}/balance", 
            "/wallets/{address}/tokens",
            "/transactions/{signature}/status",
            "/nfts/{mint}/metadata",
            "/tokens/{mint}/info",
            "/payments/simulate",
            "/payments",
            "/network/info",
            "/fees/estimate"
        ]
    }
