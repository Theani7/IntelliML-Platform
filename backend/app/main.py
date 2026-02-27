"""
Main FastAPI application entry point
"""
import sys
from pathlib import Path

# Add project root to path
backend_dir = Path(__file__).parent.parent
project_root = backend_dir.parent
sys.path.insert(0, str(backend_dir))
sys.path.insert(0, str(project_root))

from fastapi import FastAPI
from fastapi.responses import JSONResponse
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title="IntelliML API",
    description="Voice-Controlled AutoML Platform API",
    version="1.0.0"
)

# --- Setup via core modules ---
from app.core.cors import setup_cors
from app.core.exceptions import register_exception_handlers
from app.core.lifespan import register_lifecycle_events
from app.core.routers import register_routers
from app.core.db_utils import create_db_and_tables

@app.on_event("startup")
def on_startup():
    create_db_and_tables()

setup_cors(app)
register_exception_handlers(app)
register_lifecycle_events(app)

# --- Security Middleware ---
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
import os
from dotenv import load_dotenv
from jose import jwt, JWTError
from app.core.auth_utils import SECRET_KEY as JWT_SECRET_KEY, ALGORITHM
from app.core.auth_utils import is_admin_username

load_dotenv()
API_KEY = os.getenv("INTELLIML_API_KEY")


class SecurityMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # Always allow CORS preflight checks to pass through.
        if request.method == "OPTIONS":
            return await call_next(request)

        # Exempt routes
        if request.url.path in ["/", "/health", "/docs", "/openapi.json", "/redoc", "/test-groq"] or "/ws/" in request.url.path or "/api/auth/" in request.url.path:
            return await call_next(request)
        
        # 1. Check for JWT Authorization header (Primary)
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]
            try:
                payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[ALGORITHM])
                username = str(payload.get("sub", "")).lower()
                is_admin_token = is_admin_username(username)

                # Admin accounts are restricted to admin-only functionality.
                if is_admin_token and not request.url.path.startswith("/api/admin"):
                    return JSONResponse(
                        status_code=403,
                        content={"detail": "Admin account is restricted to Admin Dashboard endpoints only"}
                    )
                return await call_next(request)
            except JWTError:
                return JSONResponse(
                    status_code=401,
                    content={"detail": "Unauthorized: Invalid or expired token"}
                )

        # 2. Check for Legacy API Key (Fallback for testing/internal)
        header_key = request.headers.get("X-API-Key")
        if header_key == API_KEY and API_KEY:
            return await call_next(request)
        
        return JSONResponse(
            status_code=401,
            content={"detail": "Unauthorized: Authentication required"}
        )

app.add_middleware(SecurityMiddleware)
logger.info("✓ API Security Middleware enabled")
if not API_KEY:
    logger.warning("! INTELLIML_API_KEY not set; only JWT auth is available.")


# --- Basic endpoints (defined before routers) ---

@app.get("/")
async def root():
    """Root endpoint - API information"""
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
    """Health check endpoint"""
    return {
        "status": "healthy",
        "message": "Backend is running",
        "service": "IntelliML API",
        "version": "1.0.0"
    }


@app.get("/test-groq")
async def test_groq():
    """Test Groq API connection"""
    try:
        from app.core.groq_client import groq_client

        if groq_client is None:
            return JSONResponse(
                status_code=503,
                content={
                    "status": "error",
                    "message": "Groq client not initialized. Check GROQ_API_KEY.",
                    "response": None
                }
            )

        response = groq_client.chat_completion(
            messages=[{"role": "user", "content": "Say 'OK' if you're working"}],
            temperature=0.1,
            max_tokens=10
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


# --- Register all routers (AFTER basic endpoints) ---
register_routers(app)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8010,
        reload=True,
        log_level="info"
    )
