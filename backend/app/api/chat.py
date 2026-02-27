"""
Chat API Router
Handles AI-powered data chat functionality
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
import logging

from app.services.data_chat_service import data_chat_service

logger = logging.getLogger(__name__)
router = APIRouter(tags=["chat"])


class ChatMessage(BaseModel):
    message: str


class ChatResponse(BaseModel):
    text: str
    code: Optional[str] = None
    output: Optional[str] = None
    visualization: Optional[str] = None
    error: bool = False


@router.post("/message", response_model=ChatResponse)
async def send_message(request: ChatMessage, session_id: str = "default"):
    """
    Send a message to the AI data assistant.
    
    The AI can:
    - Answer questions about your dataset
    - Generate and execute Python code
    - Create visualizations
    - Provide data insights
    """
    try:
        logger.info(f"Chat message received: {request.message[:50]}...")
        
        result = data_chat_service.chat(request.message, session_id=session_id)
        
        return ChatResponse(**result)
        
    except Exception as e:
        logger.error(f"Chat endpoint error: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/suggestions")
async def get_visualization_suggestions(session_id: str = "default"):
    """
    Get AI-suggested visualizations based on the current dataset.
    
    Returns a list of suggested charts with:
    - Type (histogram, scatter, heatmap, etc.)
    - Title and description
    - Python code to generate the visualization
    """
    try:
        suggestions = data_chat_service.get_visualization_suggestions(session_id=session_id)
        return {"suggestions": suggestions}
        
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Suggestions error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/clear")
async def clear_chat_history(session_id: str = "default"):
    """Clear the conversation history"""
    data_chat_service.clear_history(session_id=session_id)
    return {"message": "Chat history cleared"}
