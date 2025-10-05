"""
Solana-specific Pydantic schemas for API validation
"""

from pydantic import BaseModel, Field, validator
from typing import Optional, Dict, Any, List
from datetime import datetime
from enum import Enum

class WalletType(str, Enum):
    PHANTOM = "phantom"
    SOLFLARE = "solflare"
    BACKPACK = "backpack"
    SOLLET = "sollet"
    LEDGER = "ledger"

class TransactionType(str, Enum):
    PAYMENT = "payment"
    NFT_TRANSFER = "nft_transfer"
    TOKEN_TRANSFER = "token_transfer"
    ESCROW_FUND = "escrow_fund"
    ESCROW_RELEASE = "escrow_release"
    AUCTION_BID = "auction_bid"
    AUCTION_WIN = "auction_win"

class TransactionStatus(str, Enum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    FAILED = "failed"
    CANCELLED = "cancelled"

class EscrowStatus(str, Enum):
    PENDING = "pending"
    FUNDED = "funded"
    RELEASED = "released"
    REFUNDED = "refunded"
    DISPUTED = "disputed"

class AuctionStatus(str, Enum):
    ACTIVE = "active"
    ENDED = "ended"
    CANCELLED = "cancelled"

# Wallet Schemas
class SolanaWalletBase(BaseModel):
    wallet_address: str = Field(..., min_length=32, max_length=44, description="Solana wallet address")
    wallet_type: WalletType = Field(..., description="Type of wallet")
    is_primary: bool = Field(default=False, description="Whether this is the user's primary wallet")
    is_verified: bool = Field(default=False, description="Whether the wallet is verified")

class SolanaWalletCreate(SolanaWalletBase):
    pass

class SolanaWalletUpdate(BaseModel):
    is_primary: Optional[bool] = None
    is_verified: Optional[bool] = None

class SolanaWalletResponse(SolanaWalletBase):
    id: int
    user_id: int
    balance_sol: float
    balance_lamports: int
    created_at: datetime
    updated_at: Optional[datetime]
    last_activity: Optional[datetime]

    class Config:
        from_attributes = True

# Transaction Schemas
class SolanaTransactionBase(BaseModel):
    transaction_signature: str = Field(..., min_length=80, max_length=88, description="Transaction signature")
    transaction_type: TransactionType = Field(..., description="Type of transaction")
    from_address: str = Field(..., min_length=32, max_length=44, description="Sender address")
    to_address: str = Field(..., min_length=32, max_length=44, description="Recipient address")
    amount: float = Field(..., gt=0, description="Transaction amount")
    amount_lamports: int = Field(..., ge=0, description="Transaction amount in lamports")
    token_mint: Optional[str] = Field(None, min_length=32, max_length=44, description="Token mint address for SPL tokens")
    memo: Optional[str] = Field(None, max_length=1000, description="Transaction memo")
    status: TransactionStatus = Field(default=TransactionStatus.PENDING, description="Transaction status")

class SolanaTransactionCreate(SolanaTransactionBase):
    wallet_id: int = Field(..., description="Associated wallet ID")

class SolanaTransactionUpdate(BaseModel):
    status: Optional[TransactionStatus] = None
    confirmation_count: Optional[int] = None
    fee: Optional[float] = None
    block_time: Optional[datetime] = None
    error_message: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None

class SolanaTransactionResponse(SolanaTransactionBase):
    id: int
    wallet_id: int
    confirmation_count: int
    fee: float
    block_time: Optional[datetime]
    created_at: datetime
    updated_at: Optional[datetime]
    metadata: Optional[Dict[str, Any]]
    error_message: Optional[str]

    class Config:
        from_attributes = True

# NFT Schemas
class SolanaNFTBase(BaseModel):
    nft_mint: str = Field(..., min_length=32, max_length=44, description="NFT mint address")
    name: str = Field(..., min_length=1, max_length=255, description="NFT name")
    symbol: Optional[str] = Field(None, max_length=50, description="NFT symbol")
    description: Optional[str] = Field(None, description="NFT description")
    image_url: Optional[str] = Field(None, max_length=500, description="NFT image URL")
    animation_url: Optional[str] = Field(None, max_length=500, description="NFT animation URL")
    external_url: Optional[str] = Field(None, max_length=500, description="External URL")
    attributes: Optional[Dict[str, Any]] = Field(None, description="NFT attributes")
    collection: Optional[str] = Field(None, max_length=255, description="Collection name")
    collection_family: Optional[str] = Field(None, max_length=255, description="Collection family")

class SolanaNFTCreate(SolanaNFTBase):
    owner_wallet_id: int = Field(..., description="Owner wallet ID")

class SolanaNFTUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    image_url: Optional[str] = None
    animation_url: Optional[str] = None
    external_url: Optional[str] = None
    attributes: Optional[Dict[str, Any]] = None
    collection: Optional[str] = None
    collection_family: Optional[str] = None
    is_listed: Optional[bool] = None
    listing_price: Optional[float] = None
    listing_currency: Optional[str] = None

class SolanaNFTResponse(SolanaNFTBase):
    id: int
    owner_wallet_id: int
    is_listed: bool
    listing_price: Optional[float]
    listing_currency: str
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True

# Token Schemas
class SolanaTokenBase(BaseModel):
    token_mint: str = Field(..., min_length=32, max_length=44, description="Token mint address")
    symbol: str = Field(..., min_length=1, max_length=20, description="Token symbol")
    name: str = Field(..., min_length=1, max_length=100, description="Token name")
    decimals: int = Field(default=9, ge=0, le=18, description="Token decimals")
    supply: Optional[int] = Field(None, ge=0, description="Token supply")
    is_verified: bool = Field(default=False, description="Whether token is verified")
    logo_url: Optional[str] = Field(None, max_length=500, description="Token logo URL")
    website: Optional[str] = Field(None, max_length=500, description="Token website")
    description: Optional[str] = Field(None, description="Token description")

class SolanaTokenCreate(SolanaTokenBase):
    pass

class SolanaTokenUpdate(BaseModel):
    symbol: Optional[str] = None
    name: Optional[str] = None
    decimals: Optional[int] = None
    supply: Optional[int] = None
    is_verified: Optional[bool] = None
    logo_url: Optional[str] = None
    website: Optional[str] = None
    description: Optional[str] = None

class SolanaTokenResponse(SolanaTokenBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True

# Escrow Schemas
class SolanaEscrowBase(BaseModel):
    escrow_id: str = Field(..., min_length=1, max_length=100, description="Unique escrow ID")
    buyer_wallet_id: int = Field(..., description="Buyer wallet ID")
    seller_wallet_id: int = Field(..., description="Seller wallet ID")
    amount: float = Field(..., gt=0, description="Escrow amount")
    currency: str = Field(default="SOL", max_length=10, description="Currency")
    status: EscrowStatus = Field(default=EscrowStatus.PENDING, description="Escrow status")
    expires_at: Optional[datetime] = Field(None, description="Escrow expiration time")

class SolanaEscrowCreate(SolanaEscrowBase):
    product_id: Optional[int] = Field(None, description="Associated product ID")

class SolanaEscrowUpdate(BaseModel):
    status: Optional[EscrowStatus] = None
    escrow_address: Optional[str] = None
    transaction_signature: Optional[str] = None
    expires_at: Optional[datetime] = None

class SolanaEscrowResponse(SolanaEscrowBase):
    id: int
    product_id: Optional[int]
    escrow_address: Optional[str]
    transaction_signature: Optional[str]
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True

# Auction Schemas
class SolanaAuctionBase(BaseModel):
    auction_id: str = Field(..., min_length=1, max_length=100, description="Unique auction ID")
    nft_id: int = Field(..., description="NFT ID")
    seller_wallet_id: int = Field(..., description="Seller wallet ID")
    starting_price: float = Field(..., gt=0, description="Starting price")
    reserve_price: Optional[float] = Field(None, gt=0, description="Reserve price")
    currency: str = Field(default="SOL", max_length=10, description="Currency")
    start_time: datetime = Field(..., description="Auction start time")
    end_time: datetime = Field(..., description="Auction end time")
    status: AuctionStatus = Field(default=AuctionStatus.ACTIVE, description="Auction status")

class SolanaAuctionCreate(SolanaAuctionBase):
    pass

class SolanaAuctionUpdate(BaseModel):
    current_bid: Optional[float] = None
    current_bidder_wallet_id: Optional[int] = None
    status: Optional[AuctionStatus] = None

class SolanaAuctionResponse(SolanaAuctionBase):
    id: int
    current_bid: Optional[float]
    current_bidder_wallet_id: Optional[int]
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True

# Bid Schemas
class SolanaBidCreate(BaseModel):
    auction_id: int = Field(..., description="Auction ID")
    bidder_wallet_id: int = Field(..., description="Bidder wallet ID")
    bid_amount: float = Field(..., gt=0, description="Bid amount")

class SolanaBidResponse(BaseModel):
    id: int
    auction_id: int
    bidder_wallet_id: int
    bid_amount: float
    created_at: datetime
    is_winning: bool

    class Config:
        from_attributes = True

# Payment Schemas
class SolanaPaymentRequest(BaseModel):
    from_wallet: str = Field(..., min_length=32, max_length=44, description="Sender wallet address")
    to_wallet: str = Field(..., min_length=32, max_length=44, description="Recipient wallet address")
    amount: float = Field(..., gt=0, description="Payment amount")
    currency: str = Field(default="SOL", max_length=10, description="Currency")
    memo: Optional[str] = Field(None, max_length=1000, description="Payment memo")
    use_escrow: bool = Field(default=False, description="Whether to use escrow")

class SolanaPaymentResponse(BaseModel):
    transaction_id: str
    status: str
    amount: float
    currency: str
    from_wallet: str
    to_wallet: str
    memo: Optional[str]
    created_at: datetime

# Wallet Balance Schemas
class SolanaWalletBalance(BaseModel):
    wallet_address: str
    balance_sol: float
    balance_lamports: int
    token_balances: List[Dict[str, Any]] = Field(default_factory=list)

# Transaction History Schemas
class SolanaTransactionHistory(BaseModel):
    wallet_address: str
    transactions: List[SolanaTransactionResponse]
    total_count: int
    page: int
    page_size: int

# NFT Marketplace Schemas
class SolanaNFTListing(BaseModel):
    nft_id: int
    price: float
    currency: str = "SOL"
    is_auction: bool = False
    auction_end_time: Optional[datetime] = None

class SolanaNFTListingResponse(BaseModel):
    listing_id: str
    nft_id: int
    price: float
    currency: str
    is_auction: bool
    auction_end_time: Optional[datetime]
    created_at: datetime
    status: str

# Analytics Schemas
class SolanaAnalytics(BaseModel):
    total_volume: float
    total_transactions: int
    active_wallets: int
    nft_sales: int
    average_transaction_value: float
    top_tokens: List[Dict[str, Any]]
    recent_activity: List[Dict[str, Any]]

# Error Schemas
class SolanaError(BaseModel):
    error_code: str
    error_message: str
    details: Optional[Dict[str, Any]] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)
