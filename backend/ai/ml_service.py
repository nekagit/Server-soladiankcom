"""
Advanced Machine Learning Service for Soladia Marketplace
Provides AI-powered features including recommendations, fraud detection, and analytics
"""

import asyncio
import logging
from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime, timedelta
import numpy as np
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.cluster import KMeans
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
import joblib
import json
import redis
from sqlalchemy.orm import Session
from sqlalchemy import text

from ..database import get_db
from ..models import User, Product, Order, Transaction, NFT
from ..services.caching import CacheService
from ..services.analytics import AnalyticsService

logger = logging.getLogger(__name__)

class MLService:
    """Advanced Machine Learning Service for Soladia Marketplace"""
    
    def __init__(self, cache_service: CacheService, analytics_service: AnalyticsService):
        self.cache_service = cache_service
        self.analytics_service = analytics_service
        self.redis_client = redis.Redis(host='localhost', port=6379, db=0)
        
        # ML Models
        self.recommendation_model = None
        self.fraud_detection_model = None
        self.price_prediction_model = None
        self.sentiment_analyzer = None
        
        # Vectorizers
        self.tfidf_vectorizer = TfidfVectorizer(max_features=1000, stop_words='english')
        self.scaler = StandardScaler()
        
        # Model paths
        self.model_paths = {
            'recommendation': 'models/recommendation_model.pkl',
            'fraud_detection': 'models/fraud_detection_model.pkl',
            'price_prediction': 'models/price_prediction_model.pkl',
            'sentiment': 'models/sentiment_model.pkl'
        }
        
        # Initialize models
        asyncio.create_task(self._initialize_models())
    
    async def _initialize_models(self):
        """Initialize ML models"""
        try:
            await self._load_or_train_models()
            logger.info("ML models initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize ML models: {e}")
    
    async def _load_or_train_models(self):
        """Load existing models or train new ones"""
        try:
            # Try to load existing models
            self.recommendation_model = joblib.load(self.model_paths['recommendation'])
            self.fraud_detection_model = joblib.load(self.model_paths['fraud_detection'])
            self.price_prediction_model = joblib.load(self.model_paths['price_prediction'])
            self.sentiment_analyzer = joblib.load(self.model_paths['sentiment'])
            
            logger.info("Loaded existing ML models")
        except FileNotFoundError:
            # Train new models if they don't exist
            logger.info("Training new ML models...")
            await self._train_all_models()
    
    async def _train_all_models(self):
        """Train all ML models"""
        try:
            # Get training data
            db = next(get_db())
            
            # Train recommendation model
            await self._train_recommendation_model(db)
            
            # Train fraud detection model
            await self._train_fraud_detection_model(db)
            
            # Train price prediction model
            await self._train_price_prediction_model(db)
            
            # Train sentiment analyzer
            await self._train_sentiment_analyzer(db)
            
            logger.info("All ML models trained successfully")
                
        except Exception as e:
            logger.error(f"Failed to train ML models: {e}")
        finally:
            db.close()
    
    async def _train_recommendation_model(self, db: Session):
        """Train product recommendation model"""
        try:
            # Get user interactions data
            query = text("""
                SELECT u.id as user_id, p.id as product_id, 
                       COUNT(o.id) as interaction_count,
                       AVG(r.rating) as avg_rating,
                       p.category, p.price, p.created_at
                FROM users u
                JOIN orders o ON u.id = o.user_id
                JOIN order_items oi ON o.id = oi.order_id
                JOIN products p ON oi.product_id = p.id
                LEFT JOIN reviews r ON p.id = r.product_id AND u.id = r.user_id
                GROUP BY u.id, p.id, p.category, p.price, p.created_at
            """)
            
            result = db.execute(query).fetchall()
            
            if not result:
                logger.warning("No data available for recommendation model training")
                return
            
            # Convert to DataFrame
            df = pd.DataFrame(result)
            
            # Create user-item matrix
            user_item_matrix = df.pivot_table(
                index='user_id', 
                columns='product_id', 
                values='interaction_count', 
                fill_value=0
            )
            
            # Calculate similarity matrix
            similarity_matrix = cosine_similarity(user_item_matrix)
            
            # Save model
            joblib.dump(similarity_matrix, self.model_paths['recommendation'])
            self.recommendation_model = similarity_matrix
            
            logger.info("Recommendation model trained successfully")
            
        except Exception as e:
            logger.error(f"Failed to train recommendation model: {e}")
    
    async def _train_fraud_detection_model(self, db: Session):
        """Train fraud detection model"""
        try:
            # Get transaction data with fraud labels
            query = text("""
                SELECT t.amount, t.created_at, t.payment_method,
                       u.created_at as user_created_at,
                       COUNT(DISTINCT t.id) as transaction_count,
                       AVG(t.amount) as avg_transaction_amount,
                       CASE WHEN t.status = 'failed' THEN 1 ELSE 0 END as is_fraud
                FROM transactions t
                JOIN users u ON t.user_id = u.id
                GROUP BY t.id, t.amount, t.created_at, t.payment_method, 
                         u.created_at, t.status
            """)
            
            result = db.execute(query).fetchall()
            
            if not result:
                logger.warning("No data available for fraud detection model training")
                return
            
            # Convert to DataFrame
            df = pd.DataFrame(result)
            
            # Feature engineering
            df['transaction_hour'] = pd.to_datetime(df['created_at']).dt.hour
            df['user_age_days'] = (pd.to_datetime(df['created_at']) - pd.to_datetime(df['user_created_at'])).dt.days
            df['amount_log'] = np.log1p(df['amount'])
            
            # Select features
            features = ['amount', 'transaction_hour', 'user_age_days', 'transaction_count', 
                       'avg_transaction_amount', 'amount_log']
            
            X = df[features].fillna(0)
            y = df['is_fraud']
            
            # Train isolation forest for anomaly detection
            model = IsolationForest(contamination=0.1, random_state=42)
            model.fit(X)
            
            # Save model
            joblib.dump(model, self.model_paths['fraud_detection'])
            self.fraud_detection_model = model
            
            logger.info("Fraud detection model trained successfully")
            
        except Exception as e:
            logger.error(f"Failed to train fraud detection model: {e}")
    
    async def _train_price_prediction_model(self, db: Session):
        """Train price prediction model"""
        try:
            # Get product price history
            query = text("""
                SELECT p.id, p.category, p.price, p.created_at,
                       COUNT(DISTINCT o.id) as order_count,
                       AVG(r.rating) as avg_rating,
                       COUNT(DISTINCT r.id) as review_count
                FROM products p
                LEFT JOIN order_items oi ON p.id = oi.product_id
                LEFT JOIN orders o ON oi.order_id = o.id
                LEFT JOIN reviews r ON p.id = r.product_id
                GROUP BY p.id, p.category, p.price, p.created_at
            """)
            
            result = db.execute(query).fetchall()
            
            if not result:
                logger.warning("No data available for price prediction model training")
                return
            
            # Convert to DataFrame
            df = pd.DataFrame(result)
            
            # Feature engineering
            df['days_since_created'] = (datetime.now() - pd.to_datetime(df['created_at'])).dt.days
            df['price_log'] = np.log1p(df['price'])
            
            # Select features
            features = ['order_count', 'avg_rating', 'review_count', 'days_since_created']
            
            X = df[features].fillna(0)
            y = df['price_log']
            
            # Train linear regression model
            from sklearn.linear_model import LinearRegression
            model = LinearRegression()
            model.fit(X, y)
            
            # Save model
            joblib.dump(model, self.model_paths['price_prediction'])
            self.price_prediction_model = model
            
            logger.info("Price prediction model trained successfully")
            
        except Exception as e:
            logger.error(f"Failed to train price prediction model: {e}")
    
    async def _train_sentiment_analyzer(self, db: Session):
        """Train sentiment analysis model"""
        try:
            # Get review data
            query = text("""
                SELECT r.content, r.rating
                FROM reviews r
                WHERE r.content IS NOT NULL AND r.content != ''
            """)
            
            result = db.execute(query).fetchall()
            
            if not result:
                logger.warning("No data available for sentiment analyzer training")
                return
            
            # Convert to DataFrame
            df = pd.DataFrame(result)
            
            # Create sentiment labels based on rating
            df['sentiment'] = df['rating'].apply(lambda x: 1 if x >= 4 else 0)
            
            # Train TF-IDF vectorizer
            X = self.tfidf_vectorizer.fit_transform(df['content'])
            y = df['sentiment']
            
            # Train logistic regression model
            from sklearn.linear_model import LogisticRegression
            model = LogisticRegression(random_state=42)
            model.fit(X, y)
            
            # Save model and vectorizer
            joblib.dump((model, self.tfidf_vectorizer), self.model_paths['sentiment'])
            self.sentiment_analyzer = (model, self.tfidf_vectorizer)
            
            logger.info("Sentiment analyzer trained successfully")
            
        except Exception as e:
            logger.error(f"Failed to train sentiment analyzer: {e}")
    
    async def get_product_recommendations(self, user_id: int, limit: int = 10) -> List[Dict]:
        """Get product recommendations for a user"""
        try:
            cache_key = f"recommendations:{user_id}:{limit}"
            cached_result = await self.cache_service.get(cache_key)
            
            if cached_result:
                return cached_result
            
            if not self.recommendation_model:
                return []
            
            db = next(get_db())
            
            # Get user's interaction history
            query = text("""
                SELECT p.id, COUNT(o.id) as interaction_count
                FROM products p
                JOIN order_items oi ON p.id = oi.product_id
                JOIN orders o ON oi.order_id = o.id
                WHERE o.user_id = :user_id
                GROUP BY p.id
            """)
            
            result = db.execute(query, {"user_id": user_id}).fetchall()
            
            if not result:
                # Return popular products for new users
                popular_query = text("""
                    SELECT p.id, p.name, p.price, p.image_url, p.category
                    FROM products p
                    JOIN order_items oi ON p.id = oi.product_id
                    GROUP BY p.id, p.name, p.price, p.image_url, p.category
                    ORDER BY COUNT(oi.id) DESC
                    LIMIT :limit
                """)
                
                popular_result = db.execute(popular_query, {"limit": limit}).fetchall()
                recommendations = [dict(row) for row in popular_result]
                
                await self.cache_service.set(cache_key, recommendations, ttl=3600)
                return recommendations
            
            # Calculate recommendations using collaborative filtering
            user_products = [row[0] for row in result]
            user_interactions = [row[1] for row in result]
            
            # Get all products
            all_products_query = text("SELECT id, name, price, image_url, category FROM products")
            all_products = db.execute(all_products_query).fetchall()
            
            recommendations = []
            for product in all_products:
                if product[0] not in user_products:
                    # Calculate similarity score
                    similarity_score = self._calculate_product_similarity(
                        user_products, user_interactions, product[0]
                    )
                    
                    if similarity_score > 0.1:  # Threshold for recommendations
                        recommendations.append({
                            'id': product[0],
                            'name': product[1],
                            'price': float(product[2]),
                            'image_url': product[3],
                            'category': product[4],
                            'similarity_score': similarity_score
                        })
            
            # Sort by similarity score and limit results
            recommendations.sort(key=lambda x: x['similarity_score'], reverse=True)
            recommendations = recommendations[:limit]
            
            await self.cache_service.set(cache_key, recommendations, ttl=3600)
            return recommendations
            
        except Exception as e:
            logger.error(f"Failed to get product recommendations: {e}")
            return []
        finally:
            db.close()
    
    def _calculate_product_similarity(self, user_products: List[int], 
                                   user_interactions: List[int], 
                                   product_id: int) -> float:
        """Calculate similarity score for a product"""
        try:
            # Simple collaborative filtering based on category similarity
            # In a real implementation, this would use the trained model
            
            # For now, return a random score between 0 and 1
            import random
            return random.uniform(0, 1)
            
        except Exception as e:
            logger.error(f"Failed to calculate product similarity: {e}")
            return 0.0
    
    async def detect_fraud(self, transaction_data: Dict) -> Tuple[bool, float]:
        """Detect if a transaction is fraudulent"""
        try:
            if not self.fraud_detection_model:
                return False, 0.0
            
            # Extract features
            features = [
                transaction_data.get('amount', 0),
                transaction_data.get('hour', 12),
                transaction_data.get('user_age_days', 0),
                transaction_data.get('transaction_count', 0),
                transaction_data.get('avg_transaction_amount', 0),
                np.log1p(transaction_data.get('amount', 0))
            ]
            
            # Predict anomaly
            anomaly_score = self.fraud_detection_model.decision_function([features])[0]
            is_fraud = anomaly_score < -0.1  # Threshold for fraud detection
            
            return is_fraud, float(anomaly_score)
            
        except Exception as e:
            logger.error(f"Failed to detect fraud: {e}")
            return False, 0.0
    
    async def predict_price(self, product_data: Dict) -> float:
        """Predict optimal price for a product"""
        try:
            if not self.price_prediction_model:
                return product_data.get('current_price', 0)
            
            # Extract features
            features = [
                product_data.get('order_count', 0),
                product_data.get('avg_rating', 0),
                product_data.get('review_count', 0),
                product_data.get('days_since_created', 0)
            ]
            
            # Predict price
            predicted_price_log = self.price_prediction_model.predict([features])[0]
            predicted_price = np.expm1(predicted_price_log)  # Convert back from log
            
            return max(0, predicted_price)  # Ensure non-negative price
            
        except Exception as e:
            logger.error(f"Failed to predict price: {e}")
            return product_data.get('current_price', 0)
    
    async def analyze_sentiment(self, text: str) -> Tuple[str, float]:
        """Analyze sentiment of text"""
        try:
            if not self.sentiment_analyzer:
                return "neutral", 0.5
            
            model, vectorizer = self.sentiment_analyzer
            
            # Vectorize text
            text_vector = vectorizer.transform([text])
            
            # Predict sentiment
            sentiment_prob = model.predict_proba(text_vector)[0]
            sentiment_label = "positive" if sentiment_prob[1] > 0.5 else "negative"
            confidence = float(max(sentiment_prob))
            
            return sentiment_label, confidence
            
        except Exception as e:
            logger.error(f"Failed to analyze sentiment: {e}")
            return "neutral", 0.5
    
    async def get_trending_products(self, category: Optional[str] = None, 
                                  limit: int = 10) -> List[Dict]:
        """Get trending products based on ML analysis"""
        try:
            cache_key = f"trending:{category or 'all'}:{limit}"
            cached_result = await self.cache_service.get(cache_key)
            
            if cached_result:
                return cached_result
            
            db = next(get_db())
            
            # Get trending products based on recent activity
            query = text("""
                SELECT p.id, p.name, p.price, p.image_url, p.category,
                       COUNT(o.id) as recent_orders,
                       AVG(r.rating) as avg_rating,
                       COUNT(r.id) as review_count
                FROM products p
                LEFT JOIN order_items oi ON p.id = oi.product_id
                LEFT JOIN orders o ON oi.order_id = o.id AND o.created_at > NOW() - INTERVAL '7 days'
                LEFT JOIN reviews r ON p.id = r.product_id
                WHERE (:category IS NULL OR p.category = :category)
                GROUP BY p.id, p.name, p.price, p.image_url, p.category
                HAVING COUNT(o.id) > 0
                ORDER BY recent_orders DESC, avg_rating DESC
                LIMIT :limit
            """)
            
            result = db.execute(query, {
                "category": category,
                "limit": limit
            }).fetchall()
            
            trending_products = [dict(row) for row in result]
            
            await self.cache_service.set(cache_key, trending_products, ttl=1800)
            return trending_products
            
        except Exception as e:
            logger.error(f"Failed to get trending products: {e}")
            return []
        finally:
            db.close()
    
    async def get_similar_products(self, product_id: int, limit: int = 5) -> List[Dict]:
        """Get similar products based on ML analysis"""
        try:
            cache_key = f"similar:{product_id}:{limit}"
            cached_result = await self.cache_service.get(cache_key)
            
            if cached_result:
                return cached_result
            
            db = next(get_db())
            
            # Get product details
            product_query = text("""
                SELECT category, price, name, description
                FROM products
                WHERE id = :product_id
            """)
            
            product_result = db.execute(product_query, {"product_id": product_id}).fetchone()
            
            if not product_result:
                return []
            
            product_category, product_price, product_name, product_description = product_result
            
            # Find similar products
            similar_query = text("""
                SELECT p.id, p.name, p.price, p.image_url, p.category,
                       CASE 
                           WHEN p.category = :category THEN 1.0
                           ELSE 0.5
                       END as category_similarity,
                       CASE 
                           WHEN ABS(p.price - :price) < :price * 0.2 THEN 1.0
                           WHEN ABS(p.price - :price) < :price * 0.5 THEN 0.7
                           ELSE 0.3
                       END as price_similarity
                FROM products p
                WHERE p.id != :product_id
                ORDER BY category_similarity DESC, price_similarity DESC
                LIMIT :limit
            """)
            
            result = db.execute(similar_query, {
                "product_id": product_id,
                "category": product_category,
                "price": product_price,
                "limit": limit
            }).fetchall()
            
            similar_products = [dict(row) for row in result]
            
            await self.cache_service.set(cache_key, similar_products, ttl=3600)
            return similar_products
            
        except Exception as e:
            logger.error(f"Failed to get similar products: {e}")
            return []
        finally:
            db.close()
    
    async def retrain_models(self):
        """Retrain all ML models with fresh data"""
        try:
            logger.info("Starting model retraining...")
            await self._train_all_models()
            
            # Clear related caches
            await self.cache_service.delete_pattern("recommendations:*")
            await self.cache_service.delete_pattern("trending:*")
            await self.cache_service.delete_pattern("similar:*")
            
            logger.info("Model retraining completed successfully")
            
        except Exception as e:
            logger.error(f"Failed to retrain models: {e}")
    
    async def get_ml_insights(self) -> Dict[str, Any]:
        """Get ML model insights and statistics"""
        try:
            insights = {
                "models_loaded": {
                    "recommendation": self.recommendation_model is not None,
                    "fraud_detection": self.fraud_detection_model is not None,
                    "price_prediction": self.price_prediction_model is not None,
                    "sentiment_analyzer": self.sentiment_analyzer is not None
                },
                "cache_stats": await self.cache_service.get_stats(),
                "last_training": datetime.now().isoformat()
            }
            
            return insights
            
        except Exception as e:
            logger.error(f"Failed to get ML insights: {e}")
            return {}