"""
================================================================================
Exception Handlers & Custom Exceptions
================================================================================

PURPOSE:
    Defines all custom exception types and their global handlers.
    Ensures consistent error responses across the API.

WHY CUSTOM EXCEPTIONS?
    - Consistent error format for all endpoints
    - Specific HTTP status codes
    - Error codes for client handling
    - Structured details field

ERROR RESPONSE FORMAT:
    All errors follow this structure:
    {
        "success": false,
        "error": "Human-readable message",
        "error_code": "ERROR_CODE",
        "details": {...},           # Extra context
        "path": "/api/endpoint"       # Where error occurred
    }

EXCEPTION HIERARCHY:
    AppException (base)
    ├── ValidationError      400
    ├── NotFoundError        404
    ├── UnauthorizedError     401
    ├── ForbiddenError       403
    ├── ServiceUnavailableError 503
    ├── MLTrainingError      500
    ├── DataProcessingError  400
    └── ExternalAPIError     502

HOW TO USE:
    from app.core.exceptions import ValidationError, NotFoundError
    
    # In route handlers:
    if not data:
        raise NotFoundError("Dataset not found")
    
    if invalid_input:
        raise ValidationError(
            "Invalid column name",
            details={"available": ["col1", "col2"]}
        )

GLOBAL HANDLING:
    Exceptions are caught by registered handlers and converted to
    JSON responses automatically. No try/catch needed in routes.

================================================================================
"""

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from pydantic import ValidationError as PydanticValidationError
import logging
import traceback
import os

from app.core.errors import (
    AppException,
    ValidationError,
    NotFoundError,
    UnauthorizedError,
    ForbiddenError,
    ServiceUnavailableError,
    MLTrainingError,
    DataProcessingError,
    ExternalAPIError,
)

logger = logging.getLogger(__name__)


def register_exception_handlers(app: FastAPI) -> None:
    """
    Register global exception handlers on the FastAPI application.
    
    This MUST be called during app initialization to ensure all
    exceptions are caught and returned as proper JSON responses.
    
    Each handler:
    1. Logs the error appropriately
    2. Returns consistent JSON structure
    3. Includes error code, message, details, and path
    """
    # =========================================================================
    # BASE APP EXCEPTION HANDLER
    # =========================================================================
    @app.exception_handler(AppException)
    async def app_exception_handler(request: Request, exc: AppException):
        """
        Handle base application exceptions.
        
        Catches all custom AppException subclasses.
        Logs at WARNING level (not ERROR) since these are expected.
        
        Response includes:
        - HTTP status code from exception
        - error_code: Short identifier (e.g., "VALIDATION_ERROR")
        - error: Human-readable message
        - details: Extra context dict
        - path: Request path for debugging
        """
        logger.warning(
            f"[{exc.error_code}] {exc.status_code}: {exc.message} - {request.url.path}",
            extra={"details": exc.details}
        )
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "success": False,
                "error": exc.message,
                "error_code": exc.error_code,
                "details": exc.details,
                "path": request.url.path,
            }
        )

    # =========================================================================
    # VALIDATION ERROR HANDLER (400)
    # =========================================================================
    @app.exception_handler(ValidationError)
    async def validation_exception_handler(request: Request, exc: ValidationError):
        """
        Handle input validation errors.
        
        Used when:
        - Invalid request parameters
        - Missing required fields
        - Invalid column names
        - Invalid data formats
        
        Example:
            raise ValidationError(
                "Invalid operation",
                details={"valid_ops": ["fill_na", "drop_na"]}
            )
        """
        logger.warning(f"Validation error: {exc.message} - {request.url.path}")
        return JSONResponse(
            status_code=400,
            content={
                "success": False,
                "error": exc.message,
                "error_code": "VALIDATION_ERROR",
                "details": exc.details,
                "path": request.url.path,
            }
        )

    # =========================================================================
    # NOT FOUND ERROR HANDLER (404)
    # =========================================================================
    @app.exception_handler(NotFoundError)
    async def not_found_exception_handler(request: Request, exc: NotFoundError):
        """
        Handle resource not found errors.
        
        Used when:
        - Dataset not loaded
        - Model job not found
        - User not found
        - File/resource doesn't exist
        
        Example:
            raise NotFoundError("No dataset loaded. Please upload a file first.")
        """
        logger.warning(f"Resource not found: {exc.message} - {request.url.path}")
        return JSONResponse(
            status_code=404,
            content={
                "success": False,
                "error": exc.message,
                "error_code": "NOT_FOUND",
                "details": exc.details,
                "path": request.url.path,
            }
        )

    # =========================================================================
    # UNAUTHORIZED ERROR HANDLER (401)
    # =========================================================================
    @app.exception_handler(UnauthorizedError)
    async def unauthorized_exception_handler(request: Request, exc: UnauthorizedError):
        """
        Handle authentication errors.
        
        Used when:
        - Missing/invalid JWT token
        - Token expired
        - Invalid credentials
        - API key mismatch
        
        Example:
            raise UnauthorizedError("Invalid or expired token")
        """
        logger.warning(f"Unauthorized: {exc.message} - {request.url.path}")
        return JSONResponse(
            status_code=401,
            content={
                "success": False,
                "error": exc.message,
                "error_code": "UNAUTHORIZED",
                "details": exc.details,
                "path": request.url.path,
            }
        )

    # =========================================================================
    # FORBIDDEN ERROR HANDLER (403)
    # =========================================================================
    @app.exception_handler(ForbiddenError)
    async def forbidden_exception_handler(request: Request, exc: ForbiddenError):
        """
        Handle permission denied errors.
        
        Used when:
        - Admin account accessing non-admin endpoints
        - User trying to access another user's data
        - Insufficient permissions
        
        Example:
            raise ForbiddenError("Admin access required")
        """
        logger.warning(f"Forbidden: {exc.message} - {request.url.path}")
        return JSONResponse(
            status_code=403,
            content={
                "success": False,
                "error": exc.message,
                "error_code": "FORBIDDEN",
                "details": exc.details,
                "path": request.url.path,
            }
        )

    # =========================================================================
    # SERVICE UNAVAILABLE ERROR HANDLER (503)
    # =========================================================================
    @app.exception_handler(ServiceUnavailableError)
    async def service_unavailable_exception_handler(request: Request, exc: ServiceUnavailableError):
        """
        Handle service unavailable errors.
        
        Used when:
        - External API (Groq) not configured
        - Optional ML library not installed (XGBoost, etc.)
        - System resource unavailable
        
        Example:
            raise ServiceUnavailableError("XGBoost not available. Run: pip install xgboost")
        """
        logger.warning(f"Service unavailable: {exc.message} - {request.url.path}")
        return JSONResponse(
            status_code=503,
            content={
                "success": False,
                "error": exc.message,
                "error_code": "SERVICE_UNAVAILABLE",
                "details": exc.details,
                "path": request.url.path,
            }
        )

    # =========================================================================
    # ML TRAINING ERROR HANDLER (500)
    # =========================================================================
    @app.exception_handler(MLTrainingError)
    async def ml_training_exception_handler(request: Request, exc: MLTrainingError):
        """
        Handle ML training errors.
        
        Used when:
        - Training fails
        - No models succeed
        - Model persistence fails
        - Explanation generation fails
        
        Example:
            raise MLTrainingError("Training failed: insufficient data")
        """
        logger.error(f"ML training error: {exc.message} - {request.url.path}")
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "error": exc.message,
                "error_code": "ML_TRAINING_ERROR",
                "details": exc.details,
                "path": request.url.path,
            }
        )

    # =========================================================================
    # DATA PROCESSING ERROR HANDLER (400)
    # =========================================================================
    @app.exception_handler(DataProcessingError)
    async def data_processing_exception_handler(request: Request, exc: DataProcessingError):
        """
        Handle data processing errors.
        
        Used when:
        - Cleaning operation fails
        - Feature engineering fails
        - EDA analysis fails
        - Invalid data transformation
        
        Example:
            raise DataProcessingError("Failed to parse column as datetime")
        """
        logger.error(f"Data processing error: {exc.message} - {request.url.path}")
        return JSONResponse(
            status_code=400,
            content={
                "success": False,
                "error": exc.message,
                "error_code": "DATA_PROCESSING_ERROR",
                "details": exc.details,
                "path": request.url.path,
            }
        )

    # =========================================================================
    # EXTERNAL API ERROR HANDLER (502)
    # =========================================================================
    @app.exception_handler(ExternalAPIError)
    async def external_api_exception_handler(request: Request, exc: ExternalAPIError):
        """
        Handle external API call errors.
        
        Used when:
        - Groq API fails
        - External service timeout
        - API rate limit exceeded
        - Invalid API response
        
        Example:
            raise ExternalAPIError("Groq API timeout")
        """
        logger.error(f"External API error: {exc.message} - {request.url.path}")
        return JSONResponse(
            status_code=502,
            content={
                "success": False,
                "error": exc.message,
                "error_code": "EXTERNAL_API_ERROR",
                "details": exc.details,
                "path": request.url.path,
            }
        )

    # =========================================================================
    # FALLBACK: UNCAUGHT EXCEPTIONS (500)
    # =========================================================================
    @app.exception_handler(Exception)
    async def generic_exception_handler(request: Request, exc: Exception):
        """
        Catch-all handler for any unhandled exceptions.
        
        Catches:
        - Programming errors (AttributeError, TypeError, etc.)
        - Unexpected errors
        
        Logs full traceback for debugging.
        Returns generic error to client (don't expose internal details).
        """
        logger.error(
            f"Unhandled exception: {type(exc).__name__}: {str(exc)}",
            extra={"traceback": traceback.format_exc()}
        )
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "error": "Internal server error",
                "error_code": "INTERNAL_ERROR",
                "details": {},
                "path": request.url.path,
            }
        )

    # =========================================================================
    # REQUEST VALIDATION ERROR HANDLER (422)
    # =========================================================================
    @app.exception_handler(RequestValidationError)
    async def request_validation_exception_handler(request: Request, exc: RequestValidationError):
        """
        Handle FastAPI/Pydantic validation errors.
        
        Catches:
        - Missing required request body fields
        - Type mismatches in request
        - Invalid enum values
        
        Returns detailed validation errors for client debugging.
        """
        logger.warning(f"Request validation error: {exc.errors()} - {request.url.path}")
        return JSONResponse(
            status_code=422,
            content={
                "success": False,
                "error": "Request validation failed",
                "error_code": "VALIDATION_ERROR",
                "details": {"errors": exc.errors()},
                "path": request.url.path,
            }
        )


# =============================================================================
# EXCEPTION CLASS DEFINITIONS (in app.core.errors)
# =============================================================================
"""
Exception classes are defined in app.core.errors for cleaner imports.

Each exception has:
- message: Human-readable error message
- error_code: Short identifier (e.g., "VALIDATION_ERROR")
- status_code: HTTP status code
- details: Optional dict with extra context

Usage:
    raise ValidationError("Invalid input", details={"field": "email"})
"""