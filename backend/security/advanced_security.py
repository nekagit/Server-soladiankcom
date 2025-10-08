"""
Advanced Security System for Soladia Marketplace
Enterprise-grade security, compliance, and threat detection
"""

from typing import Optional, Dict, Any, List, Tuple
from datetime import datetime, timedelta
from enum import Enum
import uuid
import hashlib
import secrets
import hmac
import base64
import json
import ipaddress
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, JSON, ForeignKey, BigInteger
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from fastapi import HTTPException, Depends, Request, Response
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, Field, validator
import jwt
import bcrypt
import redis
import asyncio
from collections import defaultdict
import re

Base = declarative_base()

class SecurityLevel(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class ThreatType(str, Enum):
    BRUTE_FORCE = "brute_force"
    SQL_INJECTION = "sql_injection"
    XSS = "xss"
    CSRF = "csrf"
    DDoS = "ddos"
    SUSPICIOUS_ACTIVITY = "suspicious_activity"
    UNAUTHORIZED_ACCESS = "unauthorized_access"
    DATA_BREACH = "data_breach"
    MALWARE = "malware"
    PHISHING = "phishing"

class SecurityEvent(Base):
    __tablename__ = "security_events"
    
    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(String(36), unique=True, index=True, nullable=False)
    tenant_id = Column(String(36), ForeignKey("tenants.tenant_id"), nullable=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    # Event details
    event_type = Column(String(50), nullable=False)
    threat_type = Column(String(50), nullable=True)
    severity = Column(String(20), default=SecurityLevel.MEDIUM)
    description = Column(Text, nullable=False)
    
    # Request details
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(Text, nullable=True)
    request_path = Column(String(500), nullable=True)
    request_method = Column(String(10), nullable=True)
    request_headers = Column(JSON, nullable=True)
    request_body = Column(Text, nullable=True)
    
    # Response details
    response_status = Column(Integer, nullable=True)
    response_time = Column(Integer, nullable=True)  # milliseconds
    
    # Additional data
    metadata = Column(JSON, default=dict)
    tags = Column(JSON, default=list)
    
    # Status
    is_resolved = Column(Boolean, default=False)
    resolved_at = Column(DateTime, nullable=True)
    resolved_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    resolution_notes = Column(Text, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class SecurityRule(Base):
    __tablename__ = "security_rules"
    
    id = Column(Integer, primary_key=True, index=True)
    rule_id = Column(String(36), unique=True, index=True, nullable=False)
    tenant_id = Column(String(36), ForeignKey("tenants.tenant_id"), nullable=True)
    
    # Rule details
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    rule_type = Column(String(50), nullable=False)
    threat_type = Column(String(50), nullable=True)
    severity = Column(String(20), default=SecurityLevel.MEDIUM)
    
    # Rule configuration
    conditions = Column(JSON, nullable=False)
    actions = Column(JSON, nullable=False)
    is_active = Column(Boolean, default=True)
    is_global = Column(Boolean, default=False)
    
    # Rate limiting
    rate_limit = Column(Integer, nullable=True)  # requests per minute
    rate_window = Column(Integer, default=60)  # seconds
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)

class SecurityPolicy(Base):
    __tablename__ = "security_policies"
    
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(String(36), ForeignKey("tenants.tenant_id"), nullable=False)
    
    # Password policy
    min_password_length = Column(Integer, default=8)
    require_uppercase = Column(Boolean, default=True)
    require_lowercase = Column(Boolean, default=True)
    require_numbers = Column(Boolean, default=True)
    require_special_chars = Column(Boolean, default=True)
    password_history_count = Column(Integer, default=5)
    password_expiry_days = Column(Integer, default=90)
    
    # Session policy
    session_timeout_minutes = Column(Integer, default=30)
    max_concurrent_sessions = Column(Integer, default=5)
    require_2fa = Column(Boolean, default=False)
    
    # API security
    api_rate_limit = Column(Integer, default=1000)  # requests per hour
    api_key_rotation_days = Column(Integer, default=30)
    require_https = Column(Boolean, default=True)
    
    # Data protection
    encrypt_sensitive_data = Column(Boolean, default=True)
    data_retention_days = Column(Integer, default=365)
    audit_log_retention_days = Column(Integer, default=2555)  # 7 years
    
    # Compliance
    gdpr_compliant = Column(Boolean, default=True)
    ccpa_compliant = Column(Boolean, default=True)
    sox_compliant = Column(Boolean, default=False)
    hipaa_compliant = Column(Boolean, default=False)
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class SecurityAudit(Base):
    __tablename__ = "security_audits"
    
    id = Column(Integer, primary_key=True, index=True)
    audit_id = Column(String(36), unique=True, index=True, nullable=False)
    tenant_id = Column(String(36), ForeignKey("tenants.tenant_id"), nullable=False)
    
    # Audit details
    audit_type = Column(String(50), nullable=False)
    status = Column(String(20), default="pending")
    started_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)
    
    # Results
    total_checks = Column(Integer, default=0)
    passed_checks = Column(Integer, default=0)
    failed_checks = Column(Integer, default=0)
    warnings = Column(Integer, default=0)
    
    # Report
    report_data = Column(JSON, nullable=True)
    recommendations = Column(JSON, default=list)
    
    # Metadata
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

# Pydantic models
class SecurityEventCreate(BaseModel):
    event_type: str = Field(..., max_length=50)
    threat_type: Optional[ThreatType] = None
    severity: SecurityLevel = SecurityLevel.MEDIUM
    description: str = Field(..., min_length=1)
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    request_path: Optional[str] = None
    request_method: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)
    tags: List[str] = Field(default_factory=list)

class SecurityRuleCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    rule_type: str = Field(..., max_length=50)
    threat_type: Optional[ThreatType] = None
    severity: SecurityLevel = SecurityLevel.MEDIUM
    conditions: Dict[str, Any] = Field(..., min_items=1)
    actions: Dict[str, Any] = Field(..., min_items=1)
    is_global: bool = False
    rate_limit: Optional[int] = Field(None, ge=1)
    rate_window: int = Field(60, ge=1, le=3600)

class SecurityPolicyUpdate(BaseModel):
    min_password_length: Optional[int] = Field(None, ge=6, le=128)
    require_uppercase: Optional[bool] = None
    require_lowercase: Optional[bool] = None
    require_numbers: Optional[bool] = None
    require_special_chars: Optional[bool] = None
    password_history_count: Optional[int] = Field(None, ge=0, le=20)
    password_expiry_days: Optional[int] = Field(None, ge=1, le=365)
    session_timeout_minutes: Optional[int] = Field(None, ge=5, le=1440)
    max_concurrent_sessions: Optional[int] = Field(None, ge=1, le=50)
    require_2fa: Optional[bool] = None
    api_rate_limit: Optional[int] = Field(None, ge=1)
    api_key_rotation_days: Optional[int] = Field(None, ge=1, le=365)
    require_https: Optional[bool] = None
    encrypt_sensitive_data: Optional[bool] = None
    data_retention_days: Optional[int] = Field(None, ge=1, le=3650)
    audit_log_retention_days: Optional[int] = Field(None, ge=30, le=3650)
    gdpr_compliant: Optional[bool] = None
    ccpa_compliant: Optional[bool] = None
    sox_compliant: Optional[bool] = None
    hipaa_compliant: Optional[bool] = None

class SecurityAuditResponse(BaseModel):
    id: int
    audit_id: str
    tenant_id: str
    audit_type: str
    status: str
    started_at: datetime
    completed_at: Optional[datetime]
    total_checks: int
    passed_checks: int
    failed_checks: int
    warnings: int
    recommendations: List[str]
    created_at: datetime

class AdvancedSecurityService:
    def __init__(self, db_session, redis_client):
        self.db = db_session
        self.redis = redis_client
        self.rate_limiters = defaultdict(lambda: defaultdict(list))
        self.threat_detectors = {
            "sql_injection": self._detect_sql_injection,
            "xss": self._detect_xss,
            "brute_force": self._detect_brute_force,
            "ddos": self._detect_ddos,
            "suspicious_activity": self._detect_suspicious_activity
        }
    
    async def log_security_event(self, event_data: SecurityEventCreate, request: Request, tenant_id: Optional[str] = None) -> str:
        """Log a security event"""
        event_id = str(uuid.uuid4())
        
        # Extract request details
        ip_address = self._get_client_ip(request)
        user_agent = request.headers.get("user-agent")
        request_path = str(request.url.path)
        request_method = request.method
        request_headers = dict(request.headers)
        
        # Create security event
        event = SecurityEvent(
            event_id=event_id,
            tenant_id=tenant_id,
            event_type=event_data.event_type,
            threat_type=event_data.threat_type,
            severity=event_data.severity,
            description=event_data.description,
            ip_address=ip_address,
            user_agent=user_agent,
            request_path=request_path,
            request_method=request_method,
            request_headers=request_headers,
            metadata=event_data.metadata,
            tags=event_data.tags
        )
        
        self.db.add(event)
        self.db.commit()
        
        # Check for threats
        await self._analyze_threat(event)
        
        # Cache for rate limiting
        await self._update_rate_limiter(ip_address, event_id)
        
        return event_id
    
    async def create_security_rule(self, tenant_id: str, rule_data: SecurityRuleCreate, created_by: int) -> str:
        """Create a security rule"""
        rule_id = str(uuid.uuid4())
        
        rule = SecurityRule(
            rule_id=rule_id,
            tenant_id=tenant_id if not rule_data.is_global else None,
            name=rule_data.name,
            description=rule_data.description,
            rule_type=rule_data.rule_type,
            threat_type=rule_data.threat_type,
            severity=rule_data.severity,
            conditions=rule_data.conditions,
            actions=rule_data.actions,
            is_global=rule_data.is_global,
            rate_limit=rule_data.rate_limit,
            rate_window=rule_data.rate_window,
            created_by=created_by
        )
        
        self.db.add(rule)
        self.db.commit()
        
        return rule_id
    
    async def get_security_policy(self, tenant_id: str) -> Optional[SecurityPolicy]:
        """Get security policy for tenant"""
        return self.db.query(SecurityPolicy).filter(SecurityPolicy.tenant_id == tenant_id).first()
    
    async def update_security_policy(self, tenant_id: str, policy_data: SecurityPolicyUpdate) -> SecurityPolicy:
        """Update security policy"""
        policy = await self.get_security_policy(tenant_id)
        
        if not policy:
            # Create new policy
            policy = SecurityPolicy(tenant_id=tenant_id)
            self.db.add(policy)
        
        # Update fields
        for field, value in policy_data.dict(exclude_unset=True).items():
            setattr(policy, field, value)
        
        policy.updated_at = datetime.utcnow()
        
        self.db.commit()
        self.db.refresh(policy)
        
        return policy
    
    async def validate_password(self, password: str, tenant_id: str) -> Tuple[bool, List[str]]:
        """Validate password against security policy"""
        policy = await self.get_security_policy(tenant_id)
        if not policy:
            return True, []  # No policy, allow any password
        
        errors = []
        
        if len(password) < policy.min_password_length:
            errors.append(f"Password must be at least {policy.min_password_length} characters long")
        
        if policy.require_uppercase and not re.search(r'[A-Z]', password):
            errors.append("Password must contain at least one uppercase letter")
        
        if policy.require_lowercase and not re.search(r'[a-z]', password):
            errors.append("Password must contain at least one lowercase letter")
        
        if policy.require_numbers and not re.search(r'\d', password):
            errors.append("Password must contain at least one number")
        
        if policy.require_special_chars and not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
            errors.append("Password must contain at least one special character")
        
        return len(errors) == 0, errors
    
    async def check_rate_limit(self, identifier: str, limit: int, window: int = 60) -> bool:
        """Check if rate limit is exceeded"""
        now = datetime.utcnow()
        cutoff = now - timedelta(seconds=window)
        
        # Get recent requests
        recent_requests = await self.redis.lrange(f"rate_limit:{identifier}", 0, -1)
        
        # Filter out old requests
        valid_requests = []
        for req_time_str in recent_requests:
            req_time = datetime.fromisoformat(req_time_str.decode())
            if req_time > cutoff:
                valid_requests.append(req_time)
        
        # Check if limit exceeded
        if len(valid_requests) >= limit:
            return False
        
        # Add current request
        await self.redis.lpush(f"rate_limit:{identifier}", now.isoformat())
        await self.redis.expire(f"rate_limit:{identifier}", window)
        
        return True
    
    async def detect_threats(self, request: Request, tenant_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """Detect security threats in request"""
        threats = []
        
        # Get request data
        request_data = {
            "path": str(request.url.path),
            "query": str(request.url.query),
            "headers": dict(request.headers),
            "method": request.method
        }
        
        # Check each threat detector
        for threat_type, detector in self.threat_detectors.items():
            if await detector(request_data):
                threats.append({
                    "threat_type": threat_type,
                    "severity": self._get_threat_severity(threat_type),
                    "description": f"Detected {threat_type} threat",
                    "metadata": {"detector": threat_type}
                })
        
        # Log threats
        for threat in threats:
            await self.log_security_event(
                SecurityEventCreate(
                    event_type="threat_detected",
                    threat_type=threat["threat_type"],
                    severity=threat["severity"],
                    description=threat["description"],
                    metadata=threat["metadata"]
                ),
                request,
                tenant_id
            )
        
        return threats
    
    async def run_security_audit(self, tenant_id: str, audit_type: str, created_by: int) -> str:
        """Run security audit"""
        audit_id = str(uuid.uuid4())
        
        audit = SecurityAudit(
            audit_id=audit_id,
            tenant_id=tenant_id,
            audit_type=audit_type,
            created_by=created_by
        )
        
        self.db.add(audit)
        self.db.commit()
        
        # Run audit in background
        asyncio.create_task(self._run_audit_checks(audit_id, tenant_id, audit_type))
        
        return audit_id
    
    async def get_security_dashboard(self, tenant_id: str) -> Dict[str, Any]:
        """Get security dashboard data"""
        # Get recent events
        recent_events = self.db.query(SecurityEvent).filter(
            SecurityEvent.tenant_id == tenant_id,
            SecurityEvent.created_at >= datetime.utcnow() - timedelta(days=7)
        ).order_by(SecurityEvent.created_at.desc()).limit(100).all()
        
        # Get threat statistics
        threat_stats = {}
        for event in recent_events:
            if event.threat_type:
                threat_stats[event.threat_type] = threat_stats.get(event.threat_type, 0) + 1
        
        # Get severity distribution
        severity_stats = {}
        for event in recent_events:
            severity_stats[event.severity] = severity_stats.get(event.severity, 0) + 1
        
        # Get top IP addresses
        ip_stats = {}
        for event in recent_events:
            if event.ip_address:
                ip_stats[event.ip_address] = ip_stats.get(event.ip_address, 0) + 1
        
        top_ips = sorted(ip_stats.items(), key=lambda x: x[1], reverse=True)[:10]
        
        return {
            "total_events": len(recent_events),
            "threat_stats": threat_stats,
            "severity_stats": severity_stats,
            "top_ips": top_ips,
            "recent_events": [
                {
                    "event_id": event.event_id,
                    "event_type": event.event_type,
                    "threat_type": event.threat_type,
                    "severity": event.severity,
                    "description": event.description,
                    "ip_address": event.ip_address,
                    "created_at": event.created_at
                }
                for event in recent_events[:20]
            ]
        }
    
    def _get_client_ip(self, request: Request) -> str:
        """Get client IP address"""
        # Check for forwarded headers
        forwarded_for = request.headers.get("x-forwarded-for")
        if forwarded_for:
            return forwarded_for.split(",")[0].strip()
        
        real_ip = request.headers.get("x-real-ip")
        if real_ip:
            return real_ip
        
        # Fallback to direct connection
        return request.client.host if request.client else "unknown"
    
    async def _analyze_threat(self, event: SecurityEvent):
        """Analyze security event for threats"""
        # Check against security rules
        rules = self.db.query(SecurityRule).filter(
            SecurityRule.is_active == True,
            (SecurityRule.tenant_id == event.tenant_id) | (SecurityRule.is_global == True)
        ).all()
        
        for rule in rules:
            if await self._evaluate_rule(rule, event):
                await self._execute_rule_actions(rule, event)
    
    async def _evaluate_rule(self, rule: SecurityRule, event: SecurityEvent) -> bool:
        """Evaluate if event matches rule conditions"""
        conditions = rule.conditions
        
        # Check event type
        if "event_type" in conditions and event.event_type != conditions["event_type"]:
            return False
        
        # Check threat type
        if "threat_type" in conditions and event.threat_type != conditions["threat_type"]:
            return False
        
        # Check severity
        if "severity" in conditions and event.severity != conditions["severity"]:
            return False
        
        # Check IP address patterns
        if "ip_patterns" in conditions:
            ip_matches = False
            for pattern in conditions["ip_patterns"]:
                if self._ip_matches_pattern(event.ip_address, pattern):
                    ip_matches = True
                    break
            if not ip_matches:
                return False
        
        # Check user agent patterns
        if "user_agent_patterns" in conditions:
            ua_matches = False
            for pattern in conditions["user_agent_patterns"]:
                if event.user_agent and re.search(pattern, event.user_agent, re.IGNORECASE):
                    ua_matches = True
                    break
            if not ua_matches:
                return False
        
        return True
    
    async def _execute_rule_actions(self, rule: SecurityRule, event: SecurityEvent):
        """Execute rule actions"""
        actions = rule.actions
        
        # Block IP
        if "block_ip" in actions and actions["block_ip"]:
            await self._block_ip(event.ip_address, rule.rate_window or 3600)
        
        # Send alert
        if "send_alert" in actions and actions["send_alert"]:
            await self._send_security_alert(rule, event)
        
        # Log additional event
        if "log_event" in actions and actions["log_event"]:
            await self.log_security_event(
                SecurityEventCreate(
                    event_type="rule_triggered",
                    severity=rule.severity,
                    description=f"Security rule '{rule.name}' triggered",
                    metadata={"rule_id": rule.rule_id, "original_event_id": event.event_id}
                ),
                None,
                event.tenant_id
            )
    
    def _ip_matches_pattern(self, ip: str, pattern: str) -> bool:
        """Check if IP matches pattern"""
        try:
            if "/" in pattern:  # CIDR notation
                return ipaddress.ip_address(ip) in ipaddress.ip_network(pattern)
            else:  # Exact match
                return ip == pattern
        except:
            return False
    
    async def _block_ip(self, ip: str, duration: int):
        """Block IP address"""
        await self.redis.setex(f"blocked_ip:{ip}", duration, "blocked")
    
    async def _send_security_alert(self, rule: SecurityRule, event: SecurityEvent):
        """Send security alert"""
        # Implementation would send email, Slack, etc.
        pass
    
    async def _detect_sql_injection(self, request_data: Dict[str, Any]) -> bool:
        """Detect SQL injection attempts"""
        sql_patterns = [
            r"union\s+select",
            r"drop\s+table",
            r"delete\s+from",
            r"insert\s+into",
            r"update\s+set",
            r"or\s+1\s*=\s*1",
            r"and\s+1\s*=\s*1",
            r"'\s*or\s*'",
            r"'\s*and\s*'",
            r"'\s*;\s*--",
            r"'\s*;\s*#",
            r"'\s*;\s*\/\*"
        ]
        
        search_text = f"{request_data['path']} {request_data['query']}"
        for pattern in sql_patterns:
            if re.search(pattern, search_text, re.IGNORECASE):
                return True
        
        return False
    
    async def _detect_xss(self, request_data: Dict[str, Any]) -> bool:
        """Detect XSS attempts"""
        xss_patterns = [
            r"<script[^>]*>",
            r"javascript:",
            r"on\w+\s*=",
            r"<iframe[^>]*>",
            r"<object[^>]*>",
            r"<embed[^>]*>",
            r"<link[^>]*>",
            r"<meta[^>]*>",
            r"<style[^>]*>",
            r"expression\s*\(",
            r"url\s*\(",
            r"@import"
        ]
        
        search_text = f"{request_data['path']} {request_data['query']}"
        for pattern in xss_patterns:
            if re.search(pattern, search_text, re.IGNORECASE):
                return True
        
        return False
    
    async def _detect_brute_force(self, request_data: Dict[str, Any]) -> bool:
        """Detect brute force attempts"""
        # This would check rate limits and failed login attempts
        # Implementation depends on specific requirements
        return False
    
    async def _detect_ddos(self, request_data: Dict[str, Any]) -> bool:
        """Detect DDoS attempts"""
        # This would check for high request volumes
        # Implementation depends on specific requirements
        return False
    
    async def _detect_suspicious_activity(self, request_data: Dict[str, Any]) -> bool:
        """Detect suspicious activity"""
        # Check for unusual patterns
        suspicious_patterns = [
            r"\.\.\/",  # Directory traversal
            r"\/etc\/passwd",  # System file access
            r"\/proc\/",  # Process access
            r"cmd\.exe",  # Command execution
            r"powershell",  # PowerShell execution
            r"wget\s+",  # File download
            r"curl\s+",  # File download
        ]
        
        search_text = f"{request_data['path']} {request_data['query']}"
        for pattern in suspicious_patterns:
            if re.search(pattern, search_text, re.IGNORECASE):
                return True
        
        return False
    
    def _get_threat_severity(self, threat_type: str) -> SecurityLevel:
        """Get severity level for threat type"""
        severity_map = {
            "sql_injection": SecurityLevel.HIGH,
            "xss": SecurityLevel.HIGH,
            "brute_force": SecurityLevel.MEDIUM,
            "ddos": SecurityLevel.CRITICAL,
            "suspicious_activity": SecurityLevel.MEDIUM
        }
        
        return severity_map.get(threat_type, SecurityLevel.MEDIUM)
    
    async def _update_rate_limiter(self, ip: str, event_id: str):
        """Update rate limiter for IP"""
        now = datetime.utcnow()
        await self.redis.lpush(f"rate_limit:{ip}", now.isoformat())
        await self.redis.expire(f"rate_limit:{ip}", 3600)  # 1 hour
    
    async def _run_audit_checks(self, audit_id: str, tenant_id: str, audit_type: str):
        """Run security audit checks"""
        # Implementation would run various security checks
        # This is a placeholder for the actual audit logic
        pass

# Dependency injection
def get_security_service(db_session = Depends(get_db), redis_client = Depends(get_redis)) -> AdvancedSecurityService:
    """Get advanced security service"""
    return AdvancedSecurityService(db_session, redis_client)