"""
Fraud Detection System for Soladia Marketplace
Machine learning-based fraud detection and prevention
"""

from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime, timedelta
import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest, RandomForestClassifier
from sklearn.svm import OneClassSVM
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, confusion_matrix
import joblib
import json
import asyncio
from sqlalchemy import Column, Integer, String, Float, DateTime, JSON, ForeignKey, Boolean, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from fastapi import HTTPException, Depends
from pydantic import BaseModel, Field
import redis
import logging

Base = declarative_base()

class FraudRule(Base):
    __tablename__ = "fraud_rules"
    
    id = Column(Integer, primary_key=True, index=True)
    rule_id = Column(String(36), unique=True, index=True, nullable=False)
    tenant_id = Column(String(36), ForeignKey("tenants.tenant_id"), nullable=True)
    
    # Rule details
    rule_name = Column(String(255), nullable=False)
    rule_type = Column(String(50), nullable=False)  # ml, threshold, pattern, behavioral
    description = Column(Text, nullable=True)
    
    # Rule configuration
    conditions = Column(JSON, nullable=False)
    actions = Column(JSON, nullable=False)
    severity = Column(String(20), default="medium")  # low, medium, high, critical
    
    # ML model data
    model_data = Column(JSON, default=dict)
    parameters = Column(JSON, default=dict)
    performance_metrics = Column(JSON, default=dict)
    
    # Status
    is_active = Column(Boolean, default=True)
    is_training = Column(Boolean, default=False)
    accuracy_score = Column(Float, nullable=True)
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    last_trained = Column(DateTime, nullable=True)
    last_used = Column(DateTime, nullable=True)

class FraudEvent(Base):
    __tablename__ = "fraud_events"
    
    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(String(36), unique=True, index=True, nullable=False)
    tenant_id = Column(String(36), ForeignKey("tenants.tenant_id"), nullable=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    # Event details
    event_type = Column(String(50), nullable=False)  # transaction, login, registration, etc.
    fraud_score = Column(Float, nullable=False)
    risk_level = Column(String(20), nullable=False)  # low, medium, high, critical
    status = Column(String(20), default="pending")  # pending, reviewed, resolved, false_positive
    
    # Event data
    event_data = Column(JSON, nullable=False)
    features = Column(JSON, default=dict)
    context = Column(JSON, default=dict)
    
    # Detection details
    triggered_rules = Column(JSON, default=list)
    detection_method = Column(String(50), nullable=False)  # ml, rule, manual, etc.
    confidence_score = Column(Float, nullable=True)
    
    # Resolution
    reviewed_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    reviewed_at = Column(DateTime, nullable=True)
    resolution_notes = Column(Text, nullable=True)
    action_taken = Column(String(100), nullable=True)
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class FraudModel(Base):
    __tablename__ = "fraud_models"
    
    id = Column(Integer, primary_key=True, index=True)
    model_id = Column(String(36), unique=True, index=True, nullable=False)
    tenant_id = Column(String(36), ForeignKey("tenants.tenant_id"), nullable=True)
    
    # Model details
    model_name = Column(String(255), nullable=False)
    model_type = Column(String(50), nullable=False)  # isolation_forest, one_class_svm, random_forest
    algorithm = Column(String(50), nullable=False)
    
    # Model data
    model_data = Column(JSON, default=dict)
    parameters = Column(JSON, default=dict)
    feature_importance = Column(JSON, default=dict)
    performance_metrics = Column(JSON, default=dict)
    
    # Training data
    training_samples = Column(Integer, default=0)
    positive_samples = Column(Integer, default=0)
    negative_samples = Column(Integer, default=0)
    
    # Status
    is_active = Column(Boolean, default=False)
    is_training = Column(Boolean, default=False)
    accuracy_score = Column(Float, nullable=True)
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    last_trained = Column(DateTime, nullable=True)
    last_used = Column(DateTime, nullable=True)

class FraudPattern(Base):
    __tablename__ = "fraud_patterns"
    
    id = Column(Integer, primary_key=True, index=True)
    pattern_id = Column(String(36), unique=True, index=True, nullable=False)
    tenant_id = Column(String(36), ForeignKey("tenants.tenant_id"), nullable=True)
    
    # Pattern details
    pattern_name = Column(String(255), nullable=False)
    pattern_type = Column(String(50), nullable=False)  # velocity, frequency, geographic, etc.
    description = Column(Text, nullable=True)
    
    # Pattern data
    pattern_data = Column(JSON, nullable=False)
    conditions = Column(JSON, nullable=False)
    threshold = Column(Float, nullable=False)
    
    # Statistics
    detection_count = Column(Integer, default=0)
    false_positive_count = Column(Integer, default=0)
    accuracy_rate = Column(Float, nullable=True)
    
    # Status
    is_active = Column(Boolean, default=True)
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    last_updated = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

# Pydantic models
class FraudDetectionRequest(BaseModel):
    event_type: str = Field(..., max_length=50)
    event_data: Dict[str, Any] = Field(..., min_items=1)
    user_id: Optional[int] = Field(None, ge=1)
    context: Dict[str, Any] = Field(default_factory=dict)

class FraudDetectionResponse(BaseModel):
    event_id: str
    fraud_score: float
    risk_level: str
    is_fraud: bool
    triggered_rules: List[str]
    confidence_score: Optional[float]
    recommendations: List[str]

class FraudRuleCreate(BaseModel):
    rule_name: str = Field(..., min_length=1, max_length=255)
    rule_type: str = Field(..., max_length=50)
    description: Optional[str] = None
    conditions: Dict[str, Any] = Field(..., min_items=1)
    actions: Dict[str, Any] = Field(..., min_items=1)
    severity: str = Field(default="medium", max_length=20)

class FraudModelTrainingRequest(BaseModel):
    model_name: str = Field(..., min_length=1, max_length=255)
    model_type: str = Field(..., max_length=50)
    algorithm: str = Field(..., max_length=50)
    training_data: List[Dict[str, Any]] = Field(..., min_items=10)
    parameters: Dict[str, Any] = Field(default_factory=dict)

class FraudDetection:
    def __init__(self, db_session, redis_client):
        self.db = db_session
        self.redis = redis_client
        self.models = {}
        self.scalers = {}
        self.encoders = {}
        self.logger = logging.getLogger(__name__)
        
        # Initialize algorithms
        self.algorithms = {
            'isolation_forest': IsolationForest,
            'one_class_svm': OneClassSVM,
            'random_forest': RandomForestClassifier
        }
    
    async def detect_fraud(self, request: FraudDetectionRequest, 
                          tenant_id: Optional[str] = None) -> FraudDetectionResponse:
        """Detect fraud in an event"""
        event_id = f"fraud_event_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}"
        
        # Extract features from event data
        features = await self._extract_features(request.event_data, request.user_id, tenant_id)
        
        # Calculate fraud score using ML models
        ml_score = await self._calculate_ml_fraud_score(features, tenant_id)
        
        # Check rule-based detection
        rule_results = await self._check_fraud_rules(request.event_data, features, tenant_id)
        
        # Combine scores
        fraud_score = await self._combine_fraud_scores(ml_score, rule_results)
        
        # Determine risk level
        risk_level = await self._determine_risk_level(fraud_score)
        
        # Check if fraud
        is_fraud = fraud_score > 0.7  # Threshold for fraud detection
        
        # Get triggered rules
        triggered_rules = [rule['rule_id'] for rule in rule_results if rule['triggered']]
        
        # Calculate confidence score
        confidence_score = await self._calculate_confidence_score(fraud_score, rule_results)
        
        # Generate recommendations
        recommendations = await self._generate_recommendations(fraud_score, risk_level, triggered_rules)
        
        # Store fraud event
        fraud_event = FraudEvent(
            event_id=event_id,
            tenant_id=tenant_id,
            user_id=request.user_id,
            event_type=request.event_type,
            fraud_score=fraud_score,
            risk_level=risk_level,
            event_data=request.event_data,
            features=features,
            context=request.context,
            triggered_rules=triggered_rules,
            detection_method='ml_rule_combined',
            confidence_score=confidence_score
        )
        self.db.add(fraud_event)
        self.db.commit()
        
        return FraudDetectionResponse(
            event_id=event_id,
            fraud_score=fraud_score,
            risk_level=risk_level,
            is_fraud=is_fraud,
            triggered_rules=triggered_rules,
            confidence_score=confidence_score,
            recommendations=recommendations
        )
    
    async def create_fraud_rule(self, request: FraudRuleCreate, 
                               tenant_id: Optional[str] = None) -> str:
        """Create fraud detection rule"""
        rule_id = f"fraud_rule_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}"
        
        rule = FraudRule(
            rule_id=rule_id,
            tenant_id=tenant_id,
            rule_name=request.rule_name,
            rule_type=request.rule_type,
            description=request.description,
            conditions=request.conditions,
            actions=request.actions,
            severity=request.severity
        )
        
        self.db.add(rule)
        self.db.commit()
        
        return rule_id
    
    async def train_fraud_model(self, request: FraudModelTrainingRequest, 
                               tenant_id: Optional[str] = None) -> str:
        """Train fraud detection model"""
        model_id = f"fraud_model_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}"
        
        # Create model record
        model = FraudModel(
            model_id=model_id,
            tenant_id=tenant_id,
            model_name=request.model_name,
            model_type=request.model_type,
            algorithm=request.algorithm,
            parameters=request.parameters,
            is_training=True
        )
        self.db.add(model)
        self.db.commit()
        
        try:
            # Prepare training data
            X, y = await self._prepare_training_data(request.training_data)
            
            # Train model
            trained_model, performance_metrics = await self._train_ml_model(
                X, y, request.algorithm, request.parameters
            )
            
            # Store model
            model.model_data = {
                'model_type': request.model_type,
                'algorithm': request.algorithm,
                'features': list(X.columns) if hasattr(X, 'columns') else list(range(X.shape[1]))
            }
            model.performance_metrics = performance_metrics
            model.accuracy_score = performance_metrics.get('accuracy', 0)
            model.training_samples = len(request.training_data)
            model.positive_samples = int(y.sum()) if hasattr(y, 'sum') else sum(y)
            model.negative_samples = len(y) - model.positive_samples
            model.is_training = False
            model.is_active = True
            model.last_trained = datetime.utcnow()
            
            # Store trained model
            self.models[model_id] = trained_model
            
            # Deactivate other models of same type
            self.db.query(FraudModel).filter(
                FraudModel.tenant_id == tenant_id,
                FraudModel.model_type == request.model_type,
                FraudModel.model_id != model_id
            ).update({"is_active": False})
            
            self.db.commit()
            
            return model_id
            
        except Exception as e:
            model.is_training = False
            model.is_active = False
            self.db.commit()
            raise e
    
    async def _extract_features(self, event_data: Dict[str, Any], 
                              user_id: Optional[int], tenant_id: Optional[str]) -> Dict[str, Any]:
        """Extract features from event data for fraud detection"""
        features = {}
        
        # Basic event features
        features['event_type'] = event_data.get('event_type', 'unknown')
        features['timestamp'] = datetime.utcnow().timestamp()
        
        # User features
        if user_id:
            features['user_id'] = user_id
            # Get user behavior features
            user_features = await self._get_user_behavior_features(user_id, tenant_id)
            features.update(user_features)
        
        # Transaction features
        if 'amount' in event_data:
            features['amount'] = float(event_data['amount'])
            features['amount_log'] = np.log1p(features['amount'])
        
        # Geographic features
        if 'ip_address' in event_data:
            features['ip_address'] = event_data['ip_address']
            # Get geographic features
            geo_features = await self._get_geographic_features(event_data['ip_address'])
            features.update(geo_features)
        
        # Device features
        if 'user_agent' in event_data:
            features['user_agent'] = event_data['user_agent']
            device_features = await self._extract_device_features(event_data['user_agent'])
            features.update(device_features)
        
        # Time features
        now = datetime.utcnow()
        features['hour'] = now.hour
        features['day_of_week'] = now.weekday()
        features['is_weekend'] = now.weekday() >= 5
        
        # Velocity features
        if user_id:
            velocity_features = await self._calculate_velocity_features(user_id, tenant_id)
            features.update(velocity_features)
        
        return features
    
    async def _get_user_behavior_features(self, user_id: int, tenant_id: Optional[str]) -> Dict[str, Any]:
        """Get user behavior features"""
        features = {}
        
        # Get user's transaction history
        transactions = self.db.query(FraudEvent).filter(
            FraudEvent.user_id == user_id,
            FraudEvent.tenant_id == tenant_id,
            FraudEvent.event_type == 'transaction'
        ).order_by(FraudEvent.created_at.desc()).limit(100).all()
        
        if transactions:
            # Calculate statistics
            amounts = [t.event_data.get('amount', 0) for t in transactions if 'amount' in t.event_data]
            if amounts:
                features['avg_transaction_amount'] = np.mean(amounts)
                features['max_transaction_amount'] = np.max(amounts)
                features['transaction_frequency'] = len(transactions) / 30  # per day
            else:
                features['avg_transaction_amount'] = 0
                features['max_transaction_amount'] = 0
                features['transaction_frequency'] = 0
        else:
            features['avg_transaction_amount'] = 0
            features['max_transaction_amount'] = 0
            features['transaction_frequency'] = 0
        
        # Get fraud history
        fraud_events = self.db.query(FraudEvent).filter(
            FraudEvent.user_id == user_id,
            FraudEvent.tenant_id == tenant_id,
            FraudEvent.is_fraud == True
        ).count()
        
        features['fraud_history_count'] = fraud_events
        
        return features
    
    async def _get_geographic_features(self, ip_address: str) -> Dict[str, Any]:
        """Get geographic features from IP address"""
        features = {}
        
        # Simple IP-based features (in production, use a proper geolocation service)
        features['ip_country'] = 'unknown'
        features['ip_region'] = 'unknown'
        features['ip_city'] = 'unknown'
        
        # IP type features
        if ip_address.startswith('192.168.') or ip_address.startswith('10.') or ip_address.startswith('172.'):
            features['is_private_ip'] = True
        else:
            features['is_private_ip'] = False
        
        return features
    
    async def _extract_device_features(self, user_agent: str) -> Dict[str, Any]:
        """Extract device features from user agent"""
        features = {}
        
        user_agent_lower = user_agent.lower()
        
        # Browser detection
        if 'chrome' in user_agent_lower:
            features['browser'] = 'chrome'
        elif 'firefox' in user_agent_lower:
            features['browser'] = 'firefox'
        elif 'safari' in user_agent_lower:
            features['browser'] = 'safari'
        elif 'edge' in user_agent_lower:
            features['browser'] = 'edge'
        else:
            features['browser'] = 'other'
        
        # OS detection
        if 'windows' in user_agent_lower:
            features['os'] = 'windows'
        elif 'mac' in user_agent_lower:
            features['os'] = 'mac'
        elif 'linux' in user_agent_lower:
            features['os'] = 'linux'
        elif 'android' in user_agent_lower:
            features['os'] = 'android'
        elif 'ios' in user_agent_lower:
            features['os'] = 'ios'
        else:
            features['os'] = 'other'
        
        # Mobile detection
        features['is_mobile'] = any(mobile in user_agent_lower for mobile in ['mobile', 'android', 'iphone'])
        
        return features
    
    async def _calculate_velocity_features(self, user_id: int, tenant_id: Optional[str]) -> Dict[str, Any]:
        """Calculate velocity features for user"""
        features = {}
        
        # Get recent events
        recent_events = self.db.query(FraudEvent).filter(
            FraudEvent.user_id == user_id,
            FraudEvent.tenant_id == tenant_id,
            FraudEvent.created_at >= datetime.utcnow() - timedelta(hours=1)
        ).all()
        
        features['events_last_hour'] = len(recent_events)
        
        # Get events in last 24 hours
        daily_events = self.db.query(FraudEvent).filter(
            FraudEvent.user_id == user_id,
            FraudEvent.tenant_id == tenant_id,
            FraudEvent.created_at >= datetime.utcnow() - timedelta(days=1)
        ).all()
        
        features['events_last_24h'] = len(daily_events)
        
        # Calculate velocity
        if len(daily_events) > 0:
            time_span = (datetime.utcnow() - daily_events[-1].created_at).total_seconds() / 3600
            features['event_velocity'] = len(daily_events) / max(time_span, 1)
        else:
            features['event_velocity'] = 0
        
        return features
    
    async def _calculate_ml_fraud_score(self, features: Dict[str, Any], 
                                      tenant_id: Optional[str] = None) -> float:
        """Calculate fraud score using ML models"""
        # Get active models
        models = self.db.query(FraudModel).filter(
            FraudModel.tenant_id == tenant_id,
            FraudModel.is_active == True
        ).all()
        
        if not models:
            return 0.0
        
        scores = []
        for model in models:
            try:
                # Load model if not in memory
                if model.model_id not in self.models:
                    await self._load_model(model.model_id)
                
                # Prepare features for model
                model_features = await self._prepare_model_features(features, model)
                
                # Make prediction
                if model.algorithm == 'isolation_forest':
                    score = self.models[model.model_id].decision_function([model_features])[0]
                    # Convert to 0-1 scale
                    score = (score + 1) / 2
                elif model.algorithm == 'one_class_svm':
                    score = self.models[model.model_id].decision_function([model_features])[0]
                    # Convert to 0-1 scale
                    score = (score + 1) / 2
                elif model.algorithm == 'random_forest':
                    score = self.models[model.model_id].predict_proba([model_features])[0][1]
                else:
                    score = 0.0
                
                scores.append(score)
                
            except Exception as e:
                self.logger.error(f"Error calculating ML score for model {model.model_id}: {e}")
                continue
        
        # Return average score
        return np.mean(scores) if scores else 0.0
    
    async def _check_fraud_rules(self, event_data: Dict[str, Any], 
                               features: Dict[str, Any], 
                               tenant_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """Check fraud detection rules"""
        rules = self.db.query(FraudRule).filter(
            FraudRule.tenant_id == tenant_id,
            FraudRule.is_active == True
        ).all()
        
        results = []
        for rule in rules:
            triggered = await self._evaluate_rule(rule, event_data, features)
            results.append({
                'rule_id': rule.rule_id,
                'rule_name': rule.rule_name,
                'triggered': triggered,
                'severity': rule.severity
            })
        
        return results
    
    async def _evaluate_rule(self, rule: FraudRule, event_data: Dict[str, Any], 
                           features: Dict[str, Any]) -> bool:
        """Evaluate a fraud rule"""
        conditions = rule.conditions
        
        # Check each condition
        for condition in conditions:
            field = condition.get('field')
            operator = condition.get('operator')
            value = condition.get('value')
            
            if field in event_data:
                event_value = event_data[field]
            elif field in features:
                event_value = features[field]
            else:
                continue
            
            # Evaluate condition
            if operator == 'equals' and event_value != value:
                return False
            elif operator == 'not_equals' and event_value == value:
                return False
            elif operator == 'greater_than' and event_value <= value:
                return False
            elif operator == 'less_than' and event_value >= value:
                return False
            elif operator == 'contains' and value not in str(event_value):
                return False
            elif operator == 'not_contains' and value in str(event_value):
                return False
        
        return True
    
    async def _combine_fraud_scores(self, ml_score: float, 
                                  rule_results: List[Dict[str, Any]]) -> float:
        """Combine ML and rule-based fraud scores"""
        # ML score weight
        ml_weight = 0.7
        
        # Rule-based score
        rule_score = 0.0
        if rule_results:
            triggered_rules = [r for r in rule_results if r['triggered']]
            if triggered_rules:
                # Weight by severity
                severity_weights = {'low': 0.2, 'medium': 0.5, 'high': 0.8, 'critical': 1.0}
                rule_score = max(
                    severity_weights.get(r['severity'], 0.5) for r in triggered_rules
                )
        
        # Combine scores
        combined_score = ml_weight * ml_score + (1 - ml_weight) * rule_score
        
        return min(combined_score, 1.0)
    
    async def _determine_risk_level(self, fraud_score: float) -> str:
        """Determine risk level from fraud score"""
        if fraud_score >= 0.8:
            return 'critical'
        elif fraud_score >= 0.6:
            return 'high'
        elif fraud_score >= 0.4:
            return 'medium'
        else:
            return 'low'
    
    async def _calculate_confidence_score(self, fraud_score: float, 
                                       rule_results: List[Dict[str, Any]]) -> float:
        """Calculate confidence score for fraud detection"""
        # Base confidence on fraud score
        confidence = fraud_score
        
        # Increase confidence if rules are triggered
        triggered_rules = [r for r in rule_results if r['triggered']]
        if triggered_rules:
            confidence += 0.2
        
        # Cap at 1.0
        return min(confidence, 1.0)
    
    async def _generate_recommendations(self, fraud_score: float, risk_level: str, 
                                      triggered_rules: List[str]) -> List[str]:
        """Generate recommendations based on fraud detection results"""
        recommendations = []
        
        if risk_level == 'critical':
            recommendations.append("Immediately block the transaction and freeze the account")
            recommendations.append("Contact the user for verification")
            recommendations.append("Review all recent transactions from this user")
        elif risk_level == 'high':
            recommendations.append("Require additional verification before processing")
            recommendations.append("Monitor the user's activity closely")
            recommendations.append("Consider manual review")
        elif risk_level == 'medium':
            recommendations.append("Flag for review")
            recommendations.append("Monitor for similar patterns")
        else:
            recommendations.append("Continue monitoring")
        
        if triggered_rules:
            recommendations.append(f"Review triggered rules: {', '.join(triggered_rules)}")
        
        return recommendations
    
    async def _prepare_training_data(self, training_data: List[Dict[str, Any]]) -> Tuple[np.ndarray, np.ndarray]:
        """Prepare training data for ML model"""
        # Convert to DataFrame
        df = pd.DataFrame(training_data)
        
        # Separate features and target
        if 'is_fraud' not in df.columns:
            raise HTTPException(status_code=400, detail="Training data must include 'is_fraud' column")
        
        y = df['is_fraud'].values
        X = df.drop(columns=['is_fraud'])
        
        # Handle categorical variables
        X_encoded = pd.get_dummies(X, drop_first=True)
        
        # Handle missing values
        X_encoded = X_encoded.fillna(X_encoded.mean())
        
        return X_encoded, y
    
    async def _train_ml_model(self, X: np.ndarray, y: np.ndarray, 
                            algorithm: str, parameters: Dict[str, Any]) -> Tuple[Any, Dict[str, float]]:
        """Train ML model for fraud detection"""
        if algorithm not in self.algorithms:
            raise HTTPException(status_code=400, detail=f"Unknown algorithm: {algorithm}")
        
        AlgorithmClass = self.algorithms[algorithm]
        model = AlgorithmClass(**parameters)
        
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42
        )
        
        # Scale features
        scaler = StandardScaler()
        X_train_scaled = scaler.fit_transform(X_train)
        X_test_scaled = scaler.transform(X_test)
        
        # Train model
        model.fit(X_train_scaled, y_train)
        
        # Make predictions
        y_pred = model.predict(X_test_scaled)
        
        # Calculate metrics
        from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score
        
        accuracy = accuracy_score(y_test, y_pred)
        precision = precision_score(y_test, y_pred, zero_division=0)
        recall = recall_score(y_test, y_pred, zero_division=0)
        f1 = f1_score(y_test, y_pred, zero_division=0)
        
        performance_metrics = {
            'accuracy': float(accuracy),
            'precision': float(precision),
            'recall': float(recall),
            'f1_score': float(f1)
        }
        
        # Store scaler
        self.scalers[algorithm] = scaler
        
        return model, performance_metrics
    
    async def _prepare_model_features(self, features: Dict[str, Any], model: FraudModel) -> np.ndarray:
        """Prepare features for model prediction"""
        # Get model features
        model_features = model.model_data.get('features', [])
        
        # Create feature vector
        feature_vector = []
        for feature in model_features:
            if feature in features:
                feature_vector.append(features[feature])
            else:
                feature_vector.append(0)  # Default value
        
        return np.array(feature_vector).reshape(1, -1)
    
    async def _load_model(self, model_id: str):
        """Load model from storage"""
        # In a real implementation, this would load from persistent storage
        if model_id not in self.models:
            raise HTTPException(status_code=404, detail="Model not found in memory")

# Dependency injection
def get_fraud_detection(db_session = Depends(get_db), redis_client = Depends(get_redis)) -> FraudDetection:
    """Get fraud detection service"""
    return FraudDetection(db_session, redis_client)

