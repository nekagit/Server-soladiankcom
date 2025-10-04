"""
Solana transaction service for processing and verification
"""

import asyncio
import base64
import json
from typing import Dict, Any, Optional, List, Tuple
from dataclasses import dataclass
from datetime import datetime, timezone
import logging

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from solana.rpc_client import SolanaRPCClient, RPCResponse
from solana.config import SolanaConfig

logger = logging.getLogger(__name__)

@dataclass
class TransactionStatus:
    """Transaction status information"""
    signature: str
    status: str  # 'pending', 'confirmed', 'finalized', 'failed'
    confirmation_status: Optional[str] = None
    slot: Optional[int] = None
    block_time: Optional[datetime] = None
    error: Optional[Dict[str, Any]] = None
    confirmations: Optional[int] = None

@dataclass
class TransactionDetails:
    """Detailed transaction information"""
    signature: str
    slot: int
    block_time: datetime
    fee: int
    accounts: List[str]
    instructions: List[Dict[str, Any]]
    meta: Dict[str, Any]
    version: Optional[str] = None

class TransactionService:
    """Service for handling Solana transactions"""
    
    def __init__(self, rpc_client: SolanaRPCClient, config: SolanaConfig):
        self.rpc_client = rpc_client
        self.config = config
        
    async def send_transaction(self, transaction: str, skip_preflight: bool = None) -> Tuple[bool, str, Optional[str]]:
        """
        Send a transaction to the Solana network
        
        Args:
            transaction: Base64 encoded transaction
            skip_preflight: Whether to skip preflight checks
            
        Returns:
            Tuple of (success, signature, error_message)
        """
        try:
            skip_preflight = skip_preflight if skip_preflight is not None else self.config.skip_preflight
            
            response = await self.rpc_client.send_transaction(transaction, skip_preflight)
            
            if response.error:
                logger.error(f"Transaction send failed: {response.error}")
                return False, "", response.error.get("message", "Unknown error")
            
            signature = response.result
            logger.info(f"Transaction sent successfully: {signature}")
            return True, signature, None
            
        except Exception as e:
            logger.error(f"Transaction send error: {str(e)}")
            return False, "", str(e)
    
    async def get_transaction_status(self, signature: str) -> TransactionStatus:
        """
        Get transaction status
        
        Args:
            signature: Transaction signature
            
        Returns:
            TransactionStatus object
        """
        try:
            response = await self.rpc_client.get_signature_statuses([signature])
            
            if response.error:
                logger.error(f"Failed to get transaction status: {response.error}")
                return TransactionStatus(
                    signature=signature,
                    status="failed",
                    error=response.error
                )
            
            status_info = response.result.get("value", [{}])[0]
            
            if not status_info:
                return TransactionStatus(
                    signature=signature,
                    status="pending"
                )
            
            # Parse status
            if status_info.get("err"):
                return TransactionStatus(
                    signature=signature,
                    status="failed",
                    error=status_info["err"],
                    confirmation_status=status_info.get("confirmationStatus"),
                    slot=status_info.get("slot")
                )
            
            confirmation_status = status_info.get("confirmationStatus", "pending")
            confirmations = status_info.get("confirmations")
            
            # Map confirmation status to our status
            if confirmation_status == "finalized":
                status = "finalized"
            elif confirmation_status == "confirmed":
                status = "confirmed"
            else:
                status = "pending"
            
            return TransactionStatus(
                signature=signature,
                status=status,
                confirmation_status=confirmation_status,
                slot=status_info.get("slot"),
                confirmations=confirmations
            )
            
        except Exception as e:
            logger.error(f"Error getting transaction status: {str(e)}")
            return TransactionStatus(
                signature=signature,
                status="failed",
                error={"message": str(e)}
            )
    
    async def get_transaction_details(self, signature: str) -> Optional[TransactionDetails]:
        """
        Get detailed transaction information
        
        Args:
            signature: Transaction signature
            
        Returns:
            TransactionDetails object or None if not found
        """
        try:
            response = await self.rpc_client.get_transaction(signature)
            
            if response.error:
                logger.error(f"Failed to get transaction details: {response.error}")
                return None
            
            tx_data = response.result
            if not tx_data:
                return None
            
            # Parse transaction data
            meta = tx_data.get("meta", {})
            transaction = tx_data.get("transaction", {})
            message = transaction.get("message", {})
            
            # Extract accounts
            accounts = message.get("accountKeys", [])
            
            # Extract instructions
            instructions = []
            for instruction in message.get("instructions", []):
                program_id_index = instruction.get("programIdIndex", 0)
                accounts = instruction.get("accounts", [])
                data = instruction.get("data", "")
                
                instructions.append({
                    "program_id": accounts[program_id_index] if program_id_index < len(accounts) else None,
                    "accounts": accounts,
                    "data": data
                })
            
            # Parse block time
            block_time = None
            if tx_data.get("blockTime"):
                block_time = datetime.fromtimestamp(tx_data["blockTime"], tz=timezone.utc)
            
            return TransactionDetails(
                signature=signature,
                slot=tx_data.get("slot", 0),
                block_time=block_time,
                fee=meta.get("fee", 0),
                accounts=accounts,
                instructions=instructions,
                meta=meta,
                version=transaction.get("version")
            )
            
        except Exception as e:
            logger.error(f"Error getting transaction details: {str(e)}")
            return None
    
    async def wait_for_confirmation(
        self, 
        signature: str, 
        timeout: int = 60,
        commitment: str = "confirmed"
    ) -> TransactionStatus:
        """
        Wait for transaction confirmation
        
        Args:
            signature: Transaction signature
            timeout: Maximum time to wait in seconds
            commitment: Confirmation level to wait for
            
        Returns:
            Final TransactionStatus
        """
        start_time = asyncio.get_event_loop().time()
        
        while True:
            status = await self.get_transaction_status(signature)
            
            # Check if we've reached the desired commitment level
            if commitment == "confirmed" and status.confirmation_status in ["confirmed", "finalized"]:
                return status
            elif commitment == "finalized" and status.confirmation_status == "finalized":
                return status
            elif status.status == "failed":
                return status
            
            # Check timeout
            elapsed = asyncio.get_event_loop().time() - start_time
            if elapsed >= timeout:
                logger.warning(f"Transaction confirmation timeout: {signature}")
                return status
            
            # Wait before next check
            await asyncio.sleep(1)
    
    async def verify_transaction(self, signature: str) -> bool:
        """
        Verify transaction is valid and confirmed
        
        Args:
            signature: Transaction signature
            
        Returns:
            True if transaction is valid and confirmed
        """
        try:
            status = await self.get_transaction_status(signature)
            
            if status.status == "failed":
                logger.error(f"Transaction failed: {signature}, error: {status.error}")
                return False
            
            if status.confirmation_status in ["confirmed", "finalized"]:
                return True
            
            # Wait for confirmation
            final_status = await self.wait_for_confirmation(signature, timeout=30)
            return final_status.status in ["confirmed", "finalized"]
            
        except Exception as e:
            logger.error(f"Transaction verification error: {str(e)}")
            return False
    
    async def get_multiple_transaction_statuses(self, signatures: List[str]) -> List[TransactionStatus]:
        """
        Get status for multiple transactions
        
        Args:
            signatures: List of transaction signatures
            
        Returns:
            List of TransactionStatus objects
        """
        try:
            response = await self.rpc_client.get_signature_statuses(signatures)
            
            if response.error:
                logger.error(f"Failed to get multiple transaction statuses: {response.error}")
                return [
                    TransactionStatus(signature=sig, status="failed", error=response.error)
                    for sig in signatures
                ]
            
            statuses = []
            results = response.result.get("value", [])
            
            for i, signature in enumerate(signatures):
                status_info = results[i] if i < len(results) else {}
                
                if not status_info:
                    statuses.append(TransactionStatus(signature=signature, status="pending"))
                    continue
                
                if status_info.get("err"):
                    statuses.append(TransactionStatus(
                        signature=signature,
                        status="failed",
                        error=status_info["err"],
                        confirmation_status=status_info.get("confirmationStatus"),
                        slot=status_info.get("slot")
                    ))
                else:
                    confirmation_status = status_info.get("confirmationStatus", "pending")
                    status = "finalized" if confirmation_status == "finalized" else \
                            "confirmed" if confirmation_status == "confirmed" else "pending"
                    
                    statuses.append(TransactionStatus(
                        signature=signature,
                        status=status,
                        confirmation_status=confirmation_status,
                        slot=status_info.get("slot"),
                        confirmations=status_info.get("confirmations")
                    ))
            
            return statuses
            
        except Exception as e:
            logger.error(f"Error getting multiple transaction statuses: {str(e)}")
            return [
                TransactionStatus(signature=sig, status="failed", error={"message": str(e)})
                for sig in signatures
            ]
