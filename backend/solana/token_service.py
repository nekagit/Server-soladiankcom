"""
Solana SPL token service for token management
"""

import asyncio
from typing import Dict, Any, Optional, List, Tuple
from dataclasses import dataclass
from datetime import datetime, timezone
import logging

from .rpc_client import SolanaRPCClient, RPCResponse
from .wallet_service import WalletService, TokenAccount
from .config import SolanaConfig

logger = logging.getLogger(__name__)

@dataclass
class TokenInfo:
    """SPL token information"""
    mint: str
    name: str
    symbol: str
    decimals: int
    supply: int
    ui_supply: float
    owner: Optional[str] = None
    is_native: bool = False

@dataclass
class TokenTransfer:
    """Token transfer information"""
    from_wallet: str
    to_wallet: str
    mint: str
    amount: int
    ui_amount: float
    signature: str
    timestamp: datetime

class TokenService:
    """Service for SPL token operations"""
    
    def __init__(
        self, 
        rpc_client: SolanaRPCClient, 
        wallet_service: WalletService,
        config: SolanaConfig
    ):
        self.rpc_client = rpc_client
        self.wallet_service = wallet_service
        self.config = config
        
    async def get_token_info(self, mint: str) -> Optional[TokenInfo]:
        """
        Get SPL token information
        
        Args:
            mint: Token mint address
            
        Returns:
            TokenInfo object or None if not found
        """
        try:
            # Get token supply
            supply_response = await self.rpc_client.get_token_supply(mint)
            
            if supply_response.error:
                logger.error(f"Failed to get token supply: {supply_response.error}")
                return None
            
            supply_data = supply_response.result
            if not supply_data:
                return None
            
            # In a real implementation, this would also fetch:
            # - Token metadata from Metaplex
            # - Token program account info
            # - Additional token details
            
            return TokenInfo(
                mint=mint,
                name=f"Token {mint[:8]}",
                symbol="TOKEN",
                decimals=supply_data.get("decimals", 9),
                supply=int(supply_data.get("amount", 0)),
                ui_supply=float(supply_data.get("uiAmount", 0)),
                is_native=False
            )
            
        except Exception as e:
            logger.error(f"Error getting token info: {str(e)}")
            return None
    
    async def get_wallet_tokens(self, wallet_address: str) -> List[TokenAccount]:
        """
        Get all SPL tokens owned by a wallet
        
        Args:
            wallet_address: Wallet address
            
        Returns:
            List of TokenAccount objects
        """
        try:
            return await self.wallet_service.get_token_accounts(wallet_address)
        except Exception as e:
            logger.error(f"Error getting wallet tokens: {str(e)}")
            return []
    
    async def get_token_balance(self, wallet_address: str, mint: str) -> Tuple[bool, float, Optional[str]]:
        """
        Get balance of a specific token for a wallet
        
        Args:
            wallet_address: Wallet address
            mint: Token mint address
            
        Returns:
            Tuple of (success, balance, error_message)
        """
        try:
            # Validate wallet address
            is_valid, error = self.wallet_service.validate_wallet_address(wallet_address)
            if not is_valid:
                return False, 0.0, error
            
            # Get token accounts for the specific mint
            token_accounts = await self.wallet_service.get_token_accounts(wallet_address, mint)
            
            if not token_accounts:
                return True, 0.0, None
            
            # Sum up all token accounts for this mint
            total_amount = sum(account.ui_amount for account in token_accounts)
            
            return True, total_amount, None
            
        except Exception as e:
            logger.error(f"Error getting token balance: {str(e)}")
            return False, 0.0, str(e)
    
    async def transfer_tokens(
        self, 
        from_wallet: str, 
        to_wallet: str, 
        mint: str, 
        amount: float
    ) -> Tuple[bool, Optional[str], Optional[str]]:
        """
        Transfer SPL tokens between wallets
        
        Args:
            from_wallet: Sender wallet address
            to_wallet: Recipient wallet address
            mint: Token mint address
            amount: Amount to transfer (in token units)
            
        Returns:
            Tuple of (success, transaction_signature, error_message)
        """
        try:
            # Validate wallet addresses
            from_valid, from_error = self.wallet_service.validate_wallet_address(from_wallet)
            to_valid, to_error = self.wallet_service.validate_wallet_address(to_wallet)
            
            if not from_valid:
                return False, None, f"Invalid sender wallet: {from_error}"
            
            if not to_valid:
                return False, None, f"Invalid recipient wallet: {to_error}"
            
            if amount <= 0:
                return False, None, "Amount must be greater than 0"
            
            # Check sender balance
            balance_success, balance, balance_error = await self.get_token_balance(from_wallet, mint)
            if not balance_success:
                return False, None, f"Failed to check balance: {balance_error}"
            
            if balance < amount:
                return False, None, f"Insufficient token balance. Required: {amount}, Available: {balance}"
            
            # In a real implementation, this would:
            # 1. Create a token transfer instruction
            # 2. Build and sign the transaction
            # 3. Send the transaction to the network
            
            logger.info(f"Transferring {amount} tokens of {mint} from {from_wallet} to {to_wallet}")
            
            # Simulate transaction
            mock_signature = self._generate_mock_signature()
            return True, mock_signature, None
            
        except Exception as e:
            logger.error(f"Error transferring tokens: {str(e)}")
            return False, None, str(e)
    
    async def create_token_account(
        self, 
        wallet_address: str, 
        mint: str
    ) -> Tuple[bool, Optional[str], Optional[str]]:
        """
        Create a token account for a specific mint
        
        Args:
            wallet_address: Wallet address
            mint: Token mint address
            
        Returns:
            Tuple of (success, token_account_address, error_message)
        """
        try:
            # Validate wallet address
            is_valid, error = self.wallet_service.validate_wallet_address(wallet_address)
            if not is_valid:
                return False, None, error
            
            # In a real implementation, this would:
            # 1. Generate a new token account keypair
            # 2. Create the token account instruction
            # 3. Build and send the transaction
            
            logger.info(f"Creating token account for {mint} owned by {wallet_address}")
            
            # Simulate token account creation
            mock_account = self._generate_mock_address()
            return True, mock_account, None
            
        except Exception as e:
            logger.error(f"Error creating token account: {str(e)}")
            return False, None, str(e)
    
    async def get_token_holders(self, mint: str, limit: int = 100) -> List[Dict[str, Any]]:
        """
        Get token holders for a specific mint
        
        Args:
            mint: Token mint address
            limit: Maximum number of holders to return
            
        Returns:
            List of holder information
        """
        try:
            # In a real implementation, this would:
            # 1. Query all token accounts for the mint
            # 2. Filter out zero-balance accounts
            # 3. Sort by balance (descending)
            # 4. Return holder information
            
            logger.info(f"Getting token holders for {mint}")
            
            # For simulation, return empty list
            return []
            
        except Exception as e:
            logger.error(f"Error getting token holders: {str(e)}")
            return []
    
    async def get_token_transfers(
        self, 
        mint: str, 
        limit: int = 50
    ) -> List[TokenTransfer]:
        """
        Get token transfer history
        
        Args:
            mint: Token mint address
            limit: Maximum number of transfers to return
            
        Returns:
            List of TokenTransfer objects
        """
        try:
            # In a real implementation, this would:
            # 1. Query transaction history for the token
            # 2. Parse transfer instructions
            # 3. Extract transfer details
            
            logger.info(f"Getting token transfers for {mint}")
            
            # For simulation, return empty list
            return []
            
        except Exception as e:
            logger.error(f"Error getting token transfers: {str(e)}")
            return []
    
    async def get_popular_tokens(self, limit: int = 20) -> List[TokenInfo]:
        """
        Get popular tokens by trading volume or holders
        
        Args:
            limit: Maximum number of tokens to return
            
        Returns:
            List of TokenInfo objects
        """
        try:
            # In a real implementation, this would:
            # 1. Query token trading data
            # 2. Sort by volume or holder count
            # 3. Return top tokens
            
            logger.info(f"Getting popular tokens: limit={limit}")
            
            # For simulation, return empty list
            return []
            
        except Exception as e:
            logger.error(f"Error getting popular tokens: {str(e)}")
            return []
    
    async def search_tokens(self, query: str, limit: int = 20) -> List[TokenInfo]:
        """
        Search tokens by name or symbol
        
        Args:
            query: Search query
            limit: Maximum number of results
            
        Returns:
            List of matching TokenInfo objects
        """
        try:
            logger.info(f"Searching tokens with query: {query}")
            
            # In a real implementation, this would:
            # 1. Search token metadata database
            # 2. Filter by name or symbol
            # 3. Return matching tokens
            
            # For simulation, return empty list
            return []
            
        except Exception as e:
            logger.error(f"Error searching tokens: {str(e)}")
            return []
    
    def format_token_amount(self, amount: int, decimals: int) -> str:
        """
        Format token amount for display
        
        Args:
            amount: Raw token amount
            decimals: Token decimals
            
        Returns:
            Formatted amount string
        """
        try:
            ui_amount = amount / (10 ** decimals)
            
            if ui_amount == 0:
                return "0"
            elif ui_amount < 0.001:
                return f"{ui_amount:.6f}"
            elif ui_amount < 1:
                return f"{ui_amount:.4f}"
            else:
                return f"{ui_amount:.2f}"
                
        except Exception as e:
            logger.error(f"Error formatting token amount: {str(e)}")
            return "0"
    
    def _generate_mock_signature(self) -> str:
        """Generate mock transaction signature for simulation"""
        import random
        import string
        
        chars = string.ascii_letters + string.digits
        return ''.join(random.choices(chars, k=88))
    
    def _generate_mock_address(self) -> str:
        """Generate mock address for simulation"""
        import random
        import string
        
        chars = string.ascii_letters + string.digits
        return ''.join(random.choices(chars, k=44))
