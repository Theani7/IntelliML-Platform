"""
Application Lifecycle Events (startup / shutdown)
"""

from fastapi import FastAPI
import logging

logger = logging.getLogger(__name__)


def register_lifecycle_events(app: FastAPI) -> None:
    """Register startup and shutdown event handlers."""

    @app.on_event("startup")
    async def startup_event():
        """Log startup information"""
        logger.info("=" * 70)
        logger.info("🚀 IntelliML API Starting Up")
        logger.info("=" * 70)
        logger.info("Server: Uvicorn")
        logger.info("Framework: FastAPI")
        logger.info("Environment: Development")
        logger.info("CORS: Enabled (wildcard for development)")
        logger.info("=" * 70)

        # Log all registered routes
        logger.info("Registered routes:")
        for route in app.routes:
            if hasattr(route, 'methods') and hasattr(route, 'path'):
                methods = ', '.join(route.methods)
                logger.info(f"  {methods:8s} {route.path}")
        logger.info("=" * 70)

    @app.on_event("shutdown")
    async def shutdown_event():
        """Log shutdown information"""
        logger.info("=" * 70)
        logger.info("🛑 IntelliML API Shutting Down")
        logger.info("=" * 70)
