from fastapi import APIRouter
from app.services.analysis_service import AnalysisService
from app.core.exceptions import DataProcessingError
import logging

logger = logging.getLogger(__name__)
router = APIRouter()

analysis_service = AnalysisService()

@router.post("/analyze")
async def analyze_data():
    """Perform comprehensive data analysis"""
    try:
        result = analysis_service.analyze_dataset()
        return result
    except Exception as e:
        logger.error(f"Analysis endpoint error: {str(e)}")
        raise DataProcessingError(f"Analysis failed: {str(e)}")