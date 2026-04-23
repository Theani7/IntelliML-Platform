"""
================================================================================
Custom Exception Classes
================================================================================

PURPOSE:
    Defines all application-specific exception types with consistent
    behavior: message, error code, HTTP status, and optional details.

WHY CUSTOM EXCEPTIONS?
    - Semantic meaning (ValidationError vs NotFoundError)
    - Specific HTTP status codes
    - Structured error codes for client handling
    - Extensible details field

BASE CLASS:
    AppException: All custom exceptions inherit from this
    
    Provides:
    - message: Human-readable error message
    - error_code: Short identifier (e.g., "VALIDATION_ERROR")
    - status_code: HTTP status code
    - details: Optional dict with extra context

USAGE:
    # Simple
    raise ValidationError("Invalid input")
    
    # With details
    raise ValidationError(
        "Column not found",
        details={"available_columns": ["age", "name"]}
    )

ERROR CODES:
    - VALIDATION_ERROR (400)
    - NOT_FOUND (404)
    - UNAUTHORIZED (401)
    - FORBIDDEN (403)
    - SERVICE_UNAVAILABLE (503)
    - ML_TRAINING_ERROR (500)
    - DATA_PROCESSING_ERROR (400)
    - EXTERNAL_API_ERROR (502)

================================================================================
"""

from typing import Any, Optional, Dict
from fastapi import status


class AppException(Exception):
    """
    Base exception class for all application errors.
    
    All custom exceptions should inherit from this class.
    
    Attributes:
        message: Human-readable error description
        error_code: Short identifier (e.g., "VALIDATION_ERROR")
        status_code: HTTP status code
        details: Optional dict with extra context
        
    Example:
        class MyError(AppException):
            def __init__(self, message: str, details: dict = None):
                super().__init__(
                    message=message,
                    error_code="MY_ERROR",
                    status_code=status.HTTP_400_BAD_REQUEST,
                    details=details
                )
    """
    
    def __init__(
        self,
        message: str,
        error_code: str = "APP_ERROR",
        status_code: int = status.HTTP_500_INTERNAL_SERVER_ERROR,
        details: Optional[Dict[str, Any]] = None
    ):
        """
        Initialize exception.
        
        Args:
            message: Error description
            error_code: Short identifier
            status_code: HTTP status
            details: Extra context dict
        """
        self.message = message
        self.error_code = error_code
        self.status_code = status_code
        self.details = details or {}
        super().__init__(self.message)
    
    def __repr__(self):
        return f"{self.__class__.__name__}({self.error_code}: {self.message})"


class ValidationError(AppException):
    """
    Input validation failed.
    
    HTTP Status: 400 Bad Request
    
    Use when:
    - Invalid request parameters
    - Missing required fields
    - Invalid data formats
    - Constraint violations
    """
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(
            message=message,
            error_code="VALIDATION_ERROR",
            status_code=status.HTTP_400_BAD_REQUEST,
            details=details
        )


class NotFoundError(AppException):
    """
    Requested resource not found.
    
    HTTP Status: 404 Not Found
    
    Use when:
    - Dataset not loaded
    - Model job not found
    - User/resource doesn't exist
    - Endpoint returns no results
    """
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(
            message=message,
            error_code="NOT_FOUND",
            status_code=status.HTTP_404_NOT_FOUND,
            details=details
        )


class UnauthorizedError(AppException):
    """
    Authentication required or failed.
    
    HTTP Status: 401 Unauthorized
    
    Use when:
    - Missing authentication token
    - Invalid JWT token
    - Token expired
    - Invalid credentials
    """
    def __init__(self, message: str = "Unauthorized", details: Optional[Dict[str, Any]] = None):
        super().__init__(
            message=message,
            error_code="UNAUTHORIZED",
            status_code=status.HTTP_401_UNAUTHORIZED,
            details=details
        )


class ForbiddenError(AppException):
    """
    Permission denied.
    
    HTTP Status: 403 Forbidden
    
    Use when:
    - User lacks required permissions
    - Admin accessing user endpoints
    - User trying to access others' data
    - Invalid role for operation
    """
    def __init__(self, message: str = "Access forbidden", details: Optional[Dict[str, Any]] = None):
        super().__init__(
            message=message,
            error_code="FORBIDDEN",
            status_code=status.HTTP_403_FORBIDDEN,
            details=details
        )


class ServiceUnavailableError(AppException):
    """
    Service temporarily unavailable.
    
    HTTP Status: 503 Service Unavailable
    
    Use when:
    - Optional dependency not installed
    - External service not configured
    - System resource unavailable
    - Rate limit exceeded
    """
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(
            message=message,
            error_code="SERVICE_UNAVAILABLE",
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            details=details
        )


class MLTrainingError(AppException):
    """
    Machine learning training failed.
    
    HTTP Status: 500 Internal Server Error
    
    Use when:
    - All models failed to train
    - Training timeout
    - Invalid training parameters
    - Model persistence error
    """
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(
            message=message,
            error_code="ML_TRAINING_ERROR",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            details=details
        )


class DataProcessingError(AppException):
    """
    Data transformation/processing failed.
    
    HTTP Status: 400 Bad Request
    
    Use when:
    - Cleaning operation failed
    - Feature engineering error
    - Invalid data format
    - Transformation error
    """
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(
            message=message,
            error_code="DATA_PROCESSING_ERROR",
            status_code=status.HTTP_400_BAD_REQUEST,
            details=details
        )


class ExternalAPIError(AppException):
    """
    External API call failed.
    
    HTTP Status: 502 Bad Gateway
    
    Use when:
    - Groq API error
    - API timeout
    - Invalid API response
    - Rate limit hit
    """
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(
            message=message,
            error_code="EXTERNAL_API_ERROR",
            status_code=status.HTTP_502_BAD_GATEWAY,
            details=details
        )


# Export all for easy importing
__all__ = [
    "AppException",
    "ValidationError",
    "NotFoundError",
    "UnauthorizedError",
    "ForbiddenError",
    "ServiceUnavailableError",
    "MLTrainingError",
    "DataProcessingError",
    "ExternalAPIError",
]