"""
Advanced Monitoring and Alerting System for Soladia Marketplace
Enterprise-grade monitoring, metrics, and alerting
"""

from typing import Optional, Dict, Any, List, Tuple
from datetime import datetime, timedelta
from enum import Enum
import uuid
import json
import asyncio
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, JSON, ForeignKey, BigInteger, Float
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from fastapi import HTTPException, Depends, Request
from pydantic import BaseModel, Field
import redis
import psutil
import time
from collections import defaultdict
import statistics

Base = declarative_base()

class AlertSeverity(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class AlertStatus(str, Enum):
    ACTIVE = "active"
    ACKNOWLEDGED = "acknowledged"
    RESOLVED = "resolved"
    SUPPRESSED = "suppressed"

class MetricType(str, Enum):
    COUNTER = "counter"
    GAUGE = "gauge"
    HISTOGRAM = "histogram"
    SUMMARY = "summary"

class HealthStatus(str, Enum):
    HEALTHY = "healthy"
    WARNING = "warning"
    CRITICAL = "critical"
    UNKNOWN = "unknown"

class MonitoringMetric(Base):
    __tablename__ = "monitoring_metrics"
    
    id = Column(Integer, primary_key=True, index=True)
    metric_id = Column(String(36), unique=True, index=True, nullable=False)
    tenant_id = Column(String(36), ForeignKey("tenants.tenant_id"), nullable=True)
    
    # Metric details
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    metric_type = Column(String(20), default=MetricType.GAUGE)
    unit = Column(String(20), nullable=True)  # seconds, bytes, count, etc.
    
    # Labels and tags
    labels = Column(JSON, default=dict)
    tags = Column(JSON, default=list)
    
    # Configuration
    is_active = Column(Boolean, default=True)
    collection_interval = Column(Integer, default=60)  # seconds
    retention_days = Column(Integer, default=30)
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class MetricDataPoint(Base):
    __tablename__ = "metric_data_points"
    
    id = Column(Integer, primary_key=True, index=True)
    metric_id = Column(String(36), ForeignKey("monitoring_metrics.metric_id"), nullable=False)
    tenant_id = Column(String(36), ForeignKey("tenants.tenant_id"), nullable=True)
    
    # Data point
    value = Column(Float, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)
    
    # Labels for this specific data point
    labels = Column(JSON, default=dict)
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)

class AlertRule(Base):
    __tablename__ = "alert_rules"
    
    id = Column(Integer, primary_key=True, index=True)
    rule_id = Column(String(36), unique=True, index=True, nullable=False)
    tenant_id = Column(String(36), ForeignKey("tenants.tenant_id"), nullable=True)
    
    # Rule details
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    metric_name = Column(String(255), nullable=False)
    
    # Conditions
    condition = Column(String(50), nullable=False)  # gt, lt, eq, ne, gte, lte
    threshold = Column(Float, nullable=False)
    evaluation_window = Column(Integer, default=300)  # seconds
    
    # Alert configuration
    severity = Column(String(20), default=AlertSeverity.MEDIUM)
    is_active = Column(Boolean, default=True)
    
    # Notification settings
    notification_channels = Column(JSON, default=list)
    cooldown_period = Column(Integer, default=300)  # seconds
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)

class Alert(Base):
    __tablename__ = "alerts"
    
    id = Column(Integer, primary_key=True, index=True)
    alert_id = Column(String(36), unique=True, index=True, nullable=False)
    rule_id = Column(String(36), ForeignKey("alert_rules.rule_id"), nullable=False)
    tenant_id = Column(String(36), ForeignKey("tenants.tenant_id"), nullable=True)
    
    # Alert details
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    severity = Column(String(20), default=AlertSeverity.MEDIUM)
    status = Column(String(20), default=AlertStatus.ACTIVE)
    
    # Trigger details
    metric_value = Column(Float, nullable=False)
    threshold_value = Column(Float, nullable=False)
    triggered_at = Column(DateTime, default=datetime.utcnow)
    
    # Resolution
    resolved_at = Column(DateTime, nullable=True)
    resolved_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    resolution_notes = Column(Text, nullable=True)
    
    # Notification
    notifications_sent = Column(JSON, default=list)
    last_notification_sent = Column(DateTime, nullable=True)
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class HealthCheck(Base):
    __tablename__ = "health_checks"
    
    id = Column(Integer, primary_key=True, index=True)
    check_id = Column(String(36), unique=True, index=True, nullable=False)
    tenant_id = Column(String(36), ForeignKey("tenants.tenant_id"), nullable=True)
    
    # Check details
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    check_type = Column(String(50), nullable=False)  # http, tcp, ping, custom
    target = Column(String(500), nullable=False)  # URL, host:port, etc.
    
    # Configuration
    timeout = Column(Integer, default=30)  # seconds
    interval = Column(Integer, default=60)  # seconds
    retries = Column(Integer, default=3)
    
    # Status
    status = Column(String(20), default=HealthStatus.UNKNOWN)
    last_check = Column(DateTime, nullable=True)
    last_success = Column(DateTime, nullable=True)
    last_failure = Column(DateTime, nullable=True)
    
    # Statistics
    success_count = Column(BigInteger, default=0)
    failure_count = Column(BigInteger, default=0)
    avg_response_time = Column(Float, default=0.0)
    
    # Metadata
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class NotificationChannel(Base):
    __tablename__ = "notification_channels"
    
    id = Column(Integer, primary_key=True, index=True)
    channel_id = Column(String(36), unique=True, index=True, nullable=False)
    tenant_id = Column(String(36), ForeignKey("tenants.tenant_id"), nullable=True)
    
    # Channel details
    name = Column(String(255), nullable=False)
    channel_type = Column(String(50), nullable=False)  # email, slack, webhook, sms
    configuration = Column(JSON, nullable=False)
    
    # Status
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)

# Pydantic models
class MetricCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    metric_type: MetricType = MetricType.GAUGE
    unit: Optional[str] = Field(None, max_length=20)
    labels: Dict[str, str] = Field(default_factory=dict)
    tags: List[str] = Field(default_factory=list)
    collection_interval: int = Field(60, ge=10, le=3600)
    retention_days: int = Field(30, ge=1, le=365)

class MetricDataPointCreate(BaseModel):
    metric_id: str = Field(..., min_length=1)
    value: float = Field(..., ge=0)
    labels: Dict[str, str] = Field(default_factory=dict)

class AlertRuleCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    metric_name: str = Field(..., min_length=1, max_length=255)
    condition: str = Field(..., regex=r"^(gt|lt|eq|ne|gte|lte)$")
    threshold: float = Field(..., ge=0)
    evaluation_window: int = Field(300, ge=60, le=3600)
    severity: AlertSeverity = AlertSeverity.MEDIUM
    notification_channels: List[str] = Field(default_factory=list)
    cooldown_period: int = Field(300, ge=60, le=3600)

class HealthCheckCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    check_type: str = Field(..., regex=r"^(http|tcp|ping|custom)$")
    target: str = Field(..., min_length=1, max_length=500)
    timeout: int = Field(30, ge=5, le=300)
    interval: int = Field(60, ge=10, le=3600)
    retries: int = Field(3, ge=1, le=10)

class NotificationChannelCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    channel_type: str = Field(..., regex=r"^(email|slack|webhook|sms)$")
    configuration: Dict[str, Any] = Field(..., min_items=1)

class MonitoringDashboard(BaseModel):
    system_metrics: Dict[str, Any]
    application_metrics: Dict[str, Any]
    business_metrics: Dict[str, Any]
    alerts: List[Dict[str, Any]]
    health_checks: List[Dict[str, Any]]

class AdvancedMonitoringService:
    def __init__(self, db_session, redis_client):
        self.db = db_session
        self.redis = redis_client
        self.metrics_cache = {}
        self.alert_evaluators = {}
        self.health_checkers = {}
    
    async def create_metric(self, tenant_id: str, metric_data: MetricCreate) -> str:
        """Create a new monitoring metric"""
        metric_id = str(uuid.uuid4())
        
        metric = MonitoringMetric(
            metric_id=metric_id,
            tenant_id=tenant_id,
            name=metric_data.name,
            description=metric_data.description,
            metric_type=metric_data.metric_type,
            unit=metric_data.unit,
            labels=metric_data.labels,
            tags=metric_data.tags,
            collection_interval=metric_data.collection_interval,
            retention_days=metric_data.retention_days
        )
        
        self.db.add(metric)
        self.db.commit()
        
        # Start collection if active
        if metric.is_active:
            asyncio.create_task(self._start_metric_collection(metric))
        
        return metric_id
    
    async def record_metric_data(self, metric_id: str, data_point: MetricDataPointCreate, tenant_id: Optional[str] = None):
        """Record metric data point"""
        # Verify metric exists
        metric = self.db.query(MonitoringMetric).filter(MonitoringMetric.metric_id == metric_id).first()
        if not metric:
            raise HTTPException(status_code=404, detail="Metric not found")
        
        # Create data point
        data_point_record = MetricDataPoint(
            metric_id=metric_id,
            tenant_id=tenant_id or metric.tenant_id,
            value=data_point.value,
            labels=data_point.labels
        )
        
        self.db.add(data_point_record)
        self.db.commit()
        
        # Update cache
        await self._update_metric_cache(metric_id, data_point.value)
        
        # Evaluate alert rules
        await self._evaluate_alert_rules(metric_id, data_point.value)
    
    async def create_alert_rule(self, tenant_id: str, rule_data: AlertRuleCreate, created_by: int) -> str:
        """Create alert rule"""
        rule_id = str(uuid.uuid4())
        
        rule = AlertRule(
            rule_id=rule_id,
            tenant_id=tenant_id,
            name=rule_data.name,
            description=rule_data.description,
            metric_name=rule_data.metric_name,
            condition=rule_data.condition,
            threshold=rule_data.threshold,
            evaluation_window=rule_data.evaluation_window,
            severity=rule_data.severity,
            notification_channels=rule_data.notification_channels,
            cooldown_period=rule_data.cooldown_period,
            created_by=created_by
        )
        
        self.db.add(rule)
        self.db.commit()
        
        return rule_id
    
    async def create_health_check(self, tenant_id: str, health_check_data: HealthCheckCreate) -> str:
        """Create health check"""
        check_id = str(uuid.uuid4())
        
        health_check = HealthCheck(
            check_id=check_id,
            tenant_id=tenant_id,
            name=health_check_data.name,
            description=health_check_data.description,
            check_type=health_check_data.check_type,
            target=health_check_data.target,
            timeout=health_check_data.timeout,
            interval=health_check_data.interval,
            retries=health_check_data.retries
        )
        
        self.db.add(health_check)
        self.db.commit()
        
        # Start health checking
        asyncio.create_task(self._start_health_checking(health_check))
        
        return check_id
    
    async def create_notification_channel(self, tenant_id: str, channel_data: NotificationChannelCreate, created_by: int) -> str:
        """Create notification channel"""
        channel_id = str(uuid.uuid4())
        
        channel = NotificationChannel(
            channel_id=channel_id,
            tenant_id=tenant_id,
            name=channel_data.name,
            channel_type=channel_data.channel_type,
            configuration=channel_data.configuration,
            created_by=created_by
        )
        
        self.db.add(channel)
        self.db.commit()
        
        return channel_id
    
    async def get_monitoring_dashboard(self, tenant_id: str) -> MonitoringDashboard:
        """Get monitoring dashboard data"""
        # System metrics
        system_metrics = await self._get_system_metrics()
        
        # Application metrics
        application_metrics = await self._get_application_metrics(tenant_id)
        
        # Business metrics
        business_metrics = await self._get_business_metrics(tenant_id)
        
        # Active alerts
        alerts = await self._get_active_alerts(tenant_id)
        
        # Health checks
        health_checks = await self._get_health_checks(tenant_id)
        
        return MonitoringDashboard(
            system_metrics=system_metrics,
            application_metrics=application_metrics,
            business_metrics=business_metrics,
            alerts=alerts,
            health_checks=health_checks
        )
    
    async def get_metric_data(self, metric_id: str, start_time: datetime, end_time: datetime, 
                             aggregation: str = "avg") -> List[Dict[str, Any]]:
        """Get metric data for time range"""
        # Query data points
        data_points = self.db.query(MetricDataPoint).filter(
            MetricDataPoint.metric_id == metric_id,
            MetricDataPoint.timestamp >= start_time,
            MetricDataPoint.timestamp <= end_time
        ).order_by(MetricDataPoint.timestamp).all()
        
        if not data_points:
            return []
        
        # Apply aggregation
        if aggregation == "avg":
            # Group by time intervals and calculate average
            return await self._aggregate_data_points(data_points, "avg")
        elif aggregation == "sum":
            return await self._aggregate_data_points(data_points, "sum")
        elif aggregation == "max":
            return await self._aggregate_data_points(data_points, "max")
        elif aggregation == "min":
            return await self._aggregate_data_points(data_points, "min")
        else:
            # Return raw data points
            return [
                {
                    "timestamp": dp.timestamp.isoformat(),
                    "value": dp.value,
                    "labels": dp.labels
                }
                for dp in data_points
            ]
    
    async def acknowledge_alert(self, alert_id: str, user_id: int, notes: Optional[str] = None) -> bool:
        """Acknowledge alert"""
        alert = self.db.query(Alert).filter(Alert.alert_id == alert_id).first()
        if not alert:
            return False
        
        alert.status = AlertStatus.ACKNOWLEDGED
        alert.resolved_by = user_id
        alert.resolution_notes = notes
        alert.updated_at = datetime.utcnow()
        
        self.db.commit()
        
        return True
    
    async def resolve_alert(self, alert_id: str, user_id: int, notes: Optional[str] = None) -> bool:
        """Resolve alert"""
        alert = self.db.query(Alert).filter(Alert.alert_id == alert_id).first()
        if not alert:
            return False
        
        alert.status = AlertStatus.RESOLVED
        alert.resolved_at = datetime.utcnow()
        alert.resolved_by = user_id
        alert.resolution_notes = notes
        alert.updated_at = datetime.utcnow()
        
        self.db.commit()
        
        return True
    
    async def _start_metric_collection(self, metric: MonitoringMetric):
        """Start collecting metric data"""
        while metric.is_active:
            try:
                # Collect metric data based on type
                if metric.name.startswith("system."):
                    value = await self._collect_system_metric(metric.name)
                elif metric.name.startswith("application."):
                    value = await self._collect_application_metric(metric.name, metric.tenant_id)
                else:
                    value = 0.0
                
                # Record data point
                await self.record_metric_data(
                    metric.metric_id,
                    MetricDataPointCreate(value=value),
                    metric.tenant_id
                )
                
                # Wait for next collection
                await asyncio.sleep(metric.collection_interval)
                
            except Exception as e:
                print(f"Error collecting metric {metric.name}: {e}")
                await asyncio.sleep(metric.collection_interval)
    
    async def _start_health_checking(self, health_check: HealthCheck):
        """Start health checking"""
        while health_check.is_active:
            try:
                # Perform health check
                success = await self._perform_health_check(health_check)
                
                # Update health check record
                health_check.last_check = datetime.utcnow()
                if success:
                    health_check.status = HealthStatus.HEALTHY
                    health_check.last_success = datetime.utcnow()
                    health_check.success_count += 1
                else:
                    health_check.status = HealthStatus.CRITICAL
                    health_check.last_failure = datetime.utcnow()
                    health_check.failure_count += 1
                
                self.db.commit()
                
                # Wait for next check
                await asyncio.sleep(health_check.interval)
                
            except Exception as e:
                print(f"Error performing health check {health_check.name}: {e}")
                await asyncio.sleep(health_check.interval)
    
    async def _collect_system_metric(self, metric_name: str) -> float:
        """Collect system metric"""
        if metric_name == "system.cpu.usage":
            return psutil.cpu_percent(interval=1)
        elif metric_name == "system.memory.usage":
            memory = psutil.virtual_memory()
            return memory.percent
        elif metric_name == "system.disk.usage":
            disk = psutil.disk_usage('/')
            return (disk.used / disk.total) * 100
        elif metric_name == "system.load.average":
            load_avg = psutil.getloadavg()
            return load_avg[0]  # 1-minute load average
        else:
            return 0.0
    
    async def _collect_application_metric(self, metric_name: str, tenant_id: str) -> float:
        """Collect application metric"""
        # This would collect application-specific metrics
        # Implementation depends on specific requirements
        return 0.0
    
    async def _perform_health_check(self, health_check: HealthCheck) -> bool:
        """Perform health check"""
        try:
            if health_check.check_type == "http":
                import aiohttp
                async with aiohttp.ClientSession() as session:
                    async with session.get(health_check.target, timeout=health_check.timeout) as response:
                        return response.status == 200
            elif health_check.check_type == "tcp":
                import socket
                host, port = health_check.target.split(":")
                sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                sock.settimeout(health_check.timeout)
                result = sock.connect_ex((host, int(port)))
                sock.close()
                return result == 0
            elif health_check.check_type == "ping":
                import subprocess
                result = subprocess.run(
                    ["ping", "-c", "1", health_check.target],
                    capture_output=True,
                    timeout=health_check.timeout
                )
                return result.returncode == 0
            else:
                return False
        except Exception:
            return False
    
    async def _evaluate_alert_rules(self, metric_id: str, value: float):
        """Evaluate alert rules for metric"""
        # Get metric
        metric = self.db.query(MonitoringMetric).filter(MonitoringMetric.metric_id == metric_id).first()
        if not metric:
            return
        
        # Get applicable alert rules
        rules = self.db.query(AlertRule).filter(
            AlertRule.metric_name == metric.name,
            AlertRule.is_active == True,
            (AlertRule.tenant_id == metric.tenant_id) | (AlertRule.tenant_id.is_(None))
        ).all()
        
        for rule in rules:
            if await self._evaluate_rule_condition(rule, value):
                await self._trigger_alert(rule, value)
    
    async def _evaluate_rule_condition(self, rule: AlertRule, value: float) -> bool:
        """Evaluate alert rule condition"""
        conditions = {
            "gt": lambda v, t: v > t,
            "lt": lambda v, t: v < t,
            "eq": lambda v, t: v == t,
            "ne": lambda v, t: v != t,
            "gte": lambda v, t: v >= t,
            "lte": lambda v, t: v <= t
        }
        
        condition_func = conditions.get(rule.condition)
        if not condition_func:
            return False
        
        return condition_func(value, rule.threshold)
    
    async def _trigger_alert(self, rule: AlertRule, value: float):
        """Trigger alert"""
        # Check if alert already exists and is active
        existing_alert = self.db.query(Alert).filter(
            Alert.rule_id == rule.rule_id,
            Alert.status == AlertStatus.ACTIVE
        ).first()
        
        if existing_alert:
            # Check cooldown period
            if existing_alert.triggered_at > datetime.utcnow() - timedelta(seconds=rule.cooldown_period):
                return
        
        # Create new alert
        alert_id = str(uuid.uuid4())
        alert = Alert(
            alert_id=alert_id,
            rule_id=rule.rule_id,
            tenant_id=rule.tenant_id,
            title=f"Alert: {rule.name}",
            description=f"Metric {rule.metric_name} {rule.condition} {rule.threshold} (current: {value})",
            severity=rule.severity,
            metric_value=value,
            threshold_value=rule.threshold
        )
        
        self.db.add(alert)
        self.db.commit()
        
        # Send notifications
        await self._send_alert_notifications(alert, rule)
    
    async def _send_alert_notifications(self, alert: Alert, rule: AlertRule):
        """Send alert notifications"""
        for channel_id in rule.notification_channels:
            channel = self.db.query(NotificationChannel).filter(
                NotificationChannel.channel_id == channel_id,
                NotificationChannel.is_active == True
            ).first()
            
            if channel:
                await self._send_notification(channel, alert)
    
    async def _send_notification(self, channel: NotificationChannel, alert: Alert):
        """Send notification via channel"""
        # Implementation would send actual notifications
        # This is a placeholder for the actual notification logic
        pass
    
    async def _get_system_metrics(self) -> Dict[str, Any]:
        """Get system metrics"""
        return {
            "cpu_usage": psutil.cpu_percent(interval=1),
            "memory_usage": psutil.virtual_memory().percent,
            "disk_usage": (psutil.disk_usage('/').used / psutil.disk_usage('/').total) * 100,
            "load_average": psutil.getloadavg()[0],
            "uptime": time.time() - psutil.boot_time()
        }
    
    async def _get_application_metrics(self, tenant_id: str) -> Dict[str, Any]:
        """Get application metrics"""
        # This would return application-specific metrics
        return {}
    
    async def _get_business_metrics(self, tenant_id: str) -> Dict[str, Any]:
        """Get business metrics"""
        # This would return business-specific metrics
        return {}
    
    async def _get_active_alerts(self, tenant_id: str) -> List[Dict[str, Any]]:
        """Get active alerts"""
        alerts = self.db.query(Alert).filter(
            Alert.tenant_id == tenant_id,
            Alert.status == AlertStatus.ACTIVE
        ).order_by(Alert.triggered_at.desc()).limit(20).all()
        
        return [
            {
                "alert_id": alert.alert_id,
                "title": alert.title,
                "description": alert.description,
                "severity": alert.severity,
                "metric_value": alert.metric_value,
                "threshold_value": alert.threshold_value,
                "triggered_at": alert.triggered_at.isoformat()
            }
            for alert in alerts
        ]
    
    async def _get_health_checks(self, tenant_id: str) -> List[Dict[str, Any]]:
        """Get health checks"""
        health_checks = self.db.query(HealthCheck).filter(
            HealthCheck.tenant_id == tenant_id,
            HealthCheck.is_active == True
        ).all()
        
        return [
            {
                "check_id": hc.check_id,
                "name": hc.name,
                "check_type": hc.check_type,
                "target": hc.target,
                "status": hc.status,
                "last_check": hc.last_check.isoformat() if hc.last_check else None,
                "success_count": hc.success_count,
                "failure_count": hc.failure_count,
                "avg_response_time": hc.avg_response_time
            }
            for hc in health_checks
        ]
    
    async def _update_metric_cache(self, metric_id: str, value: float):
        """Update metric cache"""
        await self.redis.setex(f"metric:{metric_id}:latest", 300, str(value))
    
    async def _aggregate_data_points(self, data_points: List[MetricDataPoint], aggregation: str) -> List[Dict[str, Any]]:
        """Aggregate data points"""
        if not data_points:
            return []
        
        # Group by time intervals (e.g., 5-minute intervals)
        interval_minutes = 5
        grouped = defaultdict(list)
        
        for dp in data_points:
            # Round timestamp to nearest interval
            rounded_time = dp.timestamp.replace(
                minute=(dp.timestamp.minute // interval_minutes) * interval_minutes,
                second=0,
                microsecond=0
            )
            grouped[rounded_time].append(dp.value)
        
        # Calculate aggregation for each group
        result = []
        for timestamp, values in grouped.items():
            if aggregation == "avg":
                agg_value = statistics.mean(values)
            elif aggregation == "sum":
                agg_value = sum(values)
            elif aggregation == "max":
                agg_value = max(values)
            elif aggregation == "min":
                agg_value = min(values)
            else:
                agg_value = values[0]  # First value
            
            result.append({
                "timestamp": timestamp.isoformat(),
                "value": agg_value,
                "count": len(values)
            })
        
        return sorted(result, key=lambda x: x["timestamp"])

# Dependency injection
def get_monitoring_service(db_session = Depends(get_db), redis_client = Depends(get_redis)) -> AdvancedMonitoringService:
    """Get advanced monitoring service"""
    return AdvancedMonitoringService(db_session, redis_client)

