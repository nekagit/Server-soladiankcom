"""
Solana NFT service for marketplace functionality
"""

import asyncio
from typing import Dict, Any, Optional, List, Tuple
from dataclasses import dataclass
from datetime import datetime, timezone
import logging

from .rpc_client import SolanaRPCClient, RPCResponse
from .wallet_service import WalletService
from .config import SolanaConfig

logger = logging.getLogger(__name__)

@dataclass
class NFTMetadata:
    """NFT metadata information"""
    mint: str
    name: str
    symbol: str
    description: str
    image: str
    external_url: Optional[str] = None
    attributes: List[Dict[str, Any]] = None
    collection: Optional[str] = None
    seller_fee_basis_points: int = 0
    creators: List[Dict[str, Any]] = None

@dataclass
class NFTOwnership:
    """NFT ownership information"""
    mint: str
    owner: str
    amount: int
    delegate: Optional[str] = None
    state: str = "initialized"
    is_frozen: bool = False

@dataclass
class NFTListing:
    """NFT marketplace listing"""
    mint: str
    seller: str
    price: float  # Price in SOL
    currency: str = "SOL"
    listing_type: str = "fixed"  # 'fixed', 'auction'
    auction_end: Optional[datetime] = None
    current_bid: Optional[float] = None
    min_bid: Optional[float] = None
    is_active: bool = True
    created_at: datetime = None

class NFTService:
    """Service for NFT marketplace operations"""
    
    def __init__(
        self, 
        rpc_client: SolanaRPCClient, 
        wallet_service: WalletService,
        config: SolanaConfig
    ):
        self.rpc_client = rpc_client
        self.wallet_service = wallet_service
        self.config = config
        
    async def get_nft_metadata(self, mint: str) -> Optional[NFTMetadata]:
        """
        Get NFT metadata
        
        Args:
            mint: NFT mint address
            
        Returns:
            NFTMetadata object or None if not found
        """
        try:
            # In a real implementation, this would:
            # 1. Get the metadata account for the NFT
            # 2. Parse the metadata URI
            # 3. Fetch metadata from IPFS or HTTP
            # 4. Parse and return structured metadata
            
            logger.info(f"Getting NFT metadata for {mint}")
            
            # For simulation, return mock metadata
            return NFTMetadata(
                mint=mint,
                name=f"NFT #{mint[:8]}",
                symbol="NFT",
                description="A unique digital asset on Solana",
                image="https://via.placeholder.com/300x300",
                external_url="https://soladia.com/nft/" + mint,
                attributes=[
                    {"trait_type": "Rarity", "value": "Common"},
                    {"trait_type": "Color", "value": "Blue"}
                ],
                collection="Soladia Collection",
                seller_fee_basis_points=250,  # 2.5%
                creators=[
                    {"address": "11111111111111111111111111111111", "verified": True, "share": 100}
                ]
            )
            
        except Exception as e:
            logger.error(f"Error getting NFT metadata: {str(e)}")
            return None
    
    async def get_nft_owner(self, mint: str) -> Optional[str]:
        """
        Get current owner of an NFT
        
        Args:
            mint: NFT mint address
            
        Returns:
            Owner wallet address or None if not found
        """
        try:
            # In a real implementation, this would query the token accounts
            # to find the current owner of the NFT
            
            logger.info(f"Getting NFT owner for {mint}")
            
            # For simulation, return a mock owner
            return "11111111111111111111111111111111111111111111"
            
        except Exception as e:
            logger.error(f"Error getting NFT owner: {str(e)}")
            return None
    
    async def get_wallet_nfts(self, wallet_address: str) -> List[NFTMetadata]:
        """
        Get all NFTs owned by a wallet
        
        Args:
            wallet_address: Wallet address
            
        Returns:
            List of NFTMetadata objects
        """
        try:
            # Validate wallet address
            is_valid, error = self.wallet_service.validate_wallet_address(wallet_address)
            if not is_valid:
                logger.error(f"Invalid wallet address: {error}")
                return []
            
            # Get token accounts for the wallet
            token_accounts = await self.wallet_service.get_token_accounts(wallet_address)
            
            nfts = []
            for account in token_accounts:
                # Check if this is an NFT (amount = 1 and decimals = 0)
                if account.amount == 1 and account.decimals == 0:
                    metadata = await self.get_nft_metadata(account.mint)
                    if metadata:
                        nfts.append(metadata)
            
            return nfts
            
        except Exception as e:
            logger.error(f"Error getting wallet NFTs: {str(e)}")
            return []
    
    async def create_nft_listing(
        self, 
        mint: str, 
        seller: str, 
        price: float,
        listing_type: str = "fixed",
        auction_duration_hours: int = 24
    ) -> Optional[NFTListing]:
        """
        Create an NFT listing
        
        Args:
            mint: NFT mint address
            seller: Seller wallet address
            price: Listing price in SOL
            listing_type: Type of listing ('fixed' or 'auction')
            auction_duration_hours: Duration for auction listings
            
        Returns:
            NFTListing object or None if failed
        """
        try:
            # Validate inputs
            is_valid, error = self.wallet_service.validate_wallet_address(seller)
            if not is_valid:
                logger.error(f"Invalid seller address: {error}")
                return None
            
            if price <= 0:
                logger.error("Price must be greater than 0")
                return None
            
            # Check if seller owns the NFT
            owner = await self.get_nft_owner(mint)
            if owner != seller:
                logger.error("Seller does not own this NFT")
                return None
            
            # Create listing
            listing = NFTListing(
                mint=mint,
                seller=seller,
                price=price,
                listing_type=listing_type,
                auction_end=datetime.now(timezone.utc).replace(
                    hour=datetime.now(timezone.utc).hour + auction_duration_hours
                ) if listing_type == "auction" else None,
                min_bid=price * 0.1 if listing_type == "auction" else None,
                created_at=datetime.now(timezone.utc)
            )
            
            logger.info(f"Created NFT listing: {mint} for {price} SOL")
            return listing
            
        except Exception as e:
            logger.error(f"Error creating NFT listing: {str(e)}")
            return None
    
    async def place_bid(self, mint: str, bidder: str, amount: float) -> bool:
        """
        Place a bid on an NFT auction
        
        Args:
            mint: NFT mint address
            bidder: Bidder wallet address
            amount: Bid amount in SOL
            
        Returns:
            True if bid placed successfully
        """
        try:
            # Validate inputs
            is_valid, error = self.wallet_service.validate_wallet_address(bidder)
            if not is_valid:
                logger.error(f"Invalid bidder address: {error}")
                return False
            
            if amount <= 0:
                logger.error("Bid amount must be greater than 0")
                return False
            
            # In a real implementation, this would:
            # 1. Check if listing exists and is an auction
            # 2. Verify auction is still active
            # 3. Check if bid is higher than current bid
            # 4. Create and process the bid transaction
            
            logger.info(f"Placed bid on {mint}: {amount} SOL from {bidder}")
            return True
            
        except Exception as e:
            logger.error(f"Error placing bid: {str(e)}")
            return False
    
    async def buy_nft(self, mint: str, buyer: str, price: float) -> Tuple[bool, Optional[str]]:
        """
        Buy an NFT at fixed price
        
        Args:
            mint: NFT mint address
            buyer: Buyer wallet address
            price: Purchase price in SOL
            
        Returns:
            Tuple of (success, transaction_signature)
        """
        try:
            # Validate inputs
            is_valid, error = self.wallet_service.validate_wallet_address(buyer)
            if not is_valid:
                logger.error(f"Invalid buyer address: {error}")
                return False, None
            
            if price <= 0:
                logger.error("Price must be greater than 0")
                return False, None
            
            # Check buyer balance
            balance_success, balance, balance_error = await self.wallet_service.get_wallet_balance(buyer)
            if not balance_success:
                logger.error(f"Failed to check buyer balance: {balance_error}")
                return False, None
            
            if balance < price:
                logger.error(f"Insufficient balance. Required: {price} SOL, Available: {balance} SOL")
                return False, None
            
            # In a real implementation, this would:
            # 1. Verify listing exists and is active
            # 2. Create transfer transaction
            # 3. Process payment
            # 4. Transfer NFT ownership
            
            logger.info(f"Buying NFT {mint} for {price} SOL by {buyer}")
            
            # Simulate transaction
            mock_signature = self._generate_mock_signature()
            return True, mock_signature
            
        except Exception as e:
            logger.error(f"Error buying NFT: {str(e)}")
            return False, None
    
    async def cancel_listing(self, mint: str, seller: str) -> bool:
        """
        Cancel an NFT listing
        
        Args:
            mint: NFT mint address
            seller: Seller wallet address
            
        Returns:
            True if listing cancelled successfully
        """
        try:
            # Validate seller address
            is_valid, error = self.wallet_service.validate_wallet_address(seller)
            if not is_valid:
                logger.error(f"Invalid seller address: {error}")
                return False
            
            # In a real implementation, this would:
            # 1. Verify listing exists and belongs to seller
            # 2. Check if listing can be cancelled (no active bids)
            # 3. Update listing status
            
            logger.info(f"Cancelled listing for NFT {mint} by {seller}")
            return True
            
        except Exception as e:
            logger.error(f"Error cancelling listing: {str(e)}")
            return False
    
    async def get_nft_listings(self, limit: int = 50, offset: int = 0) -> List[NFTListing]:
        """
        Get active NFT listings
        
        Args:
            limit: Maximum number of listings to return
            offset: Number of listings to skip
            
        Returns:
            List of NFTListing objects
        """
        try:
            # In a real implementation, this would query the database
            # for active NFT listings
            
            logger.info(f"Getting NFT listings: limit={limit}, offset={offset}")
            
            # For simulation, return empty list
            return []
            
        except Exception as e:
            logger.error(f"Error getting NFT listings: {str(e)}")
            return []
    
    async def search_nfts(self, query: str, limit: int = 20) -> List[NFTMetadata]:
        """
        Search NFTs by name, description, or attributes
        
        Args:
            query: Search query
            limit: Maximum number of results
            
        Returns:
            List of matching NFTMetadata objects
        """
        try:
            logger.info(f"Searching NFTs with query: {query}")
            
            # In a real implementation, this would:
            # 1. Search metadata database
            # 2. Filter by query terms
            # 3. Return matching NFTs
            
            # For simulation, return empty list
            return []
            
        except Exception as e:
            logger.error(f"Error searching NFTs: {str(e)}")
            return []
    
    def _generate_mock_signature(self) -> str:
        """Generate mock transaction signature for simulation"""
        import random
        import string
        
        chars = string.ascii_letters + string.digits
        return ''.join(random.choices(chars, k=88))
