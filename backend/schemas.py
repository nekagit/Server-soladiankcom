from pydantic import BaseModel, EmailStr, Field, validator, HttpUrl
from typing import Optional, List
from datetime import datetime
import re
from models import UserType, OrderStatus, ProductCondition, PaymentStatus

# User schemas
class UserBase(BaseModel):
    wallet_address: str = Field(..., min_length=32, max_length=44, description="Solana wallet address")
    username: Optional[str] = Field(None, min_length=3, max_length=50, pattern=r'^[a-zA-Z0-9_-]+$')
    email: Optional[EmailStr] = None
    full_name: Optional[str] = Field(None, max_length=100)
    avatar_url: Optional[HttpUrl] = None
    user_type: UserType = UserType.BOTH
    
    @validator('wallet_address')
    def validate_wallet_address(cls, v):
        """Validate Solana wallet address format"""
        if not re.match(r'^[1-9A-HJ-NP-Za-km-z]{32,44}$', v):
            raise ValueError('Invalid Solana wallet address format')
        return v
    
    @validator('username')
    def validate_username(cls, v):
        """Validate username doesn't contain special characters"""
        if v and not re.match(r'^[a-zA-Z0-9_-]+$', v):
            raise ValueError('Username can only contain letters, numbers, underscores and hyphens')
        return v

class UserCreate(UserBase):
    pass

class UserResponse(UserBase):
    id: int
    is_verified: bool
    rating: float
    total_sales: int
    total_purchases: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# Product schemas
class ProductBase(BaseModel):
    title: str = Field(..., min_length=3, max_length=200, description="Product title")
    description: Optional[str] = Field(None, max_length=5000)
    price: float = Field(..., gt=0, description="Product price in SOL")
    currency: str = Field("SOL", min_length=2, max_length=10)
    condition: ProductCondition = ProductCondition.NEW
    category_id: int = Field(..., gt=0)
    images: Optional[str] = Field(None, max_length=2000)
    is_auction: bool = False
    auction_end_time: Optional[datetime] = None
    current_bid: Optional[float] = Field(None, ge=0)
    buy_now_price: Optional[float] = Field(None, gt=0)
    shipping_cost: float = Field(0.0, ge=0, description="Shipping cost in SOL")
    
    @validator('title')
    def validate_title(cls, v):
        """Validate title doesn't contain dangerous characters"""
        if re.search(r'[<>]', v):
            raise ValueError('Title cannot contain < or > characters')
        return v.strip()
    
    @validator('price')
    def validate_price(cls, v):
        """Validate price is reasonable"""
        if v > 1000000:
            raise ValueError('Price cannot exceed 1,000,000 SOL')
        return round(v, 4)  # Round to 4 decimal places
    
    @validator('shipping_cost')
    def validate_shipping_cost(cls, v):
        """Validate shipping cost is reasonable"""
        if v > 1000:
            raise ValueError('Shipping cost cannot exceed 1,000 SOL')
        return round(v, 4)

class ProductCreate(ProductBase):
    pass

class ProductResponse(ProductBase):
    id: int
    seller_id: int
    is_featured: bool
    is_trending: bool
    is_active: bool
    views_count: int
    likes_count: int
    created_at: datetime
    updated_at: datetime
    seller: Optional[UserResponse] = None
    category: Optional["CategoryResponse"] = None

    class Config:
        from_attributes = True

# Category schemas
class CategoryBase(BaseModel):
    name: str
    description: Optional[str] = None
    icon_url: Optional[str] = None
    parent_id: Optional[int] = None

class CategoryResponse(CategoryBase):
    id: int
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

# Order schemas
class OrderBase(BaseModel):
    product_id: int = Field(..., gt=0)
    quantity: int = Field(1, gt=0, le=1000, description="Order quantity")
    shipping_address: Optional[str] = Field(None, max_length=500)
    notes: Optional[str] = Field(None, max_length=1000)
    
    @validator('shipping_address')
    def validate_shipping_address(cls, v):
        """Validate shipping address"""
        if v and re.search(r'[<>]', v):
            raise ValueError('Shipping address cannot contain < or > characters')
        return v.strip() if v else None
    
    @validator('notes')
    def validate_notes(cls, v):
        """Validate notes"""
        if v and len(v.strip()) < 3:
            raise ValueError('Notes must be at least 3 characters if provided')
        return v.strip() if v else None

class OrderCreate(OrderBase):
    buyer_id: int = Field(..., gt=0)
    shipping_cost: float = Field(0.0, ge=0)

class OrderResponse(OrderBase):
    id: int
    buyer_id: int
    seller_id: int
    unit_price: float
    total_price: float
    shipping_cost: float
    status: OrderStatus
    transaction_hash: Optional[str] = None
    tracking_number: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    buyer: Optional[UserResponse] = None
    seller: Optional[UserResponse] = None
    product: Optional[ProductResponse] = None

    class Config:
        from_attributes = True

# Review schemas
class ReviewBase(BaseModel):
    rating: int = Field(..., ge=1, le=5, description="Rating from 1 to 5 stars")
    title: Optional[str] = Field(None, min_length=3, max_length=200)
    comment: Optional[str] = Field(None, min_length=10, max_length=2000)
    
    @validator('title')
    def validate_title(cls, v):
        """Validate review title"""
        if v and re.search(r'[<>]', v):
            raise ValueError('Title cannot contain < or > characters')
        return v.strip() if v else None
    
    @validator('comment')
    def validate_comment(cls, v):
        """Validate review comment"""
        if v and re.search(r'[<>]', v):
            raise ValueError('Comment cannot contain < or > characters')
        return v.strip() if v else None

class ReviewCreate(ReviewBase):
    reviewee_id: int
    product_id: int
    order_id: Optional[int] = None

class ReviewResponse(ReviewBase):
    id: int
    reviewer_id: int
    reviewee_id: int
    product_id: int
    order_id: Optional[int] = None
    is_verified_purchase: bool
    created_at: datetime
    reviewer: Optional[UserResponse] = None
    reviewee: Optional[UserResponse] = None
    product: Optional[ProductResponse] = None

    class Config:
        from_attributes = True

# Watchlist schemas
class WatchlistBase(BaseModel):
    product_id: int

class WatchlistCreate(WatchlistBase):
    pass

class WatchlistResponse(WatchlistBase):
    id: int
    user_id: int
    created_at: datetime
    product: Optional[ProductResponse] = None

    class Config:
        from_attributes = True

# Search schemas
class SearchFilters(BaseModel):
    query: Optional[str] = None
    category_id: Optional[int] = None
    min_price: Optional[float] = None
    max_price: Optional[float] = None
    condition: Optional[ProductCondition] = None
    is_auction: Optional[bool] = None

# Analytics schemas
class SalesAnalytics(BaseModel):
    total_sales: float
    total_orders: int
    average_order_value: float
    sales_by_month: List[dict]
    top_products: List[dict]

class ProductAnalytics(BaseModel):
    total_products: int
    active_products: int
    total_views: int
    total_likes: int
    views_by_product: List[dict]
    likes_by_product: List[dict]
