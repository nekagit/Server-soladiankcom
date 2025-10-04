"""
Advanced Security Service for Soladia Marketplace
Implements wallet validation, transaction verification, and fraud detection
"""

import hashlib
import hmac
import time
import json
import base64
from typing import Dict, Any, List, Optional, Tuple
from dataclasses import dataclass
from datetime import datetime, timezone, timedelta
import asyncio
import logging
from enum import Enum

from ..solana.rpc_client import SolanaRPCClient
from ..solana.config import SolanaConfig

logger = logging.getLogger(__name__)

class SecurityLevel(Enum):
    """Security level enumeration"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class RiskLevel(Enum):
    """Risk level enumeration"""
    SAFE = "safe"
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

@dataclass
class SecurityEvent:
    """Security event data structure"""
    event_id: str
    event_type: str
    user_id: str
    wallet_address: str
    risk_level: RiskLevel
    security_level: SecurityLevel
    description: str
    metadata: Dict[str, Any]
    timestamp: datetime
    resolved: bool = False

@dataclass
class WalletValidation:
    """Wallet validation result"""
    is_valid: bool
    risk_score: float
    risk_level: RiskLevel
    warnings: List[str]
    recommendations: List[str]
    validation_data: Dict[str, Any]

@dataclass
class TransactionVerification:
    """Transaction verification result"""
    is_verified: bool
    risk_score: float
    risk_level: RiskLevel
    verification_data: Dict[str, Any]
    warnings: List[str]
    recommendations: List[str]

class SecurityService:
    """Advanced security service for Soladia marketplace"""
    
    def __init__(self, config: SolanaConfig):
        self.config = config
        self.rpc_client = SolanaRPCClient(config)
        
        # Security thresholds
        self.risk_thresholds = {
            RiskLevel.SAFE: 0.0,
            RiskLevel.LOW: 0.2,
            RiskLevel.MEDIUM: 0.4,
            RiskLevel.HIGH: 0.7,
            RiskLevel.CRITICAL: 0.9
        }
        
        # Known malicious addresses (in production, this would be a database)
        self.malicious_addresses = set()
        
        # Suspicious patterns
        self.suspicious_patterns = [
            "wash_trading",
            "pump_and_dump",
            "front_running",
            "sandwich_attack",
            "mev_extraction"
        ]
        
        # Security events storage (in production, this would be a database)
        self.security_events: List[SecurityEvent] = []
    
    async def __aenter__(self):
        await self.rpc_client.connect()
        return self
        
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.rpc_client.close()
    
    # Wallet Validation
    async def validate_wallet(self, wallet_address: str, user_id: str = None) -> WalletValidation:
        """Comprehensive wallet validation"""
        try:
            warnings = []
            recommendations = []
            validation_data = {}
            risk_score = 0.0
            
            # Basic format validation
            if not self._is_valid_solana_address(wallet_address):
                return WalletValidation(
                    is_valid=False,
                    risk_score=1.0,
                    risk_level=RiskLevel.CRITICAL,
                    warnings=["Invalid Solana address format"],
                    recommendations=["Please provide a valid Solana wallet address"],
                    validation_data={}
                )
            
            # Check if address exists on blockchain
            account_response = await self.rpc_client.get_account_info(wallet_address)
            if account_response.error:
                warnings.append("Address not found on blockchain")
                risk_score += 0.1
            else:
                validation_data["exists_on_blockchain"] = True
                validation_data["account_info"] = account_response.result
            
            # Check for malicious addresses
            if wallet_address in self.malicious_addresses:
                warnings.append("Address flagged as malicious")
                risk_score += 0.8
            
            # Check transaction history
            tx_history = await self._analyze_transaction_history(wallet_address)
            validation_data["transaction_history"] = tx_history
            
            # Analyze transaction patterns
            pattern_analysis = await self._analyze_transaction_patterns(wallet_address)
            validation_data["pattern_analysis"] = pattern_analysis
            
            if pattern_analysis["suspicious_activity"]:
                warnings.append("Suspicious transaction patterns detected")
                risk_score += 0.3
            
            # Check wallet age
            wallet_age = await self._get_wallet_age(wallet_address)
            validation_data["wallet_age_days"] = wallet_age
            
            if wallet_age < 7:
                warnings.append("New wallet (less than 7 days old)")
                risk_score += 0.2
                recommendations.append("Consider using an established wallet for large transactions")
            
            # Check balance consistency
            balance_analysis = await self._analyze_balance_patterns(wallet_address)
            validation_data["balance_analysis"] = balance_analysis
            
            if balance_analysis["unusual_patterns"]:
                warnings.append("Unusual balance patterns detected")
                risk_score += 0.2
            
            # Determine risk level
            risk_level = self._calculate_risk_level(risk_score)
            
            # Generate recommendations
            if risk_score > 0.5:
                recommendations.append("Consider using a different wallet for this transaction")
            if risk_score > 0.7:
                recommendations.append("Contact support before proceeding")
            
            return WalletValidation(
                is_valid=risk_score < 0.8,
                risk_score=risk_score,
                risk_level=risk_level,
                warnings=warnings,
                recommendations=recommendations,
                validation_data=validation_data
            )
            
        except Exception as e:
            logger.error(f"Wallet validation failed: {str(e)}")
            return WalletValidation(
                is_valid=False,
                risk_score=1.0,
                risk_level=RiskLevel.CRITICAL,
                warnings=[f"Validation error: {str(e)}"],
                recommendations=["Please try again or contact support"],
                validation_data={}
            )
    
    # Transaction Verification
    async def verify_transaction(
        self, 
        transaction_signature: str, 
        expected_amount: int = None,
        expected_recipient: str = None,
        expected_sender: str = None
    ) -> TransactionVerification:
        """Comprehensive transaction verification"""
        try:
            warnings = []
            recommendations = []
            verification_data = {}
            risk_score = 0.0
            
            # Get transaction details
            tx_response = await self.rpc_client.get_transaction(transaction_signature)
            if tx_response.error or not tx_response.result:
                return TransactionVerification(
                    is_verified=False,
                    risk_score=1.0,
                    risk_level=RiskLevel.CRITICAL,
                    verification_data={},
                    warnings=["Transaction not found"],
                    recommendations=["Please provide a valid transaction signature"]
                )
            
            transaction = tx_response.result
            verification_data["transaction"] = transaction
            
            # Check transaction success
            if transaction.get("meta", {}).get("err"):
                warnings.append("Transaction failed")
                risk_score += 0.5
                verification_data["failed"] = True
            else:
                verification_data["successful"] = True
            
            # Verify amount if provided
            if expected_amount:
                actual_amount = self._extract_transaction_amount(transaction)
                if actual_amount != expected_amount:
                    warnings.append(f"Amount mismatch: expected {expected_amount}, got {actual_amount}")
                    risk_score += 0.3
                verification_data["amount_verified"] = actual_amount == expected_amount
            
            # Verify recipient if provided
            if expected_recipient:
                actual_recipient = self._extract_recipient(transaction)
                if actual_recipient != expected_recipient:
                    warnings.append(f"Recipient mismatch: expected {expected_recipient}, got {actual_recipient}")
                    risk_score += 0.4
                verification_data["recipient_verified"] = actual_recipient == expected_recipient
            
            # Verify sender if provided
            if expected_sender:
                actual_sender = self._extract_sender(transaction)
                if actual_sender != expected_sender:
                    warnings.append(f"Sender mismatch: expected {expected_sender}, got {actual_sender}")
                    risk_score += 0.4
                verification_data["sender_verified"] = actual_sender == expected_sender
            
            # Check for suspicious patterns
            suspicious_patterns = await self._detect_suspicious_patterns(transaction)
            if suspicious_patterns:
                warnings.append(f"Suspicious patterns detected: {', '.join(suspicious_patterns)}")
                risk_score += 0.4
            verification_data["suspicious_patterns"] = suspicious_patterns
            
            # Check transaction age
            tx_age = await self._get_transaction_age(transaction)
            verification_data["age_hours"] = tx_age
            
            if tx_age > 24:
                warnings.append("Transaction is older than 24 hours")
                risk_score += 0.1
            
            # Check confirmation status
            confirmation_status = transaction.get("confirmationStatus")
            verification_data["confirmation_status"] = confirmation_status
            
            if confirmation_status != "confirmed":
                warnings.append(f"Transaction not fully confirmed: {confirmation_status}")
                risk_score += 0.2
            
            # Determine risk level
            risk_level = self._calculate_risk_level(risk_score)
            
            # Generate recommendations
            if risk_score > 0.5:
                recommendations.append("Review transaction details carefully")
            if risk_score > 0.7:
                recommendations.append("Consider rejecting this transaction")
            
            return TransactionVerification(
                is_verified=risk_score < 0.6,
                risk_score=risk_score,
                risk_level=risk_level,
                verification_data=verification_data,
                warnings=warnings,
                recommendations=recommendations
            )
            
        except Exception as e:
            logger.error(f"Transaction verification failed: {str(e)}")
            return TransactionVerification(
                is_verified=False,
                risk_score=1.0,
                risk_level=RiskLevel.CRITICAL,
                verification_data={},
                warnings=[f"Verification error: {str(e)}"],
                recommendations=["Please try again or contact support"]
            )
    
    # Fraud Detection
    async def detect_fraud(
        self, 
        user_id: str, 
        transaction_data: Dict[str, Any],
        wallet_address: str = None
    ) -> Dict[str, Any]:
        """Advanced fraud detection"""
        try:
            fraud_indicators = []
            risk_score = 0.0
            
            # Check for duplicate transactions
            if await self._is_duplicate_transaction(transaction_data):
                fraud_indicators.append("duplicate_transaction")
                risk_score += 0.3
            
            # Check for unusual transaction patterns
            if await self._has_unusual_patterns(user_id, transaction_data):
                fraud_indicators.append("unusual_patterns")
                risk_score += 0.4
            
            # Check for velocity limits
            if await self._exceeds_velocity_limits(user_id, transaction_data):
                fraud_indicators.append("velocity_limit_exceeded")
                risk_score += 0.5
            
            # Check for geographic anomalies
            if await self._has_geographic_anomalies(user_id, transaction_data):
                fraud_indicators.append("geographic_anomaly")
                risk_score += 0.3
            
            # Check for device anomalies
            if await self._has_device_anomalies(user_id, transaction_data):
                fraud_indicators.append("device_anomaly")
                risk_score += 0.2
            
            # Check wallet reputation
            if wallet_address:
                wallet_validation = await self.validate_wallet(wallet_address, user_id)
                if wallet_validation.risk_score > 0.7:
                    fraud_indicators.append("suspicious_wallet")
                    risk_score += 0.4
            
            # Determine fraud probability
            fraud_probability = min(risk_score, 1.0)
            is_fraud = fraud_probability > 0.7
            
            # Log security event if fraud detected
            if is_fraud:
                await self._log_security_event(
                    event_type="fraud_detected",
                    user_id=user_id,
                    wallet_address=wallet_address,
                    risk_level=RiskLevel.HIGH if fraud_probability > 0.8 else RiskLevel.MEDIUM,
                    description=f"Fraud detected with probability {fraud_probability:.2f}",
                    metadata={
                        "fraud_indicators": fraud_indicators,
                        "transaction_data": transaction_data
                    }
                )
            
            return {
                "is_fraud": is_fraud,
                "fraud_probability": fraud_probability,
                "fraud_indicators": fraud_indicators,
                "risk_score": risk_score,
                "recommendations": self._generate_fraud_recommendations(fraud_indicators)
            }
            
        except Exception as e:
            logger.error(f"Fraud detection failed: {str(e)}")
            return {
                "is_fraud": False,
                "fraud_probability": 0.0,
                "fraud_indicators": [],
                "risk_score": 0.0,
                "recommendations": ["Fraud detection temporarily unavailable"]
            }
    
    # Security Event Management
    async def log_security_event(
        self,
        event_type: str,
        user_id: str,
        wallet_address: str,
        risk_level: RiskLevel,
        description: str,
        metadata: Dict[str, Any] = None
    ) -> str:
        """Log a security event"""
        return await self._log_security_event(
            event_type=event_type,
            user_id=user_id,
            wallet_address=wallet_address,
            risk_level=risk_level,
            description=description,
            metadata=metadata or {}
        )
    
    async def get_security_events(
        self, 
        user_id: str = None,
        risk_level: RiskLevel = None,
        limit: int = 100
    ) -> List[SecurityEvent]:
        """Get security events with filters"""
        events = self.security_events
        
        if user_id:
            events = [e for e in events if e.user_id == user_id]
        
        if risk_level:
            events = [e for e in events if e.risk_level == risk_level]
        
        return events[-limit:]
    
    # Utility Functions
    def _is_valid_solana_address(self, address: str) -> bool:
        """Validate Solana address format"""
        if not address or len(address) < 32 or len(address) > 44:
            return False
        
        # Basic base58 validation
        try:
            base58_chars = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"
            return all(c in base58_chars for c in address)
        except:
            return False
    
    async def _analyze_transaction_history(self, wallet_address: str) -> Dict[str, Any]:
        """Analyze wallet transaction history"""
        # In a real implementation, this would analyze actual transaction history
        return {
            "total_transactions": 150,
            "successful_transactions": 145,
            "failed_transactions": 5,
            "average_transaction_value": 2.5,
            "last_transaction_days_ago": 2
        }
    
    async def _analyze_transaction_patterns(self, wallet_address: str) -> Dict[str, Any]:
        """Analyze transaction patterns for suspicious activity"""
        # In a real implementation, this would analyze actual patterns
        return {
            "suspicious_activity": False,
            "wash_trading_detected": False,
            "pump_and_dump_detected": False,
            "mev_activity": False,
            "pattern_confidence": 0.85
        }
    
    async def _get_wallet_age(self, wallet_address: str) -> int:
        """Get wallet age in days"""
        # In a real implementation, this would check the first transaction
        return 30  # Mock: 30 days old
    
    async def _analyze_balance_patterns(self, wallet_address: str) -> Dict[str, Any]:
        """Analyze wallet balance patterns"""
        # In a real implementation, this would analyze balance history
        return {
            "unusual_patterns": False,
            "balance_volatility": 0.2,
            "average_balance": 5.0,
            "max_balance": 10.0,
            "min_balance": 0.1
        }
    
    def _calculate_risk_level(self, risk_score: float) -> RiskLevel:
        """Calculate risk level from score"""
        for level, threshold in reversed(list(self.risk_thresholds.items())):
            if risk_score >= threshold:
                return level
        return RiskLevel.SAFE
    
    def _extract_transaction_amount(self, transaction: Dict[str, Any]) -> int:
        """Extract transaction amount from transaction data"""
        # In a real implementation, this would parse the actual transaction
        return 1000000000  # Mock: 1 SOL in lamports
    
    def _extract_recipient(self, transaction: Dict[str, Any]) -> str:
        """Extract recipient from transaction data"""
        # In a real implementation, this would parse the actual transaction
        return "RecipientAddress123"
    
    def _extract_sender(self, transaction: Dict[str, Any]) -> str:
        """Extract sender from transaction data"""
        # In a real implementation, this would parse the actual transaction
        return "SenderAddress456"
    
    async def _detect_suspicious_patterns(self, transaction: Dict[str, Any]) -> List[str]:
        """Detect suspicious patterns in transaction"""
        patterns = []
        
        # In a real implementation, this would analyze the actual transaction
        # For now, return mock patterns
        if "high_fee" in str(transaction):
            patterns.append("high_fee")
        
        return patterns
    
    async def _get_transaction_age(self, transaction: Dict[str, Any]) -> float:
        """Get transaction age in hours"""
        block_time = transaction.get("blockTime")
        if block_time:
            tx_time = datetime.fromtimestamp(block_time, tz=timezone.utc)
            now = datetime.now(timezone.utc)
            return (now - tx_time).total_seconds() / 3600
        return 0.0
    
    async def _is_duplicate_transaction(self, transaction_data: Dict[str, Any]) -> bool:
        """Check if transaction is a duplicate"""
        # In a real implementation, this would check against a database
        return False
    
    async def _has_unusual_patterns(self, user_id: str, transaction_data: Dict[str, Any]) -> bool:
        """Check for unusual transaction patterns"""
        # In a real implementation, this would analyze user's transaction history
        return False
    
    async def _exceeds_velocity_limits(self, user_id: str, transaction_data: Dict[str, Any]) -> bool:
        """Check if transaction exceeds velocity limits"""
        # In a real implementation, this would check against rate limits
        return False
    
    async def _has_geographic_anomalies(self, user_id: str, transaction_data: Dict[str, Any]) -> bool:
        """Check for geographic anomalies"""
        # In a real implementation, this would check IP geolocation
        return False
    
    async def _has_device_anomalies(self, user_id: str, transaction_data: Dict[str, Any]) -> bool:
        """Check for device anomalies"""
        # In a real implementation, this would check device fingerprinting
        return False
    
    def _generate_fraud_recommendations(self, fraud_indicators: List[str]) -> List[str]:
        """Generate fraud prevention recommendations"""
        recommendations = []
        
        if "duplicate_transaction" in fraud_indicators:
            recommendations.append("Check for duplicate transactions")
        
        if "unusual_patterns" in fraud_indicators:
            recommendations.append("Review transaction patterns")
        
        if "velocity_limit_exceeded" in fraud_indicators:
            recommendations.append("Implement rate limiting")
        
        if "geographic_anomaly" in fraud_indicators:
            recommendations.append("Verify user location")
        
        if "device_anomaly" in fraud_indicators:
            recommendations.append("Verify device information")
        
        if "suspicious_wallet" in fraud_indicators:
            recommendations.append("Verify wallet reputation")
        
        return recommendations
    
    async def _log_security_event(
        self,
        event_type: str,
        user_id: str,
        wallet_address: str,
        risk_level: RiskLevel,
        description: str,
        metadata: Dict[str, Any]
    ) -> str:
        """Internal method to log security events"""
        event_id = f"sec_{int(time.time())}_{hashlib.md5(f'{user_id}{event_type}'.encode()).hexdigest()[:8]}"
        
        event = SecurityEvent(
            event_id=event_id,
            event_type=event_type,
            user_id=user_id,
            wallet_address=wallet_address,
            risk_level=risk_level,
            security_level=SecurityLevel.HIGH if risk_level in [RiskLevel.HIGH, RiskLevel.CRITICAL] else SecurityLevel.MEDIUM,
            description=description,
            metadata=metadata,
            timestamp=datetime.now(timezone.utc)
        )
        
        self.security_events.append(event)
        
        # In a real implementation, this would also send alerts, notifications, etc.
        if risk_level in [RiskLevel.HIGH, RiskLevel.CRITICAL]:
            logger.warning(f"High-risk security event: {event_id} - {description}")
        
        return event_id
