"""
Predictive Analytics System for Soladia Marketplace
Advanced machine learning for business insights and forecasting
"""

from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime, timedelta
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.linear_model import LinearRegression, Ridge, Lasso
from sklearn.svm import SVR
from sklearn.neural_network import MLPRegressor
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score
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

class AnalyticsModel(Base):
    __tablename__ = "analytics_models"
    
    id = Column(Integer, primary_key=True, index=True)
    model_id = Column(String(36), unique=True, index=True, nullable=False)
    tenant_id = Column(String(36), ForeignKey("tenants.tenant_id"), nullable=True)
    
    # Model details
    model_type = Column(String(50), nullable=False)  # sales, demand, price, churn, etc.
    model_name = Column(String(255), nullable=False)
    model_version = Column(String(20), default="1.0.0")
    algorithm = Column(String(50), nullable=False)  # random_forest, gradient_boosting, etc.
    
    # Model data
    model_data = Column(JSON, default=dict)
    parameters = Column(JSON, default=dict)
    feature_importance = Column(JSON, default=dict)
    performance_metrics = Column(JSON, default=dict)
    
    # Status
    is_active = Column(Boolean, default=False)
    is_training = Column(Boolean, default=False)
    accuracy_score = Column(Float, nullable=True)
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    last_trained = Column(DateTime, nullable=True)
    last_used = Column(DateTime, nullable=True)

class Prediction(Base):
    __tablename__ = "predictions"
    
    id = Column(Integer, primary_key=True, index=True)
    model_id = Column(String(36), ForeignKey("analytics_models.model_id"), nullable=False)
    tenant_id = Column(String(36), ForeignKey("tenants.tenant_id"), nullable=True)
    
    # Prediction details
    prediction_type = Column(String(50), nullable=False)
    input_data = Column(JSON, nullable=False)
    prediction_value = Column(Float, nullable=False)
    confidence_score = Column(Float, nullable=True)
    prediction_interval = Column(JSON, nullable=True)  # Lower and upper bounds
    
    # Context
    context = Column(JSON, default=dict)
    metadata = Column(JSON, default=dict)
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime, nullable=True)

class AnalyticsDataset(Base):
    __tablename__ = "analytics_datasets"
    
    id = Column(Integer, primary_key=True, index=True)
    dataset_id = Column(String(36), unique=True, index=True, nullable=False)
    tenant_id = Column(String(36), ForeignKey("tenants.tenant_id"), nullable=True)
    
    # Dataset details
    dataset_name = Column(String(255), nullable=False)
    dataset_type = Column(String(50), nullable=False)  # sales, user_behavior, etc.
    description = Column(Text, nullable=True)
    
    # Data
    data_points = Column(JSON, default=list)
    features = Column(JSON, default=list)
    target_column = Column(String(100), nullable=True)
    
    # Metadata
    row_count = Column(Integer, default=0)
    column_count = Column(Integer, default=0)
    data_quality_score = Column(Float, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    last_updated = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class BusinessInsight(Base):
    __tablename__ = "business_insights"
    
    id = Column(Integer, primary_key=True, index=True)
    insight_id = Column(String(36), unique=True, index=True, nullable=False)
    tenant_id = Column(String(36), ForeignKey("tenants.tenant_id"), nullable=True)
    
    # Insight details
    insight_type = Column(String(50), nullable=False)  # trend, anomaly, pattern, etc.
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    confidence_score = Column(Float, nullable=True)
    
    # Data
    supporting_data = Column(JSON, default=dict)
    visualizations = Column(JSON, default=list)
    recommendations = Column(JSON, default=list)
    
    # Impact
    impact_score = Column(Float, nullable=True)
    business_value = Column(Text, nullable=True)
    
    # Status
    is_active = Column(Boolean, default=True)
    is_acknowledged = Column(Boolean, default=False)
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime, nullable=True)

# Pydantic models
class PredictionRequest(BaseModel):
    model_id: str = Field(..., min_length=1)
    input_data: Dict[str, Any] = Field(..., min_items=1)
    prediction_type: str = Field(default="forecast", max_length=50)
    context: Dict[str, Any] = Field(default_factory=dict)

class PredictionResponse(BaseModel):
    prediction_id: str
    prediction_value: float
    confidence_score: Optional[float]
    prediction_interval: Optional[Dict[str, float]]
    model_id: str
    generated_at: datetime

class ModelTrainingRequest(BaseModel):
    model_type: str = Field(..., max_length=50)
    algorithm: str = Field(..., max_length=50)
    dataset_id: str = Field(..., min_length=1)
    parameters: Dict[str, Any] = Field(default_factory=dict)
    target_column: str = Field(..., min_length=1)

class InsightRequest(BaseModel):
    insight_type: str = Field(..., max_length=50)
    time_range: Dict[str, str] = Field(..., min_items=2)
    filters: Dict[str, Any] = Field(default_factory=dict)

class PredictiveAnalytics:
    def __init__(self, db_session, redis_client):
        self.db = db_session
        self.redis = redis_client
        self.models = {}
        self.scalers = {}
        self.encoders = {}
        self.logger = logging.getLogger(__name__)
        
        # Initialize algorithms
        self.algorithms = {
            'random_forest': RandomForestRegressor,
            'gradient_boosting': GradientBoostingRegressor,
            'linear_regression': LinearRegression,
            'ridge': Ridge,
            'lasso': Lasso,
            'svr': SVR,
            'neural_network': MLPRegressor
        }
    
    async def create_dataset(self, dataset_name: str, dataset_type: str, 
                           data_points: List[Dict[str, Any]], 
                           tenant_id: Optional[str] = None) -> str:
        """Create analytics dataset"""
        dataset_id = f"dataset_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}"
        
        # Extract features from data
        features = list(data_points[0].keys()) if data_points else []
        
        # Calculate data quality score
        quality_score = await self._calculate_data_quality(data_points)
        
        dataset = AnalyticsDataset(
            dataset_id=dataset_id,
            tenant_id=tenant_id,
            dataset_name=dataset_name,
            dataset_type=dataset_type,
            data_points=data_points,
            features=features,
            row_count=len(data_points),
            column_count=len(features),
            data_quality_score=quality_score
        )
        
        self.db.add(dataset)
        self.db.commit()
        
        return dataset_id
    
    async def train_model(self, request: ModelTrainingRequest, 
                         tenant_id: Optional[str] = None) -> str:
        """Train predictive analytics model"""
        model_id = f"model_{request.model_type}_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}"
        
        # Get dataset
        dataset = self.db.query(AnalyticsDataset).filter(
            AnalyticsDataset.dataset_id == request.dataset_id,
            AnalyticsDataset.tenant_id == tenant_id
        ).first()
        
        if not dataset:
            raise HTTPException(status_code=404, detail="Dataset not found")
        
        # Create model record
        model = AnalyticsModel(
            model_id=model_id,
            tenant_id=tenant_id,
            model_type=request.model_type,
            model_name=f"{request.model_type.title()} Prediction Model",
            algorithm=request.algorithm,
            parameters=request.parameters,
            is_training=True
        )
        self.db.add(model)
        self.db.commit()
        
        try:
            # Prepare data
            X, y = await self._prepare_training_data(dataset, request.target_column)
            
            # Train model
            trained_model, performance_metrics = await self._train_ml_model(
                X, y, request.algorithm, request.parameters
            )
            
            # Store model
            model.model_data = {
                'model_type': request.model_type,
                'algorithm': request.algorithm,
                'features': list(X.columns) if hasattr(X, 'columns') else list(range(X.shape[1])),
                'target_column': request.target_column
            }
            model.performance_metrics = performance_metrics
            model.accuracy_score = performance_metrics.get('r2_score', 0)
            model.is_training = False
            model.is_active = True
            model.last_trained = datetime.utcnow()
            
            # Store trained model
            self.models[model_id] = trained_model
            
            # Deactivate other models of same type
            self.db.query(AnalyticsModel).filter(
                AnalyticsModel.tenant_id == tenant_id,
                AnalyticsModel.model_type == request.model_type,
                AnalyticsModel.model_id != model_id
            ).update({"is_active": False})
            
            self.db.commit()
            
            return model_id
            
        except Exception as e:
            model.is_training = False
            model.is_active = False
            self.db.commit()
            raise e
    
    async def make_prediction(self, request: PredictionRequest, 
                            tenant_id: Optional[str] = None) -> PredictionResponse:
        """Make prediction using trained model"""
        # Get model
        model = self.db.query(AnalyticsModel).filter(
            AnalyticsModel.model_id == request.model_id,
            AnalyticsModel.tenant_id == tenant_id,
            AnalyticsModel.is_active == True
        ).first()
        
        if not model:
            raise HTTPException(status_code=404, detail="Model not found")
        
        # Load model if not in memory
        if request.model_id not in self.models:
            await self._load_model(request.model_id)
        
        # Prepare input data
        input_features = await self._prepare_prediction_input(
            request.input_data, model.model_data['features']
        )
        
        # Make prediction
        prediction_value = self.models[request.model_id].predict([input_features])[0]
        
        # Calculate confidence score
        confidence_score = await self._calculate_confidence_score(
            self.models[request.model_id], input_features
        )
        
        # Calculate prediction interval
        prediction_interval = await self._calculate_prediction_interval(
            self.models[request.model_id], input_features, confidence_score
        )
        
        # Store prediction
        prediction_id = f"pred_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}"
        prediction = Prediction(
            model_id=request.model_id,
            tenant_id=tenant_id,
            prediction_type=request.prediction_type,
            input_data=request.input_data,
            prediction_value=float(prediction_value),
            confidence_score=confidence_score,
            prediction_interval=prediction_interval,
            context=request.context,
            expires_at=datetime.utcnow() + timedelta(days=30)
        )
        self.db.add(prediction)
        self.db.commit()
        
        # Update model last used
        model.last_used = datetime.utcnow()
        self.db.commit()
        
        return PredictionResponse(
            prediction_id=prediction_id,
            prediction_value=float(prediction_value),
            confidence_score=confidence_score,
            prediction_interval=prediction_interval,
            model_id=request.model_id,
            generated_at=datetime.utcnow()
        )
    
    async def generate_insights(self, request: InsightRequest, 
                              tenant_id: Optional[str] = None) -> List[BusinessInsight]:
        """Generate business insights from data"""
        insights = []
        
        # Get data for time range
        data = await self._get_data_for_insights(
            request.time_range, request.filters, tenant_id
        )
        
        if not data:
            return insights
        
        # Generate different types of insights
        if request.insight_type == "trend":
            insights.extend(await self._analyze_trends(data, tenant_id))
        elif request.insight_type == "anomaly":
            insights.extend(await self._detect_anomalies(data, tenant_id))
        elif request.insight_type == "pattern":
            insights.extend(await self._find_patterns(data, tenant_id))
        elif request.insight_type == "forecast":
            insights.extend(await self._generate_forecasts(data, tenant_id))
        elif request.insight_type == "all":
            insights.extend(await self._analyze_trends(data, tenant_id))
            insights.extend(await self._detect_anomalies(data, tenant_id))
            insights.extend(await self._find_patterns(data, tenant_id))
            insights.extend(await self._generate_forecasts(data, tenant_id))
        
        return insights
    
    async def _prepare_training_data(self, dataset: AnalyticsDataset, 
                                   target_column: str) -> Tuple[np.ndarray, np.ndarray]:
        """Prepare training data from dataset"""
        data_points = dataset.data_points
        
        if not data_points:
            raise HTTPException(status_code=400, detail="Dataset is empty")
        
        # Convert to DataFrame
        df = pd.DataFrame(data_points)
        
        # Separate features and target
        if target_column not in df.columns:
            raise HTTPException(status_code=400, detail=f"Target column '{target_column}' not found")
        
        y = df[target_column].values
        X = df.drop(columns=[target_column])
        
        # Handle categorical variables
        X_encoded = pd.get_dummies(X, drop_first=True)
        
        # Handle missing values
        X_encoded = X_encoded.fillna(X_encoded.mean())
        
        return X_encoded, y
    
    async def _train_ml_model(self, X: np.ndarray, y: np.ndarray, 
                            algorithm: str, parameters: Dict[str, Any]) -> Tuple[Any, Dict[str, float]]:
        """Train machine learning model"""
        # Get algorithm class
        if algorithm not in self.algorithms:
            raise HTTPException(status_code=400, detail=f"Unknown algorithm: {algorithm}")
        
        AlgorithmClass = self.algorithms[algorithm]
        
        # Create model with parameters
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
        mse = mean_squared_error(y_test, y_pred)
        mae = mean_absolute_error(y_test, y_pred)
        r2 = r2_score(y_test, y_pred)
        
        # Cross-validation score
        cv_scores = cross_val_score(model, X_train_scaled, y_train, cv=5)
        
        performance_metrics = {
            'mse': float(mse),
            'mae': float(mae),
            'r2_score': float(r2),
            'cv_mean': float(cv_scores.mean()),
            'cv_std': float(cv_scores.std())
        }
        
        # Store scaler
        self.scalers[algorithm] = scaler
        
        return model, performance_metrics
    
    async def _prepare_prediction_input(self, input_data: Dict[str, Any], 
                                      features: List[str]) -> np.ndarray:
        """Prepare input data for prediction"""
        # Convert to array in correct order
        input_array = []
        for feature in features:
            if feature in input_data:
                input_array.append(input_data[feature])
            else:
                input_array.append(0)  # Default value for missing features
        
        return np.array(input_array).reshape(1, -1)
    
    async def _calculate_confidence_score(self, model: Any, input_features: np.ndarray) -> float:
        """Calculate confidence score for prediction"""
        # For tree-based models, use prediction variance
        if hasattr(model, 'estimators_'):
            # Random Forest or Gradient Boosting
            predictions = []
            for estimator in model.estimators_:
                pred = estimator.predict(input_features)
                predictions.append(pred[0])
            
            # Calculate confidence based on variance
            variance = np.var(predictions)
            confidence = max(0, 1 - variance)
            return float(confidence)
        else:
            # For other models, use a default confidence
            return 0.8
    
    async def _calculate_prediction_interval(self, model: Any, input_features: np.ndarray, 
                                           confidence: float) -> Dict[str, float]:
        """Calculate prediction interval"""
        prediction = model.predict(input_features)[0]
        
        # Simple interval calculation based on confidence
        margin = (1 - confidence) * abs(prediction) * 0.1
        
        return {
            'lower': float(prediction - margin),
            'upper': float(prediction + margin)
        }
    
    async def _load_model(self, model_id: str):
        """Load model from storage"""
        # In a real implementation, this would load from persistent storage
        # For now, we'll use the models dictionary
        if model_id not in self.models:
            raise HTTPException(status_code=404, detail="Model not found in memory")
    
    async def _calculate_data_quality(self, data_points: List[Dict[str, Any]]) -> float:
        """Calculate data quality score"""
        if not data_points:
            return 0.0
        
        total_points = len(data_points)
        quality_score = 1.0
        
        # Check for missing values
        missing_values = 0
        for point in data_points:
            for value in point.values():
                if value is None or value == '':
                    missing_values += 1
        
        if total_points > 0:
            missing_ratio = missing_values / (total_points * len(data_points[0]))
            quality_score -= missing_ratio * 0.5
        
        # Check for outliers (simple heuristic)
        numeric_columns = []
        for key, value in data_points[0].items():
            if isinstance(value, (int, float)):
                numeric_columns.append(key)
        
        for column in numeric_columns:
            values = [point[column] for point in data_points if point[column] is not None]
            if values:
                mean_val = np.mean(values)
                std_val = np.std(values)
                outliers = sum(1 for v in values if abs(v - mean_val) > 3 * std_val)
                outlier_ratio = outliers / len(values)
                quality_score -= outlier_ratio * 0.2
        
        return max(0.0, min(1.0, quality_score))
    
    async def _get_data_for_insights(self, time_range: Dict[str, str], 
                                   filters: Dict[str, Any], 
                                   tenant_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """Get data for insight generation"""
        # This would query the actual data sources
        # For now, return mock data
        return []
    
    async def _analyze_trends(self, data: List[Dict[str, Any]], 
                            tenant_id: Optional[str] = None) -> List[BusinessInsight]:
        """Analyze trends in data"""
        insights = []
        
        # Mock trend analysis
        insight = BusinessInsight(
            insight_id=f"trend_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}",
            tenant_id=tenant_id,
            insight_type="trend",
            title="Sales Growth Trend",
            description="Sales have increased by 15% over the last quarter",
            confidence_score=0.85,
            supporting_data={"growth_rate": 0.15, "period": "quarter"},
            impact_score=0.8,
            business_value="Positive growth indicates market expansion"
        )
        
        insights.append(insight)
        return insights
    
    async def _detect_anomalies(self, data: List[Dict[str, Any]], 
                              tenant_id: Optional[str] = None) -> List[BusinessInsight]:
        """Detect anomalies in data"""
        insights = []
        
        # Mock anomaly detection
        insight = BusinessInsight(
            insight_id=f"anomaly_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}",
            tenant_id=tenant_id,
            insight_type="anomaly",
            title="Unusual Traffic Spike",
            description="Detected 300% increase in traffic on 2024-01-15",
            confidence_score=0.95,
            supporting_data={"increase": 3.0, "date": "2024-01-15"},
            impact_score=0.9,
            business_value="Investigate cause of traffic spike for potential opportunities"
        )
        
        insights.append(insight)
        return insights
    
    async def _find_patterns(self, data: List[Dict[str, Any]], 
                           tenant_id: Optional[str] = None) -> List[BusinessInsight]:
        """Find patterns in data"""
        insights = []
        
        # Mock pattern analysis
        insight = BusinessInsight(
            insight_id=f"pattern_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}",
            tenant_id=tenant_id,
            insight_type="pattern",
            title="Weekly Sales Pattern",
            description="Sales peak on Fridays and are lowest on Mondays",
            confidence_score=0.78,
            supporting_data={"peak_day": "Friday", "low_day": "Monday"},
            impact_score=0.6,
            business_value="Optimize marketing campaigns for peak days"
        )
        
        insights.append(insight)
        return insights
    
    async def _generate_forecasts(self, data: List[Dict[str, Any]], 
                                tenant_id: Optional[str] = None) -> List[BusinessInsight]:
        """Generate forecasts from data"""
        insights = []
        
        # Mock forecast generation
        insight = BusinessInsight(
            insight_id=f"forecast_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}",
            tenant_id=tenant_id,
            insight_type="forecast",
            title="Next Month Sales Forecast",
            description="Predicted sales of $150,000 for next month",
            confidence_score=0.82,
            supporting_data={"forecast": 150000, "period": "next_month"},
            impact_score=0.7,
            business_value="Plan inventory and resources based on forecast"
        )
        
        insights.append(insight)
        return insights

# Dependency injection
def get_predictive_analytics(db_session = Depends(get_db), redis_client = Depends(get_redis)) -> PredictiveAnalytics:
    """Get predictive analytics service"""
    return PredictiveAnalytics(db_session, redis_client)


