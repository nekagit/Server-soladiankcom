"""
Copy trading and social trading features for Soladia
"""
from typing import Dict, List, Optional, Any, Tuple
from sqlalchemy import Column, String, Integer, Boolean, DateTime, Text, ForeignKey, Float, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime, timedelta
import uuid
import json

Base = declarative_base()

class Trader(Base):
    """Trader model for copy trading"""
    __tablename__ = "traders"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, nullable=False)
    username = Column(String(100), nullable=False)
    display_name = Column(String(255), nullable=True)
    avatar_url = Column(String(500), nullable=True)
    bio = Column(Text, nullable=True)
    
    # Trading stats
    total_trades = Column(Integer, default=0)
    successful_trades = Column(Integer, default=0)
    total_volume = Column(Float, default=0.0)
    win_rate = Column(Float, default=0.0)
    average_return = Column(Float, default=0.0)
    max_drawdown = Column(Float, default=0.0)
    
    # Social stats
    followers_count = Column(Integer, default=0)
    following_count = Column(Integer, default=0)
    total_copiers = Column(Integer, default=0)
    
    # Verification
    is_verified = Column(Boolean, default=False)
    verification_badge = Column(String(50), nullable=True)
    
    # Status
    is_active = Column(Boolean, default=True)
    is_public = Column(Boolean, default=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    trades = relationship("Trade", back_populates="trader")
    followers = relationship("TraderFollow", back_populates="trader")
    copy_trades = relationship("CopyTrade", back_populates="trader")

class Trade(Base):
    """Trade model"""
    __tablename__ = "trades"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    trader_id = Column(String, ForeignKey("traders.id"), nullable=False)
    
    # Trade details
    asset_type = Column(String(50), nullable=False)  # 'nft', 'token', 'product'
    asset_id = Column(String, nullable=False)
    trade_type = Column(String(20), nullable=False)  # 'buy', 'sell', 'bid', 'offer'
    price = Column(Float, nullable=False)
    quantity = Column(Integer, default=1)
    currency = Column(String(10), default="SOL")
    
    # Trade status
    status = Column(String(20), default="pending")  # 'pending', 'completed', 'cancelled', 'failed'
    executed_at = Column(DateTime, nullable=True)
    
    # Copy trading
    is_copyable = Column(Boolean, default=True)
    copy_count = Column(Integer, default=0)
    total_copy_volume = Column(Float, default=0.0)
    
    # Metadata
    metadata = Column(JSON, nullable=True)
    notes = Column(Text, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    trader = relationship("Trader", back_populates="trades")
    copy_trades = relationship("CopyTrade", back_populates="original_trade")

class CopyTrade(Base):
    """Copy trade model"""
    __tablename__ = "copy_trades"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    original_trade_id = Column(String, ForeignKey("trades.id"), nullable=False)
    trader_id = Column(String, ForeignKey("traders.id"), nullable=False)
    copier_id = Column(String, nullable=False)  # User who copied the trade
    
    # Copy settings
    copy_percentage = Column(Float, default=100.0)  # Percentage of original trade to copy
    max_copy_amount = Column(Float, nullable=True)  # Maximum amount to copy
    auto_copy = Column(Boolean, default=False)  # Auto-copy future trades
    
    # Copy trade details
    copied_price = Column(Float, nullable=False)
    copied_quantity = Column(Integer, default=1)
    status = Column(String(20), default="pending")
    executed_at = Column(DateTime, nullable=True)
    
    # Performance tracking
    profit_loss = Column(Float, default=0.0)
    return_percentage = Column(Float, default=0.0)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    original_trade = relationship("Trade", back_populates="copy_trades")
    trader = relationship("Trader", back_populates="copy_trades")

class TraderFollow(Base):
    """Trader follow model"""
    __tablename__ = "trader_follows"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    trader_id = Column(String, ForeignKey("traders.id"), nullable=False)
    follower_id = Column(String, nullable=False)
    
    # Follow settings
    auto_copy = Column(Boolean, default=False)
    copy_percentage = Column(Float, default=100.0)
    max_copy_amount = Column(Float, nullable=True)
    notification_enabled = Column(Boolean, default=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    trader = relationship("Trader", back_populates="followers")

class CopyTradingService:
    """Service for copy trading operations"""
    
    def __init__(self, db_session):
        self.db = db_session
    
    async def create_trader_profile(
        self,
        user_id: str,
        username: str,
        display_name: Optional[str] = None,
        bio: Optional[str] = None,
        avatar_url: Optional[str] = None
    ) -> Trader:
        """Create trader profile"""
        trader = Trader(
            user_id=user_id,
            username=username,
            display_name=display_name,
            bio=bio,
            avatar_url=avatar_url
        )
        
        self.db.add(trader)
        self.db.commit()
        self.db.refresh(trader)
        
        return trader
    
    async def get_trader_by_user_id(self, user_id: str) -> Optional[Trader]:
        """Get trader by user ID"""
        return self.db.query(Trader).filter(
            Trader.user_id == user_id,
            Trader.is_active == True
        ).first()
    
    async def get_trader_by_username(self, username: str) -> Optional[Trader]:
        """Get trader by username"""
        return self.db.query(Trader).filter(
            Trader.username == username,
            Trader.is_active == True
        ).first()
    
    async def create_trade(
        self,
        trader_id: str,
        asset_type: str,
        asset_id: str,
        trade_type: str,
        price: float,
        quantity: int = 1,
        currency: str = "SOL",
        is_copyable: bool = True,
        metadata: Optional[Dict[str, Any]] = None,
        notes: Optional[str] = None
    ) -> Trade:
        """Create a new trade"""
        trade = Trade(
            trader_id=trader_id,
            asset_type=asset_type,
            asset_id=asset_id,
            trade_type=trade_type,
            price=price,
            quantity=quantity,
            currency=currency,
            is_copyable=is_copyable,
            metadata=metadata,
            notes=notes
        )
        
        self.db.add(trade)
        self.db.commit()
        self.db.refresh(trade)
        
        # Update trader stats
        await self.update_trader_stats(trader_id)
        
        return trade
    
    async def execute_trade(self, trade_id: str) -> Trade:
        """Execute a trade"""
        trade = self.db.query(Trade).filter(Trade.id == trade_id).first()
        if not trade:
            raise ValueError("Trade not found")
        
        trade.status = "completed"
        trade.executed_at = datetime.utcnow()
        
        self.db.commit()
        self.db.refresh(trade)
        
        # Process copy trades
        await self.process_copy_trades(trade_id)
        
        return trade
    
    async def follow_trader(
        self,
        trader_id: str,
        follower_id: str,
        auto_copy: bool = False,
        copy_percentage: float = 100.0,
        max_copy_amount: Optional[float] = None,
        notification_enabled: bool = True
    ) -> TraderFollow:
        """Follow a trader"""
        follow = TraderFollow(
            trader_id=trader_id,
            follower_id=follower_id,
            auto_copy=auto_copy,
            copy_percentage=copy_percentage,
            max_copy_amount=max_copy_amount,
            notification_enabled=notification_enabled
        )
        
        self.db.add(follow)
        self.db.commit()
        self.db.refresh(follow)
        
        # Update trader follower count
        trader = self.db.query(Trader).filter(Trader.id == trader_id).first()
        if trader:
            trader.followers_count += 1
            self.db.commit()
        
        return follow
    
    async def unfollow_trader(self, trader_id: str, follower_id: str) -> bool:
        """Unfollow a trader"""
        follow = self.db.query(TraderFollow).filter(
            TraderFollow.trader_id == trader_id,
            TraderFollow.follower_id == follower_id
        ).first()
        
        if follow:
            self.db.delete(follow)
            self.db.commit()
            
            # Update trader follower count
            trader = self.db.query(Trader).filter(Trader.id == trader_id).first()
            if trader:
                trader.followers_count = max(0, trader.followers_count - 1)
                self.db.commit()
            
            return True
        
        return False
    
    async def copy_trade(
        self,
        original_trade_id: str,
        copier_id: str,
        copy_percentage: float = 100.0,
        max_copy_amount: Optional[float] = None
    ) -> CopyTrade:
        """Copy a trade"""
        original_trade = self.db.query(Trade).filter(Trade.id == original_trade_id).first()
        if not original_trade:
            raise ValueError("Original trade not found")
        
        if not original_trade.is_copyable:
            raise ValueError("Trade is not copyable")
        
        # Calculate copy amount
        copy_amount = original_trade.price * (copy_percentage / 100.0)
        if max_copy_amount:
            copy_amount = min(copy_amount, max_copy_amount)
        
        copy_trade = CopyTrade(
            original_trade_id=original_trade_id,
            trader_id=original_trade.trader_id,
            copier_id=copier_id,
            copy_percentage=copy_percentage,
            max_copy_amount=max_copy_amount,
            copied_price=copy_amount,
            copied_quantity=original_trade.quantity
        )
        
        self.db.add(copy_trade)
        self.db.commit()
        self.db.refresh(copy_trade)
        
        # Update original trade copy count
        original_trade.copy_count += 1
        original_trade.total_copy_volume += copy_amount
        self.db.commit()
        
        return copy_trade
    
    async def process_copy_trades(self, trade_id: str):
        """Process copy trades for a completed trade"""
        trade = self.db.query(Trade).filter(Trade.id == trade_id).first()
        if not trade or trade.status != "completed":
            return
        
        # Get all followers with auto-copy enabled
        followers = self.db.query(TraderFollow).filter(
            TraderFollow.trader_id == trade.trader_id,
            TraderFollow.auto_copy == True
        ).all()
        
        for follower in followers:
            try:
                await self.copy_trade(
                    original_trade_id=trade_id,
                    copier_id=follower.follower_id,
                    copy_percentage=follower.copy_percentage,
                    max_copy_amount=follower.max_copy_amount
                )
            except Exception as e:
                print(f"Failed to process copy trade for follower {follower.follower_id}: {str(e)}")
    
    async def get_trader_performance(self, trader_id: str, days: int = 30) -> Dict[str, Any]:
        """Get trader performance metrics"""
        start_date = datetime.utcnow() - timedelta(days=days)
        
        # Get completed trades
        trades = self.db.query(Trade).filter(
            Trade.trader_id == trader_id,
            Trade.status == "completed",
            Trade.created_at >= start_date
        ).all()
        
        if not trades:
            return {
                "total_trades": 0,
                "successful_trades": 0,
                "win_rate": 0.0,
                "total_volume": 0.0,
                "average_return": 0.0,
                "max_drawdown": 0.0
            }
        
        # Calculate metrics
        total_trades = len(trades)
        successful_trades = len([t for t in trades if t.trade_type == "buy"])  # Simplified
        win_rate = (successful_trades / total_trades) * 100 if total_trades > 0 else 0
        total_volume = sum(t.price * t.quantity for t in trades)
        
        return {
            "total_trades": total_trades,
            "successful_trades": successful_trades,
            "win_rate": win_rate,
            "total_volume": total_volume,
            "average_return": 0.0,  # Would need more complex calculation
            "max_drawdown": 0.0  # Would need more complex calculation
        }
    
    async def get_top_traders(self, limit: int = 10) -> List[Trader]:
        """Get top performing traders"""
        return self.db.query(Trader).filter(
            Trader.is_active == True,
            Trader.is_public == True
        ).order_by(
            Trader.win_rate.desc(),
            Trader.total_volume.desc()
        ).limit(limit).all()
    
    async def get_trader_feed(self, trader_id: str, limit: int = 20) -> List[Trade]:
        """Get trader's recent trades"""
        return self.db.query(Trade).filter(
            Trade.trader_id == trader_id,
            Trade.is_copyable == True
        ).order_by(Trade.created_at.desc()).limit(limit).all()
    
    async def get_following_feed(self, user_id: str, limit: int = 20) -> List[Trade]:
        """Get feed of trades from followed traders"""
        # Get followed traders
        followed_traders = self.db.query(TraderFollow).filter(
            TraderFollow.follower_id == user_id
        ).all()
        
        trader_ids = [f.trader_id for f in followed_traders]
        
        if not trader_ids:
            return []
        
        return self.db.query(Trade).filter(
            Trade.trader_id.in_(trader_ids),
            Trade.is_copyable == True
        ).order_by(Trade.created_at.desc()).limit(limit).all()
    
    async def update_trader_stats(self, trader_id: str):
        """Update trader statistics"""
        trader = self.db.query(Trader).filter(Trader.id == trader_id).first()
        if not trader:
            return
        
        # Get performance data
        performance = await self.get_trader_performance(trader_id)
        
        # Update trader stats
        trader.total_trades = performance["total_trades"]
        trader.successful_trades = performance["successful_trades"]
        trader.win_rate = performance["win_rate"]
        trader.total_volume = performance["total_volume"]
        trader.average_return = performance["average_return"]
        trader.max_drawdown = performance["max_drawdown"]
        
        self.db.commit()
    
    async def get_copy_trade_performance(self, copier_id: str) -> Dict[str, Any]:
        """Get copy trade performance for a user"""
        copy_trades = self.db.query(CopyTrade).filter(
            CopyTrade.copier_id == copier_id,
            CopyTrade.status == "completed"
        ).all()
        
        if not copy_trades:
            return {
                "total_copies": 0,
                "successful_copies": 0,
                "total_profit_loss": 0.0,
                "average_return": 0.0
            }
        
        total_copies = len(copy_trades)
        successful_copies = len([ct for ct in copy_trades if ct.profit_loss > 0])
        total_profit_loss = sum(ct.profit_loss for ct in copy_trades)
        average_return = total_profit_loss / total_copies if total_copies > 0 else 0
        
        return {
            "total_copies": total_copies,
            "successful_copies": successful_copies,
            "total_profit_loss": total_profit_loss,
            "average_return": average_return
        }
