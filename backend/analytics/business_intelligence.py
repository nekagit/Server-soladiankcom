"""
Advanced Business Intelligence Service for Soladia Marketplace
Provides comprehensive analytics, reporting, and business insights
"""

import asyncio
import logging
from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime, timedelta
import pandas as pd
import numpy as np
from sqlalchemy.orm import Session
from sqlalchemy import text, func, desc, asc
import json
import redis
from dataclasses import dataclass
from enum import Enum

from ..database import get_db
from ..models import User, Product, Order, Transaction, NFT, Review
from ..services.caching import CacheService
from ..services.ml_service import MLService

logger = logging.getLogger(__name__)

class MetricType(Enum):
    REVENUE = "revenue"
    ORDERS = "orders"
    USERS = "users"
    PRODUCTS = "products"
    CONVERSION = "conversion"
    RETENTION = "retention"

@dataclass
class MetricData:
    """Data class for metric information"""
    name: str
    value: float
    change: float
    change_percentage: float
    trend: str
    period: str
    category: str

@dataclass
class ChartData:
    """Data class for chart data"""
    labels: List[str]
    datasets: List[Dict[str, Any]]
    type: str
    title: str

class BusinessIntelligenceService:
    """Advanced Business Intelligence Service for Soladia Marketplace"""
    
    def __init__(self, cache_service: CacheService, ml_service: MLService):
        self.cache_service = cache_service
        self.ml_service = ml_service
        self.redis_client = redis.Redis(host='localhost', port=6379, db=0)
        
        # Cache TTL settings
        self.cache_ttl = {
            'realtime': 60,      # 1 minute
            'hourly': 3600,      # 1 hour
            'daily': 86400,      # 1 day
            'weekly': 604800,    # 1 week
            'monthly': 2592000   # 1 month
        }
    
    async def get_dashboard_overview(self, period: str = '30d') -> Dict[str, Any]:
        """Get comprehensive dashboard overview"""
        try:
            cache_key = f"dashboard_overview:{period}"
            cached_result = await self.cache_service.get(cache_key)
            
            if cached_result:
                return cached_result
            
            db = next(get_db())
            
            # Calculate date range
            end_date = datetime.now()
            if period == '7d':
                start_date = end_date - timedelta(days=7)
            elif period == '30d':
                start_date = end_date - timedelta(days=30)
            elif period == '90d':
                start_date = end_date - timedelta(days=90)
            elif period == '1y':
                start_date = end_date - timedelta(days=365)
            else:
                start_date = end_date - timedelta(days=30)
            
            # Get key metrics
            metrics = await self._get_key_metrics(db, start_date, end_date)
            
            # Get revenue analytics
            revenue_data = await self._get_revenue_analytics(db, start_date, end_date)
            
            # Get user analytics
            user_data = await self._get_user_analytics(db, start_date, end_date)
            
            # Get product analytics
            product_data = await self._get_product_analytics(db, start_date, end_date)
            
            # Get conversion analytics
            conversion_data = await self._get_conversion_analytics(db, start_date, end_date)
            
            # Get geographic analytics
            geographic_data = await self._get_geographic_analytics(db, start_date, end_date)
            
            # Get blockchain analytics
            blockchain_data = await self._get_blockchain_analytics(db, start_date, end_date)
            
            # Get performance metrics
            performance_data = await self._get_performance_metrics(db, start_date, end_date)
            
            dashboard_data = {
                'period': period,
                'date_range': {
                    'start': start_date.isoformat(),
                    'end': end_date.isoformat()
                },
                'metrics': metrics,
                'revenue': revenue_data,
                'users': user_data,
                'products': product_data,
                'conversion': conversion_data,
                'geographic': geographic_data,
                'blockchain': blockchain_data,
                'performance': performance_data,
                'generated_at': datetime.now().isoformat()
            }
            
            await self.cache_service.set(cache_key, dashboard_data, ttl=self.cache_ttl['hourly'])
            return dashboard_data
            
        except Exception as e:
            logger.error(f"Failed to get dashboard overview: {e}")
            return {}
        finally:
            db.close()
    
    async def _get_key_metrics(self, db: Session, start_date: datetime, end_date: datetime) -> List[MetricData]:
        """Get key business metrics"""
        try:
            metrics = []
            
            # Total Revenue
            revenue_query = text("""
                SELECT 
                    COALESCE(SUM(t.amount), 0) as total_revenue,
                    COUNT(DISTINCT t.id) as transaction_count
                FROM transactions t
                WHERE t.created_at BETWEEN :start_date AND :end_date
                AND t.status = 'completed'
            """)
            
            revenue_result = db.execute(revenue_query, {
                "start_date": start_date,
                "end_date": end_date
            }).fetchone()
            
            total_revenue = float(revenue_result[0]) if revenue_result[0] else 0.0
            transaction_count = revenue_result[1] if revenue_result[1] else 0
            
            # Previous period revenue for comparison
            prev_start = start_date - (end_date - start_date)
            prev_revenue_query = text("""
                SELECT COALESCE(SUM(t.amount), 0) as prev_revenue
                FROM transactions t
                WHERE t.created_at BETWEEN :prev_start AND :start_date
                AND t.status = 'completed'
            """)
            
            prev_revenue_result = db.execute(prev_revenue_query, {
                "prev_start": prev_start,
                "start_date": start_date
            }).fetchone()
            
            prev_revenue = float(prev_revenue_result[0]) if prev_revenue_result[0] else 0.0
            revenue_change = total_revenue - prev_revenue
            revenue_change_pct = (revenue_change / prev_revenue * 100) if prev_revenue > 0 else 0
            
            metrics.append(MetricData(
                name="Total Revenue",
                value=total_revenue,
                change=revenue_change,
                change_percentage=revenue_change_pct,
                trend="up" if revenue_change > 0 else "down",
                period=f"{start_date.strftime('%Y-%m-%d')} to {end_date.strftime('%Y-%m-%d')}",
                category="financial"
            ))
            
            # Total Orders
            orders_query = text("""
                SELECT COUNT(DISTINCT o.id) as total_orders
                FROM orders o
                WHERE o.created_at BETWEEN :start_date AND :end_date
            """)
            
            orders_result = db.execute(orders_query, {
                "start_date": start_date,
                "end_date": end_date
            }).fetchone()
            
            total_orders = orders_result[0] if orders_result[0] else 0
            
            # Previous period orders
            prev_orders_query = text("""
                SELECT COUNT(DISTINCT o.id) as prev_orders
                FROM orders o
                WHERE o.created_at BETWEEN :prev_start AND :start_date
            """)
            
            prev_orders_result = db.execute(prev_orders_query, {
                "prev_start": prev_start,
                "start_date": start_date
            }).fetchone()
            
            prev_orders = prev_orders_result[0] if prev_orders_result[0] else 0
            orders_change = total_orders - prev_orders
            orders_change_pct = (orders_change / prev_orders * 100) if prev_orders > 0 else 0
            
            metrics.append(MetricData(
                name="Total Orders",
                value=float(total_orders),
                change=float(orders_change),
                change_percentage=orders_change_pct,
                trend="up" if orders_change > 0 else "down",
                period=f"{start_date.strftime('%Y-%m-%d')} to {end_date.strftime('%Y-%m-%d')}",
                category="operational"
            ))
            
            # Active Users
            active_users_query = text("""
                SELECT COUNT(DISTINCT u.id) as active_users
                FROM users u
                JOIN orders o ON u.id = o.user_id
                WHERE o.created_at BETWEEN :start_date AND :end_date
            """)
            
            active_users_result = db.execute(active_users_query, {
                "start_date": start_date,
                "end_date": end_date
            }).fetchone()
            
            active_users = active_users_result[0] if active_users_result[0] else 0
            
            # Previous period active users
            prev_active_users_query = text("""
                SELECT COUNT(DISTINCT u.id) as prev_active_users
                FROM users u
                JOIN orders o ON u.id = o.user_id
                WHERE o.created_at BETWEEN :prev_start AND :start_date
            """)
            
            prev_active_users_result = db.execute(prev_active_users_query, {
                "prev_start": prev_start,
                "start_date": start_date
            }).fetchone()
            
            prev_active_users = prev_active_users_result[0] if prev_active_users_result[0] else 0
            active_users_change = active_users - prev_active_users
            active_users_change_pct = (active_users_change / prev_active_users * 100) if prev_active_users > 0 else 0
            
            metrics.append(MetricData(
                name="Active Users",
                value=float(active_users),
                change=float(active_users_change),
                change_percentage=active_users_change_pct,
                trend="up" if active_users_change > 0 else "down",
                period=f"{start_date.strftime('%Y-%m-%d')} to {end_date.strftime('%Y-%m-%d')}",
                category="user"
            ))
            
            # Average Order Value
            aov = total_revenue / total_orders if total_orders > 0 else 0
            
            # Previous period AOV
            prev_aov = prev_revenue / prev_orders if prev_orders > 0 else 0
            aov_change = aov - prev_aov
            aov_change_pct = (aov_change / prev_aov * 100) if prev_aov > 0 else 0
            
            metrics.append(MetricData(
                name="Average Order Value",
                value=aov,
                change=aov_change,
                change_percentage=aov_change_pct,
                trend="up" if aov_change > 0 else "down",
                period=f"{start_date.strftime('%Y-%m-%d')} to {end_date.strftime('%Y-%m-%d')}",
                category="financial"
            ))
            
            return metrics
            
        except Exception as e:
            logger.error(f"Failed to get key metrics: {e}")
            return []
    
    async def _get_revenue_analytics(self, db: Session, start_date: datetime, end_date: datetime) -> Dict[str, Any]:
        """Get revenue analytics data"""
        try:
            # Daily revenue trend
            daily_revenue_query = text("""
                SELECT 
                    DATE(t.created_at) as date,
                    SUM(t.amount) as daily_revenue,
                    COUNT(DISTINCT t.id) as daily_transactions
                FROM transactions t
                WHERE t.created_at BETWEEN :start_date AND :end_date
                AND t.status = 'completed'
                GROUP BY DATE(t.created_at)
                ORDER BY date
            """)
            
            daily_revenue_result = db.execute(daily_revenue_query, {
                "start_date": start_date,
                "end_date": end_date
            }).fetchall()
            
            daily_revenue_data = {
                'labels': [row[0].strftime('%Y-%m-%d') for row in daily_revenue_result],
                'datasets': [{
                    'label': 'Daily Revenue',
                    'data': [float(row[1]) for row in daily_revenue_result],
                    'borderColor': '#E60012',
                    'backgroundColor': 'rgba(230, 0, 18, 0.1)',
                    'fill': True
                }]
            }
            
            # Revenue by category
            category_revenue_query = text("""
                SELECT 
                    p.category,
                    SUM(t.amount) as category_revenue,
                    COUNT(DISTINCT t.id) as category_transactions
                FROM transactions t
                JOIN order_items oi ON t.order_id = oi.order_id
                JOIN products p ON oi.product_id = p.id
                WHERE t.created_at BETWEEN :start_date AND :end_date
                AND t.status = 'completed'
                GROUP BY p.category
                ORDER BY category_revenue DESC
            """)
            
            category_revenue_result = db.execute(category_revenue_query, {
                "start_date": start_date,
                "end_date": end_date
            }).fetchall()
            
            category_revenue_data = {
                'labels': [row[0] for row in category_revenue_result],
                'datasets': [{
                    'label': 'Revenue by Category',
                    'data': [float(row[1]) for row in category_revenue_result],
                    'backgroundColor': [
                        '#E60012', '#0066CC', '#FFD700', '#00A650', 
                        '#FF8C00', '#DC2626', '#0EA5E9'
                    ]
                }]
            }
            
            # Revenue by payment method
            payment_revenue_query = text("""
                SELECT 
                    t.payment_method,
                    SUM(t.amount) as payment_revenue,
                    COUNT(DISTINCT t.id) as payment_transactions
                FROM transactions t
                WHERE t.created_at BETWEEN :start_date AND :end_date
                AND t.status = 'completed'
                GROUP BY t.payment_method
                ORDER BY payment_revenue DESC
            """)
            
            payment_revenue_result = db.execute(payment_revenue_query, {
                "start_date": start_date,
                "end_date": end_date
            }).fetchall()
            
            payment_revenue_data = {
                'labels': [row[0] for row in payment_revenue_result],
                'datasets': [{
                    'label': 'Revenue by Payment Method',
                    'data': [float(row[1]) for row in payment_revenue_result],
                    'backgroundColor': [
                        '#E60012', '#0066CC', '#FFD700', '#00A650'
                    ]
                }]
            }
            
            return {
                'daily_trend': daily_revenue_data,
                'by_category': category_revenue_data,
                'by_payment_method': payment_revenue_data
            }
            
        except Exception as e:
            logger.error(f"Failed to get revenue analytics: {e}")
            return {}
    
    async def _get_user_analytics(self, db: Session, start_date: datetime, end_date: datetime) -> Dict[str, Any]:
        """Get user analytics data"""
        try:
            # User registration trend
            registration_query = text("""
                SELECT 
                    DATE(created_at) as date,
                    COUNT(*) as new_users
                FROM users
                WHERE created_at BETWEEN :start_date AND :end_date
                GROUP BY DATE(created_at)
                ORDER BY date
            """)
            
            registration_result = db.execute(registration_query, {
                "start_date": start_date,
                "end_date": end_date
            }).fetchall()
            
            registration_data = {
                'labels': [row[0].strftime('%Y-%m-%d') for row in registration_result],
                'datasets': [{
                    'label': 'New User Registrations',
                    'data': [row[1] for row in registration_result],
                    'borderColor': '#0066CC',
                    'backgroundColor': 'rgba(0, 102, 204, 0.1)',
                    'fill': True
                }]
            }
            
            # User activity by hour
            activity_query = text("""
                SELECT 
                    EXTRACT(HOUR FROM o.created_at) as hour,
                    COUNT(DISTINCT o.user_id) as active_users
                FROM orders o
                WHERE o.created_at BETWEEN :start_date AND :end_date
                GROUP BY EXTRACT(HOUR FROM o.created_at)
                ORDER BY hour
            """)
            
            activity_result = db.execute(activity_query, {
                "start_date": start_date,
                "end_date": end_date
            }).fetchall()
            
            activity_data = {
                'labels': [f"{int(row[0]):02d}:00" for row in activity_result],
                'datasets': [{
                    'label': 'Active Users by Hour',
                    'data': [row[1] for row in activity_result],
                    'borderColor': '#00A650',
                    'backgroundColor': 'rgba(0, 166, 80, 0.1)',
                    'fill': True
                }]
            }
            
            # User retention analysis
            retention_query = text("""
                WITH user_first_order AS (
                    SELECT 
                        user_id,
                        MIN(created_at) as first_order_date
                    FROM orders
                    GROUP BY user_id
                ),
                user_orders AS (
                    SELECT 
                        o.user_id,
                        o.created_at,
                        ufo.first_order_date,
                        CASE 
                            WHEN o.created_at = ufo.first_order_date THEN 'new'
                            WHEN o.created_at > ufo.first_order_date + INTERVAL '1 day' THEN 'returning'
                            ELSE 'first_day'
                        END as user_type
                    FROM orders o
                    JOIN user_first_order ufo ON o.user_id = ufo.user_id
                    WHERE o.created_at BETWEEN :start_date AND :end_date
                )
                SELECT 
                    user_type,
                    COUNT(DISTINCT user_id) as user_count
                FROM user_orders
                GROUP BY user_type
            """)
            
            retention_result = db.execute(retention_query, {
                "start_date": start_date,
                "end_date": end_date
            }).fetchall()
            
            retention_data = {
                'labels': [row[0] for row in retention_result],
                'datasets': [{
                    'label': 'User Types',
                    'data': [row[1] for row in retention_result],
                    'backgroundColor': ['#E60012', '#0066CC', '#FFD700']
                }]
            }
            
            return {
                'registration_trend': registration_data,
                'activity_by_hour': activity_data,
                'retention_analysis': retention_data
            }
            
        except Exception as e:
            logger.error(f"Failed to get user analytics: {e}")
            return {}
    
    async def _get_product_analytics(self, db: Session, start_date: datetime, end_date: datetime) -> Dict[str, Any]:
        """Get product analytics data"""
        try:
            # Top selling products
            top_products_query = text("""
                SELECT 
                    p.name,
                    p.category,
                    COUNT(oi.id) as units_sold,
                    SUM(oi.price * oi.quantity) as revenue
                FROM products p
                JOIN order_items oi ON p.id = oi.product_id
                JOIN orders o ON oi.order_id = o.id
                WHERE o.created_at BETWEEN :start_date AND :end_date
                GROUP BY p.id, p.name, p.category
                ORDER BY units_sold DESC
                LIMIT 10
            """)
            
            top_products_result = db.execute(top_products_query, {
                "start_date": start_date,
                "end_date": end_date
            }).fetchall()
            
            top_products_data = {
                'labels': [row[0] for row in top_products_result],
                'datasets': [{
                    'label': 'Units Sold',
                    'data': [row[2] for row in top_products_result],
                    'backgroundColor': '#E60012'
                }]
            }
            
            # Product performance by category
            category_performance_query = text("""
                SELECT 
                    p.category,
                    COUNT(DISTINCT p.id) as product_count,
                    COUNT(oi.id) as total_orders,
                    AVG(oi.price) as avg_price,
                    SUM(oi.price * oi.quantity) as total_revenue
                FROM products p
                LEFT JOIN order_items oi ON p.id = oi.product_id
                LEFT JOIN orders o ON oi.order_id = o.id AND o.created_at BETWEEN :start_date AND :end_date
                GROUP BY p.category
                ORDER BY total_revenue DESC
            """)
            
            category_performance_result = db.execute(category_performance_query, {
                "start_date": start_date,
                "end_date": end_date
            }).fetchall()
            
            category_performance_data = {
                'labels': [row[0] for row in category_performance_result],
                'datasets': [
                    {
                        'label': 'Product Count',
                        'data': [row[1] for row in category_performance_result],
                        'backgroundColor': '#E60012'
                    },
                    {
                        'label': 'Total Orders',
                        'data': [row[2] for row in category_performance_result],
                        'backgroundColor': '#0066CC'
                    }
                ]
            }
            
            # Product rating distribution
            rating_query = text("""
                SELECT 
                    CASE 
                        WHEN r.rating >= 4.5 THEN 'Excellent (4.5-5.0)'
                        WHEN r.rating >= 3.5 THEN 'Good (3.5-4.4)'
                        WHEN r.rating >= 2.5 THEN 'Average (2.5-3.4)'
                        WHEN r.rating >= 1.5 THEN 'Poor (1.5-2.4)'
                        ELSE 'Very Poor (1.0-1.4)'
                    END as rating_range,
                    COUNT(*) as review_count
                FROM reviews r
                WHERE r.created_at BETWEEN :start_date AND :end_date
                GROUP BY rating_range
                ORDER BY MIN(r.rating) DESC
            """)
            
            rating_result = db.execute(rating_query, {
                "start_date": start_date,
                "end_date": end_date
            }).fetchall()
            
            rating_data = {
                'labels': [row[0] for row in rating_result],
                'datasets': [{
                    'label': 'Review Count',
                    'data': [row[1] for row in rating_result],
                    'backgroundColor': ['#00A650', '#FFD700', '#FF8C00', '#DC2626', '#8B0000']
                }]
            }
            
            return {
                'top_products': top_products_data,
                'category_performance': category_performance_data,
                'rating_distribution': rating_data
            }
            
        except Exception as e:
            logger.error(f"Failed to get product analytics: {e}")
            return {}
    
    async def _get_conversion_analytics(self, db: Session, start_date: datetime, end_date: datetime) -> Dict[str, Any]:
        """Get conversion analytics data"""
        try:
            # Conversion funnel
            funnel_query = text("""
                WITH user_actions AS (
                    SELECT 
                        u.id as user_id,
                        CASE WHEN u.created_at IS NOT NULL THEN 1 ELSE 0 END as registered,
                        CASE WHEN o.id IS NOT NULL THEN 1 ELSE 0 END as made_order,
                        CASE WHEN t.id IS NOT NULL AND t.status = 'completed' THEN 1 ELSE 0 END as completed_purchase
                    FROM users u
                    LEFT JOIN orders o ON u.id = o.user_id AND o.created_at BETWEEN :start_date AND :end_date
                    LEFT JOIN transactions t ON o.id = t.order_id AND t.created_at BETWEEN :start_date AND :end_date
                )
                SELECT 
                    'Registered' as step,
                    SUM(registered) as count
                FROM user_actions
                UNION ALL
                SELECT 
                    'Made Order' as step,
                    SUM(made_order) as count
                FROM user_actions
                UNION ALL
                SELECT 
                    'Completed Purchase' as step,
                    SUM(completed_purchase) as count
                FROM user_actions
            """)
            
            funnel_result = db.execute(funnel_query, {
                "start_date": start_date,
                "end_date": end_date
            }).fetchall()
            
            funnel_data = {
                'labels': [row[0] for row in funnel_result],
                'datasets': [{
                    'label': 'Conversion Funnel',
                    'data': [row[1] for row in funnel_result],
                    'backgroundColor': ['#E60012', '#0066CC', '#00A650']
                }]
            }
            
            # Conversion rate by traffic source
            traffic_conversion_query = text("""
                SELECT 
                    COALESCE(u.traffic_source, 'Unknown') as traffic_source,
                    COUNT(DISTINCT u.id) as total_users,
                    COUNT(DISTINCT o.user_id) as converted_users,
                    ROUND(COUNT(DISTINCT o.user_id) * 100.0 / COUNT(DISTINCT u.id), 2) as conversion_rate
                FROM users u
                LEFT JOIN orders o ON u.id = o.user_id AND o.created_at BETWEEN :start_date AND :end_date
                WHERE u.created_at BETWEEN :start_date AND :end_date
                GROUP BY u.traffic_source
                ORDER BY conversion_rate DESC
            """)
            
            traffic_conversion_result = db.execute(traffic_conversion_query, {
                "start_date": start_date,
                "end_date": end_date
            }).fetchall()
            
            traffic_conversion_data = {
                'labels': [row[0] for row in traffic_conversion_result],
                'datasets': [{
                    'label': 'Conversion Rate (%)',
                    'data': [float(row[3]) for row in traffic_conversion_result],
                    'backgroundColor': '#FFD700'
                }]
            }
            
            return {
                'conversion_funnel': funnel_data,
                'traffic_conversion': traffic_conversion_data
            }
            
        except Exception as e:
            logger.error(f"Failed to get conversion analytics: {e}")
            return {}
    
    async def _get_geographic_analytics(self, db: Session, start_date: datetime, end_date: datetime) -> Dict[str, Any]:
        """Get geographic analytics data"""
        try:
            # Revenue by country
            country_revenue_query = text("""
                SELECT 
                    COALESCE(u.country, 'Unknown') as country,
                    SUM(t.amount) as revenue,
                    COUNT(DISTINCT t.id) as transaction_count
                FROM transactions t
                JOIN orders o ON t.order_id = o.id
                JOIN users u ON o.user_id = u.id
                WHERE t.created_at BETWEEN :start_date AND :end_date
                AND t.status = 'completed'
                GROUP BY u.country
                ORDER BY revenue DESC
                LIMIT 10
            """)
            
            country_revenue_result = db.execute(country_revenue_query, {
                "start_date": start_date,
                "end_date": end_date
            }).fetchall()
            
            country_revenue_data = {
                'labels': [row[0] for row in country_revenue_result],
                'datasets': [{
                    'label': 'Revenue by Country',
                    'data': [float(row[1]) for row in country_revenue_result],
                    'backgroundColor': [
                        '#E60012', '#0066CC', '#FFD700', '#00A650', 
                        '#FF8C00', '#DC2626', '#0EA5E9', '#8B0000', 
                        '#800080', '#008080'
                    ]
                }]
            }
            
            # User distribution by country
            country_users_query = text("""
                SELECT 
                    COALESCE(u.country, 'Unknown') as country,
                    COUNT(DISTINCT u.id) as user_count
                FROM users u
                WHERE u.created_at BETWEEN :start_date AND :end_date
                GROUP BY u.country
                ORDER BY user_count DESC
                LIMIT 10
            """)
            
            country_users_result = db.execute(country_users_query, {
                "start_date": start_date,
                "end_date": end_date
            }).fetchall()
            
            country_users_data = {
                'labels': [row[0] for row in country_users_result],
                'datasets': [{
                    'label': 'Users by Country',
                    'data': [row[1] for row in country_users_result],
                    'backgroundColor': '#0066CC'
                }]
            }
            
            return {
                'revenue_by_country': country_revenue_data,
                'users_by_country': country_users_data
            }
            
        except Exception as e:
            logger.error(f"Failed to get geographic analytics: {e}")
            return {}
    
    async def _get_blockchain_analytics(self, db: Session, start_date: datetime, end_date: datetime) -> Dict[str, Any]:
        """Get blockchain analytics data"""
        try:
            # NFT sales analytics
            nft_sales_query = text("""
                SELECT 
                    DATE(n.created_at) as date,
                    COUNT(*) as nft_sales,
                    SUM(n.price) as nft_revenue
                FROM nfts n
                WHERE n.created_at BETWEEN :start_date AND :end_date
                AND n.status = 'sold'
                GROUP BY DATE(n.created_at)
                ORDER BY date
            """)
            
            nft_sales_result = db.execute(nft_sales_query, {
                "start_date": start_date,
                "end_date": end_date
            }).fetchall()
            
            nft_sales_data = {
                'labels': [row[0].strftime('%Y-%m-%d') for row in nft_sales_result],
                'datasets': [
                    {
                        'label': 'NFT Sales Count',
                        'data': [row[1] for row in nft_sales_result],
                        'borderColor': '#E60012',
                        'backgroundColor': 'rgba(230, 0, 18, 0.1)',
                        'fill': True
                    },
                    {
                        'label': 'NFT Revenue',
                        'data': [float(row[2]) for row in nft_sales_result],
                        'borderColor': '#0066CC',
                        'backgroundColor': 'rgba(0, 102, 204, 0.1)',
                        'fill': True
                    }
                ]
            }
            
            # Solana transaction analytics
            solana_query = text("""
                SELECT 
                    t.payment_method,
                    COUNT(*) as transaction_count,
                    SUM(t.amount) as total_amount
                FROM transactions t
                WHERE t.created_at BETWEEN :start_date AND :end_date
                AND t.payment_method LIKE '%solana%'
                GROUP BY t.payment_method
            """)
            
            solana_result = db.execute(solana_query, {
                "start_date": start_date,
                "end_date": end_date
            }).fetchall()
            
            solana_data = {
                'labels': [row[0] for row in solana_result],
                'datasets': [{
                    'label': 'Solana Transactions',
                    'data': [row[1] for row in solana_result],
                    'backgroundColor': '#FFD700'
                }]
            }
            
            return {
                'nft_sales': nft_sales_data,
                'solana_transactions': solana_data
            }
            
        except Exception as e:
            logger.error(f"Failed to get blockchain analytics: {e}")
            return {}
    
    async def _get_performance_metrics(self, db: Session, start_date: datetime, end_date: datetime) -> Dict[str, Any]:
        """Get performance metrics data"""
        try:
            # API response time analytics
            api_performance_query = text("""
                SELECT 
                    DATE(created_at) as date,
                    AVG(response_time) as avg_response_time,
                    MAX(response_time) as max_response_time,
                    MIN(response_time) as min_response_time
                FROM api_logs
                WHERE created_at BETWEEN :start_date AND :end_date
                GROUP BY DATE(created_at)
                ORDER BY date
            """)
            
            # This would require an api_logs table
            # For now, return mock data
            performance_data = {
                'api_response_time': {
                    'labels': ['2024-01-01', '2024-01-02', '2024-01-03'],
                    'datasets': [{
                        'label': 'Average Response Time (ms)',
                        'data': [150, 145, 160],
                        'borderColor': '#00A650',
                        'backgroundColor': 'rgba(0, 166, 80, 0.1)',
                        'fill': True
                    }]
                }
            }
            
            return performance_data
            
        except Exception as e:
            logger.error(f"Failed to get performance metrics: {e}")
            return {}
    
    async def get_custom_report(self, report_config: Dict[str, Any]) -> Dict[str, Any]:
        """Generate custom report based on configuration"""
        try:
            # This would implement custom report generation
            # based on user-defined parameters
            return {
                'status': 'success',
                'message': 'Custom report generated',
                'data': {}
            }
            
        except Exception as e:
            logger.error(f"Failed to generate custom report: {e}")
            return {'status': 'error', 'message': str(e)}
    
    async def export_analytics_data(self, format: str = 'json', 
                                  metrics: List[str] = None) -> str:
        """Export analytics data in specified format"""
        try:
            # Get dashboard data
            dashboard_data = await self.get_dashboard_overview()
            
            if format == 'json':
                return json.dumps(dashboard_data, indent=2)
            elif format == 'csv':
                # Convert to CSV format
                return self._convert_to_csv(dashboard_data)
            else:
                return json.dumps(dashboard_data, indent=2)
                
        except Exception as e:
            logger.error(f"Failed to export analytics data: {e}")
            return ""
    
    def _convert_to_csv(self, data: Dict[str, Any]) -> str:
        """Convert analytics data to CSV format"""
        try:
            import csv
            import io
            
            output = io.StringIO()
            writer = csv.writer(output)
            
            # Write metrics data
            if 'metrics' in data:
                writer.writerow(['Metric', 'Value', 'Change', 'Change %', 'Trend'])
                for metric in data['metrics']:
                    writer.writerow([
                        metric.name,
                        metric.value,
                        metric.change,
                        metric.change_percentage,
                        metric.trend
                    ])
            
            return output.getvalue()
            
        except Exception as e:
            logger.error(f"Failed to convert to CSV: {e}")
            return ""
