from fastapi import FastAPI, HTTPException, Depends, status, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse
from fastapi.exceptions import RequestValidationError
from sqlalchemy.orm import Session
from typing import List, Optional
import uvicorn
import os
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from database import get_db, engine, Base
from models import User, Product, Order, Category, Review, Watchlist
from schemas import (
    UserCreate, UserResponse, ProductCreate, ProductResponse, 
    OrderCreate, OrderResponse, CategoryResponse, ReviewCreate, 
    ReviewResponse, WatchlistCreate, WatchlistResponse
)
from services import (
    UserService, ProductService, OrderService, 
    CategoryService, ReviewService, WatchlistService
)
from enhanced_solana_endpoints import router as solana_router
from config import settings
from middleware.error_handler import (
    error_handler_middleware,
    app_exception_handler,
    validation_exception_handler,
    AppException
)
from middleware.logging_middleware import logging_middleware
from utils.logger import app_logger, setup_logger

# Create database tables (only creates if not exists)
Base.metadata.create_all(bind=engine)

# Initialize logger with config
setup_logger("soladia", settings.LOG_LEVEL)
app_logger.info("Starting Soladia Marketplace API", version="1.0.0", debug=settings.DEBUG)

# Initialize rate limiter
limiter = Limiter(key_func=get_remote_address, enabled=settings.RATE_LIMIT_ENABLED)

app = FastAPI(
    title="Soladia Marketplace API",
    description="Decentralized marketplace powered by Solana blockchain",
    version="1.0.0",
    debug=settings.DEBUG
)

# Add rate limiter to app state
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Add custom exception handlers
app.add_exception_handler(AppException, app_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)

# Logging middleware (before error handler)
app.middleware("http")(logging_middleware)

# Error handling middleware
app.middleware("http")(error_handler_middleware)

# CORS middleware - restricted to allowed origins from config
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Solana API routes FIRST (before other routes)
app.include_router(solana_router)
print(f"✅ Solana router included with prefix: {solana_router.prefix}")
print(f"✅ Solana routes: {[route.path for route in solana_router.routes]}")

# Mount static files
app.mount("/static", StaticFiles(directory="static"), name="static")

# Initialize services
user_service = UserService()
product_service = ProductService()
order_service = OrderService()
category_service = CategoryService()
review_service = ReviewService()
watchlist_service = WatchlistService()

@app.get("/")
async def root():
    return {"message": "Soladia Marketplace API", "version": "1.0.0"}

# Test endpoint to verify Solana router
@app.get("/test-solana")
async def test_solana():
    return {
        "message": "Solana router is working", 
        "routes": [route.path for route in solana_router.routes],
        "prefix": solana_router.prefix
    }

# User endpoints
@app.post("/api/users/", response_model=UserResponse)
async def create_user(user: UserCreate, db: Session = Depends(get_db)):
    return user_service.create_user(db, user)

@app.get("/api/users/{user_id}", response_model=UserResponse)
async def get_user(user_id: int, db: Session = Depends(get_db)):
    user = user_service.get_user(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@app.get("/api/users/", response_model=List[UserResponse])
async def get_users(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return user_service.get_users(db, skip=skip, limit=limit)

@app.put("/api/users/{user_id}", response_model=UserResponse)
async def update_user(user_id: int, user: UserCreate, db: Session = Depends(get_db)):
    return user_service.update_user(db, user_id, user)

@app.delete("/api/users/{user_id}")
async def delete_user(user_id: int, db: Session = Depends(get_db)):
    user_service.delete_user(db, user_id)
    return {"message": "User deleted successfully"}

# Product endpoints
@app.post("/api/products/", response_model=ProductResponse)
@limiter.limit(settings.RATE_LIMIT_PAYMENT)
async def create_product(request: Request, product: ProductCreate, db: Session = Depends(get_db)):
    return product_service.create_product(db, product)

@app.get("/api/products/{product_id}", response_model=ProductResponse)
async def get_product(product_id: int, db: Session = Depends(get_db)):
    product = product_service.get_product(db, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product

@app.get("/api/products/", response_model=List[ProductResponse])
async def get_products(
    skip: int = 0, 
    limit: int = 100, 
    category_id: Optional[int] = None,
    search: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    db: Session = Depends(get_db)
):
    return product_service.get_products(
        db, skip=skip, limit=limit, category_id=category_id,
        search=search, min_price=min_price, max_price=max_price
    )

@app.get("/api/products/featured/", response_model=List[ProductResponse])
async def get_featured_products(db: Session = Depends(get_db)):
    return product_service.get_featured_products(db)

@app.get("/api/products/trending/", response_model=List[ProductResponse])
async def get_trending_products(db: Session = Depends(get_db)):
    return product_service.get_trending_products(db)

@app.put("/api/products/{product_id}", response_model=ProductResponse)
async def update_product(product_id: int, product: ProductCreate, db: Session = Depends(get_db)):
    return product_service.update_product(db, product_id, product)

@app.delete("/api/products/{product_id}")
async def delete_product(product_id: int, db: Session = Depends(get_db)):
    product_service.delete_product(db, product_id)
    return {"message": "Product deleted successfully"}

# Category endpoints
@app.get("/api/categories/", response_model=List[CategoryResponse])
async def get_categories(db: Session = Depends(get_db)):
    return category_service.get_categories(db)

@app.get("/api/categories/{category_id}", response_model=CategoryResponse)
async def get_category(category_id: int, db: Session = Depends(get_db)):
    category = category_service.get_category(db, category_id)
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    return category

# Order endpoints
@app.post("/api/orders/", response_model=OrderResponse)
@limiter.limit(settings.RATE_LIMIT_PAYMENT)
async def create_order(request: Request, order: OrderCreate, db: Session = Depends(get_db)):
    return order_service.create_order(db, order)

@app.get("/api/orders/{order_id}", response_model=OrderResponse)
async def get_order(order_id: int, db: Session = Depends(get_db)):
    order = order_service.get_order(db, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order

@app.get("/api/orders/", response_model=List[OrderResponse])
async def get_orders(
    user_id: Optional[int] = None,
    seller_id: Optional[int] = None,
    status: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    return order_service.get_orders(
        db, user_id=user_id, seller_id=seller_id, 
        status=status, skip=skip, limit=limit
    )

@app.put("/api/orders/{order_id}/status")
async def update_order_status(order_id: int, status: str, db: Session = Depends(get_db)):
    return order_service.update_order_status(db, order_id, status)

# Review endpoints
@app.post("/api/reviews/", response_model=ReviewResponse)
async def create_review(review: ReviewCreate, db: Session = Depends(get_db)):
    return review_service.create_review(db, review)

@app.get("/api/reviews/product/{product_id}", response_model=List[ReviewResponse])
async def get_product_reviews(product_id: int, db: Session = Depends(get_db)):
    return review_service.get_product_reviews(db, product_id)

@app.get("/api/reviews/user/{user_id}", response_model=List[ReviewResponse])
async def get_user_reviews(user_id: int, db: Session = Depends(get_db)):
    return review_service.get_user_reviews(db, user_id)

# Watchlist endpoints
@app.post("/api/watchlist/", response_model=WatchlistResponse)
async def add_to_watchlist(watchlist: WatchlistCreate, db: Session = Depends(get_db)):
    return watchlist_service.add_to_watchlist(db, watchlist)

@app.get("/api/watchlist/user/{user_id}", response_model=List[WatchlistResponse])
async def get_user_watchlist(user_id: int, db: Session = Depends(get_db)):
    return watchlist_service.get_user_watchlist(db, user_id)

@app.delete("/api/watchlist/{watchlist_id}")
async def remove_from_watchlist(watchlist_id: int, db: Session = Depends(get_db)):
    watchlist_service.remove_from_watchlist(db, watchlist_id)
    return {"message": "Item removed from watchlist"}

# Search endpoint
@app.get("/api/search/")
async def search_products(
    q: str,
    category_id: Optional[int] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    db: Session = Depends(get_db)
):
    return product_service.search_products(
        db, query=q, category_id=category_id,
        min_price=min_price, max_price=max_price
    )

# Analytics endpoints
@app.get("/api/analytics/sales/{user_id}")
async def get_sales_analytics(user_id: int, db: Session = Depends(get_db)):
    return user_service.get_sales_analytics(db, user_id)

@app.get("/api/analytics/products/{user_id}")
async def get_product_analytics(user_id: int, db: Session = Depends(get_db)):
    return product_service.get_product_analytics(db, user_id)

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
