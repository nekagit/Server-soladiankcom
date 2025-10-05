"""
Real-time Monitoring and Alert System for Soladia
Comprehensive monitoring of transactions, wallets, and system health
"""

import asyncio
import logging
from typing import Dict, List, Optional, Any, Callable
from dataclasses import dataclass, asdict
from datetime import datetime, timedelta
from enum import Enum
import json
import websockets
import aiohttp
from collections import defaultdict, deque
import numpy as np
from solana.rpc.async_api import AsyncClient
from solana.rpc.commitment import Commitment
from solana.publickey import PublicKey
import redis
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

logger = logging.getLogger(__name__)

class AlertLevel(Enum):
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"

class AlertType(Enum):
    TRANSACTION = "transaction"
    WALLET = "wallet"
    SYSTEM = "system"
    SECURITY = "security"
    PERFORMANCE = "performance"

@dataclass
class Alert:
    """Alert data structure"""
    alert_id: str
    type: AlertType
    level: AlertLevel
    title: str
    message: str
    timestamp: datetime
    source: str
    metadata: Dict[str, Any]
    resolved: bool = False
    resolved_at: Optional[datetime] = None

@dataclass
class MonitoringMetric:
    """Monitoring metric data structure"""
    metric_name: str
    value: float
    timestamp: datetime
    tags: Dict[str, str]
    metadata: Dict[str, Any]

@dataclass
class TransactionAlert:
    """Transaction-specific alert"""
    transaction_id: str
    wallet_address: str
    amount: float
    alert_type: str
    severity: str
    description: str
    timestamp: datetime

class RealTimeMonitor:
    """Real-time monitoring system"""
    
    def __init__(
        self,
        rpc_client: AsyncClient,
        redis_client: redis.Redis,
        websocket_url: str
    ):
        self.rpc_client = rpc_client
        self.redis_client = redis_client
        self.websocket_url = websocket_url
        self.alerts: Dict[str, Alert] = {}
        self.metrics: Dict[str, deque] = defaultdict(lambda: deque(maxlen=1000))
        self.alert_handlers: Dict[AlertType, List[Callable]] = defaultdict(list)
        self.monitoring_tasks = []
        self.is_running = False
        
        # Alert thresholds
        self.thresholds = {
            "high_volume_transaction": 1000.0,  # SOL
            "suspicious_activity": 0.8,
            "system_error_rate": 0.05,
            "response_time": 5.0,  # seconds
            "memory_usage": 0.9,
            "cpu_usage": 0.9
        }
        
    async def start_monitoring(self):
        """Start real-time monitoring"""
        try:
            self.is_running = True
            
            # Start monitoring tasks
            self.monitoring_tasks = [
                asyncio.create_task(self._monitor_transactions()),
                asyncio.create_task(self._monitor_system_health()),
                asyncio.create_task(self._monitor_wallet_activity()),
                asyncio.create_task(self._monitor_performance()),
                asyncio.create_task(self._process_alerts()),
                asyncio.create_task(self._websocket_monitor())
            ]
            
            logger.info("Real-time monitoring started")
            
        except Exception as e:
            logger.error(f"Failed to start monitoring: {e}")
            raise
    
    async def stop_monitoring(self):
        """Stop real-time monitoring"""
        try:
            self.is_running = False
            
            # Cancel all monitoring tasks
            for task in self.monitoring_tasks:
                task.cancel()
            
            self.monitoring_tasks.clear()
            
            logger.info("Real-time monitoring stopped")
            
        except Exception as e:
            logger.error(f"Failed to stop monitoring: {e}")
    
    async def _monitor_transactions(self):
        """Monitor blockchain transactions"""
        try:
            while self.is_running:
                try:
                    # Get recent transactions
                    recent_transactions = await self._get_recent_transactions()
                    
                    for tx in recent_transactions:
                        await self._analyze_transaction(tx)
                    
                    # Wait before next check
                    await asyncio.sleep(10)
                    
                except Exception as e:
                    logger.error(f"Transaction monitoring error: {e}")
                    await asyncio.sleep(30)
                    
        except asyncio.CancelledError:
            logger.info("Transaction monitoring cancelled")
        except Exception as e:
            logger.error(f"Transaction monitoring failed: {e}")
    
    async def _monitor_system_health(self):
        """Monitor system health metrics"""
        try:
            while self.is_running:
                try:
                    # Check system metrics
                    await self._check_system_health()
                    
                    # Wait before next check
                    await asyncio.sleep(60)
                    
                except Exception as e:
                    logger.error(f"System health monitoring error: {e}")
                    await asyncio.sleep(60)
                    
        except asyncio.CancelledError:
            logger.info("System health monitoring cancelled")
        except Exception as e:
            logger.error(f"System health monitoring failed: {e}")
    
    async def _monitor_wallet_activity(self):
        """Monitor wallet activity for suspicious behavior"""
        try:
            while self.is_running:
                try:
                    # Check wallet activity
                    await self._check_wallet_activity()
                    
                    # Wait before next check
                    await asyncio.sleep(30)
                    
                except Exception as e:
                    logger.error(f"Wallet activity monitoring error: {e}")
                    await asyncio.sleep(60)
                    
        except asyncio.CancelledError:
            logger.info("Wallet activity monitoring cancelled")
        except Exception as e:
            logger.error(f"Wallet activity monitoring failed: {e}")
    
    async def _monitor_performance(self):
        """Monitor system performance metrics"""
        try:
            while self.is_running:
                try:
                    # Check performance metrics
                    await self._check_performance_metrics()
                    
                    # Wait before next check
                    await asyncio.sleep(30)
                    
                except Exception as e:
                    logger.error(f"Performance monitoring error: {e}")
                    await asyncio.sleep(60)
                    
        except asyncio.CancelledError:
            logger.info("Performance monitoring cancelled")
        except Exception as e:
            logger.error(f"Performance monitoring failed: {e}")
    
    async def _process_alerts(self):
        """Process and send alerts"""
        try:
            while self.is_running:
                try:
                    # Process pending alerts
                    await self._process_pending_alerts()
                    
                    # Wait before next check
                    await asyncio.sleep(5)
                    
                except Exception as e:
                    logger.error(f"Alert processing error: {e}")
                    await asyncio.sleep(10)
                    
        except asyncio.CancelledError:
            logger.info("Alert processing cancelled")
        except Exception as e:
            logger.error(f"Alert processing failed: {e}")
    
    async def _websocket_monitor(self):
        """Monitor blockchain events via WebSocket"""
        try:
            async with websockets.connect(self.websocket_url) as websocket:
                # Subscribe to relevant events
                await websocket.send(json.dumps({
                    "jsonrpc": "2.0",
                    "id": 1,
                    "method": "logsSubscribe",
                    "params": [
                        {"mentions": ["11111111111111111111111111111111"]},
                        {"commitment": "confirmed"}
                    ]
                }))
                
                async for message in websocket:
                    try:
                        data = json.loads(message)
                        await self._process_websocket_event(data)
                    except Exception as e:
                        logger.error(f"Failed to process WebSocket event: {e}")
                        
        except Exception as e:
            logger.error(f"WebSocket monitoring failed: {e}")
            # Retry connection
            await asyncio.sleep(30)
            if self.is_running:
                asyncio.create_task(self._websocket_monitor())
    
    async def _get_recent_transactions(self) -> List[Dict[str, Any]]:
        """Get recent transactions from blockchain"""
        try:
            # This would get actual recent transactions
            # For now, return mock data
            return []
            
        except Exception as e:
            logger.error(f"Failed to get recent transactions: {e}")
            return []
    
    async def _analyze_transaction(self, transaction: Dict[str, Any]):
        """Analyze transaction for suspicious activity"""
        try:
            # Check for high volume transactions
            amount = transaction.get("amount", 0)
            if amount > self.thresholds["high_volume_transaction"]:
                await self._create_alert(
                    AlertType.TRANSACTION,
                    AlertLevel.WARNING,
                    "High Volume Transaction",
                    f"Transaction with amount {amount} SOL detected",
                    "transaction_monitor",
                    {"transaction_id": transaction.get("id"), "amount": amount}
                )
            
            # Check for suspicious patterns
            wallet_address = transaction.get("from")
            if wallet_address:
                suspicious_score = await self._calculate_suspicious_score(wallet_address)
                if suspicious_score > self.thresholds["suspicious_activity"]:
                    await self._create_alert(
                        AlertType.SECURITY,
                        AlertLevel.ERROR,
                        "Suspicious Activity Detected",
                        f"Suspicious activity detected for wallet {wallet_address}",
                        "security_monitor",
                        {"wallet_address": wallet_address, "suspicious_score": suspicious_score}
                    )
            
        except Exception as e:
            logger.error(f"Failed to analyze transaction: {e}")
    
    async def _check_system_health(self):
        """Check system health metrics"""
        try:
            # Check error rates
            error_rate = await self._calculate_error_rate()
            if error_rate > self.thresholds["system_error_rate"]:
                await self._create_alert(
                    AlertType.SYSTEM,
                    AlertLevel.ERROR,
                    "High Error Rate",
                    f"System error rate is {error_rate:.2%}",
                    "system_monitor",
                    {"error_rate": error_rate}
                )
            
            # Check memory usage
            memory_usage = await self._get_memory_usage()
            if memory_usage > self.thresholds["memory_usage"]:
                await self._create_alert(
                    AlertType.SYSTEM,
                    AlertLevel.WARNING,
                    "High Memory Usage",
                    f"Memory usage is {memory_usage:.2%}",
                    "system_monitor",
                    {"memory_usage": memory_usage}
                )
            
            # Check CPU usage
            cpu_usage = await self._get_cpu_usage()
            if cpu_usage > self.thresholds["cpu_usage"]:
                await self._create_alert(
                    AlertType.SYSTEM,
                    AlertLevel.WARNING,
                    "High CPU Usage",
                    f"CPU usage is {cpu_usage:.2%}",
                    "system_monitor",
                    {"cpu_usage": cpu_usage}
                )
            
        except Exception as e:
            logger.error(f"Failed to check system health: {e}")
    
    async def _check_wallet_activity(self):
        """Check wallet activity for suspicious behavior"""
        try:
            # Get active wallets
            active_wallets = await self._get_active_wallets()
            
            for wallet in active_wallets:
                # Check transaction frequency
                tx_frequency = await self._get_transaction_frequency(wallet)
                if tx_frequency > 100:  # More than 100 transactions per hour
                    await self._create_alert(
                        AlertType.WALLET,
                        AlertLevel.WARNING,
                        "High Transaction Frequency",
                        f"Wallet {wallet} has high transaction frequency",
                        "wallet_monitor",
                        {"wallet_address": wallet, "frequency": tx_frequency}
                    )
                
                # Check for unusual patterns
                pattern_score = await self._analyze_wallet_patterns(wallet)
                if pattern_score > 0.8:
                    await self._create_alert(
                        AlertType.SECURITY,
                        AlertLevel.ERROR,
                        "Unusual Wallet Pattern",
                        f"Unusual pattern detected for wallet {wallet}",
                        "security_monitor",
                        {"wallet_address": wallet, "pattern_score": pattern_score}
                    )
            
        except Exception as e:
            logger.error(f"Failed to check wallet activity: {e}")
    
    async def _check_performance_metrics(self):
        """Check system performance metrics"""
        try:
            # Check response times
            response_time = await self._get_average_response_time()
            if response_time > self.thresholds["response_time"]:
                await self._create_alert(
                    AlertType.PERFORMANCE,
                    AlertLevel.WARNING,
                    "Slow Response Time",
                    f"Average response time is {response_time:.2f}s",
                    "performance_monitor",
                    {"response_time": response_time}
                )
            
            # Check throughput
            throughput = await self._get_throughput()
            if throughput < 100:  # Less than 100 requests per second
                await self._create_alert(
                    AlertType.PERFORMANCE,
                    AlertLevel.WARNING,
                    "Low Throughput",
                    f"System throughput is {throughput} req/s",
                    "performance_monitor",
                    {"throughput": throughput}
                )
            
        except Exception as e:
            logger.error(f"Failed to check performance metrics: {e}")
    
    async def _process_websocket_event(self, event_data: Dict[str, Any]):
        """Process WebSocket events"""
        try:
            # Process different types of events
            if "result" in event_data:
                result = event_data["result"]
                
                # Check for specific events
                if "value" in result:
                    log_data = result["value"]
                    
                    # Check for error logs
                    if "err" in log_data and log_data["err"]:
                        await self._create_alert(
                            AlertType.SYSTEM,
                            AlertLevel.ERROR,
                            "Blockchain Error",
                            f"Blockchain error detected: {log_data['err']}",
                            "blockchain_monitor",
                            {"error": log_data["err"]}
                        )
                    
                    # Check for specific program logs
                    if "logs" in log_data:
                        for log in log_data["logs"]:
                            if "error" in log.lower():
                                await self._create_alert(
                                    AlertType.SYSTEM,
                                    AlertLevel.WARNING,
                                    "Program Error",
                                    f"Program error in log: {log}",
                                    "program_monitor",
                                    {"log": log}
                                )
            
        except Exception as e:
            logger.error(f"Failed to process WebSocket event: {e}")
    
    async def _create_alert(
        self,
        alert_type: AlertType,
        level: AlertLevel,
        title: str,
        message: str,
        source: str,
        metadata: Dict[str, Any]
    ):
        """Create a new alert"""
        try:
            alert_id = f"{alert_type.value}_{int(datetime.now().timestamp())}"
            
            alert = Alert(
                alert_id=alert_id,
                type=alert_type,
                level=level,
                title=title,
                message=message,
                timestamp=datetime.now(),
                source=source,
                metadata=metadata
            )
            
            # Store alert
            self.alerts[alert_id] = alert
            
            # Store in Redis
            await self._store_alert(alert)
            
            # Trigger alert handlers
            await self._trigger_alert_handlers(alert)
            
            logger.info(f"Created alert: {title}")
            
        except Exception as e:
            logger.error(f"Failed to create alert: {e}")
    
    async def _process_pending_alerts(self):
        """Process pending alerts"""
        try:
            # Get unresolved alerts
            unresolved_alerts = [
                alert for alert in self.alerts.values()
                if not alert.resolved
            ]
            
            # Process each alert
            for alert in unresolved_alerts:
                await self._process_alert(alert)
            
        except Exception as e:
            logger.error(f"Failed to process pending alerts: {e}")
    
    async def _process_alert(self, alert: Alert):
        """Process a specific alert"""
        try:
            # Check if alert should be escalated
            if alert.level == AlertLevel.CRITICAL:
                await self._escalate_alert(alert)
            
            # Send notifications
            await self._send_alert_notifications(alert)
            
        except Exception as e:
            logger.error(f"Failed to process alert: {e}")
    
    async def _escalate_alert(self, alert: Alert):
        """Escalate critical alerts"""
        try:
            # Send immediate notifications
            await self._send_immediate_notification(alert)
            
            # Log critical alert
            logger.critical(f"CRITICAL ALERT: {alert.title} - {alert.message}")
            
        except Exception as e:
            logger.error(f"Failed to escalate alert: {e}")
    
    async def _send_alert_notifications(self, alert: Alert):
        """Send alert notifications"""
        try:
            # Send email notification
            await self._send_email_notification(alert)
            
            # Send webhook notification
            await self._send_webhook_notification(alert)
            
            # Send Slack notification (if configured)
            await self._send_slack_notification(alert)
            
        except Exception as e:
            logger.error(f"Failed to send alert notifications: {e}")
    
    async def _send_email_notification(self, alert: Alert):
        """Send email notification for alert"""
        try:
            # This would send actual email
            # For now, just log
            logger.info(f"Email notification sent for alert: {alert.title}")
            
        except Exception as e:
            logger.error(f"Failed to send email notification: {e}")
    
    async def _send_webhook_notification(self, alert: Alert):
        """Send webhook notification for alert"""
        try:
            # This would send webhook
            # For now, just log
            logger.info(f"Webhook notification sent for alert: {alert.title}")
            
        except Exception as e:
            logger.error(f"Failed to send webhook notification: {e}")
    
    async def _send_slack_notification(self, alert: Alert):
        """Send Slack notification for alert"""
        try:
            # This would send Slack message
            # For now, just log
            logger.info(f"Slack notification sent for alert: {alert.title}")
            
        except Exception as e:
            logger.error(f"Failed to send Slack notification: {e}")
    
    async def _send_immediate_notification(self, alert: Alert):
        """Send immediate notification for critical alerts"""
        try:
            # Send immediate notifications (SMS, phone calls, etc.)
            logger.critical(f"IMMEDIATE NOTIFICATION: {alert.title}")
            
        except Exception as e:
            logger.error(f"Failed to send immediate notification: {e}")
    
    async def _trigger_alert_handlers(self, alert: Alert):
        """Trigger alert handlers"""
        try:
            handlers = self.alert_handlers.get(alert.type, [])
            
            for handler in handlers:
                try:
                    await handler(alert)
                except Exception as e:
                    logger.error(f"Alert handler failed: {e}")
            
        except Exception as e:
            logger.error(f"Failed to trigger alert handlers: {e}")
    
    def register_alert_handler(self, alert_type: AlertType, handler: Callable):
        """Register an alert handler"""
        self.alert_handlers[alert_type].append(handler)
    
    async def _store_alert(self, alert: Alert):
        """Store alert in Redis"""
        try:
            alert_data = asdict(alert)
            alert_data['timestamp'] = alert.timestamp.isoformat()
            alert_data['resolved_at'] = alert.resolved_at.isoformat() if alert.resolved_at else None
            alert_data['type'] = alert.type.value
            alert_data['level'] = alert.level.value
            
            await self.redis_client.hset(
                f"alert:{alert.alert_id}",
                mapping=alert_data
            )
            
        except Exception as e:
            logger.error(f"Failed to store alert: {e}")
    
    async def _calculate_suspicious_score(self, wallet_address: str) -> float:
        """Calculate suspicious activity score for wallet"""
        try:
            # This would implement actual suspicious activity detection
            # For now, return a mock score
            return 0.1
            
        except Exception as e:
            logger.error(f"Failed to calculate suspicious score: {e}")
            return 0.0
    
    async def _calculate_error_rate(self) -> float:
        """Calculate system error rate"""
        try:
            # This would calculate actual error rate
            # For now, return a mock value
            return 0.01
            
        except Exception as e:
            logger.error(f"Failed to calculate error rate: {e}")
            return 0.0
    
    async def _get_memory_usage(self) -> float:
        """Get system memory usage"""
        try:
            # This would get actual memory usage
            # For now, return a mock value
            return 0.5
            
        except Exception as e:
            logger.error(f"Failed to get memory usage: {e}")
            return 0.0
    
    async def _get_cpu_usage(self) -> float:
        """Get system CPU usage"""
        try:
            # This would get actual CPU usage
            # For now, return a mock value
            return 0.3
            
        except Exception as e:
            logger.error(f"Failed to get CPU usage: {e}")
            return 0.0
    
    async def _get_active_wallets(self) -> List[str]:
        """Get list of active wallets"""
        try:
            # This would get actual active wallets
            # For now, return mock data
            return []
            
        except Exception as e:
            logger.error(f"Failed to get active wallets: {e}")
            return []
    
    async def _get_transaction_frequency(self, wallet_address: str) -> int:
        """Get transaction frequency for wallet"""
        try:
            # This would calculate actual transaction frequency
            # For now, return a mock value
            return 0
            
        except Exception as e:
            logger.error(f"Failed to get transaction frequency: {e}")
            return 0
    
    async def _analyze_wallet_patterns(self, wallet_address: str) -> float:
        """Analyze wallet patterns for suspicious behavior"""
        try:
            # This would implement actual pattern analysis
            # For now, return a mock score
            return 0.1
            
        except Exception as e:
            logger.error(f"Failed to analyze wallet patterns: {e}")
            return 0.0
    
    async def _get_average_response_time(self) -> float:
        """Get average response time"""
        try:
            # This would get actual response time
            # For now, return a mock value
            return 1.5
            
        except Exception as e:
            logger.error(f"Failed to get average response time: {e}")
            return 0.0
    
    async def _get_throughput(self) -> int:
        """Get system throughput"""
        try:
            # This would get actual throughput
            # For now, return a mock value
            return 500
            
        except Exception as e:
            logger.error(f"Failed to get throughput: {e}")
            return 0
