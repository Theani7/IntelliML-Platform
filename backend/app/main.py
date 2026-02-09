"""
Main FastAPI application entry point
"""
import sys
from pathlib import Path

# Add project root to path
# Add project root to path
# project_root is the parent of 'backend' -> /path/to/IntelliML-Platform
backend_dir = Path(__file__).parent.parent
project_root = backend_dir.parent
sys.path.insert(0, str(backend_dir))
sys.path.insert(0, str(project_root))

from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
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

# CORS Configuration - MUST be before routes
# Using wildcard for development to avoid localhost/127.0.0.1 mismatches
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins in development
    allow_credentials=False,  # Must be False when using wildcard origins
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Root endpoint - define BEFORE importing routers
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

# Health check endpoint
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "message": "Backend is running",
        "service": "IntelliML API",
        "version": "1.0.0"
    }

# Test Groq connection endpoint
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
        
        # Test with a simple chat completion
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

# Import routers AFTER defining basic endpoints
logger.info("Importing routers...")

try:
    from app.api import voice, data
    logger.info("✓ Core routers imported successfully")
except Exception as e:
    logger.error(f"Failed to import core routers: {e}", exc_info=True)
    raise

# Try to import optional routers
analysis_router = None
models_router = None
explanations_router = None

try:
    from app.api import analysis
    analysis_router = analysis
    logger.info("✓ Analysis router imported")
except Exception as e:
    logger.warning(f"Analysis router not available: {e}")

try:
    from app.api import models
    models_router = models
    logger.info("✓ Models router imported")
except Exception as e:
    logger.warning(f"Models router not available: {e}")

try:
    from app.api import explanations
    explanations_router = explanations
    logger.info("✓ Explanations router imported")
except Exception as e:
    logger.warning(f"Explanations router not available: {e}")

chat_router = None
try:
    from app.api import chat
    chat_router = chat
    logger.info("✓ Chat router imported")
except Exception as e:
    logger.warning(f"Chat router not available: {e}")

# Include routers - THIS IS CRITICAL
logger.info("Including routers...")

# VOICE ROUTER
app.include_router(voice.router, prefix="/api/voice", tags=["voice"])
logger.info("✓ Voice router included at /api/voice")

# DATA ROUTER - THIS IS THE IMPORTANT ONE FOR CSV UPLOAD
app.include_router(data.router, prefix="/api/data", tags=["data"])
logger.info("✓ Data router included at /api/data")

# OPTIONAL ROUTERS
if analysis_router:
    app.include_router(analysis_router.router, prefix="/api/analysis", tags=["analysis"])
    logger.info("✓ Analysis router included at /api/analysis")

if models_router:
    app.include_router(models_router.router, prefix="/api/models", tags=["models"])
    logger.info("✓ Models router included at /api/models")

if explanations_router:
    app.include_router(explanations_router.router, prefix="/api/explanations", tags=["explanations"])
    logger.info("✓ Explanations router included at /api/explanations")

if chat_router:
    app.include_router(chat_router.router, prefix="/api/chat", tags=["chat"])
    logger.info("✓ Chat router included at /api/chat")

logger.info("All routers included successfully")

# Global exception handlers
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """Handle HTTP exceptions globally"""
    logger.warning(f"HTTP {exc.status_code}: {exc.detail} - {request.url}")
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "error": exc.detail,
            "detail": exc.detail,
            "status_code": exc.status_code,
            "path": str(request.url)
        }
    )

@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """Handle all other exceptions globally"""
    logger.error(f"Unhandled exception: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "error": "An unexpected error occurred",
            "detail": str(exc),
            "path": str(request.url)
        }
    )

# Startup event
@app.on_event("startup")
async def startup_event():
    """Log startup information"""
    logger.info("=" * 70)
    logger.info("🚀 IntelliML API Starting Up")
    logger.info("=" * 70)
    logger.info("Server: Uvicorn")
    logger.info("Framework: FastAPI")
    logger.info("Environment: Development")
    logger.info("CORS: Enabled for localhost:3000, localhost:3001")
    logger.info("=" * 70)
    
    # Log all registered routes
    logger.info("Registered routes:")
    for route in app.routes:
        if hasattr(route, 'methods') and hasattr(route, 'path'):
            methods = ', '.join(route.methods)
            logger.info(f"  {methods:8s} {route.path}")
    logger.info("=" * 70)

# Shutdown event
@app.on_event("shutdown")
async def shutdown_event():
    """Log shutdown information"""
    logger.info("=" * 70)
    logger.info("🛑 IntelliML API Shutting Down")
    logger.info("=" * 70)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )