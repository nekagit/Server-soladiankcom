from sqlalchemy.orm import Session, joinedload, selectinload
from sqlalchemy import and_, or_, desc, func, select
from typing import List, Optional
from datetime import datetime, timedelta
from models import User, Product, Order, Category, Review, Watchlist
from schemas import (
    UserCreate, ProductCreate, OrderCreate, ReviewCreate, 
    WatchlistCreate, SearchFilters, SalesAnalytics, ProductAnalytics
)

class UserService:
    def create_user(self, db: Session, user: UserCreate):
        db_user = User(**user.dict())
        db.add(db_user)
        db.commit()
        db.refresh(db_user)
        return db_user

    def get_user(self, db: Session, user_id: int):
        return db.query(User).filter(User.id == user_id).first()

    def get_user_by_wallet(self, db: Session, wallet_address: str):
        return db.query(User).filter(User.wallet_address == wallet_address).first()

    def get_users(self, db: Session, skip: int = 0, limit: int = 100):
        return db.query(User).offset(skip).limit(limit).all()

    def update_user(self, db: Session, user_id: int, user: UserCreate):
        db_user = db.query(User).filter(User.id == user_id).first()
        if db_user:
            for key, value in user.dict().items():
                setattr(db_user, key, value)
            db.commit()
            db.refresh(db_user)
        return db_user

    def delete_user(self, db: Session, user_id: int):
        db_user = db.query(User).filter(User.id == user_id).first()
        if db_user:
            db.delete(db_user)
            db.commit()
        return db_user

    def get_sales_analytics(self, db: Session, user_id: int):
        # Single query for total sales and total orders using aggregates
        completed_statuses = ["confirmed", "shipped", "delivered"]
        
        sales_summary = db.query(
            func.sum(Order.total_price).label('total_sales'),
            func.count(Order.id).label('total_orders')
        ).filter(
            Order.seller_id == user_id,
            Order.status.in_(completed_statuses)
        ).first()
        
        total_sales = sales_summary.total_sales or 0
        total_orders = sales_summary.total_orders or 0
        avg_order_value = total_sales / total_orders if total_orders > 0 else 0

        # Get sales by month (last 12 months) - optimized with index on created_at
        sales_by_month = db.query(
            func.strftime('%Y-%m', Order.created_at).label('month'),
            func.sum(Order.total_price).label('sales')
        ).filter(
            Order.seller_id == user_id,
            Order.status.in_(completed_statuses),
            Order.created_at >= datetime.now() - timedelta(days=365)
        ).group_by(func.strftime('%Y-%m', Order.created_at)).all()

        # Get top products - optimized with specific column selection
        top_products = db.query(
            Product.title,
            func.sum(Order.quantity).label('total_sold'),
            func.sum(Order.total_price).label('total_revenue')
        ).select_from(Order).join(
            Product, Order.product_id == Product.id
        ).filter(
            Order.seller_id == user_id,
            Order.status.in_(completed_statuses)
        ).group_by(Product.id, Product.title).order_by(desc('total_revenue')).limit(10).all()

        return SalesAnalytics(
            total_sales=float(total_sales),
            total_orders=int(total_orders),
            average_order_value=float(avg_order_value),
            sales_by_month=[{"month": row.month, "sales": float(row.sales)} for row in sales_by_month],
            top_products=[{"title": row.title, "total_sold": int(row.total_sold), "total_revenue": float(row.total_revenue)} for row in top_products]
        )

class ProductService:
    def create_product(self, db: Session, product: ProductCreate):
        db_product = Product(**product.dict())
        db.add(db_product)
        db.commit()
        db.refresh(db_product)
        return db_product

    def get_product(self, db: Session, product_id: int):
        return db.query(Product).filter(Product.id == product_id).first()

    def get_products(self, db: Session, skip: int = 0, limit: int = 100, 
                    category_id: Optional[int] = None, search: Optional[str] = None,
                    min_price: Optional[float] = None, max_price: Optional[float] = None):
        query = db.query(Product).filter(Product.is_active == True)
        
        if category_id:
            query = query.filter(Product.category_id == category_id)
        
        if search:
            query = query.filter(
                or_(
                    Product.title.contains(search),
                    Product.description.contains(search)
                )
            )
        
        if min_price is not None:
            query = query.filter(Product.price >= min_price)
        
        if max_price is not None:
            query = query.filter(Product.price <= max_price)
        
        return query.offset(skip).limit(limit).all()

    def get_featured_products(self, db: Session):
        return db.query(Product).filter(
            Product.is_featured == True,
            Product.is_active == True
        ).limit(10).all()

    def get_trending_products(self, db: Session):
        return db.query(Product).filter(
            Product.is_trending == True,
            Product.is_active == True
        ).order_by(desc(Product.views_count)).limit(10).all()

    def update_product(self, db: Session, product_id: int, product: ProductCreate):
        db_product = db.query(Product).filter(Product.id == product_id).first()
        if db_product:
            for key, value in product.dict().items():
                setattr(db_product, key, value)
            db.commit()
            db.refresh(db_product)
        return db_product

    def delete_product(self, db: Session, product_id: int):
        db_product = db.query(Product).filter(Product.id == product_id).first()
        if db_product:
            db.delete(db_product)
            db.commit()
        return db_product

    def search_products(self, db: Session, query: str, category_id: Optional[int] = None,
                       min_price: Optional[float] = None, max_price: Optional[float] = None):
        return self.get_products(db, category_id=category_id, search=query,
                                min_price=min_price, max_price=max_price)

    def get_product_analytics(self, db: Session, user_id: int):
        # Get total products
        total_products = db.query(func.count(Product.id)).filter(Product.seller_id == user_id).scalar() or 0
        
        # Get active products
        active_products = db.query(func.count(Product.id)).filter(
            Product.seller_id == user_id,
            Product.is_active == True
        ).scalar() or 0
        
        # Get total views
        total_views = db.query(func.sum(Product.views_count)).filter(Product.seller_id == user_id).scalar() or 0
        
        # Get total likes
        total_likes = db.query(func.sum(Product.likes_count)).filter(Product.seller_id == user_id).scalar() or 0
        
        # Get views by product
        views_by_product = db.query(
            Product.title,
            Product.views_count
        ).filter(Product.seller_id == user_id).order_by(desc(Product.views_count)).limit(10).all()
        
        # Get likes by product
        likes_by_product = db.query(
            Product.title,
            Product.likes_count
        ).filter(Product.seller_id == user_id).order_by(desc(Product.likes_count)).limit(10).all()
        
        return ProductAnalytics(
            total_products=total_products,
            active_products=active_products,
            total_views=total_views,
            total_likes=total_likes,
            views_by_product=[{"title": row.title, "views": row.views_count} for row in views_by_product],
            likes_by_product=[{"title": row.title, "likes": row.likes_count} for row in likes_by_product]
        )

class OrderService:
    def create_order(self, db: Session, order: OrderCreate):
        # Get product details
        product = db.query(Product).filter(Product.id == order.product_id).first()
        if not product:
            raise ValueError("Product not found")
        
        # Calculate total price
        unit_price = product.price
        total_price = unit_price * order.quantity + order.shipping_cost
        
        # Create order
        db_order = Order(
            buyer_id=order.buyer_id,
            seller_id=product.seller_id,
            product_id=order.product_id,
            quantity=order.quantity,
            unit_price=unit_price,
            total_price=total_price,
            shipping_cost=order.shipping_cost,
            shipping_address=order.shipping_address,
            notes=order.notes
        )
        
        db.add(db_order)
        db.commit()
        db.refresh(db_order)
        return db_order

    def get_order(self, db: Session, order_id: int):
        return db.query(Order).filter(Order.id == order_id).first()

    def get_orders(self, db: Session, user_id: Optional[int] = None, 
                  seller_id: Optional[int] = None, status: Optional[str] = None,
                  skip: int = 0, limit: int = 100):
        query = db.query(Order)
        
        if user_id:
            query = query.filter(Order.buyer_id == user_id)
        
        if seller_id:
            query = query.filter(Order.seller_id == seller_id)
        
        if status:
            query = query.filter(Order.status == status)
        
        return query.offset(skip).limit(limit).all()

    def update_order_status(self, db: Session, order_id: int, status: str):
        db_order = db.query(Order).filter(Order.id == order_id).first()
        if db_order:
            db_order.status = status
            db.commit()
            db.refresh(db_order)
        return db_order

class CategoryService:
    def get_categories(self, db: Session):
        return db.query(Category).filter(Category.is_active == True).all()

    def get_category(self, db: Session, category_id: int):
        return db.query(Category).filter(Category.id == category_id).first()

class ReviewService:
    def create_review(self, db: Session, review: ReviewCreate):
        db_review = Review(**review.dict())
        db.add(db_review)
        db.commit()
        db.refresh(db_review)
        return db_review

    def get_product_reviews(self, db: Session, product_id: int):
        return db.query(Review).filter(Review.product_id == product_id).all()

    def get_user_reviews(self, db: Session, user_id: int):
        return db.query(Review).filter(Review.reviewee_id == user_id).all()

class WatchlistService:
    def add_to_watchlist(self, db: Session, watchlist: WatchlistCreate):
        # Check if already in watchlist
        existing = db.query(Watchlist).filter(
            Watchlist.user_id == watchlist.user_id,
            Watchlist.product_id == watchlist.product_id
        ).first()
        
        if existing:
            return existing
        
        db_watchlist = Watchlist(**watchlist.dict())
        db.add(db_watchlist)
        db.commit()
        db.refresh(db_watchlist)
        return db_watchlist

    def get_user_watchlist(self, db: Session, user_id: int):
        return db.query(Watchlist).filter(Watchlist.user_id == user_id).all()

    def remove_from_watchlist(self, db: Session, watchlist_id: int):
        db_watchlist = db.query(Watchlist).filter(Watchlist.id == watchlist_id).first()
        if db_watchlist:
            db.delete(db_watchlist)
            db.commit()
        return db_watchlist
