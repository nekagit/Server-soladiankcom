"""
Advanced security measures for Soladia
"""
import hashlib
import hmac
import secrets
import time
import re
from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime, timedelta
from dataclasses import dataclass
from enum import Enum
import jwt
from passlib.context import CryptContext
from passlib.hash import bcrypt, argon2
import ipaddress
import geoip2.database
import geoip2.errors
from fastapi import Request, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import logging

logger = logging.getLogger(__name__)

class SecurityLevel(Enum):
    """Security level enumeration"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class ThreatType(Enum):
    """Threat type enumeration"""
    BRUTE_FORCE = "brute_force"
    RATE_LIMIT = "rate_limit"
    SUSPICIOUS_IP = "suspicious_ip"
    SQL_INJECTION = "sql_injection"
    XSS = "xss"
    CSRF = "csrf"
    MALICIOUS_FILE = "malicious_file"
    UNUSUAL_ACTIVITY = "unusual_activity"

@dataclass
class SecurityEvent:
    """Security event data structure"""
    event_id: str
    threat_type: ThreatType
    security_level: SecurityLevel
    user_id: Optional[str]
    ip_address: str
    user_agent: str
    request_path: str
    timestamp: datetime
    details: Dict[str, Any]
    blocked: bool = False

class RateLimiter:
    """Advanced rate limiting with multiple strategies"""
    
    def __init__(self, redis_client):
        self.redis = redis_client
        self.limits = {
            "login": {"requests": 5, "window": 300},  # 5 attempts per 5 minutes
            "api": {"requests": 100, "window": 60},   # 100 requests per minute
            "upload": {"requests": 10, "window": 3600},  # 10 uploads per hour
            "password_reset": {"requests": 3, "window": 3600},  # 3 resets per hour
        }
    
    async def is_rate_limited(
        self,
        identifier: str,
        limit_type: str,
        custom_limits: Optional[Dict[str, int]] = None
    ) -> Tuple[bool, Dict[str, Any]]:
        """Check if request is rate limited"""
        limits = custom_limits or self.limits.get(limit_type, {"requests": 100, "window": 60})
        
        key = f"rate_limit:{limit_type}:{identifier}"
        current_time = int(time.time())
        window_start = current_time - limits["window"]
        
        try:
            # Get current count
            pipe = self.redis.pipeline()
            pipe.zremrangebyscore(key, 0, window_start)  # Remove old entries
            pipe.zcard(key)  # Count current entries
            pipe.zadd(key, {str(current_time): current_time})  # Add current request
            pipe.expire(key, limits["window"])  # Set expiration
            results = await pipe.execute()
            
            current_count = results[1]
            is_limited = current_count >= limits["requests"]
            
            return is_limited, {
                "current_count": current_count,
                "limit": limits["requests"],
                "window": limits["window"],
                "reset_time": current_time + limits["window"]
            }
        except Exception as e:
            logger.error(f"Rate limiting error: {e}")
            return False, {}

class IPReputationChecker:
    """Check IP reputation and geolocation"""
    
    def __init__(self, geoip_db_path: Optional[str] = None):
        self.geoip_db = None
        if geoip_db_path:
            try:
                self.geoip_db = geoip2.database.Reader(geoip_db_path)
            except Exception as e:
                logger.warning(f"Could not load GeoIP database: {e}")
        
        # Known malicious IP ranges (simplified)
        self.malicious_ranges = [
            "10.0.0.0/8",  # Private networks (for testing)
            "192.168.0.0/16",  # Private networks
        ]
        
        # Suspicious countries (example)
        self.suspicious_countries = ["XX"]  # Add country codes as needed
    
    def is_malicious_ip(self, ip_address: str) -> bool:
        """Check if IP is in malicious ranges"""
        try:
            ip = ipaddress.ip_address(ip_address)
            for range_str in self.malicious_ranges:
                if ip in ipaddress.ip_network(range_str):
                    return True
            return False
        except ValueError:
            return True  # Invalid IP
    
    def get_ip_info(self, ip_address: str) -> Dict[str, Any]:
        """Get IP geolocation and reputation info"""
        info = {
            "ip": ip_address,
            "country": None,
            "city": None,
            "is_malicious": self.is_malicious_ip(ip_address),
            "is_suspicious": False
        }
        
        if self.geoip_db:
            try:
                response = self.geoip_db.city(ip_address)
                info["country"] = response.country.iso_code
                info["city"] = response.city.name
                info["is_suspicious"] = response.country.iso_code in self.suspicious_countries
            except geoip2.errors.AddressNotFoundError:
                pass
            except Exception as e:
                logger.error(f"GeoIP lookup error: {e}")
        
        return info

class InputValidator:
    """Advanced input validation and sanitization"""
    
    def __init__(self):
        self.sql_patterns = [
            r"(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)",
            r"(\b(OR|AND)\s+\d+\s*=\s*\d+)",
            r"(\b(OR|AND)\s+'.*'\s*=\s*'.*')",
            r"(--|#|\/\*|\*\/)",
            r"(\b(UNION|UNION ALL)\b)",
        ]
        
        self.xss_patterns = [
            r"<script[^>]*>.*?</script>",
            r"javascript:",
            r"on\w+\s*=",
            r"<iframe[^>]*>.*?</iframe>",
            r"<object[^>]*>.*?</object>",
            r"<embed[^>]*>.*?</embed>",
        ]
        
        self.path_traversal_patterns = [
            r"\.\.",
            r"\/\.\.",
            r"\\\.\.",
            r"\.\.\/",
            r"\.\.\\",
        ]
    
    def validate_sql_injection(self, input_string: str) -> bool:
        """Check for SQL injection patterns"""
        input_lower = input_string.lower()
        for pattern in self.sql_patterns:
            if re.search(pattern, input_lower, re.IGNORECASE):
                return False
        return True
    
    def validate_xss(self, input_string: str) -> bool:
        """Check for XSS patterns"""
        for pattern in self.xss_patterns:
            if re.search(pattern, input_string, re.IGNORECASE):
                return False
        return True
    
    def validate_path_traversal(self, input_string: str) -> bool:
        """Check for path traversal patterns"""
        for pattern in self.path_traversal_patterns:
            if re.search(pattern, input_string):
                return False
        return True
    
    def sanitize_string(self, input_string: str) -> str:
        """Sanitize input string"""
        # Remove null bytes
        sanitized = input_string.replace('\x00', '')
        
        # Remove control characters except newlines and tabs
        sanitized = ''.join(char for char in sanitized if ord(char) >= 32 or char in '\n\t')
        
        # Limit length
        sanitized = sanitized[:1000]
        
        return sanitized.strip()
    
    def validate_email(self, email: str) -> bool:
        """Validate email format"""
        pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        return bool(re.match(pattern, email))
    
    def validate_password_strength(self, password: str) -> Dict[str, Any]:
        """Validate password strength"""
        score = 0
        feedback = []
        
        if len(password) >= 8:
            score += 1
        else:
            feedback.append("Password must be at least 8 characters long")
        
        if re.search(r'[a-z]', password):
            score += 1
        else:
            feedback.append("Password must contain lowercase letters")
        
        if re.search(r'[A-Z]', password):
            score += 1
        else:
            feedback.append("Password must contain uppercase letters")
        
        if re.search(r'\d', password):
            score += 1
        else:
            feedback.append("Password must contain numbers")
        
        if re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
            score += 1
        else:
            feedback.append("Password must contain special characters")
        
        strength_levels = {
            0: "Very Weak",
            1: "Weak", 
            2: "Fair",
            3: "Good",
            4: "Strong",
            5: "Very Strong"
        }
        
        return {
            "score": score,
            "strength": strength_levels.get(score, "Very Weak"),
            "is_strong": score >= 4,
            "feedback": feedback
        }

class SecurityMonitor:
    """Monitor and detect security threats"""
    
    def __init__(self, redis_client):
        self.redis = redis_client
        self.rate_limiter = RateLimiter(redis_client)
        self.ip_checker = IPReputationChecker()
        self.input_validator = InputValidator()
        self.security_events = []
        self.blocked_ips = set()
        self.suspicious_activities = {}
    
    async def analyze_request(
        self,
        request: Request,
        user_id: Optional[str] = None
    ) -> Tuple[bool, Optional[SecurityEvent]]:
        """Analyze request for security threats"""
        client_ip = request.client.host
        user_agent = request.headers.get("user-agent", "")
        path = request.url.path
        
        # Check if IP is blocked
        if client_ip in self.blocked_ips:
            return False, SecurityEvent(
                event_id=secrets.token_hex(8),
                threat_type=ThreatType.SUSPICIOUS_IP,
                security_level=SecurityLevel.HIGH,
                user_id=user_id,
                ip_address=client_ip,
                user_agent=user_agent,
                request_path=path,
                timestamp=datetime.utcnow(),
                details={"reason": "IP is blocked"},
                blocked=True
            )
        
        # Check IP reputation
        ip_info = self.ip_checker.get_ip_info(client_ip)
        if ip_info["is_malicious"]:
            self.blocked_ips.add(client_ip)
            return False, SecurityEvent(
                event_id=secrets.token_hex(8),
                threat_type=ThreatType.SUSPICIOUS_IP,
                security_level=SecurityLevel.CRITICAL,
                user_id=user_id,
                ip_address=client_ip,
                user_agent=user_agent,
                request_path=path,
                timestamp=datetime.utcnow(),
                details=ip_info,
                blocked=True
            )
        
        # Check rate limiting
        identifier = user_id or client_ip
        is_rate_limited, rate_info = await self.rate_limiter.is_rate_limited(
            identifier, "api"
        )
        
        if is_rate_limited:
            return False, SecurityEvent(
                event_id=secrets.token_hex(8),
                threat_type=ThreatType.RATE_LIMIT,
                security_level=SecurityLevel.MEDIUM,
                user_id=user_id,
                ip_address=client_ip,
                user_agent=user_agent,
                request_path=path,
                timestamp=datetime.utcnow(),
                details=rate_info,
                blocked=True
            )
        
        # Check for suspicious activity patterns
        if await self._detect_suspicious_activity(identifier, path, user_agent):
            return False, SecurityEvent(
                event_id=secrets.token_hex(8),
                threat_type=ThreatType.UNUSUAL_ACTIVITY,
                security_level=SecurityLevel.MEDIUM,
                user_id=user_id,
                ip_address=client_ip,
                user_agent=user_agent,
                request_path=path,
                timestamp=datetime.utcnow(),
                details={"reason": "Suspicious activity pattern detected"},
                blocked=True
            )
        
        return True, None
    
    async def _detect_suspicious_activity(
        self,
        identifier: str,
        path: str,
        user_agent: str
    ) -> bool:
        """Detect suspicious activity patterns"""
        key = f"suspicious_activity:{identifier}"
        
        # Track activity
        activity = {
            "path": path,
            "user_agent": user_agent,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        await self.redis.lpush(key, json.dumps(activity))
        await self.redis.ltrim(key, 0, 99)  # Keep last 100 activities
        await self.redis.expire(key, 3600)  # Expire in 1 hour
        
        # Get recent activities
        activities = await self.redis.lrange(key, 0, 9)
        recent_paths = [json.loads(act)["path"] for act in activities]
        
        # Check for rapid path changes (potential scanning)
        unique_paths = len(set(recent_paths))
        if unique_paths > 5:  # More than 5 different paths in recent requests
            return True
        
        # Check for admin path access attempts
        admin_paths = ["/admin", "/api/admin", "/dashboard", "/settings"]
        admin_attempts = sum(1 for p in recent_paths if any(ap in p for ap in admin_paths))
        if admin_attempts > 3:
            return True
        
        return False
    
    async def validate_input(
        self,
        input_data: Dict[str, Any],
        user_id: Optional[str] = None
    ) -> Tuple[bool, List[str]]:
        """Validate input data for security threats"""
        errors = []
        
        for key, value in input_data.items():
            if isinstance(value, str):
                # Check for SQL injection
                if not self.input_validator.validate_sql_injection(value):
                    errors.append(f"Potential SQL injection in {key}")
                
                # Check for XSS
                if not self.input_validator.validate_xss(value):
                    errors.append(f"Potential XSS in {key}")
                
                # Check for path traversal
                if not self.input_validator.validate_path_traversal(value):
                    errors.append(f"Potential path traversal in {key}")
                
                # Sanitize string
                input_data[key] = self.input_validator.sanitize_string(value)
        
        return len(errors) == 0, errors
    
    async def log_security_event(self, event: SecurityEvent):
        """Log security event"""
        self.security_events.append(event)
        
        # Store in Redis for persistence
        await self.redis.lpush(
            "security_events",
            json.dumps({
                "event_id": event.event_id,
                "threat_type": event.threat_type.value,
                "security_level": event.security_level.value,
                "user_id": event.user_id,
                "ip_address": event.ip_address,
                "user_agent": event.user_agent,
                "request_path": event.request_path,
                "timestamp": event.timestamp.isoformat(),
                "details": event.details,
                "blocked": event.blocked
            })
        )
        
        # Keep only last 1000 events
        await self.redis.ltrim("security_events", 0, 999)
        
        logger.warning(f"Security event: {event.threat_type.value} - {event.details}")
    
    async def get_security_stats(self) -> Dict[str, Any]:
        """Get security statistics"""
        events = await self.redis.lrange("security_events", 0, -1)
        parsed_events = [json.loads(event) for event in events]
        
        threat_counts = {}
        blocked_count = 0
        
        for event in parsed_events:
            threat_type = event["threat_type"]
            threat_counts[threat_type] = threat_counts.get(threat_type, 0) + 1
            if event["blocked"]:
                blocked_count += 1
        
        return {
            "total_events": len(parsed_events),
            "blocked_requests": blocked_count,
            "threat_breakdown": threat_counts,
            "blocked_ips": len(self.blocked_ips),
            "suspicious_activities": len(self.suspicious_activities)
        }

class PasswordManager:
    """Advanced password management"""
    
    def __init__(self):
        self.pwd_context = CryptContext(
            schemes=["bcrypt", "argon2"],
            default="bcrypt",
            bcrypt__rounds=12,
            argon2__memory_cost=65536,
            argon2__time_cost=3,
            argon2__parallelism=4
        )
    
    def hash_password(self, password: str) -> str:
        """Hash password with salt"""
        return self.pwd_context.hash(password)
    
    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        """Verify password against hash"""
        return self.pwd_context.verify(plain_password, hashed_password)
    
    def generate_secure_password(self, length: int = 16) -> str:
        """Generate secure random password"""
        alphabet = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*"
        return ''.join(secrets.choice(alphabet) for _ in range(length))

class TokenManager:
    """Advanced token management with JWT"""
    
    def __init__(self, secret_key: str, algorithm: str = "HS256"):
        self.secret_key = secret_key
        self.algorithm = algorithm
        self.access_token_expire = timedelta(minutes=30)
        self.refresh_token_expire = timedelta(days=7)
    
    def create_access_token(self, data: Dict[str, Any]) -> str:
        """Create JWT access token"""
        to_encode = data.copy()
        expire = datetime.utcnow() + self.access_token_expire
        to_encode.update({"exp": expire, "type": "access"})
        
        return jwt.encode(to_encode, self.secret_key, algorithm=self.algorithm)
    
    def create_refresh_token(self, data: Dict[str, Any]) -> str:
        """Create JWT refresh token"""
        to_encode = data.copy()
        expire = datetime.utcnow() + self.refresh_token_expire
        to_encode.update({"exp": expire, "type": "refresh"})
        
        return jwt.encode(to_encode, self.secret_key, algorithm=self.algorithm)
    
    def verify_token(self, token: str) -> Optional[Dict[str, Any]]:
        """Verify and decode JWT token"""
        try:
            payload = jwt.decode(token, self.secret_key, algorithms=[self.algorithm])
            return payload
        except jwt.ExpiredSignatureError:
            return None
        except jwt.InvalidTokenError:
            return None
    
    def create_token_pair(self, user_id: str, additional_data: Optional[Dict[str, Any]] = None) -> Dict[str, str]:
        """Create access and refresh token pair"""
        data = {"user_id": user_id}
        if additional_data:
            data.update(additional_data)
        
        return {
            "access_token": self.create_access_token(data),
            "refresh_token": self.create_refresh_token(data),
            "token_type": "bearer"
        }

# Global security instances
security_monitor = None
password_manager = PasswordManager()
token_manager = None

def initialize_security(redis_client, secret_key: str):
    """Initialize global security components"""
    global security_monitor, token_manager
    security_monitor = SecurityMonitor(redis_client)
    token_manager = TokenManager(secret_key)