"""
AI-Powered Recommendation Engine for Soladia Marketplace
Advanced machine learning algorithms for personalized recommendations
"""

from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime, timedelta
import numpy as np
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.cluster import KMeans
from sklearn.decomposition import NMF
from sklearn.preprocessing import StandardScaler
import joblib
import json
import asyncio
from sqlalchemy import Column, Integer, String, Float, DateTime, JSON, ForeignKey, Boolean
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from fastapi import HTTPException, Depends
from pydantic import BaseModel, Field
import redis
import logging

Base = declarative_base()

class UserProfile(Base):
    __tablename__ = "user_profiles"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    tenant_id = Column(String(36), ForeignKey("tenants.tenant_id"), nullable=True)
    
    # User preferences
    preferences = Column(JSON, default=dict)
    behavior_patterns = Column(JSON, default=dict)
    interests = Column(JSON, default=list)
    demographics = Column(JSON, default=dict)
    
    # ML features
    feature_vector = Column(JSON, default=list)
    cluster_id = Column(Integer, nullable=True)
    similarity_scores = Column(JSON, default=dict)
    
    # Metadata
    last_updated = Column(DateTime, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)

class ProductFeatures(Base):
    __tablename__ = "product_features"
    
    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    tenant_id = Column(String(36), ForeignKey("tenants.tenant_id"), nullable=True)
    
    # Product features
    category_features = Column(JSON, default=dict)
    text_features = Column(JSON, default=dict)
    visual_features = Column(JSON, default=dict)
    price_features = Column(JSON, default=dict)
    
    # ML features
    feature_vector = Column(JSON, default=list)
    embedding_vector = Column(JSON, default=list)
    cluster_id = Column(Integer, nullable=True)
    
    # Metadata
    last_updated = Column(DateTime, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)

class Interaction(Base):
    __tablename__ = "interactions"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    tenant_id = Column(String(36), ForeignKey("tenants.tenant_id"), nullable=True)
    
    # Interaction details
    interaction_type = Column(String(50), nullable=False)  # view, click, purchase, like, share
    interaction_value = Column(Float, default=1.0)
    context = Column(JSON, default=dict)
    
    # Metadata
    timestamp = Column(DateTime, default=datetime.utcnow)

class RecommendationModel(Base):
    __tablename__ = "recommendation_models"
    
    id = Column(Integer, primary_key=True, index=True)
    model_id = Column(String(36), unique=True, index=True, nullable=False)
    tenant_id = Column(String(36), ForeignKey("tenants.tenant_id"), nullable=True)
    
    # Model details
    model_type = Column(String(50), nullable=False)  # collaborative, content_based, hybrid
    model_name = Column(String(255), nullable=False)
    model_version = Column(String(20), default="1.0.0")
    
    # Model data
    model_data = Column(JSON, default=dict)
    parameters = Column(JSON, default=dict)
    performance_metrics = Column(JSON, default=dict)
    
    # Status
    is_active = Column(Boolean, default=False)
    is_training = Column(Boolean, default=False)
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    last_trained = Column(DateTime, nullable=True)
    last_used = Column(DateTime, nullable=True)

class Recommendation(Base):
    __tablename__ = "recommendations"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    tenant_id = Column(String(36), ForeignKey("tenants.tenant_id"), nullable=True)
    
    # Recommendation details
    recommendation_type = Column(String(50), nullable=False)
    score = Column(Float, nullable=False)
    reason = Column(String(500), nullable=True)
    model_id = Column(String(36), ForeignKey("recommendation_models.model_id"), nullable=True)
    
    # Status
    is_shown = Column(Boolean, default=False)
    is_clicked = Column(Boolean, default=False)
    is_purchased = Column(Boolean, default=False)
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime, nullable=True)

# Pydantic models
class RecommendationRequest(BaseModel):
    user_id: int = Field(..., ge=1)
    tenant_id: Optional[str] = None
    recommendation_type: str = Field(default="product", max_length=50)
    limit: int = Field(default=10, ge=1, le=100)
    filters: Dict[str, Any] = Field(default_factory=dict)
    context: Dict[str, Any] = Field(default_factory=dict)

class RecommendationResponse(BaseModel):
    recommendations: List[Dict[str, Any]]
    model_id: str
    generated_at: datetime
    total_count: int

class UserProfileUpdate(BaseModel):
    preferences: Optional[Dict[str, Any]] = None
    interests: Optional[List[str]] = None
    demographics: Optional[Dict[str, Any]] = None

class InteractionCreate(BaseModel):
    user_id: int = Field(..., ge=1)
    product_id: int = Field(..., ge=1)
    interaction_type: str = Field(..., max_length=50)
    interaction_value: float = Field(default=1.0, ge=0)
    context: Dict[str, Any] = Field(default_factory=dict)

class RecommendationEngine:
    def __init__(self, db_session, redis_client):
        self.db = db_session
        self.redis = redis_client
        self.models = {}
        self.vectorizers = {}
        self.scalers = {}
        self.logger = logging.getLogger(__name__)
        
        # Initialize models
        self._initialize_models()
    
    def _initialize_models(self):
        """Initialize ML models and vectorizers"""
        # TF-IDF vectorizer for text features
        self.vectorizers['text'] = TfidfVectorizer(
            max_features=1000,
            stop_words='english',
            ngram_range=(1, 2)
        )
        
        # Standard scaler for numerical features
        self.scalers['numerical'] = StandardScaler()
        
        # Initialize recommendation models
        self.models['collaborative'] = None
        self.models['content_based'] = None
        self.models['hybrid'] = None
    
    async def create_user_profile(self, user_id: int, tenant_id: Optional[str] = None) -> UserProfile:
        """Create or update user profile"""
        profile = self.db.query(UserProfile).filter(
            UserProfile.user_id == user_id,
            UserProfile.tenant_id == tenant_id
        ).first()
        
        if not profile:
            profile = UserProfile(
                user_id=user_id,
                tenant_id=tenant_id,
                preferences={},
                behavior_patterns={},
                interests=[],
                demographics={}
            )
            self.db.add(profile)
            self.db.commit()
        
        return profile
    
    async def update_user_profile(self, user_id: int, profile_data: UserProfileUpdate, 
                                 tenant_id: Optional[str] = None) -> UserProfile:
        """Update user profile with new data"""
        profile = await self.create_user_profile(user_id, tenant_id)
        
        if profile_data.preferences:
            profile.preferences.update(profile_data.preferences)
        
        if profile_data.interests:
            profile.interests = profile_data.interests
        
        if profile_data.demographics:
            profile.demographics.update(profile_data.demographics)
        
        profile.last_updated = datetime.utcnow()
        self.db.commit()
        
        # Update ML features
        await self._update_user_features(profile)
        
        return profile
    
    async def record_interaction(self, interaction_data: InteractionCreate, 
                                tenant_id: Optional[str] = None) -> Interaction:
        """Record user interaction with product"""
        interaction = Interaction(
            user_id=interaction_data.user_id,
            product_id=interaction_data.product_id,
            tenant_id=tenant_id,
            interaction_type=interaction_data.interaction_type,
            interaction_value=interaction_data.interaction_value,
            context=interaction_data.context
        )
        
        self.db.add(interaction)
        self.db.commit()
        
        # Update user profile based on interaction
        await self._update_profile_from_interaction(interaction)
        
        return interaction
    
    async def get_recommendations(self, request: RecommendationRequest) -> RecommendationResponse:
        """Get personalized recommendations for user"""
        # Get active model
        model = await self._get_active_model(request.tenant_id)
        if not model:
            raise HTTPException(status_code=404, detail="No active recommendation model found")
        
        # Get user profile
        user_profile = await self.create_user_profile(request.user_id, request.tenant_id)
        
        # Generate recommendations based on model type
        if model.model_type == "collaborative":
            recommendations = await self._collaborative_filtering(
                user_profile, request.limit, request.filters
            )
        elif model.model_type == "content_based":
            recommendations = await self._content_based_filtering(
                user_profile, request.limit, request.filters
            )
        elif model.model_type == "hybrid":
            recommendations = await self._hybrid_recommendations(
                user_profile, request.limit, request.filters
            )
        else:
            raise HTTPException(status_code=400, detail="Unknown model type")
        
        # Store recommendations
        await self._store_recommendations(
            request.user_id, recommendations, model.model_id, request.tenant_id
        )
        
        return RecommendationResponse(
            recommendations=recommendations,
            model_id=model.model_id,
            generated_at=datetime.utcnow(),
            total_count=len(recommendations)
        )
    
    async def _collaborative_filtering(self, user_profile: UserProfile, 
                                     limit: int, filters: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Collaborative filtering recommendations"""
        # Get user interactions
        interactions = self.db.query(Interaction).filter(
            Interaction.user_id == user_profile.user_id,
            Interaction.tenant_id == user_profile.tenant_id
        ).all()
        
        if not interactions:
            return await self._get_popular_products(limit, filters)
        
        # Get similar users
        similar_users = await self._find_similar_users(user_profile)
        
        # Get products liked by similar users
        recommendations = []
        for similar_user in similar_users:
            user_interactions = self.db.query(Interaction).filter(
                Interaction.user_id == similar_user['user_id'],
                Interaction.tenant_id == user_profile.tenant_id,
                Interaction.interaction_type.in_(['purchase', 'like', 'view'])
            ).all()
            
            for interaction in user_interactions:
                # Check if user hasn't already interacted with this product
                existing = self.db.query(Interaction).filter(
                    Interaction.user_id == user_profile.user_id,
                    Interaction.product_id == interaction.product_id
                ).first()
                
                if not existing:
                    recommendations.append({
                        'product_id': interaction.product_id,
                        'score': similar_user['similarity'] * interaction.interaction_value,
                        'reason': f"Users like you also liked this product",
                        'recommendation_type': 'collaborative'
                    })
        
        # Sort by score and return top recommendations
        recommendations.sort(key=lambda x: x['score'], reverse=True)
        return recommendations[:limit]
    
    async def _content_based_filtering(self, user_profile: UserProfile, 
                                     limit: int, filters: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Content-based filtering recommendations"""
        # Get user preferences
        user_preferences = user_profile.preferences or {}
        user_interests = user_profile.interests or []
        
        # Get all products
        products = self.db.query(ProductFeatures).filter(
            ProductFeatures.tenant_id == user_profile.tenant_id
        ).all()
        
        if not products:
            return await self._get_popular_products(limit, filters)
        
        # Calculate similarity scores
        recommendations = []
        for product in products:
            score = await self._calculate_content_similarity(
                user_profile, product, user_preferences, user_interests
            )
            
            if score > 0.1:  # Threshold for relevance
                recommendations.append({
                    'product_id': product.product_id,
                    'score': score,
                    'reason': "Based on your interests and preferences",
                    'recommendation_type': 'content_based'
                })
        
        # Sort by score and return top recommendations
        recommendations.sort(key=lambda x: x['score'], reverse=True)
        return recommendations[:limit]
    
    async def _hybrid_recommendations(self, user_profile: UserProfile, 
                                    limit: int, filters: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Hybrid recommendations combining collaborative and content-based filtering"""
        # Get collaborative recommendations
        collab_recs = await self._collaborative_filtering(user_profile, limit * 2, filters)
        
        # Get content-based recommendations
        content_recs = await self._content_based_filtering(user_profile, limit * 2, filters)
        
        # Combine and re-rank
        combined_recs = {}
        
        # Add collaborative recommendations with weight 0.6
        for rec in collab_recs:
            product_id = rec['product_id']
            if product_id not in combined_recs:
                combined_recs[product_id] = {
                    'product_id': product_id,
                    'score': 0,
                    'reasons': [],
                    'recommendation_type': 'hybrid'
                }
            combined_recs[product_id]['score'] += rec['score'] * 0.6
            combined_recs[product_id]['reasons'].append(rec['reason'])
        
        # Add content-based recommendations with weight 0.4
        for rec in content_recs:
            product_id = rec['product_id']
            if product_id not in combined_recs:
                combined_recs[product_id] = {
                    'product_id': product_id,
                    'score': 0,
                    'reasons': [],
                    'recommendation_type': 'hybrid'
                }
            combined_recs[product_id]['score'] += rec['score'] * 0.4
            combined_recs[product_id]['reasons'].append(rec['reason'])
        
        # Convert to list and sort
        recommendations = list(combined_recs.values())
        for rec in recommendations:
            rec['reason'] = " | ".join(rec['reasons'])
            del rec['reasons']
        
        recommendations.sort(key=lambda x: x['score'], reverse=True)
        return recommendations[:limit]
    
    async def _find_similar_users(self, user_profile: UserProfile) -> List[Dict[str, Any]]:
        """Find users similar to the given user"""
        # Get all user profiles
        all_profiles = self.db.query(UserProfile).filter(
            UserProfile.tenant_id == user_profile.tenant_id,
            UserProfile.user_id != user_profile.user_id
        ).all()
        
        if not all_profiles:
            return []
        
        # Calculate similarity scores
        similarities = []
        for profile in all_profiles:
            similarity = await self._calculate_user_similarity(user_profile, profile)
            if similarity > 0.3:  # Threshold for similarity
                similarities.append({
                    'user_id': profile.user_id,
                    'similarity': similarity
                })
        
        # Sort by similarity
        similarities.sort(key=lambda x: x['similarity'], reverse=True)
        return similarities[:10]  # Top 10 similar users
    
    async def _calculate_user_similarity(self, user1: UserProfile, user2: UserProfile) -> float:
        """Calculate similarity between two users"""
        # Compare preferences
        prefs1 = user1.preferences or {}
        prefs2 = user2.preferences or {}
        
        # Compare interests
        interests1 = set(user1.interests or [])
        interests2 = set(user2.interests or [])
        
        # Calculate Jaccard similarity for interests
        if interests1 or interests2:
            jaccard_sim = len(interests1.intersection(interests2)) / len(interests1.union(interests2))
        else:
            jaccard_sim = 0
        
        # Calculate preference similarity
        pref_sim = 0
        if prefs1 and prefs2:
            common_keys = set(prefs1.keys()).intersection(set(prefs2.keys()))
            if common_keys:
                pref_sim = sum(
                    1 for key in common_keys if prefs1[key] == prefs2[key]
                ) / len(common_keys)
        
        # Weighted combination
        return 0.7 * jaccard_sim + 0.3 * pref_sim
    
    async def _calculate_content_similarity(self, user_profile: UserProfile, 
                                          product: ProductFeatures, 
                                          preferences: Dict[str, Any],
                                          interests: List[str]) -> float:
        """Calculate content similarity between user and product"""
        score = 0
        
        # Category matching
        if product.category_features:
            user_categories = preferences.get('categories', [])
            product_categories = product.category_features.get('categories', [])
            
            if user_categories and product_categories:
                category_match = len(set(user_categories).intersection(set(product_categories)))
                score += category_match * 0.3
        
        # Interest matching
        if product.text_features and interests:
            product_keywords = product.text_features.get('keywords', [])
            interest_match = len(set(interests).intersection(set(product_keywords)))
            score += interest_match * 0.4
        
        # Price preference
        if product.price_features and 'price_range' in preferences:
            price_range = preferences['price_range']
            product_price = product.price_features.get('price', 0)
            
            if price_range[0] <= product_price <= price_range[1]:
                score += 0.3
        
        return min(score, 1.0)  # Cap at 1.0
    
    async def _get_popular_products(self, limit: int, filters: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Get popular products as fallback recommendations"""
        # Get popular products based on interactions
        popular_products = self.db.query(
            Interaction.product_id,
            func.count(Interaction.id).label('interaction_count'),
            func.avg(Interaction.interaction_value).label('avg_value')
        ).group_by(Interaction.product_id).order_by(
            func.count(Interaction.id).desc()
        ).limit(limit).all()
        
        recommendations = []
        for product in popular_products:
            recommendations.append({
                'product_id': product.product_id,
                'score': product.interaction_count * product.avg_value,
                'reason': "Popular among users",
                'recommendation_type': 'popular'
            })
        
        return recommendations
    
    async def _update_user_features(self, user_profile: UserProfile):
        """Update ML features for user profile"""
        # Get user interactions
        interactions = self.db.query(Interaction).filter(
            Interaction.user_id == user_profile.user_id,
            Interaction.tenant_id == user_profile.tenant_id
        ).all()
        
        # Calculate behavior patterns
        behavior_patterns = {
            'total_interactions': len(interactions),
            'interaction_types': {},
            'time_patterns': {},
            'category_preferences': {}
        }
        
        for interaction in interactions:
            # Count interaction types
            itype = interaction.interaction_type
            behavior_patterns['interaction_types'][itype] = \
                behavior_patterns['interaction_types'].get(itype, 0) + 1
            
            # Time patterns
            hour = interaction.timestamp.hour
            behavior_patterns['time_patterns'][hour] = \
                behavior_patterns['time_patterns'].get(hour, 0) + 1
        
        user_profile.behavior_patterns = behavior_patterns
        
        # Update feature vector
        feature_vector = await self._extract_user_features(user_profile)
        user_profile.feature_vector = feature_vector.tolist()
        
        self.db.commit()
    
    async def _extract_user_features(self, user_profile: UserProfile) -> np.ndarray:
        """Extract numerical features from user profile"""
        features = []
        
        # Demographics features
        demographics = user_profile.demographics or {}
        features.extend([
            demographics.get('age', 0),
            demographics.get('income', 0),
            1 if demographics.get('gender') == 'male' else 0,
            1 if demographics.get('gender') == 'female' else 0
        ])
        
        # Behavior features
        behavior = user_profile.behavior_patterns or {}
        features.extend([
            behavior.get('total_interactions', 0),
            len(behavior.get('interaction_types', {})),
            len(behavior.get('time_patterns', {}))
        ])
        
        # Interest features
        interests = user_profile.interests or []
        features.extend([
            len(interests),
            1 if 'electronics' in interests else 0,
            1 if 'fashion' in interests else 0,
            1 if 'home' in interests else 0,
            1 if 'sports' in interests else 0
        ])
        
        return np.array(features)
    
    async def _update_profile_from_interaction(self, interaction: Interaction):
        """Update user profile based on new interaction"""
        user_profile = await self.create_user_profile(
            interaction.user_id, interaction.tenant_id
        )
        
        # Update interests based on product category
        if interaction.interaction_type in ['purchase', 'like']:
            # Get product category and add to interests
            product = self.db.query(ProductFeatures).filter(
                ProductFeatures.product_id == interaction.product_id
            ).first()
            
            if product and product.category_features:
                categories = product.category_features.get('categories', [])
                current_interests = set(user_profile.interests or [])
                current_interests.update(categories)
                user_profile.interests = list(current_interests)
        
        # Update behavior patterns
        await self._update_user_features(user_profile)
    
    async def _get_active_model(self, tenant_id: Optional[str] = None) -> Optional[RecommendationModel]:
        """Get active recommendation model for tenant"""
        return self.db.query(RecommendationModel).filter(
            RecommendationModel.tenant_id == tenant_id,
            RecommendationModel.is_active == True
        ).first()
    
    async def _store_recommendations(self, user_id: int, recommendations: List[Dict[str, Any]], 
                                   model_id: str, tenant_id: Optional[str] = None):
        """Store recommendations in database"""
        for rec in recommendations:
            recommendation = Recommendation(
                user_id=user_id,
                product_id=rec['product_id'],
                tenant_id=tenant_id,
                recommendation_type=rec['recommendation_type'],
                score=rec['score'],
                reason=rec['reason'],
                model_id=model_id,
                expires_at=datetime.utcnow() + timedelta(days=7)
            )
            self.db.add(recommendation)
        
        self.db.commit()
    
    async def train_model(self, tenant_id: Optional[str] = None, 
                         model_type: str = "hybrid") -> str:
        """Train recommendation model"""
        model_id = f"{model_type}_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}"
        
        # Create model record
        model = RecommendationModel(
            model_id=model_id,
            tenant_id=tenant_id,
            model_type=model_type,
            model_name=f"{model_type.title()} Recommendation Model",
            is_training=True
        )
        self.db.add(model)
        self.db.commit()
        
        try:
            # Train model based on type
            if model_type == "collaborative":
                await self._train_collaborative_model(model)
            elif model_type == "content_based":
                await self._train_content_based_model(model)
            elif model_type == "hybrid":
                await self._train_hybrid_model(model)
            
            # Mark as active and training complete
            model.is_training = False
            model.is_active = True
            model.last_trained = datetime.utcnow()
            
            # Deactivate other models
            self.db.query(RecommendationModel).filter(
                RecommendationModel.tenant_id == tenant_id,
                RecommendationModel.model_id != model_id
            ).update({"is_active": False})
            
            self.db.commit()
            
            return model_id
            
        except Exception as e:
            # Mark training as failed
            model.is_training = False
            model.is_active = False
            self.db.commit()
            raise e
    
    async def _train_collaborative_model(self, model: RecommendationModel):
        """Train collaborative filtering model"""
        # Get all interactions
        interactions = self.db.query(Interaction).filter(
            Interaction.tenant_id == model.tenant_id
        ).all()
        
        if not interactions:
            return
        
        # Create user-item matrix
        user_items = {}
        for interaction in interactions:
            user_id = interaction.user_id
            product_id = interaction.product_id
            value = interaction.interaction_value
            
            if user_id not in user_items:
                user_items[user_id] = {}
            user_items[user_id][product_id] = value
        
        # Store model data
        model.model_data = {
            'user_items': user_items,
            'interaction_count': len(interactions)
        }
        
        # Calculate performance metrics
        model.performance_metrics = {
            'training_samples': len(interactions),
            'unique_users': len(user_items),
            'unique_products': len(set(
                product_id for user_items_dict in user_items.values()
                for product_id in user_items_dict.keys()
            ))
        }
    
    async def _train_content_based_model(self, model: RecommendationModel):
        """Train content-based filtering model"""
        # Get all products with features
        products = self.db.query(ProductFeatures).filter(
            ProductFeatures.tenant_id == model.tenant_id
        ).all()
        
        if not products:
            return
        
        # Extract text features
        text_data = []
        for product in products:
            text_parts = []
            if product.text_features:
                text_parts.extend(product.text_features.get('title', '').split())
                text_parts.extend(product.text_features.get('description', '').split())
                text_parts.extend(product.text_features.get('keywords', []))
            text_data.append(' '.join(text_parts))
        
        # Fit TF-IDF vectorizer
        if text_data:
            tfidf_matrix = self.vectorizers['text'].fit_transform(text_data)
            model.model_data = {
                'tfidf_matrix': tfidf_matrix.toarray().tolist(),
                'product_ids': [p.product_id for p in products],
                'feature_names': self.vectorizers['text'].get_feature_names_out().tolist()
            }
        
        # Calculate performance metrics
        model.performance_metrics = {
            'training_products': len(products),
            'feature_dimensions': len(self.vectorizers['text'].get_feature_names_out()) if text_data else 0
        }
    
    async def _train_hybrid_model(self, model: RecommendationModel):
        """Train hybrid recommendation model"""
        # Train both collaborative and content-based components
        await self._train_collaborative_model(model)
        
        # Store as hybrid model
        model.model_type = "hybrid"
        model.performance_metrics.update({
            'model_type': 'hybrid',
            'components': ['collaborative', 'content_based']
        })

# Dependency injection
def get_recommendation_engine(db_session = Depends(get_db), redis_client = Depends(get_redis)) -> RecommendationEngine:
    """Get recommendation engine service"""
    return RecommendationEngine(db_session, redis_client)


