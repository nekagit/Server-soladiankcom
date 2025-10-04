#!/usr/bin/env python3
"""
Database initialization script for Soladia Marketplace
"""
from sqlalchemy.orm import Session
from database import engine, SessionLocal
from models import Base, Category, User, Product, Order, Review, Watchlist

def init_database():
    """Initialize database with sample data"""
    # Create all tables
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    
    try:
        # Create sample categories
        categories_data = [
            {"name": "Electronics", "description": "Electronic devices and gadgets", "icon_url": "/icons/electronics.svg"},
            {"name": "Fashion", "description": "Clothing and accessories", "icon_url": "/icons/fashion.svg"},
            {"name": "Home & Garden", "description": "Home improvement and garden items", "icon_url": "/icons/home.svg"},
            {"name": "Sports", "description": "Sports equipment and gear", "icon_url": "/icons/sports.svg"},
            {"name": "Books", "description": "Books and educational materials", "icon_url": "/icons/books.svg"},
            {"name": "Collectibles", "description": "Rare and collectible items", "icon_url": "/icons/collectibles.svg"},
        ]
        
        for cat_data in categories_data:
            existing = db.query(Category).filter(Category.name == cat_data["name"]).first()
            if not existing:
                category = Category(**cat_data)
                db.add(category)
        
        # Create sample users
        users_data = [
            {
                "wallet_address": "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
                "username": "TechGuru",
                "email": "techguru@example.com",
                "full_name": "Tech Guru",
                "user_type": "both",
                "is_verified": True,
                "rating": 4.9
            },
            {
                "wallet_address": "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
                "username": "AppleStore",
                "email": "applestore@example.com",
                "full_name": "Apple Store",
                "user_type": "seller",
                "is_verified": True,
                "rating": 4.8
            },
            {
                "wallet_address": "5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1",
                "username": "SamsungStore",
                "email": "samsung@example.com",
                "full_name": "Samsung Store",
                "user_type": "seller",
                "is_verified": True,
                "rating": 4.7
            }
        ]
        
        for user_data in users_data:
            existing = db.query(User).filter(User.wallet_address == user_data["wallet_address"]).first()
            if not existing:
                user = User(**user_data)
                db.add(user)
        
        db.commit()
        
        # Create sample products
        electronics_cat = db.query(Category).filter(Category.name == "Electronics").first()
        if electronics_cat:
            tech_guru = db.query(User).filter(User.username == "TechGuru").first()
            apple_store = db.query(User).filter(User.username == "AppleStore").first()
            samsung_store = db.query(User).filter(User.username == "SamsungStore").first()
            
            products_data = [
                {
                    "title": "iPhone 14 Pro Max 256GB Space Black",
                    "description": "Brand new iPhone 14 Pro Max in perfect condition. Latest flagship from Apple with cutting-edge features.",
                    "price": 1.2,
                    "currency": "SOL",
                    "condition": "new",
                    "category_id": electronics_cat.id,
                    "seller_id": tech_guru.id if tech_guru else 1,
                    "images": '["https://via.placeholder.com/600x600", "https://via.placeholder.com/600x600"]',
                    "is_featured": True,
                    "shipping_cost": 0.0
                },
                {
                    "title": "MacBook Pro 16\" M2 Max 1TB",
                    "description": "Powerful MacBook Pro with M2 Max chip, perfect for professionals and creators.",
                    "price": 4.5,
                    "currency": "SOL",
                    "condition": "new",
                    "category_id": electronics_cat.id,
                    "seller_id": apple_store.id if apple_store else 2,
                    "images": '["https://via.placeholder.com/600x600"]',
                    "is_featured": True,
                    "shipping_cost": 0.1
                },
                {
                    "title": "Samsung Galaxy S23 Ultra 512GB",
                    "description": "Latest Samsung flagship with advanced camera system and S Pen.",
                    "price": 1.8,
                    "currency": "SOL",
                    "condition": "new",
                    "category_id": electronics_cat.id,
                    "seller_id": samsung_store.id if samsung_store else 3,
                    "images": '["https://via.placeholder.com/600x600"]',
                    "is_trending": True,
                    "shipping_cost": 0.05
                }
            ]
            
            for prod_data in products_data:
                existing = db.query(Product).filter(Product.title == prod_data["title"]).first()
                if not existing:
                    product = Product(**prod_data)
                    db.add(product)
        
        db.commit()
        print("✅ Database initialized successfully!")
        print("📊 Created sample categories, users, and products")
        
    except Exception as e:
        print(f"❌ Error initializing database: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    init_database()
