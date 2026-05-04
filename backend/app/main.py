"""
================================================================================
IntelliML Platform - Main FastAPI Application Entry Point
================================================================================

PURPOSE:
    This is the central entry point for the IntelliML (Intelligent Machine Learning)
    platform API. It initializes FastAPI, sets up middleware, registers routers,
    and configures security for the entire application.

ARCHITECTURE OVERVIEW:
    ┌─────────────────────────────────────────────────────────────────────────────┐
    │                              FastAPI Application                              │
    ├─────────────────────────────────────────────────────────────────────────────┤
    │  Middleware Chain (top to bottom):                                           │
    │    1. SecurityMiddleware     - JWT/API Key authentication & admin restrictions│
    │    2. RequestLoggingMiddleware - HTTP request/response logging               │
    │    3. CORS Middleware         - Cross-Origin Resource Sharing                │
    │    4. Exception Handlers      - Custom error responses                      │
    └─────────────────────────────────────────────────────────────────────────────┘
    
    Routes are registered in this order:
    ┌─────────────────────────────────────────────────────────────────────────────┐
    │  1. Root Routes (defined here)      - /, /health, /test-groq                │
    │  2. Voice API Routes (/api/voice)   - Audio transcription & voice commands   │
    │  3. Data API Routes (/api/data)    - Upload, cleaning, engineering, EDA      │
    │  4. Auth Routes (/api/auth)         - Login, register, password management   │
    │  5. Analysis Routes (/api/analysis) - AI-powered data analysis              │
    │  6. Models Routes (/api/models)     - ML model training & predictions       │
    │  7. Explanations (/api/explanations) - SHAP explanations                   │
    │  8. Chat Routes (/api/chat)        - AI assistant for data questions        │
    │  9. Admin Routes (/api/admin)      - User management & system monitoring    │
    └─────────────────────────────────────────────────────────────────────────────┘

ENVIRONMENT VARIABLES:
    Required for full functionality:
    - GROQ_API_KEY: Groq API key for AI/LLM features (voice, chat, insights)
    - INTELLIML_API_KEY: Alternative API key authentication
    - JWT_SECRET_KEY: Auto-generated if not set (ephemeral, resets on restart)
    
    Optional:
    - DATABASE_URL: SQLite (default) or PostgreSQL connection string

SECURITY MODEL:
    1. Authentication Methods:
       - JWT Bearer Tokens (primary, expires in 24 hours by default)
       - X-API-Key header (for internal/testing use)
    
    2. Admin Account Restrictions:
       - Admin accounts (username 'admin') can ONLY access /api/admin/* endpoints
       - Regular users can access all other endpoints
       - This separation ensures admin accounts aren't used for data operations
    
    3. Public Endpoints (no auth required):
       - GET /, /health, /docs, /openapi.json, /redoc
       - GET /test-groq
       - WebSocket endpoints (/ws/*)
       - All /api/auth/* endpoints

DATA FLOW:
    User Request
         │
         ▼
    ┌─────────────┐
    │   Security  │ ──── Valid JWT/API Key? ──── No ──► 401 Unauthorized
    │  Middleware │
    └──────┬──────┘
           │ Yes
           ▼
    ┌─────────────┐
    │  Is Admin   │ ──── Admin accessing non-admin? ── No ──► 403 Forbidden
    │   Check     │
    └──────┬──────┘
           │ Yes
           ▼
    ┌─────────────┐
    │   Route     │
    │  Handlers   │
    └──────┬──────┘
           │
           ▼
    ┌─────────────┐
    │  Exception │ ──── Exception thrown? ── Yes ──► Custom Error Response
    │  Handler   │
    └──────┬──────┘
           │
           ▼
       Response

DEPENDENCIES:
    - FastAPI: Web framework
    - Uvicorn: ASGI server
    - Python-Jose: JWT handling
    - SQLAlchemy: Database ORM
    - Pandas/NumPy/Scikit-learn: Data processing & ML
    - Groq: LLM API client

================================================================================
"""

import sys
import time
import os
import logging
from pathlib import Path
from dotenv import load_dotenv
from jose import jwt, JWTError
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

# ================================================================================
# PATH CONFIGURATION
# ================================================================================
backend_dir = Path(__file__).parent.parent
project_root = backend_dir.parent
sys.path.insert(0, str(backend_dir))
sys.path.insert(0, str(project_root))

from app.core.cors import setup_cors                    # noqa: E402
from app.core.exceptions import register_exception_handlers  # noqa: E402
from app.core.lifespan import register_lifecycle_events   # noqa: E402
from app.core.routers import register_routers             # noqa: E402
from app.core.db_utils import create_db_and_tables       # noqa: E402
from app.core.auth_utils import SECRET_KEY as JWT_SECRET_KEY, ALGORITHM # noqa: E402
from app.core.auth_utils import is_admin_username # noqa: E402

# Configure logging format for consistent, readable log output
# Format: TIMESTAMP | LEVEL    | MODULE   | MESSAGE
# Example: 2024-01-15 10:30:45 | INFO     | app.main | Server started
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s | %(levelname)-8s | %(name)s | %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger(__name__)

# ================================================================================
# MAIN APPLICATION INSTANCE
# ================================================================================
# Creates the FastAPI application with metadata for auto-generated API docs
# 
# title: Shown in Swagger UI / OpenAPI docs
# description: Describes the API purpose
# version: Follows semantic versioning

app = FastAPI(
    title="IntelliML API",
    description="Voice-Controlled AutoML Platform API",
    version="1.0.0"
)

# Create database tables on startup (if using SQLite)
@app.on_event("startup")
def on_startup():
    """
    Application startup hook.
    Ensures database tables exist before handling requests.
    Called once when the server starts.
    """
    create_db_and_tables()

# Setup all middleware and handlers
setup_cors(app)                  # Enable CORS for frontend communication
register_exception_handlers(app)  # Register custom error response handlers
register_lifecycle_events(app)    # Setup startup/shutdown logging

# ================================================================================
# MIDDLEWARE: REQUEST LOGGING
# ================================================================================
"""
Purpose: Log every HTTP request/response for debugging and monitoring.

What it captures:
- HTTP method (GET, POST, PUT, DELETE, etc.)
- Request path (/api/data/upload, /api/auth/login, etc.)
- Response status code (200, 401, 500, etc.)
- Request duration in milliseconds

Color-coded status indicators:
- 🟢 Green: Success (2xx status codes)
- 🟡 Yellow: Client errors (4xx status codes)
- 🔴 Red: Server errors (5xx status codes)

This helps identify:
- Slow endpoints (performance issues)
- Failed requests (errors)
- Request patterns (usage monitoring)
"""

class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """
    Middleware that logs all HTTP requests and responses.
    
    Execution flow:
    1. Record start time when request arrives
    2. Call the next middleware/handler
    3. Calculate duration
    4. Log request details with color-coded status
    5. Return the response to the client
    
    Note: Runs for EVERY request, including failed ones (401, 403, etc.)
    """
    
    async def dispatch(self, request: Request, call_next):
        start_time = time.time()  # Record when request started
        
        # Process the request through the middleware chain
        response = await call_next(request)
        
        # Calculate how long the request took
        duration = time.time() - start_time
        
        # Choose color based on status code for visual logging
        status_color = ""
        if response.status_code >= 500:
            status_color = "🔴"  # Server error
        elif response.status_code >= 400:
            status_color = "🟡"  # Client error
        else:
            status_color = "🟢"  # Success
        
        # Log the request details
        logger.info(
            f"{status_color} {request.method} {request.url.path} "
            f"- {response.status_code} ({duration*1000:.1f}ms)"
        )
        
        return response

app.add_middleware(RequestLoggingMiddleware)
logger.info("✓ Request logging middleware enabled")

# ================================================================================
# MIDDLEWARE: SECURITY & AUTHENTICATION
# ================================================================================
"""
Purpose: Enforce authentication and admin access restrictions.

Security Layers:
1. AUTHENTICATION CHECK
   - JWT Bearer Token (Authorization header): Primary method
     - Contains user identity, expiration time, is_admin flag
     - Verified using secret key (JWT_SECRET_KEY)
   
   - X-API-Key Header: Legacy/fallback method
     - For internal services or testing
     - Less secure, should be replaced with JWT in production

2. ADMIN RESTRICTION
   - Admin accounts (username='admin') are BLOCKED from:
     - /api/data/* (data operations)
     - /api/models/* (model training)
     - /api/chat/* (AI chat)
     - Any non-admin endpoint
   
   - Admins CAN access:
     - /api/admin/* (admin dashboard)
     - Public endpoints (health, docs, etc.)

3. EXEMPTED ROUTES (no auth required)
   - GET /, /health, /docs, /openapi.json, /redoc
   - GET /test-groq
   - All /api/auth/* (login, register, etc.)
   - WebSocket endpoints (/ws/*)

JWT Token Structure:
{
  "sub": "username",        # Subject (user identifier)
  "exp": 1234567890,        # Expiration timestamp
  "is_admin": false         # Admin flag
}
"""

# Load environment variables from .env file
load_dotenv()
API_KEY = os.getenv("INTELLIML_API_KEY")


class SecurityMiddleware(BaseHTTPMiddleware):
    """
    Security middleware that validates authentication and enforces admin restrictions.
    
    Execution flow for each request:
    1. Allow OPTIONS (CORS preflight) requests to pass through
    2. Check if route is exempted (public endpoints)
    3. Validate JWT token if provided
    4. Check for legacy API key as fallback
    5. Return 401 if neither authentication method succeeds
    6. For admin users, verify they're only accessing admin endpoints
    """
    
    async def dispatch(self, request: Request, call_next):
        # ========================================================================
        # STEP 1: Allow CORS preflight requests
        # ========================================================================
        # Browsers send OPTIONS requests before actual requests to check CORS policy
        # These must pass through without authentication checks
        if request.method == "OPTIONS":
            return await call_next(request)

        # ========================================================================
        # STEP 2: Check if route is exempted (public)
        # ========================================================================
        # These endpoints don't require authentication:
        # - Health checks (/health)
        # - API documentation (/docs, /redoc, /openapi.json)
        # - AI testing (/test-groq)
        # - Authentication endpoints (/api/auth/*)
        # - WebSocket connections (/ws/*)
        if request.url.path in ["/", "/health", "/docs", "/openapi.json", "/redoc", "/test-groq"] or "/ws/" in request.url.path or "/api/auth/" in request.url.path:
            return await call_next(request)
        
        # ========================================================================
        # STEP 3: JWT Bearer Token Authentication (Primary Method)
        # ========================================================================
        # Expected header: Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]  # Extract the actual token
            try:
                # Decode and verify the JWT token
                # Will raise JWTError if:
                # - Token is malformed
                # - Token signature is invalid
                # - Token has expired
                payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[ALGORITHM])
                username = str(payload.get("sub", "")).lower()
                is_admin_token = is_admin_username(username)

                # ====================================================================
                # STEP 4: Admin Route Enforcement
                # ====================================================================
                # Admin accounts should ONLY access admin endpoints (/api/admin/*)
                # This prevents admin accounts from being used for regular operations
                if is_admin_token and not request.url.path.startswith("/api/admin"):
                    return JSONResponse(
                        status_code=403,
                        content={"detail": "Admin account is restricted to Admin Dashboard endpoints only"}
                    )
                
                # Authentication successful - proceed with the request
                return await call_next(request)
                
            except JWTError:
                # Token validation failed (expired, invalid signature, etc.)
                return JSONResponse(
                    status_code=401,
                    content={"detail": "Unauthorized: Invalid or expired token"}
                )

        # ========================================================================
        # STEP 5: Legacy API Key Authentication (Fallback)
        # ========================================================================
        # Alternative method for internal/testing authentication
        # Less secure, should use JWT in production
        header_key = request.headers.get("X-API-Key")
        if header_key == API_KEY and API_KEY:
            return await call_next(request)
        
        # ========================================================================
        # STEP 6: No valid authentication found
        # ========================================================================
        return JSONResponse(
            status_code=401,
            content={"detail": "Unauthorized: Authentication required"}
        )

app.add_middleware(SecurityMiddleware)
logger.info("✓ API Security Middleware enabled")
if not API_KEY:
    logger.warning("! INTELLIML_API_KEY not set; only JWT auth is available.")


# ================================================================================
# BASIC PUBLIC ENDPOINTS
# ================================================================================
"""
These endpoints are accessible without authentication.
They provide basic API information and health checks.
"""

@app.get("/")
async def root():
    """
    Root endpoint - API information
    
    Returns:
        - API name and version
        - List of main endpoint categories
        - Link to interactive documentation
    
    Use case:
        - Quick API availability check
        - Discover available endpoints
        - Get documentation links
    """
    return {
        "message": "IntelliML API",
        "version": "1.0.0",
        "status": "running",
        "endpoints": {
            "health": "/health",
            "test_groq": "/test-groq",
            "voice": "/api/voice/*",
            "data": "/api/data/*",
            "docs": "/docs",
            "redoc": "/redoc"
        }
    }


@app.get("/health")
async def health_check():
    """
    Health check endpoint
    
    Purpose:
        - Kubernetes/load balancer health probes
        - Frontend connection verification
        - Monitoring systems
    
    Returns:
        - Always returns 200 if server is running
        - Includes service name and version
    
    Note: Does NOT check:
        - Database connectivity
        - External API availability
        - ML model readiness
    """
    return {
        "status": "healthy",
        "message": "Backend is running",
        "service": "IntelliML API",
        "version": "1.0.0"
    }


@app.get("/test-groq")
async def test_groq():
    """
    Test Groq API connectivity and AI features
    
    Purpose:
        - Verify GROQ_API_KEY is configured correctly
        - Test LLM connectivity before using AI features
        - Debug AI-related issues
    
    Returns:
        - status: "success" if Groq is working
        - status: "unavailable" if GROQ_API_KEY not set
        - status: "error" if API call fails
    
    AI features that depend on Groq:
        - Voice transcription (Whisper)
        - AI chat assistant responses
        - AI-generated data insights
        - Smart data cleaning recommendations
    """
    try:
        from app.core.groq_client import groq_client

        if groq_client is None:
            # Groq client not initialized (GROQ_API_KEY not set)
            return {
                "status": "unavailable",
                "message": "Groq API not configured. AI features are disabled. Add GROQ_API_KEY to enable.",
                "response": None
            }

        # Test the Groq API with a simple prompt
        response = groq_client.chat_completion(
            messages=[{"role": "user", "content": "Say 'OK' if you're working"}],
            temperature=0.1,
            max_tokens=10  # Just need a short response
        )

        return {
            "status": "success",
            "message": "Groq API is working",
            "response": str(response)
        }
    except Exception as e:
        logger.error(f"Groq test failed: {e}")
        return JSONResponse(
            status_code=500,
            content={
                "status": "error",
                "message": "Groq API test failed",
                "response": str(e)
            }
        )


# ================================================================================
# ROUTER REGISTRATION
# ================================================================================
"""
Routers are registered AFTER basic endpoints to ensure proper route precedence.
The register_routers function in app.core.routers includes all API routes:

Data Flow for API Requests:
┌─────────────┐      ┌─────────────┐      ┌─────────────┐
│  Security   │ ───► │   Route     │ ───► │   Service   │
│  Middleware │      │  Handler    │      │    Layer    │
└─────────────┘      └─────────────┘      └─────────────┘
                          │                     │
                          │                     ▼
                          │              ┌─────────────┐
                          └───────────►  │   Response  │
                                         └─────────────┘
"""

register_routers(app)


# ================================================================================
# MAIN ENTRY POINT (for direct execution)
# ================================================================================
"""
Allows running this file directly with: python app/main.py
Useful for development/debugging.

Note: In production, use: uvicorn app.main:app --host 0.0.0.0 --port 8000
"""

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8010,  # Default port for direct execution (note: may conflict with config)
        reload=True,
        log_level="info"
    )