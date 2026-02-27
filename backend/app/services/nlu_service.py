"""
Backward-compatibility shim.
The NLUService class has been moved to app.services.nlu.service.
This file re-exports it so existing imports continue to work.
"""

from app.services.nlu import NLUService  # noqa: F401

__all__ = ["NLUService"]