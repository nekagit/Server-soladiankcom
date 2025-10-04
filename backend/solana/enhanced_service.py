"""
Enhanced Solana service with real RPC integration and comprehensive functionality
"""

import asyncio
import json
import base64
from typing import Dict, Any, Optional, List, Union
from dataclasses import dataclass
from datetime import datetime, timezone
import logging

from .rpc_client import SolanaRPCClient, RPCResponse
from .config import SolanaConfig

logger = logging.getLogger(__name__)

@dataclass
class WalletInfo:
    """Wallet information container"""
    address: str
    balance: float
    lamports: int
    exists: bool
    owner: Optional[str] = None
    executable: bool = False
    rent_epoch: Optional[int] = None

@dataclass
class TokenInfo:
    """Token information container"""
    mint: str
    name: str
    symbol: str
    decimals: int
    supply: Optional[int] = None
    balance: float = 0.0
    ui_amount: float = 0.0

@dataclass
class TransactionInfo:
    """Transaction information container"""
    signature: str
    slot: Optional[int]
    block_time: Optional[int]
    confirmation_status: Optional[str]
    success: bool
    error: Optional[str] = None
    logs: List[str] = None
    fee: Optional[int] = None

class EnhancedSolanaService:
    """Enhanced Solana service with comprehensive blockchain integration"""
    
    def __init__(self, config: SolanaConfig):
        self.config = config
        self.rpc_client = SolanaRPCClient(config)
        
    async def __aenter__(self):
        await self.rpc_client.connect()
        return self
        
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.rpc_client.close()
    
    # Wallet Management
    async def get_wallet_info(self, wallet_address: str) -> WalletInfo:
        """Get comprehensive wallet information"""
        try:
            # Get balance
            balance_response = await self.rpc_client.get_balance(wallet_address)
            if balance_response.error:
                raise Exception(f"Failed to get balance: {balance_response.error}")
            
            # Get account info
            account_response = await self.rpc_client.get_account_info(wallet_address)
            if account_response.error:
                # Account might not exist, return with exists=False
                return WalletInfo(
                    address=wallet_address,
                    balance=0.0,
                    lamports=0,
                    exists=False
                )
            
            account_info = account_response.result
            if account_info is None:
                return WalletInfo(
                    address=wallet_address,
                    balance=0.0,
                    lamports=0,
                    exists=False
                )
            
            balance_lamports = balance_response.result
            balance_sol = balance_lamports / 1e9
            
            return WalletInfo(
                address=wallet_address,
                balance=balance_sol,
                lamports=balance_lamports,
                exists=True,
                owner=account_info.get("owner"),
                executable=account_info.get("executable", False),
                rent_epoch=account_info.get("rentEpoch")
            )
            
        except Exception as e:
            logger.error(f"Failed to get wallet info for {wallet_address}: {str(e)}")
            raise Exception(f"Failed to get wallet info: {str(e)}")
    
    async def validate_wallet_address(self, wallet_address: str) -> bool:
        """Validate Solana wallet address format"""
        try:
            # Basic validation - Solana addresses are base58 encoded and 32-44 characters
            if not wallet_address or len(wallet_address) < 32 or len(wallet_address) > 44:
                return False
            
            # Try to get account info to validate existence
            response = await self.rpc_client.get_account_info(wallet_address)
            return not response.error
            
        except Exception:
            return False
    
    # Token Management
    async def get_token_accounts(self, wallet_address: str) -> List[TokenInfo]:
        """Get all token accounts for a wallet"""
        try:
            response = await self.rpc_client.get_token_accounts_by_owner(wallet_address)
            if response.error:
                raise Exception(f"Failed to get token accounts: {response.error}")
            
            accounts = response.result.get("value", [])
            tokens = []
            
            for account in accounts:
                try:
                    account_info = account.get("account", {})
                    parsed_data = account_info.get("data", {}).get("parsed", {})
                    info = parsed_data.get("info", {})
                    
                    # Get token supply for additional info
                    mint = info.get("mint")
                    if mint:
                        supply_response = await self.rpc_client.get_token_supply(mint)
                        supply = supply_response.result.get("value", {}).get("amount") if not supply_response.error else None
                    else:
                        supply = None
                    
                    token_amount = info.get("tokenAmount", {})
                    
                    tokens.append(TokenInfo(
                        mint=mint,
                        name=f"Token {mint[:8]}",  # Default name
                        symbol="UNKNOWN",  # Would need metadata lookup
                        decimals=token_amount.get("decimals", 0),
                        supply=int(supply) if supply else None,
                        balance=float(token_amount.get("amount", 0)),
                        ui_amount=float(token_amount.get("uiAmount", 0))
                    ))
                    
                except Exception as e:
                    logger.warning(f"Failed to parse token account: {str(e)}")
                    continue
            
            return tokens
            
        except Exception as e:
            logger.error(f"Failed to get token accounts for {wallet_address}: {str(e)}")
            raise Exception(f"Failed to get token accounts: {str(e)}")
    
    async def get_token_balance(self, wallet_address: str, mint: str) -> float:
        """Get balance of a specific token for a wallet"""
        try:
            response = await self.rpc_client.get_token_accounts_by_owner(wallet_address, mint)
            if response.error:
                raise Exception(f"Failed to get token balance: {response.error}")
            
            accounts = response.result.get("value", [])
            if not accounts:
                return 0.0
            
            # Sum up all token accounts for this mint
            total_balance = 0.0
            for account in accounts:
                account_info = account.get("account", {})
                parsed_data = account_info.get("data", {}).get("parsed", {})
                info = parsed_data.get("info", {})
                token_amount = info.get("tokenAmount", {})
                ui_amount = float(token_amount.get("uiAmount", 0))
                total_balance += ui_amount
            
            return total_balance
            
        except Exception as e:
            logger.error(f"Failed to get token balance for {wallet_address}, {mint}: {str(e)}")
            raise Exception(f"Failed to get token balance: {str(e)}")
    
    # Transaction Management
    async def get_transaction_info(self, signature: str) -> TransactionInfo:
        """Get comprehensive transaction information"""
        try:
            response = await self.rpc_client.get_transaction(signature)
            if response.error:
                raise Exception(f"Failed to get transaction: {response.error}")
            
            transaction = response.result
            if transaction is None:
                return TransactionInfo(
                    signature=signature,
                    slot=None,
                    block_time=None,
                    confirmation_status=None,
                    success=False,
                    error="Transaction not found"
                )
            
            meta = transaction.get("meta", {})
            success = meta.get("err") is None
            
            return TransactionInfo(
                signature=signature,
                slot=transaction.get("slot"),
                block_time=transaction.get("blockTime"),
                confirmation_status=transaction.get("confirmationStatus"),
                success=success,
                error=meta.get("err"),
                logs=meta.get("logMessages", []),
                fee=meta.get("fee")
            )
            
        except Exception as e:
            logger.error(f"Failed to get transaction info for {signature}: {str(e)}")
            raise Exception(f"Failed to get transaction info: {str(e)}")
    
    async def get_transaction_status(self, signature: str) -> Dict[str, Any]:
        """Get transaction status with confirmation details"""
        try:
            response = await self.rpc_client.get_signature_statuses([signature])
            if response.error:
                raise Exception(f"Failed to get transaction status: {response.error}")
            
            statuses = response.result.get("value", [])
            if not statuses:
                return {
                    "signature": signature,
                    "status": "unknown",
                    "confirmation_status": None,
                    "err": None,
                    "slot": None
                }
            
            status_info = statuses[0]
            return {
                "signature": signature,
                "status": "confirmed" if status_info.get("confirmationStatus") else "pending",
                "confirmation_status": status_info.get("confirmationStatus"),
                "err": status_info.get("err"),
                "slot": status_info.get("slot")
            }
            
        except Exception as e:
            logger.error(f"Failed to get transaction status for {signature}: {str(e)}")
            raise Exception(f"Failed to get transaction status: {str(e)}")
    
    # Payment Processing
    async def create_payment_transaction(self, from_wallet: str, to_wallet: str, amount: float, memo: str = None) -> Dict[str, Any]:
        """Create a payment transaction (simplified - would need proper transaction building)"""
        try:
            # This is a simplified version - in reality, you'd need to:
            # 1. Get recent blockhash
            # 2. Create transaction with proper instructions
            # 3. Sign transaction (would need private key)
            # 4. Send transaction
            
            # For now, return a mock transaction structure
            return {
                "from_wallet": from_wallet,
                "to_wallet": to_wallet,
                "amount": amount,
                "memo": memo,
                "status": "created",
                "message": "Transaction created (mock implementation)",
                "note": "Real implementation would require proper transaction building and signing"
            }
            
        except Exception as e:
            logger.error(f"Failed to create payment transaction: {str(e)}")
            raise Exception(f"Failed to create payment transaction: {str(e)}")
    
    async def simulate_payment(self, from_wallet: str, to_wallet: str, amount: float) -> Dict[str, Any]:
        """Simulate a payment transaction"""
        try:
            # Check if sender has sufficient balance
            wallet_info = await self.get_wallet_info(from_wallet)
            if not wallet_info.exists:
                return {
                    "success": False,
                    "error": "Sender wallet does not exist"
                }
            
            if wallet_info.balance < amount:
                return {
                    "success": False,
                    "error": f"Insufficient balance. Available: {wallet_info.balance} SOL, Required: {amount} SOL"
                }
            
            # Check if receiver wallet exists
            receiver_info = await self.get_wallet_info(to_wallet)
            if not receiver_info.exists:
                return {
                    "success": False,
                    "error": "Receiver wallet does not exist"
                }
            
            return {
                "success": True,
                "from_balance": wallet_info.balance,
                "to_balance": receiver_info.balance,
                "amount": amount,
                "estimated_fee": 0.000005,  # Typical Solana transaction fee
                "message": "Payment simulation successful"
            }
            
        except Exception as e:
            logger.error(f"Failed to simulate payment: {str(e)}")
            raise Exception(f"Failed to simulate payment: {str(e)}")
    
    # NFT Management
    async def get_nft_metadata(self, mint: str) -> Dict[str, Any]:
        """Get NFT metadata (simplified - would need metadata program integration)"""
        try:
            # This is a simplified version - in reality, you'd need to:
            # 1. Query the metadata program
            # 2. Parse the metadata account
            # 3. Fetch external metadata URI
            
            return {
                "mint": mint,
                "name": f"NFT #{mint[:8]}",
                "description": "NFT description",
                "image": "https://via.placeholder.com/300x300/4F46E5/FFFFFF?text=NFT",
                "attributes": [
                    {"trait_type": "Rarity", "value": "Common"},
                    {"trait_type": "Type", "value": "Digital Art"}
                ],
                "collection": "Soladia Collection",
                "status": "mock_metadata",
                "message": "Real implementation would query metadata program"
            }
            
        except Exception as e:
            logger.error(f"Failed to get NFT metadata for {mint}: {str(e)}")
            raise Exception(f"Failed to get NFT metadata: {str(e)}")
    
    # System Health
    async def get_system_health(self) -> Dict[str, Any]:
        """Get comprehensive system health information"""
        try:
            # Get RPC health
            health_response = await self.rpc_client.get_health()
            
            # Get version info
            version_response = await self.rpc_client.get_version()
            
            # Get current slot
            slot_response = await self.rpc_client.get_block_height()
            
            return {
                "rpc_status": "healthy" if not health_response.error else "unhealthy",
                "rpc_error": health_response.error,
                "version": version_response.result if not version_response.error else None,
                "current_slot": slot_response.result if not slot_response.error else None,
                "network": self.config.network,
                "rpc_url": self.config.rpc_url,
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
            
        except Exception as e:
            logger.error(f"Failed to get system health: {str(e)}")
            return {
                "rpc_status": "unhealthy",
                "error": str(e),
                "network": self.config.network,
                "rpc_url": self.config.rpc_url,
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
    
    # Utility Methods
    async def get_network_info(self) -> Dict[str, Any]:
        """Get network information"""
        try:
            version_response = await self.rpc_client.get_version()
            genesis_response = await self.rpc_client.get_genesis_hash()
            
            return {
                "version": version_response.result if not version_response.error else None,
                "genesis_hash": genesis_response.result if not genesis_response.error else None,
                "network": self.config.network,
                "rpc_url": self.config.rpc_url
            }
            
        except Exception as e:
            logger.error(f"Failed to get network info: {str(e)}")
            raise Exception(f"Failed to get network info: {str(e)}")
    
    async def estimate_transaction_fee(self, transaction_size: int = 1232) -> Dict[str, Any]:
        """Estimate transaction fee (simplified)"""
        try:
            # Typical Solana transaction fee is 5000 lamports (0.000005 SOL)
            base_fee = 5000  # lamports
            fee_per_signature = 0  # No additional fee per signature in Solana
            
            total_fee_lamports = base_fee + (fee_per_signature * 1)  # Assuming 1 signature
            total_fee_sol = total_fee_lamports / 1e9
            
            return {
                "base_fee_lamports": base_fee,
                "total_fee_lamports": total_fee_lamports,
                "total_fee_sol": total_fee_sol,
                "transaction_size": transaction_size,
                "message": "Fee estimation (simplified)"
            }
            
        except Exception as e:
            logger.error(f"Failed to estimate transaction fee: {str(e)}")
            raise Exception(f"Failed to estimate transaction fee: {str(e)}")
