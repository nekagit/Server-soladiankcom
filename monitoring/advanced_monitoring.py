"""
Advanced monitoring and alerting system for Soladia
"""
import asyncio
import json
import time
import psutil
import logging
from typing import Dict, List, Optional, Any, Callable
from datetime import datetime, timedelta
from dataclasses import dataclass, asdict
from enum import Enum
import aioredis
import aiohttp
from prometheus_client import Counter, Histogram, Gauge, start_http_server
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

logger = logging.getLogger(__name__)

class AlertLevel(Enum):
    """Alert severity levels"""
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"

class MetricType(Enum):
    """Metric types"""
    COUNTER = "counter"
    GAUGE = "gauge"
    HISTOGRAM = "histogram"
    SUMMARY = "summary"

@dataclass
class Alert:
    """Alert data structure"""
    alert_id: str
    title: str
    message: str
    level: AlertLevel
    source: str
    timestamp: datetime
    resolved: bool = False
    resolved_at: Optional[datetime] = None
    metadata: Dict[str, Any] = None

@dataclass
class Metric:
    """Metric data structure"""
    name: str
    value: float
    labels: Dict[str, str]
    timestamp: datetime
    metric_type: MetricType

class SystemMonitor:
    """Monitor system resources and performance"""
    
    def __init__(self):
        self.cpu_threshold = 80.0
        self.memory_threshold = 85.0
        self.disk_threshold = 90.0
        self.network_threshold = 1000  # MB/s
        
        # Prometheus metrics
        self.cpu_usage = Gauge('system_cpu_usage_percent', 'CPU usage percentage')
        self.memory_usage = Gauge('system_memory_usage_percent', 'Memory usage percentage')
        self.disk_usage = Gauge('system_disk_usage_percent', 'Disk usage percentage')
        self.network_io = Gauge('system_network_io_bytes', 'Network I/O bytes', ['direction'])
        self.load_average = Gauge('system_load_average', 'System load average', ['period'])
    
    async def collect_system_metrics(self) -> List[Metric]:
        """Collect system metrics"""
        metrics = []
        current_time = datetime.utcnow()
        
        # CPU usage
        cpu_percent = psutil.cpu_percent(interval=1)
        self.cpu_usage.set(cpu_percent)
        metrics.append(Metric(
            name="cpu_usage",
            value=cpu_percent,
            labels={"type": "percent"},
            timestamp=current_time,
            metric_type=MetricType.GAUGE
        ))
        
        # Memory usage
        memory = psutil.virtual_memory()
        memory_percent = memory.percent
        self.memory_usage.set(memory_percent)
        metrics.append(Metric(
            name="memory_usage",
            value=memory_percent,
            labels={"type": "percent"},
            timestamp=current_time,
            metric_type=MetricType.GAUGE
        ))
        
        # Disk usage
        disk = psutil.disk_usage('/')
        disk_percent = (disk.used / disk.total) * 100
        self.disk_usage.set(disk_percent)
        metrics.append(Metric(
            name="disk_usage",
            value=disk_percent,
            labels={"type": "percent"},
            timestamp=current_time,
            metric_type=MetricType.GAUGE
        ))
        
        # Network I/O
        network = psutil.net_io_counters()
        self.network_io.labels(direction='sent').set(network.bytes_sent)
        self.network_io.labels(direction='received').set(network.bytes_recv)
        metrics.append(Metric(
            name="network_sent",
            value=network.bytes_sent,
            labels={"direction": "sent"},
            timestamp=current_time,
            metric_type=MetricType.GAUGE
        ))
        metrics.append(Metric(
            name="network_received",
            value=network.bytes_recv,
            labels={"direction": "received"},
            timestamp=current_time,
            metric_type=MetricType.GAUGE
        ))
        
        # Load average
        load_avg = psutil.getloadavg()
        for i, load in enumerate(load_avg):
            period = ['1m', '5m', '15m'][i]
            self.load_average.labels(period=period).set(load)
            metrics.append(Metric(
                name="load_average",
                value=load,
                labels={"period": period},
                timestamp=current_time,
                metric_type=MetricType.GAUGE
            ))
        
        return metrics
    
    async def check_system_alerts(self) -> List[Alert]:
        """Check for system alerts"""
        alerts = []
        current_time = datetime.utcnow()
        
        # CPU alert
        cpu_percent = psutil.cpu_percent(interval=1)
        if cpu_percent > self.cpu_threshold:
            alerts.append(Alert(
                alert_id=f"cpu_high_{int(time.time())}",
                title="High CPU Usage",
                message=f"CPU usage is {cpu_percent:.1f}% (threshold: {self.cpu_threshold}%)",
                level=AlertLevel.WARNING,
                source="system_monitor",
                timestamp=current_time,
                metadata={"cpu_percent": cpu_percent, "threshold": self.cpu_threshold}
            ))
        
        # Memory alert
        memory = psutil.virtual_memory()
        if memory.percent > self.memory_threshold:
            alerts.append(Alert(
                alert_id=f"memory_high_{int(time.time())}",
                title="High Memory Usage",
                message=f"Memory usage is {memory.percent:.1f}% (threshold: {self.memory_threshold}%)",
                level=AlertLevel.WARNING,
                source="system_monitor",
                timestamp=current_time,
                metadata={"memory_percent": memory.percent, "threshold": self.memory_threshold}
            ))
        
        # Disk alert
        disk = psutil.disk_usage('/')
        disk_percent = (disk.used / disk.total) * 100
        if disk_percent > self.disk_threshold:
            alerts.append(Alert(
                alert_id=f"disk_high_{int(time.time())}",
                title="High Disk Usage",
                message=f"Disk usage is {disk_percent:.1f}% (threshold: {self.disk_threshold}%)",
                level=AlertLevel.ERROR,
                source="system_monitor",
                timestamp=current_time,
                metadata={"disk_percent": disk_percent, "threshold": self.disk_threshold}
            ))
        
        return alerts

class ApplicationMonitor:
    """Monitor application-specific metrics"""
    
    def __init__(self, redis_client: aioredis.Redis):
        self.redis = redis_client
        
        # Prometheus metrics
        self.request_count = Counter('http_requests_total', 'Total HTTP requests', ['method', 'endpoint', 'status'])
        self.request_duration = Histogram('http_request_duration_seconds', 'HTTP request duration', ['method', 'endpoint'])
        self.active_connections = Gauge('websocket_connections_active', 'Active WebSocket connections')
        self.cache_hits = Counter('cache_hits_total', 'Total cache hits', ['cache_type'])
        self.cache_misses = Counter('cache_misses_total', 'Total cache misses', ['cache_type'])
        self.database_connections = Gauge('database_connections_active', 'Active database connections')
        self.queue_size = Gauge('queue_size', 'Queue size', ['queue_name'])
    
    async def collect_application_metrics(self) -> List[Metric]:
        """Collect application metrics"""
        metrics = []
        current_time = datetime.utcnow()
        
        try:
            # Redis metrics
            redis_info = await self.redis.info()
            
            # Connected clients
            connected_clients = int(redis_info.get('connected_clients', 0))
            metrics.append(Metric(
                name="redis_connected_clients",
                value=connected_clients,
                labels={"type": "clients"},
                timestamp=current_time,
                metric_type=MetricType.GAUGE
            ))
            
            # Memory usage
            used_memory = int(redis_info.get('used_memory', 0))
            metrics.append(Metric(
                name="redis_memory_usage",
                value=used_memory,
                labels={"type": "bytes"},
                timestamp=current_time,
                metric_type=MetricType.GAUGE
            ))
            
            # Key count
            db_size = int(redis_info.get('db0', {}).get('keys', 0))
            metrics.append(Metric(
                name="redis_keys",
                value=db_size,
                labels={"database": "db0"},
                timestamp=current_time,
                metric_type=MetricType.GAUGE
            ))
            
        except Exception as e:
            logger.error(f"Error collecting Redis metrics: {e}")
        
        return metrics
    
    async def check_application_alerts(self) -> List[Alert]:
        """Check for application alerts"""
        alerts = []
        current_time = datetime.utcnow()
        
        try:
            # Check Redis connection
            await self.redis.ping()
        except Exception as e:
            alerts.append(Alert(
                alert_id=f"redis_down_{int(time.time())}",
                title="Redis Connection Failed",
                message=f"Redis is not responding: {str(e)}",
                level=AlertLevel.CRITICAL,
                source="application_monitor",
                timestamp=current_time,
                metadata={"error": str(e)}
            ))
        
        try:
            # Check Redis memory usage
            redis_info = await self.redis.info()
            used_memory = int(redis_info.get('used_memory', 0))
            max_memory = int(redis_info.get('maxmemory', 0))
            
            if max_memory > 0:
                memory_percent = (used_memory / max_memory) * 100
                if memory_percent > 90:
                    alerts.append(Alert(
                        alert_id=f"redis_memory_high_{int(time.time())}",
                        title="High Redis Memory Usage",
                        message=f"Redis memory usage is {memory_percent:.1f}%",
                        level=AlertLevel.WARNING,
                        source="application_monitor",
                        timestamp=current_time,
                        metadata={"memory_percent": memory_percent}
                    ))
        except Exception as e:
            logger.error(f"Error checking Redis memory: {e}")
        
        return alerts

class AlertManager:
    """Manage alerts and notifications"""
    
    def __init__(self, redis_client: aioredis.Redis):
        self.redis = redis_client
        self.alert_rules = {}
        self.notification_channels = []
        self.alert_history = []
    
    def add_alert_rule(
        self,
        name: str,
        condition: Callable,
        level: AlertLevel,
        cooldown: int = 300
    ):
        """Add alert rule"""
        self.alert_rules[name] = {
            "condition": condition,
            "level": level,
            "cooldown": cooldown,
            "last_triggered": None
        }
    
    async def process_alert(self, alert: Alert) -> bool:
        """Process and send alert"""
        # Check if alert is in cooldown
        alert_key = f"alert_cooldown:{alert.alert_id}"
        if await self.redis.exists(alert_key):
            return False
        
        # Store alert
        await self.redis.lpush("alerts", json.dumps(asdict(alert)))
        await self.redis.ltrim("alerts", 0, 999)  # Keep last 1000 alerts
        
        # Set cooldown
        await self.redis.setex(alert_key, 300, "1")  # 5 minute cooldown
        
        # Send notifications
        await self._send_notifications(alert)
        
        # Log alert
        logger.warning(f"Alert triggered: {alert.title} - {alert.message}")
        
        return True
    
    async def _send_notifications(self, alert: Alert):
        """Send alert notifications"""
        for channel in self.notification_channels:
            try:
                await channel.send(alert)
            except Exception as e:
                logger.error(f"Error sending notification via {channel.__class__.__name__}: {e}")
    
    def add_notification_channel(self, channel):
        """Add notification channel"""
        self.notification_channels.append(channel)
    
    async def get_active_alerts(self) -> List[Alert]:
        """Get active alerts"""
        alerts_data = await self.redis.lrange("alerts", 0, -1)
        alerts = []
        
        for alert_data in alerts_data:
            try:
                alert_dict = json.loads(alert_data)
                alert = Alert(**alert_dict)
                if not alert.resolved:
                    alerts.append(alert)
            except Exception as e:
                logger.error(f"Error parsing alert: {e}")
        
        return alerts
    
    async def resolve_alert(self, alert_id: str) -> bool:
        """Resolve alert"""
        alerts_data = await self.redis.lrange("alerts", 0, -1)
        
        for i, alert_data in enumerate(alerts_data):
            try:
                alert_dict = json.loads(alert_data)
                if alert_dict["alert_id"] == alert_id:
                    alert_dict["resolved"] = True
                    alert_dict["resolved_at"] = datetime.utcnow().isoformat()
                    
                    await self.redis.lset("alerts", i, json.dumps(alert_dict))
                    return True
            except Exception as e:
                logger.error(f"Error resolving alert: {e}")
        
        return False

class EmailNotificationChannel:
    """Email notification channel"""
    
    def __init__(
        self,
        smtp_server: str,
        smtp_port: int,
        username: str,
        password: str,
        from_email: str,
        to_emails: List[str]
    ):
        self.smtp_server = smtp_server
        self.smtp_port = smtp_port
        self.username = username
        self.password = password
        self.from_email = from_email
        self.to_emails = to_emails
    
    async def send(self, alert: Alert):
        """Send email notification"""
        try:
            msg = MIMEMultipart()
            msg['From'] = self.from_email
            msg['To'] = ", ".join(self.to_emails)
            msg['Subject'] = f"[{alert.level.value.upper()}] {alert.title}"
            
            body = f"""
            Alert: {alert.title}
            Level: {alert.level.value.upper()}
            Source: {alert.source}
            Time: {alert.timestamp.isoformat()}
            
            Message:
            {alert.message}
            
            Metadata:
            {json.dumps(alert.metadata, indent=2) if alert.metadata else 'None'}
            """
            
            msg.attach(MIMEText(body, 'plain'))
            
            with smtplib.SMTP(self.smtp_server, self.smtp_port) as server:
                server.starttls()
                server.login(self.username, self.password)
                server.send_message(msg)
            
            logger.info(f"Email notification sent for alert: {alert.alert_id}")
            
        except Exception as e:
            logger.error(f"Error sending email notification: {e}")

class SlackNotificationChannel:
    """Slack notification channel"""
    
    def __init__(self, webhook_url: str, channel: str = "#alerts"):
        self.webhook_url = webhook_url
        self.channel = channel
    
    async def send(self, alert: Alert):
        """Send Slack notification"""
        try:
            color_map = {
                AlertLevel.INFO: "good",
                AlertLevel.WARNING: "warning",
                AlertLevel.ERROR: "danger",
                AlertLevel.CRITICAL: "danger"
            }
            
            payload = {
                "channel": self.channel,
                "attachments": [{
                    "color": color_map.get(alert.level, "good"),
                    "title": alert.title,
                    "text": alert.message,
                    "fields": [
                        {"title": "Level", "value": alert.level.value.upper(), "short": True},
                        {"title": "Source", "value": alert.source, "short": True},
                        {"title": "Time", "value": alert.timestamp.isoformat(), "short": False}
                    ],
                    "footer": "Soladia Monitoring",
                    "ts": int(alert.timestamp.timestamp())
                }]
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.post(self.webhook_url, json=payload) as response:
                    if response.status == 200:
                        logger.info(f"Slack notification sent for alert: {alert.alert_id}")
                    else:
                        logger.error(f"Slack notification failed: {response.status}")
        
        except Exception as e:
            logger.error(f"Error sending Slack notification: {e}")

class MonitoringService:
    """Main monitoring service"""
    
    def __init__(self, redis_client: aioredis.Redis):
        self.redis = redis_client
        self.system_monitor = SystemMonitor()
        self.app_monitor = ApplicationMonitor(redis_client)
        self.alert_manager = AlertManager(redis_client)
        self.monitoring_task = None
        self.is_running = False
    
    async def start(self, prometheus_port: int = 8000):
        """Start monitoring service"""
        # Start Prometheus metrics server
        start_http_server(prometheus_port)
        logger.info(f"Prometheus metrics server started on port {prometheus_port}")
        
        # Start monitoring task
        self.is_running = True
        self.monitoring_task = asyncio.create_task(self._monitoring_loop())
        logger.info("Monitoring service started")
    
    async def stop(self):
        """Stop monitoring service"""
        self.is_running = False
        if self.monitoring_task:
            self.monitoring_task.cancel()
            try:
                await self.monitoring_task
            except asyncio.CancelledError:
                pass
        logger.info("Monitoring service stopped")
    
    async def _monitoring_loop(self):
        """Main monitoring loop"""
        while self.is_running:
            try:
                # Collect system metrics
                system_metrics = await self.system_monitor.collect_system_metrics()
                await self._store_metrics(system_metrics)
                
                # Collect application metrics
                app_metrics = await self.app_monitor.collect_application_metrics()
                await self._store_metrics(app_metrics)
                
                # Check for alerts
                system_alerts = await self.system_monitor.check_system_alerts()
                for alert in system_alerts:
                    await self.alert_manager.process_alert(alert)
                
                app_alerts = await self.app_monitor.check_application_alerts()
                for alert in app_alerts:
                    await self.alert_manager.process_alert(alert)
                
                # Wait before next check
                await asyncio.sleep(30)  # Check every 30 seconds
                
            except Exception as e:
                logger.error(f"Error in monitoring loop: {e}")
                await asyncio.sleep(60)  # Wait longer on error
    
    async def _store_metrics(self, metrics: List[Metric]):
        """Store metrics in Redis"""
        for metric in metrics:
            metric_key = f"metric:{metric.name}:{int(metric.timestamp.timestamp())}"
            await self.redis.setex(
                metric_key,
                3600,  # Keep for 1 hour
                json.dumps({
                    "name": metric.name,
                    "value": metric.value,
                    "labels": metric.labels,
                    "timestamp": metric.timestamp.isoformat(),
                    "type": metric.metric_type.value
                })
            )
    
    def add_notification_channel(self, channel):
        """Add notification channel"""
        self.alert_manager.add_notification_channel(channel)
    
    async def get_metrics_summary(self) -> Dict[str, Any]:
        """Get metrics summary"""
        # Get recent metrics
        metric_keys = await self.redis.keys("metric:*")
        metrics = []
        
        for key in metric_keys[-100:]:  # Last 100 metrics
            try:
                metric_data = await self.redis.get(key)
                if metric_data:
                    metrics.append(json.loads(metric_data))
            except Exception as e:
                logger.error(f"Error loading metric {key}: {e}")
        
        # Get active alerts
        active_alerts = await self.alert_manager.get_active_alerts()
        
        return {
            "metrics_count": len(metrics),
            "active_alerts": len(active_alerts),
            "recent_metrics": metrics[-20:],  # Last 20 metrics
            "active_alerts_list": [asdict(alert) for alert in active_alerts]
        }

# Global monitoring service
monitoring_service = None

async def initialize_monitoring(redis_client: aioredis.Redis, prometheus_port: int = 8000):
    """Initialize global monitoring service"""
    global monitoring_service
    monitoring_service = MonitoringService(redis_client)
    await monitoring_service.start(prometheus_port)
    return monitoring_service
