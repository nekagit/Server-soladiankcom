"""
Logging Middleware for request/response logging
"""
from fastapi import Request
import time
from utils.logger import app_logger


async def logging_middleware(request: Request, call_next):
    """
    Middleware to log all HTTP requests and responses
    """
    # Get request ID from state (set by error handler)
    request_id = getattr(request.state, 'request_id', 'unknown')
    
    # Start timer
    start_time = time.time()
    
    # Log incoming request
    app_logger.info(
        f"Incoming request: {request.method} {request.url.path}",
        method=request.method,
        endpoint=request.url.path,
        request_id=request_id,
        client_host=request.client.host if request.client else None,
        query_params=str(request.query_params) if request.query_params else None
    )
    
    # Process request
    response = await call_next(request)
    
    # Calculate duration
    duration_ms = (time.time() - start_time) * 1000
    
    # Log response
    app_logger.log_request(
        method=request.method,
        endpoint=request.url.path,
        status_code=response.status_code,
        duration_ms=duration_ms,
        request_id=request_id
    )
    
    # Add duration header
    response.headers["X-Process-Time"] = f"{duration_ms:.2f}ms"
    
    return response

