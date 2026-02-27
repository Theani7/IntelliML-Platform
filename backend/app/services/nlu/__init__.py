"""
NLU Service Package
Natural Language Understanding for AutoML voice commands.
Split into sub-modules: parser (intent parsing), handlers (intent execution), service (main class).
"""

from app.services.nlu.service import NLUService  # noqa: F401

__all__ = ["NLUService"]
