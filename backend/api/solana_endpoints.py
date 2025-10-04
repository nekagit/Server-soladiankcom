"""
Solana API endpoints for blockchain operations
"""

from fastapi import APIRouter, HTTPException, Depends, Query
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import get_db
from solana import (
    SolanaRPCClient, 
    TransactionService, 
    WalletService, 
    PaymentProcessor,
    NFTService,
    TokenService,
    solana_config
)

router = APIRouter(prefix="/api/solana", tags=["solana"])

# Initialize Solana services
async def get_solana_services():
    """Get initialized Solana services"""
    rpc_client = SolanaRPCClient(solana_config)
    await rpc_client.connect()
    
    transaction_service = TransactionService(rpc_client, solana_config)
    wallet_service = WalletService(rpc_client, solana_config)
    payment_processor = PaymentProcessor(rpc_client, transaction_service, wallet_service, solana_config)
    nft_service = NFTService(rpc_client, wallet_service, solana_config)
    token_service = TokenService(rpc_client, wallet_service, solana_config)
    
    return {
        'rpc_client': rpc_client,
        'transaction_service': transaction_service,
        'wallet_service': wallet_service,
        'payment_processor': payment_processor,
        'nft_service': nft_service,
        'token_service': token_service
    }

# Wallet endpoints
@router.get("/wallets/{wallet_address}/info")
async def get_wallet_info(
    wallet_address: str,
    services: Dict[str, Any] = Depends(get_solana_services)
):
    """Get wallet information"""
    try:
        wallet_info = await services['wallet_service'].get_wallet_info(wallet_address)
        return {
            "public_key": wallet_info.public_key,
            "balance": wallet_info.balance,
            "is_valid": wallet_info.is_valid,
            "is_active": wallet_info.is_active,
            "lamports": wallet_info.lamports,
            "owner": wallet_info.owner,
            "executable": wallet_info.executable,
            "rent_epoch": wallet_info.rent_epoch
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/wallets/{wallet_address}/balance")
async def get_wallet_balance(
    wallet_address: str,
    services: Dict[str, Any] = Depends(get_solana_services)
):
    """Get wallet balance"""
    try:
        success, balance, error = await services['wallet_service'].get_wallet_balance(wallet_address)
        if not success:
            raise HTTPException(status_code=400, detail=error)
        return {"balance": balance, "currency": "SOL"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/wallets/{wallet_address}/tokens")
async def get_wallet_tokens(
    wallet_address: str,
    services: Dict[str, Any] = Depends(get_solana_services)
):
    """Get wallet token accounts"""
    try:
        tokens = await services['wallet_service'].get_wallet_tokens(wallet_address)
        return {"tokens": [token.__dict__ for token in tokens]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Transaction endpoints
@router.get("/transactions/{signature}/status")
async def get_transaction_status(
    signature: str,
    services: Dict[str, Any] = Depends(get_solana_services)
):
    """Get transaction status"""
    try:
        status = await services['transaction_service'].get_transaction_status(signature)
        return {
            "signature": status.signature,
            "status": status.status,
            "confirmation_status": status.confirmation_status,
            "slot": status.slot,
            "block_time": status.block_time.isoformat() if status.block_time else None,
            "error": status.error,
            "confirmations": status.confirmations
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/transactions/{signature}")
async def get_transaction_details(
    signature: str,
    services: Dict[str, Any] = Depends(get_solana_services)
):
    """Get transaction details"""
    try:
        details = await services['transaction_service'].get_transaction_details(signature)
        if not details:
            raise HTTPException(status_code=404, detail="Transaction not found")
        
        return {
            "signature": details.signature,
            "slot": details.slot,
            "block_time": details.block_time.isoformat() if details.block_time else None,
            "fee": details.fee,
            "accounts": details.accounts,
            "instructions": details.instructions,
            "meta": details.meta,
            "version": details.version
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/transactions/statuses")
async def get_multiple_transaction_statuses(
    signatures: List[str],
    services: Dict[str, Any] = Depends(get_solana_services)
):
    """Get status for multiple transactions"""
    try:
        statuses = await services['transaction_service'].get_multiple_transaction_statuses(signatures)
        return {"statuses": [status.__dict__ for status in statuses]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/transactions/history")
async def get_transaction_history(
    wallet: str,
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    services: Dict[str, Any] = Depends(get_solana_services)
):
    """Get transaction history for a wallet"""
    try:
        # In a real implementation, this would query the database
        # for stored transaction history
        return {"transactions": []}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Payment endpoints
@router.post("/payments")
async def process_payment(
    payment_data: Dict[str, Any],
    services: Dict[str, Any] = Depends(get_solana_services)
):
    """Process a payment"""
    try:
        from solana.payment_processor import PaymentRequest
        
        payment_request = PaymentRequest(
            from_wallet=payment_data["from_wallet"],
            to_wallet=payment_data["to_wallet"],
            amount=payment_data["amount"],
            memo=payment_data.get("memo"),
            reference=payment_data.get("reference"),
            escrow_enabled=payment_data.get("escrow_enabled", False),
            escrow_duration_hours=payment_data.get("escrow_duration_hours", 24)
        )
        
        result = await services['payment_processor'].process_payment(payment_request)
        return {
            "success": result.success,
            "transaction_signature": result.transaction_signature,
            "error_message": result.error_message,
            "escrow_address": result.escrow_address,
            "confirmation_status": result.confirmation_status
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/payments/escrow/{escrow_address}/release")
async def release_escrow(
    escrow_address: str,
    release_data: Dict[str, str],
    services: Dict[str, Any] = Depends(get_solana_services)
):
    """Release escrow funds"""
    try:
        result = await services['payment_processor'].release_escrow(
            escrow_address, 
            release_data["release_to"]
        )
        return {
            "success": result.success,
            "transaction_signature": result.transaction_signature,
            "error_message": result.error_message
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/payments/escrow/{escrow_address}/refund")
async def refund_escrow(
    escrow_address: str,
    services: Dict[str, Any] = Depends(get_solana_services)
):
    """Refund escrow funds"""
    try:
        result = await services['payment_processor'].refund_escrow(escrow_address)
        return {
            "success": result.success,
            "transaction_signature": result.transaction_signature,
            "error_message": result.error_message
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# NFT endpoints
@router.get("/nfts/{mint}/metadata")
async def get_nft_metadata(
    mint: str,
    services: Dict[str, Any] = Depends(get_solana_services)
):
    """Get NFT metadata"""
    try:
        metadata = await services['nft_service'].get_nft_metadata(mint)
        if not metadata:
            raise HTTPException(status_code=404, detail="NFT not found")
        return metadata.__dict__
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/nfts/{mint}/owner")
async def get_nft_owner(
    mint: str,
    services: Dict[str, Any] = Depends(get_solana_services)
):
    """Get NFT owner"""
    try:
        owner = await services['nft_service'].get_nft_owner(mint)
        if not owner:
            raise HTTPException(status_code=404, detail="NFT owner not found")
        return {"owner": owner}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/nfts/wallet/{wallet_address}")
async def get_wallet_nfts(
    wallet_address: str,
    services: Dict[str, Any] = Depends(get_solana_services)
):
    """Get NFTs owned by a wallet"""
    try:
        nfts = await services['nft_service'].get_wallet_nfts(wallet_address)
        return {"nfts": [nft.__dict__ for nft in nfts]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/nfts/listings")
async def create_nft_listing(
    listing_data: Dict[str, Any],
    services: Dict[str, Any] = Depends(get_solana_services)
):
    """Create NFT listing"""
    try:
        listing = await services['nft_service'].create_nft_listing(
            mint=listing_data["mint"],
            seller=listing_data["seller"],
            price=listing_data["price"],
            listing_type=listing_data.get("listing_type", "fixed"),
            auction_duration_hours=listing_data.get("auction_duration_hours", 24)
        )
        if not listing:
            raise HTTPException(status_code=400, detail="Failed to create listing")
        return listing.__dict__
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/nfts/listings")
async def get_nft_listings(
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    services: Dict[str, Any] = Depends(get_solana_services)
):
    """Get NFT listings"""
    try:
        listings = await services['nft_service'].get_nft_listings(limit, offset)
        return {"listings": [listing.__dict__ for listing in listings]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/nfts/bids")
async def place_nft_bid(
    bid_data: Dict[str, Any],
    services: Dict[str, Any] = Depends(get_solana_services)
):
    """Place NFT bid"""
    try:
        success = await services['nft_service'].place_bid(
            mint=bid_data["mint"],
            bidder=bid_data["bidder"],
            amount=bid_data["amount"]
        )
        return {"success": success}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/nfts/buy")
async def buy_nft(
    buy_data: Dict[str, Any],
    services: Dict[str, Any] = Depends(get_solana_services)
):
    """Buy NFT"""
    try:
        result = await services['nft_service'].buy_nft(
            mint=buy_data["mint"],
            buyer=buy_data["buyer"],
            price=buy_data["price"]
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/nfts/listings/{mint}")
async def cancel_nft_listing(
    mint: str,
    cancel_data: Dict[str, str],
    services: Dict[str, Any] = Depends(get_solana_services)
):
    """Cancel NFT listing"""
    try:
        success = await services['nft_service'].cancel_listing(mint, cancel_data["seller"])
        return {"success": success}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/nfts/search")
async def search_nfts(
    q: str = Query(..., min_length=1),
    limit: int = Query(20, ge=1, le=100),
    services: Dict[str, Any] = Depends(get_solana_services)
):
    """Search NFTs"""
    try:
        nfts = await services['nft_service'].search_nfts(q, limit)
        return {"nfts": [nft.__dict__ for nft in nfts]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Token endpoints
@router.get("/tokens/{mint}/info")
async def get_token_info(
    mint: str,
    services: Dict[str, Any] = Depends(get_solana_services)
):
    """Get token information"""
    try:
        token_info = await services['token_service'].get_token_info(mint)
        if not token_info:
            raise HTTPException(status_code=404, detail="Token not found")
        return token_info.__dict__
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/tokens/wallet/{wallet_address}")
async def get_wallet_tokens(
    wallet_address: str,
    services: Dict[str, Any] = Depends(get_solana_services)
):
    """Get tokens owned by a wallet"""
    try:
        tokens = await services['token_service'].get_wallet_tokens(wallet_address)
        return {"tokens": [token.__dict__ for token in tokens]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/tokens/{mint}/balance")
async def get_token_balance(
    mint: str,
    wallet: str,
    services: Dict[str, Any] = Depends(get_solana_services)
):
    """Get token balance for a wallet"""
    try:
        success, balance, error = await services['token_service'].get_token_balance(wallet, mint)
        if not success:
            raise HTTPException(status_code=400, detail=error)
        return {"balance": balance, "mint": mint, "wallet": wallet}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/tokens/transfer")
async def transfer_tokens(
    transfer_data: Dict[str, Any],
    services: Dict[str, Any] = Depends(get_solana_services)
):
    """Transfer tokens"""
    try:
        success, signature, error = await services['token_service'].transfer_tokens(
            from_wallet=transfer_data["from_wallet"],
            to_wallet=transfer_data["to_wallet"],
            mint=transfer_data["mint"],
            amount=transfer_data["amount"]
        )
        if not success:
            raise HTTPException(status_code=400, detail=error)
        return {"success": success, "signature": signature}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Health check
@router.get("/health")
async def solana_health_check(
    services: Dict[str, Any] = Depends(get_solana_services)
):
    """Check Solana service health"""
    try:
        health_response = await services['rpc_client'].get_health()
        return {
            "status": "healthy" if not health_response.error else "unhealthy",
            "rpc_url": solana_config.rpc_url,
            "network": solana_config.network,
            "error": health_response.error
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "error": str(e)
        }
