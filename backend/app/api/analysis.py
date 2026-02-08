from fastapi import APIRouter, HTTPException
from app.services.analysis_service import AnalysisService
import logging

logger = logging.getLogger(__name__)
router = APIRouter()

analysis_service = AnalysisService()

@router.post("/analyze")
async def analyze_data():
    """
    Perform comprehensive data analysis
    
    Returns:
        Statistical analysis + AI-generated insights
    """
    try:
        result = analysis_service.analyze_dataset()
        return result
        
    except Exception as e:
        logger.error(f"Analysis endpoint error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))