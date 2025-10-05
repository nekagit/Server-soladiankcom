"""
Solana-specific database models for the Soladia marketplace
"""

from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Text, ForeignKey, JSON, BigInteger
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base
from datetime import datetime
from typing import Optional, Dict, Any
import json

class SolanaWallet(Base):
    """Solana wallet information"""
    __tablename__ = "solana_wallets"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    wallet_address = Column(String(44), unique=True, nullable=False, index=True)
    wallet_type = Column(String(50), nullable=False)  # phantom, solflare, backpack, etc.
    is_primary = Column(Boolean, default=False)
    is_verified = Column(Boolean, default=False)
    balance_sol = Column(Float, default=0.0)
    balance_lamports = Column(BigInteger, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    last_activity = Column(DateTime(timezone=True))
    
    # Relationships
    user = relationship("User", back_populates="solana_wallets")
    transactions = relationship("SolanaTransaction", back_populates="wallet")
    nft_holdings = relationship("SolanaNFT", back_populates="owner_wallet")
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "user_id": self.user_id,
            "wallet_address": self.wallet_address,
            "wallet_type": self.wallet_type,
            "is_primary": self.is_primary,
            "is_verified": self.is_verified,
            "balance_sol": self.balance_sol,
            "balance_lamports": self.balance_lamports,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "last_activity": self.last_activity.isoformat() if self.last_activity else None
        }

class SolanaTransaction(Base):
    """Solana transaction records"""
    __tablename__ = "solana_transactions"
    
    id = Column(Integer, primary_key=True, index=True)
    wallet_id = Column(Integer, ForeignKey("solana_wallets.id"), nullable=False)
    transaction_signature = Column(String(88), unique=True, nullable=False, index=True)
    transaction_type = Column(String(50), nullable=False)  # payment, nft_transfer, token_transfer, etc.
    from_address = Column(String(44), nullable=False)
    to_address = Column(String(44), nullable=False)
    amount = Column(Float, nullable=False)
    amount_lamports = Column(BigInteger, nullable=False)
    token_mint = Column(String(44), nullable=True)  # For SPL tokens
    memo = Column(Text, nullable=True)
    status = Column(String(20), nullable=False)  # pending, confirmed, failed
    confirmation_count = Column(Integer, default=0)
    fee = Column(Float, default=0.0)
    block_time = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Additional transaction metadata
    metadata = Column(JSON, nullable=True)
    error_message = Column(Text, nullable=True)
    
    # Relationships
    wallet = relationship("SolanaWallet", back_populates="transactions")
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "wallet_id": self.wallet_id,
            "transaction_signature": self.transaction_signature,
            "transaction_type": self.transaction_type,
            "from_address": self.from_address,
            "to_address": self.to_address,
            "amount": self.amount,
            "amount_lamports": self.amount_lamports,
            "token_mint": self.token_mint,
            "memo": self.memo,
            "status": self.status,
            "confirmation_count": self.confirmation_count,
            "fee": self.fee,
            "block_time": self.block_time.isoformat() if self.block_time else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "metadata": self.metadata,
            "error_message": self.error_message
        }

class SolanaNFT(Base):
    """Solana NFT information"""
    __tablename__ = "solana_nfts"
    
    id = Column(Integer, primary_key=True, index=True)
    nft_mint = Column(String(44), unique=True, nullable=False, index=True)
    owner_wallet_id = Column(Integer, ForeignKey("solana_wallets.id"), nullable=False)
    name = Column(String(255), nullable=False)
    symbol = Column(String(50), nullable=True)
    description = Column(Text, nullable=True)
    image_url = Column(String(500), nullable=True)
    animation_url = Column(String(500), nullable=True)
    external_url = Column(String(500), nullable=True)
    attributes = Column(JSON, nullable=True)
    collection = Column(String(255), nullable=True)
    collection_family = Column(String(255), nullable=True)
    is_listed = Column(Boolean, default=False)
    listing_price = Column(Float, nullable=True)
    listing_currency = Column(String(10), default="SOL")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    owner_wallet = relationship("SolanaWallet", back_populates="nft_holdings")
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "nft_mint": self.nft_mint,
            "owner_wallet_id": self.owner_wallet_id,
            "name": self.name,
            "symbol": self.symbol,
            "description": self.description,
            "image_url": self.image_url,
            "animation_url": self.animation_url,
            "external_url": self.external_url,
            "attributes": self.attributes,
            "collection": self.collection,
            "collection_family": self.collection_family,
            "is_listed": self.is_listed,
            "listing_price": self.listing_price,
            "listing_currency": self.listing_currency,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None
        }

class SolanaToken(Base):
    """Solana SPL token information"""
    __tablename__ = "solana_tokens"
    
    id = Column(Integer, primary_key=True, index=True)
    token_mint = Column(String(44), unique=True, nullable=False, index=True)
    symbol = Column(String(20), nullable=False)
    name = Column(String(100), nullable=False)
    decimals = Column(Integer, default=9)
    supply = Column(BigInteger, nullable=True)
    is_verified = Column(Boolean, default=False)
    logo_url = Column(String(500), nullable=True)
    website = Column(String(500), nullable=True)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "token_mint": self.token_mint,
            "symbol": self.symbol,
            "name": self.name,
            "decimals": self.decimals,
            "supply": self.supply,
            "is_verified": self.is_verified,
            "logo_url": self.logo_url,
            "website": self.website,
            "description": self.description,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None
        }

class SolanaEscrow(Base):
    """Solana escrow transactions"""
    __tablename__ = "solana_escrows"
    
    id = Column(Integer, primary_key=True, index=True)
    escrow_id = Column(String(100), unique=True, nullable=False, index=True)
    buyer_wallet_id = Column(Integer, ForeignKey("solana_wallets.id"), nullable=False)
    seller_wallet_id = Column(Integer, ForeignKey("solana_wallets.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=True)
    amount = Column(Float, nullable=False)
    currency = Column(String(10), default="SOL")
    status = Column(String(20), nullable=False)  # pending, funded, released, refunded, disputed
    escrow_address = Column(String(44), nullable=True)
    transaction_signature = Column(String(88), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    expires_at = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    buyer_wallet = relationship("SolanaWallet", foreign_keys=[buyer_wallet_id])
    seller_wallet = relationship("SolanaWallet", foreign_keys=[seller_wallet_id])
    product = relationship("Product")
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "escrow_id": self.escrow_id,
            "buyer_wallet_id": self.buyer_wallet_id,
            "seller_wallet_id": self.seller_wallet_id,
            "product_id": self.product_id,
            "amount": self.amount,
            "currency": self.currency,
            "status": self.status,
            "escrow_address": self.escrow_address,
            "transaction_signature": self.transaction_signature,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "expires_at": self.expires_at.isoformat() if self.expires_at else None
        }

class SolanaAuction(Base):
    """Solana NFT auctions"""
    __tablename__ = "solana_auctions"
    
    id = Column(Integer, primary_key=True, index=True)
    auction_id = Column(String(100), unique=True, nullable=False, index=True)
    nft_id = Column(Integer, ForeignKey("solana_nfts.id"), nullable=False)
    seller_wallet_id = Column(Integer, ForeignKey("solana_wallets.id"), nullable=False)
    starting_price = Column(Float, nullable=False)
    reserve_price = Column(Float, nullable=True)
    current_bid = Column(Float, nullable=True)
    current_bidder_wallet_id = Column(Integer, ForeignKey("solana_wallets.id"), nullable=True)
    currency = Column(String(10), default="SOL")
    status = Column(String(20), nullable=False)  # active, ended, cancelled
    start_time = Column(DateTime(timezone=True), nullable=False)
    end_time = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    nft = relationship("SolanaNFT")
    seller_wallet = relationship("SolanaWallet", foreign_keys=[seller_wallet_id])
    current_bidder_wallet = relationship("SolanaWallet", foreign_keys=[current_bidder_wallet_id])
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "auction_id": self.auction_id,
            "nft_id": self.nft_id,
            "seller_wallet_id": self.seller_wallet_id,
            "starting_price": self.starting_price,
            "reserve_price": self.reserve_price,
            "current_bid": self.current_bid,
            "current_bidder_wallet_id": self.current_bidder_wallet_id,
            "currency": self.currency,
            "status": self.status,
            "start_time": self.start_time.isoformat() if self.start_time else None,
            "end_time": self.end_time.isoformat() if self.end_time else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None
        }
