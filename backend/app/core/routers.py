"""
Router Registration
Imports and registers all API routers on the FastAPI application.
"""

from fastapi import FastAPI
import logging

logger = logging.getLogger(__name__)


def register_routers(app: FastAPI) -> None:
    """Import and include all API routers."""
    logger.info("Importing routers...")

    # Core routers (required)
    try:
        from app.api import voice, data, auth
        logger.info("✓ Core routers imported successfully")
    except Exception as e:
        logger.error(f"Failed to import core routers: {e}", exc_info=True)
        raise

    # Optional routers
    analysis_router = _try_import("app.api.analysis", "Analysis")
    models_router = _try_import("app.api.models", "Models")
    explanations_router = _try_import("app.api.explanations", "Explanations")
    chat_router = _try_import("app.api.chat", "Chat")
    admin_router = _try_import("app.api.admin", "Admin")

    # Include routers
    logger.info("Including routers...")

    app.include_router(voice.router, prefix="/api/voice", tags=["voice"])
    logger.info("✓ Voice router included at /api/voice")

    app.include_router(data.router, prefix="/api/data", tags=["data"])
    logger.info("✓ Data router included at /api/data")

    app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
    logger.info("✓ Auth router included at /api/auth")

    _include_optional(app, analysis_router, "/api/analysis", "analysis", "Analysis")
    _include_optional(app, models_router, "/api/models", "models", "Models")
    _include_optional(app, explanations_router, "/api/explanations", "explanations", "Explanations")
    _include_optional(app, chat_router, "/api/chat", "chat", "Chat")
    _include_optional(app, admin_router, "/api/admin", "admin", "Admin")

    logger.info("All routers included successfully")


def _try_import(module_path: str, name: str):
    """Try to import an optional router module."""
    try:
        import importlib
        module = importlib.import_module(module_path)
        if hasattr(module, 'router'):
            logger.info(f"✓ {name} router imported (has router)")
        else:
            logger.warning(f"{name} module imported but no 'router' attribute found")
        return module
    except Exception as e:
        logger.error(f"{name} router import FAILED: {e}")
        import traceback
        traceback.print_exc()
        return None


def _include_optional(app: FastAPI, module, prefix: str, tag: str, name: str) -> None:
    """Include an optional router if it was successfully imported."""
    if module is not None:
        app.include_router(module.router, prefix=prefix, tags=[tag])
        logger.info(f"✓ {name} router included at {prefix}")
