"""
Advanced AI/ML Service
Implements sophisticated machine learning features for marketplace optimization
"""

import asyncio
import numpy as np
import pandas as pd
from typing import Dict, Any, Optional, List, Tuple, Union
from dataclasses import dataclass
from datetime import datetime, timedelta
from enum import Enum
import logging
import json
import pickle
from sklearn.ensemble import RandomForestClassifier, GradientBoostingRegressor
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, mean_squared_error, silhouette_score
import joblib
import hashlib

logger = logging.getLogger(__name__)

class MLModelType(Enum):
    """Types of ML models"""
    RECOMMENDATION = "recommendation"
    FRAUD_DETECTION = "fraud_detection"
    PRICE_PREDICTION = "price_prediction"
    USER_SEGMENTATION = "user_segmentation"
    CONTENT_CLASSIFICATION = "content_classification"
    SENTIMENT_ANALYSIS = "sentiment_analysis"

class ModelStatus(Enum):
    """Model training status"""
    TRAINING = "training"
    TRAINED = "trained"
    DEPLOYED = "deployed"
    RETIRING = "retiring"
    RETIRED = "retired"

@dataclass
class MLModel:
    """ML model metadata"""
    model_id: str
    model_type: MLModelType
    version: str
    status: ModelStatus
    accuracy: float
    created_at: datetime
    last_trained: datetime
    features: List[str]
    hyperparameters: Dict[str, Any]
    model_path: str

@dataclass
class PredictionResult:
    """ML prediction result"""
    model_id: str
    prediction: Any
    confidence: float
    features_used: List[str]
    timestamp: datetime
    metadata: Dict[str, Any]

class AdvancedMLService:
    """Advanced machine learning service"""
    
    def __init__(self):
        self.models: Dict[str, MLModel] = {}
        self.trained_models: Dict[str, Any] = {}
        self.scalers: Dict[str, StandardScaler] = {}
        self.encoders: Dict[str, LabelEncoder] = {}
        self.feature_importance: Dict[str, Dict[str, float]] = {}
        self.model_metrics: Dict[str, Dict[str, float]] = {}
        
        # Initialize default models
        self._initialize_default_models()
        
    def _initialize_default_models(self):
        """Initialize default ML models"""
        # Recommendation model
        self.models['recommendation_v1'] = MLModel(
            model_id='recommendation_v1',
            model_type=MLModelType.RECOMMENDATION,
            version='1.0.0',
            status=ModelStatus.TRAINING,
            accuracy=0.0,
            created_at=datetime.utcnow(),
            last_trained=datetime.utcnow(),
            features=['user_id', 'nft_category', 'price_range', 'rarity_score', 'historical_views'],
            hyperparameters={'n_estimators': 100, 'max_depth': 10},
            model_path='models/recommendation_v1.pkl'
        )
        
        # Fraud detection model
        self.models['fraud_detection_v1'] = MLModel(
            model_id='fraud_detection_v1',
            model_type=MLModelType.FRAUD_DETECTION,
            version='1.0.0',
            status=ModelStatus.TRAINING,
            accuracy=0.0,
            created_at=datetime.utcnow(),
            last_trained=datetime.utcnow(),
            features=['transaction_amount', 'user_age', 'ip_location', 'device_fingerprint', 'time_of_day'],
            hyperparameters={'n_estimators': 200, 'max_depth': 15},
            model_path='models/fraud_detection_v1.pkl'
        )
        
        # Price prediction model
        self.models['price_prediction_v1'] = MLModel(
            model_id='price_prediction_v1',
            model_type=MLModelType.PRICE_PREDICTION,
            version='1.0.0',
            status=ModelStatus.TRAINING,
            accuracy=0.0,
            created_at=datetime.utcnow(),
            last_trained=datetime.utcnow(),
            features=['nft_rarity', 'creator_reputation', 'market_trend', 'historical_sales', 'collection_size'],
            hyperparameters={'n_estimators': 150, 'learning_rate': 0.1},
            model_path='models/price_prediction_v1.pkl'
        )
        
    async def train_recommendation_model(self, 
                                       training_data: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Train recommendation model using collaborative filtering and content-based filtering"""
        try:
            model_id = 'recommendation_v1'
            model = self.models[model_id]
            
            # Prepare training data
            df = pd.DataFrame(training_data)
            
            # Feature engineering
            features = self._engineer_recommendation_features(df)
            
            # Split data
            X = features.drop('rating', axis=1)
            y = features['rating']
            X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
            
            # Scale features
            scaler = StandardScaler()
            X_train_scaled = scaler.fit_transform(X_train)
            X_test_scaled = scaler.transform(X_test)
            
            # Train model
            model_instance = RandomForestClassifier(
                n_estimators=model.hyperparameters['n_estimators'],
                max_depth=model.hyperparameters['max_depth'],
                random_state=42
            )
            
            model_instance.fit(X_train_scaled, y_train)
            
            # Evaluate model
            y_pred = model_instance.predict(X_test_scaled)
            accuracy = accuracy_score(y_test, y_pred)
            
            # Update model
            model.accuracy = accuracy
            model.status = ModelStatus.TRAINED
            model.last_trained = datetime.utcnow()
            
            # Save model and scaler
            self.trained_models[model_id] = model_instance
            self.scalers[model_id] = scaler
            
            # Calculate feature importance
            feature_importance = dict(zip(X.columns, model_instance.feature_importances_))
            self.feature_importance[model_id] = feature_importance
            
            # Store metrics
            self.model_metrics[model_id] = {
                'accuracy': accuracy,
                'training_samples': len(X_train),
                'test_samples': len(X_test)
            }
            
            return {
                'success': True,
                'model_id': model_id,
                'accuracy': accuracy,
                'feature_importance': feature_importance,
                'training_samples': len(X_train)
            }
            
        except Exception as e:
            logger.error(f"Recommendation model training failed: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }
            
    async def train_fraud_detection_model(self, 
                                        training_data: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Train fraud detection model using anomaly detection and classification"""
        try:
            model_id = 'fraud_detection_v1'
            model = self.models[model_id]
            
            # Prepare training data
            df = pd.DataFrame(training_data)
            
            # Feature engineering
            features = self._engineer_fraud_features(df)
            
            # Split data
            X = features.drop('is_fraud', axis=1)
            y = features['is_fraud']
            X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
            
            # Scale features
            scaler = StandardScaler()
            X_train_scaled = scaler.fit_transform(X_train)
            X_test_scaled = scaler.transform(X_test)
            
            # Train model
            model_instance = RandomForestClassifier(
                n_estimators=model.hyperparameters['n_estimators'],
                max_depth=model.hyperparameters['max_depth'],
                random_state=42
            )
            
            model_instance.fit(X_train_scaled, y_train)
            
            # Evaluate model
            y_pred = model_instance.predict(X_test_scaled)
            accuracy = accuracy_score(y_test, y_pred)
            
            # Update model
            model.accuracy = accuracy
            model.status = ModelStatus.TRAINED
            model.last_trained = datetime.utcnow()
            
            # Save model and scaler
            self.trained_models[model_id] = model_instance
            self.scalers[model_id] = scaler
            
            # Calculate feature importance
            feature_importance = dict(zip(X.columns, model_instance.feature_importances_))
            self.feature_importance[model_id] = feature_importance
            
            # Store metrics
            self.model_metrics[model_id] = {
                'accuracy': accuracy,
                'training_samples': len(X_train),
                'test_samples': len(X_test)
            }
            
            return {
                'success': True,
                'model_id': model_id,
                'accuracy': accuracy,
                'feature_importance': feature_importance,
                'training_samples': len(X_train)
            }
            
        except Exception as e:
            logger.error(f"Fraud detection model training failed: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }
            
    async def train_price_prediction_model(self, 
                                         training_data: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Train price prediction model using regression techniques"""
        try:
            model_id = 'price_prediction_v1'
            model = self.models[model_id]
            
            # Prepare training data
            df = pd.DataFrame(training_data)
            
            # Feature engineering
            features = self._engineer_price_features(df)
            
            # Split data
            X = features.drop('price', axis=1)
            y = features['price']
            X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
            
            # Scale features
            scaler = StandardScaler()
            X_train_scaled = scaler.fit_transform(X_train)
            X_test_scaled = scaler.transform(X_test)
            
            # Train model
            model_instance = GradientBoostingRegressor(
                n_estimators=model.hyperparameters['n_estimators'],
                learning_rate=model.hyperparameters['learning_rate'],
                random_state=42
            )
            
            model_instance.fit(X_train_scaled, y_train)
            
            # Evaluate model
            y_pred = model_instance.predict(X_test_scaled)
            mse = mean_squared_error(y_test, y_pred)
            rmse = np.sqrt(mse)
            
            # Update model
            model.accuracy = 1 - (mse / np.var(y_test))  # R-squared equivalent
            model.status = ModelStatus.TRAINED
            model.last_trained = datetime.utcnow()
            
            # Save model and scaler
            self.trained_models[model_id] = model_instance
            self.scalers[model_id] = scaler
            
            # Calculate feature importance
            feature_importance = dict(zip(X.columns, model_instance.feature_importances_))
            self.feature_importance[model_id] = feature_importance
            
            # Store metrics
            self.model_metrics[model_id] = {
                'rmse': rmse,
                'r_squared': model.accuracy,
                'training_samples': len(X_train),
                'test_samples': len(X_test)
            }
            
            return {
                'success': True,
                'model_id': model_id,
                'rmse': rmse,
                'r_squared': model.accuracy,
                'feature_importance': feature_importance,
                'training_samples': len(X_train)
            }
            
        except Exception as e:
            logger.error(f"Price prediction model training failed: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }
            
    async def predict_recommendations(self, 
                                    user_id: str,
                                    nft_candidates: List[Dict[str, Any]],
                                    top_k: int = 10) -> List[Dict[str, Any]]:
        """Generate NFT recommendations for a user"""
        try:
            model_id = 'recommendation_v1'
            
            if model_id not in self.trained_models:
                return []
                
            model = self.trained_models[model_id]
            scaler = self.scalers[model_id]
            
            recommendations = []
            
            for nft in nft_candidates:
                # Prepare features
                features = self._prepare_recommendation_features(user_id, nft)
                
                # Scale features
                features_scaled = scaler.transform([features])
                
                # Make prediction
                prediction = model.predict(features_scaled)[0]
                confidence = model.predict_proba(features_scaled)[0].max()
                
                recommendations.append({
                    'nft_id': nft.get('id'),
                    'nft_name': nft.get('name'),
                    'predicted_rating': float(prediction),
                    'confidence': float(confidence),
                    'features_used': list(features.keys())
                })
                
            # Sort by predicted rating and return top_k
            recommendations.sort(key=lambda x: x['predicted_rating'], reverse=True)
            return recommendations[:top_k]
            
        except Exception as e:
            logger.error(f"Recommendation prediction failed: {str(e)}")
            return []
            
    async def detect_fraud(self, 
                          transaction_data: Dict[str, Any]) -> Dict[str, Any]:
        """Detect fraud in transaction"""
        try:
            model_id = 'fraud_detection_v1'
            
            if model_id not in self.trained_models:
                return {'is_fraud': False, 'confidence': 0.0, 'error': 'Model not trained'}
                
            model = self.trained_models[model_id]
            scaler = self.scalers[model_id]
            
            # Prepare features
            features = self._prepare_fraud_features(transaction_data)
            
            # Scale features
            features_scaled = scaler.transform([features])
            
            # Make prediction
            prediction = model.predict(features_scaled)[0]
            confidence = model.predict_proba(features_scaled)[0].max()
            
            return {
                'is_fraud': bool(prediction),
                'confidence': float(confidence),
                'features_used': list(features.keys()),
                'model_id': model_id
            }
            
        except Exception as e:
            logger.error(f"Fraud detection failed: {str(e)}")
            return {
                'is_fraud': False,
                'confidence': 0.0,
                'error': str(e)
            }
            
    async def predict_price(self, 
                           nft_data: Dict[str, Any]) -> Dict[str, Any]:
        """Predict NFT price"""
        try:
            model_id = 'price_prediction_v1'
            
            if model_id not in self.trained_models:
                return {'predicted_price': 0.0, 'confidence': 0.0, 'error': 'Model not trained'}
                
            model = self.trained_models[model_id]
            scaler = self.scalers[model_id]
            
            # Prepare features
            features = self._prepare_price_features(nft_data)
            
            # Scale features
            features_scaled = scaler.transform([features])
            
            # Make prediction
            predicted_price = model.predict(features_scaled)[0]
            
            # Calculate confidence based on feature completeness
            confidence = min(len(features) / len(self.models[model_id].features), 1.0)
            
            return {
                'predicted_price': float(predicted_price),
                'confidence': float(confidence),
                'features_used': list(features.keys()),
                'model_id': model_id
            }
            
        except Exception as e:
            logger.error(f"Price prediction failed: {str(e)}")
            return {
                'predicted_price': 0.0,
                'confidence': 0.0,
                'error': str(e)
            }
            
    async def segment_users(self, 
                          user_data: List[Dict[str, Any]],
                          n_clusters: int = 5) -> Dict[str, Any]:
        """Segment users using clustering"""
        try:
            # Prepare data
            df = pd.DataFrame(user_data)
            features = self._engineer_user_segmentation_features(df)
            
            # Scale features
            scaler = StandardScaler()
            features_scaled = scaler.fit_transform(features)
            
            # Perform clustering
            kmeans = KMeans(n_clusters=n_clusters, random_state=42)
            cluster_labels = kmeans.fit_predict(features_scaled)
            
            # Calculate silhouette score
            silhouette_avg = silhouette_score(features_scaled, cluster_labels)
            
            # Create user segments
            segments = {}
            for i in range(n_clusters):
                segment_users = df[cluster_labels == i]
                segments[f'segment_{i}'] = {
                    'user_count': len(segment_users),
                    'characteristics': self._analyze_segment_characteristics(segment_users),
                    'user_ids': segment_users['user_id'].tolist()
                }
                
            return {
                'success': True,
                'n_clusters': n_clusters,
                'silhouette_score': silhouette_avg,
                'segments': segments
            }
            
        except Exception as e:
            logger.error(f"User segmentation failed: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }
            
    def _engineer_recommendation_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """Engineer features for recommendation model"""
        features = df.copy()
        
        # User features
        features['user_activity_score'] = features['user_transactions'] / (features['user_age_days'] + 1)
        features['user_price_preference'] = features['avg_transaction_amount']
        
        # NFT features
        features['nft_popularity_score'] = features['nft_views'] / (features['nft_age_days'] + 1)
        features['price_rarity_ratio'] = features['nft_price'] / (features['nft_rarity_score'] + 1)
        
        # Interaction features
        features['category_match'] = (features['user_preferred_category'] == features['nft_category']).astype(int)
        features['price_range_match'] = ((features['nft_price'] >= features['user_min_price']) & 
                                       (features['nft_price'] <= features['user_max_price'])).astype(int)
        
        return features
        
    def _engineer_fraud_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """Engineer features for fraud detection model"""
        features = df.copy()
        
        # Transaction features
        features['amount_velocity'] = features['transaction_amount'] / (features['time_since_last_transaction'] + 1)
        features['amount_deviation'] = abs(features['transaction_amount'] - features['user_avg_amount']) / features['user_avg_amount']
        
        # Time features
        features['hour_of_day'] = pd.to_datetime(features['timestamp']).dt.hour
        features['is_weekend'] = pd.to_datetime(features['timestamp']).dt.weekday >= 5
        
        # Location features
        features['location_change'] = (features['current_ip_country'] != features['previous_ip_country']).astype(int)
        
        return features
        
    def _engineer_price_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """Engineer features for price prediction model"""
        features = df.copy()
        
        # Rarity features
        features['rarity_percentile'] = features['rarity_score'].rank(pct=True)
        features['collection_rarity_avg'] = features.groupby('collection_id')['rarity_score'].transform('mean')
        
        # Creator features
        features['creator_reputation_score'] = features['creator_total_sales'] / (features['creator_age_days'] + 1)
        features['creator_avg_price'] = features.groupby('creator_id')['price'].transform('mean')
        
        # Market features
        features['market_trend'] = features['recent_sales_volume'] / features['historical_sales_volume']
        features['category_avg_price'] = features.groupby('category')['price'].transform('mean')
        
        return features
        
    def _engineer_user_segmentation_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """Engineer features for user segmentation"""
        features = df.copy()
        
        # Activity features
        features['transaction_frequency'] = features['total_transactions'] / (features['account_age_days'] + 1)
        features['avg_transaction_value'] = features['total_spent'] / (features['total_transactions'] + 1)
        
        # Preference features
        features['category_diversity'] = features['unique_categories_purchased']
        features['price_range_std'] = features['price_range_std']
        
        # Engagement features
        features['session_frequency'] = features['total_sessions'] / (features['account_age_days'] + 1)
        features['avg_session_duration'] = features['total_session_time'] / (features['total_sessions'] + 1)
        
        return features.select_dtypes(include=[np.number])
        
    def _prepare_recommendation_features(self, user_id: str, nft: Dict[str, Any]) -> Dict[str, float]:
        """Prepare features for recommendation prediction"""
        return {
            'user_id': hash(user_id) % 1000,  # Simple hash for demo
            'nft_category': hash(nft.get('category', '')) % 10,
            'price_range': nft.get('price', 0) / 1000,
            'rarity_score': nft.get('rarity_score', 0),
            'historical_views': nft.get('views', 0) / 1000
        }
        
    def _prepare_fraud_features(self, transaction: Dict[str, Any]) -> Dict[str, float]:
        """Prepare features for fraud detection"""
        return {
            'transaction_amount': transaction.get('amount', 0) / 1000,
            'user_age': transaction.get('user_age_days', 0) / 365,
            'ip_location': hash(transaction.get('ip_country', '')) % 100,
            'device_fingerprint': hash(transaction.get('device_id', '')) % 1000,
            'time_of_day': transaction.get('hour', 12) / 24
        }
        
    def _prepare_price_features(self, nft: Dict[str, Any]) -> Dict[str, float]:
        """Prepare features for price prediction"""
        return {
            'nft_rarity': nft.get('rarity_score', 0),
            'creator_reputation': nft.get('creator_sales', 0) / 1000,
            'market_trend': nft.get('market_trend', 1.0),
            'historical_sales': nft.get('historical_sales', 0) / 1000,
            'collection_size': nft.get('collection_size', 1)
        }
        
    def _analyze_segment_characteristics(self, segment_df: pd.DataFrame) -> Dict[str, Any]:
        """Analyze characteristics of a user segment"""
        return {
            'avg_transaction_value': segment_df['total_spent'].mean() / (segment_df['total_transactions'] + 1),
            'preferred_categories': segment_df['most_purchased_category'].mode().iloc[0] if not segment_df.empty else 'Unknown',
            'activity_level': segment_df['total_transactions'].mean(),
            'price_sensitivity': segment_df['avg_transaction_value'].std()
        }

# Create singleton instance
advanced_ml_service = AdvancedMLService()


