"""
CORS Middleware Configuration
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware


def setup_cors(app: FastAPI) -> None:
    """Configure CORS middleware for the FastAPI application."""
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],  # Allow all origins in development
        allow_credentials=False,  # Must be False when using wildcard origins
        allow_methods=["*"],
        allow_headers=["*"],
        expose_headers=["*"],
    )
