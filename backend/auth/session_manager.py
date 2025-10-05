"""
Secure Session Management for Soladia
Advanced session management with security features and monitoring
"""

import asyncio
import logging
import secrets
import hashlib
import hmac
from typing import Dict, Optional, Any, List, Set
from datetime import datetime, timedelta
from enum import Enum
import json
import uuid
from dataclasses import dataclass, asdict
import redis
from fastapi import Request, Response, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from cryptography.fernet import Fernet
import ipaddress
import user_agents

logger = logging.getLogger(__name__)

class SessionStatus(Enum):
    ACTIVE = "active"
    EXPIRED = "expired"
    REVOKED = "revoked"
    SUSPENDED = "suspended"
    COMPROMISED = "compromised"

class SessionType(Enum):
    WEB = "web"
    MOBILE = "mobile"
    API = "api"
    ADMIN = "admin"

@dataclass
class SessionData:
    """Session data structure"""
    session_id: str
    user_id: str
    session_type: SessionType
    status: SessionStatus
    created_at: datetime
    last_activity: datetime
    expires_at: datetime
    ip_address: str
    user_agent: str
    device_fingerprint: str
    is_secure: bool
    is_http_only: bool
    same_site: str
    metadata: Dict[str, Any]

@dataclass
class SecurityEvent:
    """Security event data structure"""
    event_id: str
    session_id: str
    user_id: str
    event_type: str
    severity: str
    description: str
    ip_address: str
    user_agent: str
    timestamp: datetime
    metadata: Dict[str, Any]

class SecureSessionManager:
    """Secure session management system"""
    
    def __init__(
        self,
        secret_key: str,
        redis_client: Optional[redis.Redis] = None,
        session_timeout: int = 3600,  # 1 hour
        max_sessions_per_user: int = 5,
        enable_security_monitoring: bool = True
    ):
        self.secret_key = secret_key
        self.redis_client = redis_client
        self.session_timeout = session_timeout
        self.max_sessions_per_user = max_sessions_per_user
        self.enable_security_monitoring = enable_security_monitoring
        
        # Security settings
        self.encryption_key = Fernet.generate_key()
        self.cipher = Fernet(self.encryption_key)
        
        # Session storage
        self.active_sessions: Dict[str, SessionData] = {}
        self.user_sessions: Dict[str, Set[str]] = {}
        self.security_events: List[SecurityEvent] = []
        
        # Security monitoring
        self.failed_login_attempts: Dict[str, List[datetime]] = {}
        self.suspicious_ips: Set[str] = set()
        self.blocked_ips: Set[str] = set()
        
        # Rate limiting
        self.session_creation_rate: Dict[str, List[datetime]] = {}
        
        # Initialize security features
        self._setup_security_features()
    
    def _setup_security_features(self):
        """Setup security features and monitoring"""
        try:
            # Start background security monitoring
            if self.enable_security_monitoring:
                asyncio.create_task(self._security_monitor())
                asyncio.create_task(self._cleanup_expired_sessions())
                asyncio.create_task(self._monitor_suspicious_activity())
            
            logger.info("Security features initialized")
            
        except Exception as e:
            logger.error(f"Failed to setup security features: {e}")
    
    async def create_session(
        self,
        user_id: str,
        request: Request,
        session_type: SessionType = SessionType.WEB,
        remember_me: bool = False
    ) -> SessionData:
        """Create a new secure session"""
        try:
            # Check rate limiting
            if await self._is_rate_limited(request.client.host):
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail="Rate limit exceeded"
                )
            
            # Check for suspicious activity
            if await self._is_suspicious_activity(request):
                await self._log_security_event(
                    session_id="",
                    user_id=user_id,
                    event_type="suspicious_activity",
                    severity="high",
                    description="Suspicious activity detected during session creation",
                    request=request
                )
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Suspicious activity detected"
                )
            
            # Check session limit per user
            if await self._exceeds_session_limit(user_id):
                await self._revoke_oldest_sessions(user_id)
            
            # Generate session ID
            session_id = self._generate_session_id()
            
            # Calculate expiration time
            if remember_me:
                expires_at = datetime.now() + timedelta(days=30)
            else:
                expires_at = datetime.now() + timedelta(seconds=self.session_timeout)
            
            # Create session data
            session_data = SessionData(
                session_id=session_id,
                user_id=user_id,
                session_type=session_type,
                status=SessionStatus.ACTIVE,
                created_at=datetime.now(),
                last_activity=datetime.now(),
                expires_at=expires_at,
                ip_address=request.client.host,
                user_agent=request.headers.get("user-agent", ""),
                device_fingerprint=self._generate_device_fingerprint(request),
                is_secure=request.url.scheme == "https",
                is_http_only=True,
                same_site="strict",
                metadata={}
            )
            
            # Store session
            await self._store_session(session_data)
            
            # Update user sessions
            if user_id not in self.user_sessions:
                self.user_sessions[user_id] = set()
            self.user_sessions[user_id].add(session_id)
            
            # Log session creation
            await self._log_security_event(
                session_id=session_id,
                user_id=user_id,
                event_type="session_created",
                severity="info",
                description="New session created",
                request=request
            )
            
            logger.info(f"Session created for user {user_id}: {session_id}")
            return session_data
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Failed to create session: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Session creation failed"
            )
    
    async def validate_session(self, session_id: str, request: Request) -> Optional[SessionData]:
        """Validate and refresh session"""
        try:
            # Get session data
            session_data = await self._get_session(session_id)
            if not session_data:
                return None
            
            # Check if session is expired
            if datetime.now() > session_data.expires_at:
                await self._expire_session(session_id)
                return None
            
            # Check if session is revoked
            if session_data.status != SessionStatus.ACTIVE:
                return None
            
            # Check for security violations
            if await self._has_security_violation(session_data, request):
                await self._revoke_session(session_id, "Security violation detected")
                return None
            
            # Update last activity
            session_data.last_activity = datetime.now()
            await self._store_session(session_data)
            
            return session_data
            
        except Exception as e:
            logger.error(f"Session validation failed: {e}")
            return None
    
    async def revoke_session(self, session_id: str, reason: str = "Manual revocation"):
        """Revoke a session"""
        try:
            session_data = await self._get_session(session_id)
            if session_data:
                await self._revoke_session(session_id, reason)
                logger.info(f"Session revoked: {session_id} - {reason}")
            
        except Exception as e:
            logger.error(f"Failed to revoke session: {e}")
    
    async def revoke_user_sessions(self, user_id: str, reason: str = "User logout"):
        """Revoke all sessions for a user"""
        try:
            if user_id in self.user_sessions:
                for session_id in list(self.user_sessions[user_id]):
                    await self._revoke_session(session_id, reason)
                
                self.user_sessions[user_id].clear()
                logger.info(f"All sessions revoked for user {user_id}")
            
        except Exception as e:
            logger.error(f"Failed to revoke user sessions: {e}")
    
    async def refresh_session(self, session_id: str) -> Optional[SessionData]:
        """Refresh session expiration time"""
        try:
            session_data = await self._get_session(session_id)
            if not session_data or session_data.status != SessionStatus.ACTIVE:
                return None
            
            # Update expiration time
            session_data.expires_at = datetime.now() + timedelta(seconds=self.session_timeout)
            session_data.last_activity = datetime.now()
            
            await self._store_session(session_data)
            return session_data
            
        except Exception as e:
            logger.error(f"Failed to refresh session: {e}")
            return None
    
    async def get_user_sessions(self, user_id: str) -> List[SessionData]:
        """Get all active sessions for a user"""
        try:
            sessions = []
            if user_id in self.user_sessions:
                for session_id in self.user_sessions[user_id]:
                    session_data = await self._get_session(session_id)
                    if session_data and session_data.status == SessionStatus.ACTIVE:
                        sessions.append(session_data)
            
            return sessions
            
        except Exception as e:
            logger.error(f"Failed to get user sessions: {e}")
            return []
    
    async def _generate_session_id(self) -> str:
        """Generate a secure session ID"""
        return secrets.token_urlsafe(32)
    
    async def _generate_device_fingerprint(self, request: Request) -> str:
        """Generate device fingerprint for security"""
        try:
            # Collect fingerprint data
            user_agent = request.headers.get("user-agent", "")
            accept_language = request.headers.get("accept-language", "")
            accept_encoding = request.headers.get("accept-encoding", "")
            
            # Create fingerprint
            fingerprint_data = f"{user_agent}:{accept_language}:{accept_encoding}"
            fingerprint = hashlib.sha256(fingerprint_data.encode()).hexdigest()
            
            return fingerprint
            
        except Exception as e:
            logger.error(f"Failed to generate device fingerprint: {e}")
            return ""
    
    async def _store_session(self, session_data: SessionData):
        """Store session data"""
        try:
            # Store in memory
            self.active_sessions[session_data.session_id] = session_data
            
            # Store in Redis if available
            if self.redis_client:
                session_json = json.dumps(asdict(session_data), default=str)
                await self.redis_client.setex(
                    f"session:{session_data.session_id}",
                    self.session_timeout,
                    session_json
                )
            
        except Exception as e:
            logger.error(f"Failed to store session: {e}")
    
    async def _get_session(self, session_id: str) -> Optional[SessionData]:
        """Get session data"""
        try:
            # Check memory first
            if session_id in self.active_sessions:
                return self.active_sessions[session_id]
            
            # Check Redis if available
            if self.redis_client:
                session_json = await self.redis_client.get(f"session:{session_id}")
                if session_json:
                    session_data = SessionData(**json.loads(session_json))
                    self.active_sessions[session_id] = session_data
                    return session_data
            
            return None
            
        except Exception as e:
            logger.error(f"Failed to get session: {e}")
            return None
    
    async def _expire_session(self, session_id: str):
        """Expire a session"""
        try:
            if session_id in self.active_sessions:
                session_data = self.active_sessions[session_id]
                session_data.status = SessionStatus.EXPIRED
                
                # Remove from user sessions
                if session_data.user_id in self.user_sessions:
                    self.user_sessions[session_data.user_id].discard(session_id)
                
                # Remove from active sessions
                del self.active_sessions[session_id]
                
                # Remove from Redis
                if self.redis_client:
                    await self.redis_client.delete(f"session:{session_id}")
            
        except Exception as e:
            logger.error(f"Failed to expire session: {e}")
    
    async def _revoke_session(self, session_id: str, reason: str):
        """Revoke a session"""
        try:
            if session_id in self.active_sessions:
                session_data = self.active_sessions[session_id]
                session_data.status = SessionStatus.REVOKED
                
                # Remove from user sessions
                if session_data.user_id in self.user_sessions:
                    self.user_sessions[session_data.user_id].discard(session_id)
                
                # Remove from active sessions
                del self.active_sessions[session_id]
                
                # Remove from Redis
                if self.redis_client:
                    await self.redis_client.delete(f"session:{session_id}")
                
                # Log revocation
                await self._log_security_event(
                    session_id=session_id,
                    user_id=session_data.user_id,
                    event_type="session_revoked",
                    severity="info",
                    description=f"Session revoked: {reason}",
                    ip_address=session_data.ip_address,
                    user_agent=session_data.user_agent
                )
            
        except Exception as e:
            logger.error(f"Failed to revoke session: {e}")
    
    async def _is_rate_limited(self, ip_address: str) -> bool:
        """Check if IP is rate limited"""
        try:
            current_time = datetime.now()
            cutoff_time = current_time - timedelta(minutes=5)
            
            # Clean old attempts
            if ip_address in self.session_creation_rate:
                self.session_creation_rate[ip_address] = [
                    attempt for attempt in self.session_creation_rate[ip_address]
                    if attempt > cutoff_time
                ]
            else:
                self.session_creation_rate[ip_address] = []
            
            # Check rate limit (max 10 sessions per 5 minutes)
            if len(self.session_creation_rate[ip_address]) >= 10:
                return True
            
            # Add current attempt
            self.session_creation_rate[ip_address].append(current_time)
            return False
            
        except Exception as e:
            logger.error(f"Rate limit check failed: {e}")
            return False
    
    async def _is_suspicious_activity(self, request: Request) -> bool:
        """Check for suspicious activity"""
        try:
            ip_address = request.client.host
            
            # Check if IP is blocked
            if ip_address in self.blocked_ips:
                return True
            
            # Check if IP is suspicious
            if ip_address in self.suspicious_ips:
                return True
            
            # Check for failed login attempts
            if ip_address in self.failed_login_attempts:
                recent_attempts = [
                    attempt for attempt in self.failed_login_attempts[ip_address]
                    if datetime.now() - attempt < timedelta(minutes=15)
                ]
                if len(recent_attempts) >= 5:
                    return True
            
            return False
            
        except Exception as e:
            logger.error(f"Suspicious activity check failed: {e}")
            return False
    
    async def _exceeds_session_limit(self, user_id: str) -> bool:
        """Check if user exceeds session limit"""
        try:
            if user_id in self.user_sessions:
                active_sessions = 0
                for session_id in self.user_sessions[user_id]:
                    session_data = await self._get_session(session_id)
                    if session_data and session_data.status == SessionStatus.ACTIVE:
                        active_sessions += 1
                
                return active_sessions >= self.max_sessions_per_user
            
            return False
            
        except Exception as e:
            logger.error(f"Session limit check failed: {e}")
            return False
    
    async def _revoke_oldest_sessions(self, user_id: str):
        """Revoke oldest sessions for a user"""
        try:
            if user_id not in self.user_sessions:
                return
            
            # Get active sessions with timestamps
            active_sessions = []
            for session_id in self.user_sessions[user_id]:
                session_data = await self._get_session(session_id)
                if session_data and session_data.status == SessionStatus.ACTIVE:
                    active_sessions.append((session_id, session_data.last_activity))
            
            # Sort by last activity (oldest first)
            active_sessions.sort(key=lambda x: x[1])
            
            # Revoke oldest sessions
            sessions_to_revoke = len(active_sessions) - self.max_sessions_per_user + 1
            for i in range(sessions_to_revoke):
                session_id, _ = active_sessions[i]
                await self._revoke_session(session_id, "Session limit exceeded")
            
        except Exception as e:
            logger.error(f"Failed to revoke oldest sessions: {e}")
    
    async def _has_security_violation(self, session_data: SessionData, request: Request) -> bool:
        """Check for security violations"""
        try:
            # Check IP address change
            if session_data.ip_address != request.client.host:
                await self._log_security_event(
                    session_id=session_data.session_id,
                    user_id=session_data.user_id,
                    event_type="ip_address_change",
                    severity="medium",
                    description="IP address changed during session",
                    request=request
                )
                return True
            
            # Check device fingerprint change
            current_fingerprint = self._generate_device_fingerprint(request)
            if session_data.device_fingerprint != current_fingerprint:
                await self._log_security_event(
                    session_id=session_data.session_id,
                    user_id=session_data.user_id,
                    event_type="device_fingerprint_change",
                    severity="medium",
                    description="Device fingerprint changed during session",
                    request=request
                )
                return True
            
            return False
            
        except Exception as e:
            logger.error(f"Security violation check failed: {e}")
            return False
    
    async def _log_security_event(
        self,
        session_id: str,
        user_id: str,
        event_type: str,
        severity: str,
        description: str,
        request: Optional[Request] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ):
        """Log a security event"""
        try:
            event = SecurityEvent(
                event_id=str(uuid.uuid4()),
                session_id=session_id,
                user_id=user_id,
                event_type=event_type,
                severity=severity,
                description=description,
                ip_address=ip_address or (request.client.host if request else ""),
                user_agent=user_agent or (request.headers.get("user-agent", "") if request else ""),
                timestamp=datetime.now(),
                metadata={}
            )
            
            self.security_events.append(event)
            
            # Log to file
            logger.warning(f"Security event: {event_type} - {description}")
            
            # Store in Redis if available
            if self.redis_client:
                event_json = json.dumps(asdict(event), default=str)
                await self.redis_client.lpush("security_events", event_json)
                await self.redis_client.ltrim("security_events", 0, 999)  # Keep last 1000 events
            
        except Exception as e:
            logger.error(f"Failed to log security event: {e}")
    
    async def _security_monitor(self):
        """Background security monitoring"""
        while True:
            try:
                # Monitor for suspicious patterns
                await self._detect_suspicious_patterns()
                
                # Clean up old data
                await self._cleanup_old_data()
                
                # Wait before next check
                await asyncio.sleep(300)  # 5 minutes
                
            except Exception as e:
                logger.error(f"Security monitoring error: {e}")
                await asyncio.sleep(300)
    
    async def _cleanup_expired_sessions(self):
        """Clean up expired sessions"""
        while True:
            try:
                current_time = datetime.now()
                expired_sessions = []
                
                for session_id, session_data in self.active_sessions.items():
                    if current_time > session_data.expires_at:
                        expired_sessions.append(session_id)
                
                for session_id in expired_sessions:
                    await self._expire_session(session_id)
                
                # Wait before next cleanup
                await asyncio.sleep(60)  # 1 minute
                
            except Exception as e:
                logger.error(f"Session cleanup error: {e}")
                await asyncio.sleep(60)
    
    async def _monitor_suspicious_activity(self):
        """Monitor for suspicious activity"""
        while True:
            try:
                # Analyze security events
                await self._analyze_security_events()
                
                # Update suspicious IPs
                await self._update_suspicious_ips()
                
                # Wait before next check
                await asyncio.sleep(600)  # 10 minutes
                
            except Exception as e:
                logger.error(f"Suspicious activity monitoring error: {e}")
                await asyncio.sleep(600)
    
    async def _detect_suspicious_patterns(self):
        """Detect suspicious patterns in security events"""
        try:
            # Analyze recent security events
            recent_events = [
                event for event in self.security_events
                if datetime.now() - event.timestamp < timedelta(hours=1)
            ]
            
            # Group by IP address
            ip_events = {}
            for event in recent_events:
                if event.ip_address not in ip_events:
                    ip_events[event.ip_address] = []
                ip_events[event.ip_address].append(event)
            
            # Check for suspicious patterns
            for ip_address, events in ip_events.items():
                if len(events) >= 10:  # More than 10 events in 1 hour
                    self.suspicious_ips.add(ip_address)
                    logger.warning(f"Suspicious IP detected: {ip_address}")
                
                # Check for multiple failed logins
                failed_logins = [e for e in events if e.event_type == "failed_login"]
                if len(failed_logins) >= 5:
                    self.blocked_ips.add(ip_address)
                    logger.warning(f"IP blocked due to multiple failed logins: {ip_address}")
            
        except Exception as e:
            logger.error(f"Failed to detect suspicious patterns: {e}")
    
    async def _analyze_security_events(self):
        """Analyze security events for patterns"""
        try:
            # This would implement more sophisticated analysis
            # For now, just log the analysis
            logger.info(f"Analyzing {len(self.security_events)} security events")
            
        except Exception as e:
            logger.error(f"Security event analysis failed: {e}")
    
    async def _update_suspicious_ips(self):
        """Update list of suspicious IPs"""
        try:
            # This would implement IP reputation checking
            # For now, just maintain the current list
            logger.info(f"Monitoring {len(self.suspicious_ips)} suspicious IPs")
            
        except Exception as e:
            logger.error(f"Failed to update suspicious IPs: {e}")
    
    async def _cleanup_old_data(self):
        """Clean up old data"""
        try:
            current_time = datetime.now()
            cutoff_time = current_time - timedelta(days=7)
            
            # Clean up old security events
            self.security_events = [
                event for event in self.security_events
                if event.timestamp > cutoff_time
            ]
            
            # Clean up old failed login attempts
            for ip_address in list(self.failed_login_attempts.keys()):
                self.failed_login_attempts[ip_address] = [
                    attempt for attempt in self.failed_login_attempts[ip_address]
                    if attempt > cutoff_time
                ]
                if not self.failed_login_attempts[ip_address]:
                    del self.failed_login_attempts[ip_address]
            
        except Exception as e:
            logger.error(f"Failed to cleanup old data: {e}")
    
    def get_session_statistics(self) -> Dict[str, Any]:
        """Get session statistics"""
        return {
            "active_sessions": len(self.active_sessions),
            "total_users": len(self.user_sessions),
            "security_events": len(self.security_events),
            "suspicious_ips": len(self.suspicious_ips),
            "blocked_ips": len(self.blocked_ips),
            "failed_login_attempts": len(self.failed_login_attempts)
        }
    
    def get_security_events(self, limit: int = 100) -> List[SecurityEvent]:
        """Get recent security events"""
        return self.security_events[-limit:]

# Global session manager instance
_session_manager: Optional[SecureSessionManager] = None

def get_session_manager() -> Optional[SecureSessionManager]:
    """Get the global session manager instance"""
    return _session_manager

def initialize_session_manager(
    secret_key: str,
    redis_client: Optional[redis.Redis] = None,
    session_timeout: int = 3600,
    max_sessions_per_user: int = 5,
    enable_security_monitoring: bool = True
) -> SecureSessionManager:
    """Initialize the global session manager"""
    global _session_manager
    _session_manager = SecureSessionManager(
        secret_key=secret_key,
        redis_client=redis_client,
        session_timeout=session_timeout,
        max_sessions_per_user=max_sessions_per_user,
        enable_security_monitoring=enable_security_monitoring
    )
    return _session_manager
