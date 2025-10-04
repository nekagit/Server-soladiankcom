from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, Text, ForeignKey, Enum, Index
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from datetime import datetime
import enum

Base = declarative_base()

class UserType(str, enum.Enum):
    BUYER = "buyer"
    SELLER = "seller"
    BOTH = "both"

class OrderStatus(str, enum.Enum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    SHIPPED = "shipped"
    DELIVERED = "delivered"
    CANCELLED = "cancelled"
    DISPUTED = "disputed"

class ProductCondition(str, enum.Enum):
    NEW = "new"
    LIKE_NEW = "like_new"
    GOOD = "good"
    FAIR = "fair"
    POOR = "poor"

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    wallet_address = Column(String(44), unique=True, index=True, nullable=False)
    username = Column(String(50), unique=True, index=True)
    email = Column(String(100), unique=True, index=True)
    full_name = Column(String(100))
    avatar_url = Column(String(500))
    user_type = Column(Enum(UserType), default=UserType.BOTH)
    is_verified = Column(Boolean, default=False)
    rating = Column(Float, default=0.0)
    total_sales = Column(Integer, default=0)
    total_purchases = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    products = relationship("Product", back_populates="seller")
    orders_as_buyer = relationship("Order", foreign_keys="Order.buyer_id", back_populates="buyer")
    orders_as_seller = relationship("Order", foreign_keys="Order.seller_id", back_populates="seller")
    reviews_given = relationship("Review", foreign_keys="Review.reviewer_id", back_populates="reviewer")
    reviews_received = relationship("Review", foreign_keys="Review.reviewee_id", back_populates="reviewee")
    watchlist_items = relationship("Watchlist", back_populates="user")

class Category(Base):
    __tablename__ = "categories"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, index=True)
    description = Column(Text)
    icon_url = Column(String(500))
    parent_id = Column(Integer, ForeignKey("categories.id"))
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    products = relationship("Product", back_populates="category")
    parent = relationship("Category", remote_side=[id])

class Product(Base):
    __tablename__ = "products"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), index=True, nullable=False)
    description = Column(Text)
    price = Column(Float, nullable=False)
    currency = Column(String(10), default="SOL")
    condition = Column(Enum(ProductCondition), default=ProductCondition.NEW)
    category_id = Column(Integer, ForeignKey("categories.id"), index=True)
    seller_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    images = Column(Text)  # JSON string of image URLs
    is_featured = Column(Boolean, default=False)
    is_trending = Column(Boolean, default=False)
    is_auction = Column(Boolean, default=False)
    auction_end_time = Column(DateTime)
    current_bid = Column(Float)
    buy_now_price = Column(Float)
    shipping_cost = Column(Float, default=0.0)
    is_active = Column(Boolean, default=True, index=True)
    views_count = Column(Integer, default=0)
    likes_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    seller = relationship("User", foreign_keys=[seller_id], back_populates="products")
    category = relationship("Category", back_populates="products")
    orders = relationship("Order", back_populates="product")
    reviews = relationship("Review", back_populates="product")
    watchlist_items = relationship("Watchlist", back_populates="product")

class Order(Base):
    __tablename__ = "orders"
    
    id = Column(Integer, primary_key=True, index=True)
    buyer_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    seller_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    quantity = Column(Integer, default=1)
    unit_price = Column(Float, nullable=False)
    total_price = Column(Float, nullable=False)
    shipping_cost = Column(Float, default=0.0)
    status = Column(Enum(OrderStatus), default=OrderStatus.PENDING, index=True)
    transaction_hash = Column(String(100), unique=True, index=True)
    shipping_address = Column(Text)
    tracking_number = Column(String(100))
    notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    buyer = relationship("User", foreign_keys=[buyer_id], back_populates="orders_as_buyer")
    seller = relationship("User", foreign_keys=[seller_id], back_populates="orders_as_seller")
    product = relationship("Product", back_populates="orders")

class Review(Base):
    __tablename__ = "reviews"
    
    id = Column(Integer, primary_key=True, index=True)
    reviewer_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    reviewee_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"))
    rating = Column(Integer, nullable=False)  # 1-5 stars
    title = Column(String(200))
    comment = Column(Text)
    is_verified_purchase = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    
    # Relationships
    reviewer = relationship("User", foreign_keys=[reviewer_id], back_populates="reviews_given")
    reviewee = relationship("User", foreign_keys=[reviewee_id], back_populates="reviews_received")
    product = relationship("Product", back_populates="reviews")
    order = relationship("Order")

class Watchlist(Base):
    __tablename__ = "watchlist"
    __table_args__ = (
        Index('ix_watchlist_user_product', 'user_id', 'product_id'),
    )
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="watchlist_items")
    product = relationship("Product", back_populates="watchlist_items")

class PaymentStatus(str, enum.Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"
    DISPUTED = "disputed"
    REFUNDED = "refunded"

class Payment(Base):
    __tablename__ = "payments"
    
    id = Column(Integer, primary_key=True, index=True)
    payment_id = Column(String(100), unique=True, index=True, nullable=False)
    buyer_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    seller_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=True)
    amount = Column(Float, nullable=False)
    currency = Column(String(10), default="SOL")
    status = Column(Enum(PaymentStatus), default=PaymentStatus.PENDING, index=True)
    transaction_hash = Column(String(100), unique=True, index=True, nullable=True)
    buyer_wallet_address = Column(String(44), nullable=False, index=True)
    seller_wallet_address = Column(String(44), nullable=False, index=True)
    escrow_address = Column(String(44), nullable=True, index=True)
    escrow_release_time = Column(DateTime, nullable=True)
    dispute_period_days = Column(Integer, default=7)
    memo = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)
    
    # Relationships
    buyer = relationship("User", foreign_keys=[buyer_id], back_populates="payments_as_buyer")
    seller = relationship("User", foreign_keys=[seller_id], back_populates="payments_as_seller")
    product = relationship("Product", back_populates="payments")
    order = relationship("Order", back_populates="payments")

class Escrow(Base):
    __tablename__ = "escrows"
    
    id = Column(Integer, primary_key=True, index=True)
    escrow_id = Column(String(100), unique=True, index=True, nullable=False)
    payment_id = Column(Integer, ForeignKey("payments.id"), nullable=False, index=True)
    escrow_address = Column(String(44), unique=True, index=True, nullable=False)
    buyer_address = Column(String(44), nullable=False, index=True)
    seller_address = Column(String(44), nullable=False, index=True)
    amount = Column(Float, nullable=False)
    release_time = Column(DateTime, nullable=False, index=True)
    dispute_period_days = Column(Integer, default=7)
    is_released = Column(Boolean, default=False, index=True)
    is_disputed = Column(Boolean, default=False, index=True)
    dispute_reason = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    released_at = Column(DateTime, nullable=True)
    
    # Relationships
    payment = relationship("Payment", back_populates="escrow")

class Dispute(Base):
    __tablename__ = "disputes"
    
    id = Column(Integer, primary_key=True, index=True)
    dispute_id = Column(String(100), unique=True, index=True, nullable=False)
    payment_id = Column(Integer, ForeignKey("payments.id"), nullable=False, index=True)
    escrow_id = Column(Integer, ForeignKey("escrows.id"), nullable=False, index=True)
    initiator_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    reason = Column(Text, nullable=False)
    status = Column(String(50), default="open", index=True)
    resolution = Column(Text, nullable=True)
    resolved_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    resolved_at = Column(DateTime, nullable=True)
    
    # Relationships
    payment = relationship("Payment", back_populates="disputes")
    escrow = relationship("Escrow", back_populates="disputes")
    initiator = relationship("User", foreign_keys=[initiator_id], back_populates="disputes_initiated")
    resolver = relationship("User", foreign_keys=[resolved_by], back_populates="disputes_resolved")

# Add relationships to existing models
User.payments_as_buyer = relationship("Payment", foreign_keys="Payment.buyer_id", back_populates="buyer")
User.payments_as_seller = relationship("Payment", foreign_keys="Payment.seller_id", back_populates="seller")
User.disputes_initiated = relationship("Dispute", foreign_keys="Dispute.initiator_id", back_populates="initiator")
User.disputes_resolved = relationship("Dispute", foreign_keys="Dispute.resolved_by", back_populates="resolver")

Product.payments = relationship("Payment", back_populates="product")
Order.payments = relationship("Payment", back_populates="order")

Payment.escrow = relationship("Escrow", back_populates="payment", uselist=False)
Payment.disputes = relationship("Dispute", back_populates="payment")
Escrow.disputes = relationship("Dispute", back_populates="escrow")
