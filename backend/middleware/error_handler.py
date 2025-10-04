"""
Centralized Error Handling Middleware
"""
from fastapi import Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from sqlalchemy.exc import SQLAlchemyError, IntegrityError
from pydantic import ValidationError
import traceback
import uuid
from datetime import datetime


class AppException(Exception):
    """Base application exception"""
    def __init__(self, message: str, status_code: int = 500, details: dict = None):
        self.message = message
        self.status_code = status_code
        self.details = details or {}
        super().__init__(self.message)


class ValidationException(AppException):
    """Validation error exception"""
    def __init__(self, message: str, details: dict = None):
        super().__init__(message, status.HTTP_400_BAD_REQUEST, details)


class NotFoundException(AppException):
    """Resource not found exception"""
    def __init__(self, message: str, details: dict = None):
        super().__init__(message, status.HTTP_404_NOT_FOUND, details)


class DatabaseException(AppException):
    """Database error exception"""
    def __init__(self, message: str, details: dict = None):
        super().__init__(message, status.HTTP_500_INTERNAL_SERVER_ERROR, details)


class AuthenticationException(AppException):
    """Authentication error exception"""
    def __init__(self, message: str, details: dict = None):
        super().__init__(message, status.HTTP_401_UNAUTHORIZED, details)


def generate_request_id() -> str:
    """Generate unique request ID"""
    return str(uuid.uuid4())


async def error_handler_middleware(request: Request, call_next):
    """Global error handling middleware"""
    request_id = generate_request_id()
    request.state.request_id = request_id
    
    try:
        response = await call_next(request)
        response.headers["X-Request-ID"] = request_id
        return response
    except Exception as exc:
        return handle_exception(exc, request_id)


def handle_exception(exc: Exception, request_id: str) -> JSONResponse:
    """Handle different types of exceptions"""
    
    # App-specific exceptions
    if isinstance(exc, AppException):
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "error": {
                    "message": exc.message,
                    "type": exc.__class__.__name__,
                    "details": exc.details,
                    "request_id": request_id,
                    "timestamp": datetime.utcnow().isoformat()
                }
            }
        )
    
    # Pydantic validation errors
    if isinstance(exc, (RequestValidationError, ValidationError)):
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content={
                "error": {
                    "message": "Validation error",
                    "type": "ValidationError",
                    "details": {"errors": exc.errors() if hasattr(exc, 'errors') else str(exc)},
                    "request_id": request_id,
                    "timestamp": datetime.utcnow().isoformat()
                }
            }
        )
    
    # Database integrity errors
    if isinstance(exc, IntegrityError):
        return JSONResponse(
            status_code=status.HTTP_409_CONFLICT,
            content={
                "error": {
                    "message": "Database integrity error",
                    "type": "IntegrityError",
                    "details": {"database_error": str(exc.orig) if hasattr(exc, 'orig') else str(exc)},
                    "request_id": request_id,
                    "timestamp": datetime.utcnow().isoformat()
                }
            }
        )
    
    # Other database errors
    if isinstance(exc, SQLAlchemyError):
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "error": {
                    "message": "Database error occurred",
                    "type": "DatabaseError",
                    "details": {},  # Don't expose internal DB errors
                    "request_id": request_id,
                    "timestamp": datetime.utcnow().isoformat()
                }
            }
        )
    
    # Generic exceptions
    error_traceback = traceback.format_exc()
    print(f"❌ Unhandled exception [{request_id}]: {error_traceback}")
    
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": {
                "message": "An unexpected error occurred",
                "type": "InternalServerError",
                "details": {},  # Don't expose internal errors in production
                "request_id": request_id,
                "timestamp": datetime.utcnow().isoformat()
            }
        }
    )


# Exception handlers for FastAPI
async def app_exception_handler(request: Request, exc: AppException):
    """Handler for application exceptions"""
    request_id = getattr(request.state, 'request_id', generate_request_id())
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": {
                "message": exc.message,
                "type": exc.__class__.__name__,
                "details": exc.details,
                "request_id": request_id,
                "timestamp": datetime.utcnow().isoformat()
            }
        }
    )


async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Handler for validation errors"""
    request_id = getattr(request.state, 'request_id', generate_request_id())
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "error": {
                "message": "Validation error",
                "type": "ValidationError",
                "details": {"errors": exc.errors()},
                "request_id": request_id,
                "timestamp": datetime.utcnow().isoformat()
            }
        }
    )

