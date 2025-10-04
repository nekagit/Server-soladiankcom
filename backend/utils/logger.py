"""
Structured JSON Logging
"""
import logging
import json
import sys
from datetime import datetime
from typing import Any, Dict, Optional
from pythonjsonlogger import jsonlogger


class CustomJsonFormatter(jsonlogger.JsonFormatter):
    """Custom JSON formatter for structured logging"""
    
    def add_fields(self, log_record: Dict[str, Any], record: logging.LogRecord, message_dict: Dict[str, Any]) -> None:
        super().add_fields(log_record, record, message_dict)
        
        # Add timestamp
        log_record['timestamp'] = datetime.utcnow().isoformat()
        
        # Add log level
        log_record['level'] = record.levelname
        
        # Add logger name
        log_record['logger'] = record.name
        
        # Add module and function info
        log_record['module'] = record.module
        log_record['function'] = record.funcName
        log_record['line'] = record.lineno
        
        # Add request context if available
        if hasattr(record, 'request_id'):
            log_record['request_id'] = record.request_id
        
        if hasattr(record, 'user_id'):
            log_record['user_id'] = record.user_id
        
        if hasattr(record, 'endpoint'):
            log_record['endpoint'] = record.endpoint
        
        if hasattr(record, 'duration_ms'):
            log_record['duration_ms'] = record.duration_ms


def setup_logger(name: str = "soladia", level: str = "INFO") -> logging.Logger:
    """
    Set up structured JSON logger
    
    Args:
        name: Logger name
        level: Log level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
    
    Returns:
        Configured logger instance
    """
    logger = logging.getLogger(name)
    
    # Prevent duplicate handlers
    if logger.handlers:
        return logger
    
    logger.setLevel(getattr(logging, level.upper(), logging.INFO))
    
    # Console handler with JSON formatting
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(logging.DEBUG)
    
    # Use JSON formatter
    formatter = CustomJsonFormatter(
        '%(timestamp)s %(level)s %(name)s %(message)s'
    )
    console_handler.setFormatter(formatter)
    
    logger.addHandler(console_handler)
    
    return logger


# Global logger instance
logger = setup_logger("soladia")


class Logger:
    """
    Wrapper class for structured logging
    """
    
    def __init__(self, name: str = "soladia"):
        self.logger = logging.getLogger(name)
    
    def _log(
        self,
        level: str,
        message: str,
        request_id: Optional[str] = None,
        user_id: Optional[int] = None,
        endpoint: Optional[str] = None,
        duration_ms: Optional[float] = None,
        **kwargs
    ) -> None:
        """Internal logging method with context"""
        extra = {
            'request_id': request_id,
            'user_id': user_id,
            'endpoint': endpoint,
            'duration_ms': duration_ms,
            **kwargs
        }
        
        # Remove None values
        extra = {k: v for k, v in extra.items() if v is not None}
        
        getattr(self.logger, level.lower())(message, extra=extra)
    
    def debug(self, message: str, **kwargs) -> None:
        """Log debug message"""
        self._log('DEBUG', message, **kwargs)
    
    def info(self, message: str, **kwargs) -> None:
        """Log info message"""
        self._log('INFO', message, **kwargs)
    
    def warning(self, message: str, **kwargs) -> None:
        """Log warning message"""
        self._log('WARNING', message, **kwargs)
    
    def error(self, message: str, **kwargs) -> None:
        """Log error message"""
        self._log('ERROR', message, **kwargs)
    
    def critical(self, message: str, **kwargs) -> None:
        """Log critical message"""
        self._log('CRITICAL', message, **kwargs)
    
    def log_request(
        self,
        method: str,
        endpoint: str,
        status_code: int,
        duration_ms: float,
        request_id: str,
        user_id: Optional[int] = None
    ) -> None:
        """Log HTTP request"""
        self.info(
            f"{method} {endpoint} {status_code}",
            endpoint=endpoint,
            method=method,
            status_code=status_code,
            duration_ms=duration_ms,
            request_id=request_id,
            user_id=user_id
        )
    
    def log_database_query(
        self,
        query: str,
        duration_ms: float,
        rows_affected: Optional[int] = None
    ) -> None:
        """Log database query"""
        self.debug(
            f"Database query executed",
            query=query[:200],  # Truncate long queries
            duration_ms=duration_ms,
            rows_affected=rows_affected
        )
    
    def log_error_with_traceback(
        self,
        error: Exception,
        request_id: Optional[str] = None,
        **kwargs
    ) -> None:
        """Log error with full traceback"""
        import traceback
        self.error(
            f"Exception occurred: {str(error)}",
            error_type=type(error).__name__,
            traceback=traceback.format_exc(),
            request_id=request_id,
            **kwargs
        )


# Global logger instance
app_logger = Logger("soladia")

