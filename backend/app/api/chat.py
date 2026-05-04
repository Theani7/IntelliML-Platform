"""
Chat API Router
Handles AI-powered data chat functionality
"""

from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional, Any
import logging

from app.services.data_chat_service import data_chat_service
from app.core.exceptions import NotFoundError, DataProcessingError

logger = logging.getLogger(__name__)
router = APIRouter(tags=["chat"])


class ChatMessage(BaseModel):
    message: str


class ChatResponse(BaseModel):
    text: str
    code: Optional[str] = None
    output: Optional[Any] = None  # Allow any type for output
    visualization: Optional[str] = None
    error: bool = False


@router.post("/message", response_model=ChatResponse)
async def send_message(request: ChatMessage, session_id: str = "default"):
    """Send a message to the AI data assistant."""
    logger.info(f"Chat message received: {request.message[:50]}...")
    
    result = data_chat_service.chat(request.message, session_id=session_id)
    return ChatResponse(**result)


@router.get("/suggestions")
async def get_visualization_suggestions(session_id: str = "default"):
    """Get AI-suggested visualizations based on the current dataset."""
    try:
        suggestions = data_chat_service.get_visualization_suggestions(session_id=session_id)
        return {"suggestions": suggestions}
    except NotFoundError:
        raise
    except Exception as e:
        logger.error(f"Suggestions error: {str(e)}")
        raise DataProcessingError(f"Failed to get suggestions: {str(e)}")


@router.post("/clear")
async def clear_chat_history(session_id: str = "default"):
    """Clear the conversation history"""
    data_chat_service.clear_history(session_id=session_id)
    return {"message": "Chat history cleared"}