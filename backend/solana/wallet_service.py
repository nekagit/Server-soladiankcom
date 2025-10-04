"""
Solana wallet service for validation and management
"""

import re
import base58
from typing import Dict, Any, Optional, List, Tuple
from dataclasses import dataclass
import logging

from .rpc_client import SolanaRPCClient, RPCResponse
from .config import SolanaConfig

logger = logging.getLogger(__name__)

@dataclass
class WalletInfo:
    """Wallet information"""
    public_key: str
    balance: float
    is_valid: bool
    is_active: bool
    lamports: int
    owner: Optional[str] = None
    executable: bool = False
    rent_epoch: Optional[int] = None

@dataclass
class TokenAccount:
    """Token account information"""
    address: str
    mint: str
    owner: str
    amount: int
    decimals: int
    ui_amount: float
    state: str

class WalletService:
    """Service for wallet validation and management"""
    
    def __init__(self, rpc_client: SolanaRPCClient, config: SolanaConfig):
        self.rpc_client = rpc_client
        self.config = config
        
    def validate_wallet_address(self, address: str) -> Tuple[bool, Optional[str]]:
        """
        Validate Solana wallet address format
        
        Args:
            address: Wallet address to validate
            
        Returns:
            Tuple of (is_valid, error_message)
        """
        try:
            # Check if address is a string
            if not isinstance(address, str):
                return False, "Address must be a string"
            
            # Check length (Solana addresses are 32-44 characters)
            if len(address) < 32 or len(address) > 44:
                return False, "Address length must be between 32 and 44 characters"
            
            # Check if it's a valid base58 string
            try:
                decoded = base58.b58decode(address)
                if len(decoded) != 32:
                    return False, "Address must decode to 32 bytes"
            except Exception:
                return False, "Invalid base58 encoding"
            
            # Check for valid characters (base58 alphabet)
            if not re.match(r'^[1-9A-HJ-NP-Za-km-z]+$', address):
                return False, "Address contains invalid characters"
            
            return True, None
            
        except Exception as e:
            logger.error(f"Wallet validation error: {str(e)}")
            return False, f"Validation error: {str(e)}"
    
    async def get_wallet_info(self, public_key: str) -> WalletInfo:
        """
        Get comprehensive wallet information
        
        Args:
            public_key: Wallet public key
            
        Returns:
            WalletInfo object
        """
        try:
            # Validate address first
            is_valid, error = self.validate_wallet_address(public_key)
            if not is_valid:
                return WalletInfo(
                    public_key=public_key,
                    balance=0.0,
                    is_valid=False,
                    is_active=False,
                    lamports=0
                )
            
            # Get account info and balance
            account_response = await self.rpc_client.get_account_info(public_key)
            balance_response = await self.rpc_client.get_balance(public_key)
            
            # Parse account info
            account_data = account_response.result if not account_response.error else None
            balance_data = balance_response.result if not balance_response.error else 0
            
            # Convert lamports to SOL
            balance_sol = balance_data / 1_000_000_000 if balance_data else 0.0
            
            # Determine if account is active
            is_active = account_data is not None and account_data.get("data") is not None
            
            return WalletInfo(
                public_key=public_key,
                balance=balance_sol,
                is_valid=True,
                is_active=is_active,
                lamports=balance_data,
                owner=account_data.get("owner") if account_data else None,
                executable=account_data.get("executable", False) if account_data else False,
                rent_epoch=account_data.get("rentEpoch") if account_data else None
            )
            
        except Exception as e:
            logger.error(f"Error getting wallet info: {str(e)}")
            return WalletInfo(
                public_key=public_key,
                balance=0.0,
                is_valid=False,
                is_active=False,
                lamports=0
            )
    
    async def get_wallet_balance(self, public_key: str) -> Tuple[bool, float, Optional[str]]:
        """
        Get wallet balance
        
        Args:
            public_key: Wallet public key
            
        Returns:
            Tuple of (success, balance_sol, error_message)
        """
        try:
            # Validate address
            is_valid, error = self.validate_wallet_address(public_key)
            if not is_valid:
                return False, 0.0, error
            
            # Get balance
            response = await self.rpc_client.get_balance(public_key)
            
            if response.error:
                logger.error(f"Failed to get balance: {response.error}")
                return False, 0.0, response.error.get("message", "Failed to get balance")
            
            lamports = response.result
            balance_sol = lamports / 1_000_000_000 if lamports else 0.0
            
            return True, balance_sol, None
            
        except Exception as e:
            logger.error(f"Error getting wallet balance: {str(e)}")
            return False, 0.0, str(e)
    
    async def get_token_accounts(self, owner: str, mint: str = None) -> List[TokenAccount]:
        """
        Get token accounts for a wallet
        
        Args:
            owner: Wallet owner address
            mint: Optional specific mint address
            
        Returns:
            List of TokenAccount objects
        """
        try:
            # Validate owner address
            is_valid, error = self.validate_wallet_address(owner)
            if not is_valid:
                logger.error(f"Invalid owner address: {error}")
                return []
            
            # Get token accounts
            response = await self.rpc_client.get_token_accounts_by_owner(owner, mint)
            
            if response.error:
                logger.error(f"Failed to get token accounts: {response.error}")
                return []
            
            accounts = []
            token_accounts = response.result.get("value", [])
            
            for account in token_accounts:
                try:
                    account_info = account.get("account", {}).get("data", {}).get("parsed", {}).get("info", {})
                    
                    accounts.append(TokenAccount(
                        address=account.get("pubkey", ""),
                        mint=account_info.get("mint", ""),
                        owner=account_info.get("owner", ""),
                        amount=int(account_info.get("tokenAmount", {}).get("amount", 0)),
                        decimals=account_info.get("tokenAmount", {}).get("decimals", 0),
                        ui_amount=float(account_info.get("tokenAmount", {}).get("uiAmount", 0)),
                        state=account_info.get("state", "initialized")
                    ))
                except Exception as e:
                    logger.warning(f"Error parsing token account: {str(e)}")
                    continue
            
            return accounts
            
        except Exception as e:
            logger.error(f"Error getting token accounts: {str(e)}")
            return []
    
    async def check_wallet_exists(self, public_key: str) -> bool:
        """
        Check if wallet exists on the blockchain
        
        Args:
            public_key: Wallet public key
            
        Returns:
            True if wallet exists and has been used
        """
        try:
            wallet_info = await self.get_wallet_info(public_key)
            return wallet_info.is_active
            
        except Exception as e:
            logger.error(f"Error checking wallet existence: {str(e)}")
            return False
    
    async def get_wallet_tokens(self, public_key: str) -> Dict[str, TokenAccount]:
        """
        Get all tokens owned by a wallet
        
        Args:
            public_key: Wallet public key
            
        Returns:
            Dictionary mapping mint address to TokenAccount
        """
        try:
            token_accounts = await self.get_token_accounts(public_key)
            
            # Group by mint address
            tokens = {}
            for account in token_accounts:
                if account.amount > 0:  # Only include accounts with balance
                    tokens[account.mint] = account
            
            return tokens
            
        except Exception as e:
            logger.error(f"Error getting wallet tokens: {str(e)}")
            return {}
    
    def format_address(self, address: str, length: int = 8) -> str:
        """
        Format address for display
        
        Args:
            address: Address to format
            length: Number of characters to show at start/end
            
        Returns:
            Formatted address string
        """
        if len(address) <= length * 2:
            return address
        
        return f"{address[:length]}...{address[-length:]}"
    
    def format_balance(self, balance: float, decimals: int = 9) -> str:
        """
        Format balance for display
        
        Args:
            balance: Balance in SOL
            decimals: Number of decimal places
            
        Returns:
            Formatted balance string
        """
        if balance == 0:
            return "0 SOL"
        
        if balance < 0.001:
            return f"{balance:.6f} SOL"
        elif balance < 1:
            return f"{balance:.4f} SOL"
        else:
            return f"{balance:.2f} SOL"
    
    async def validate_multiple_wallets(self, addresses: List[str]) -> Dict[str, bool]:
        """
        Validate multiple wallet addresses
        
        Args:
            addresses: List of wallet addresses
            
        Returns:
            Dictionary mapping address to validation result
        """
        results = {}
        
        for address in addresses:
            is_valid, _ = self.validate_wallet_address(address)
            results[address] = is_valid
        
        return results
