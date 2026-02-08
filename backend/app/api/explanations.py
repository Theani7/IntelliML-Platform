from fastapi import APIRouter, HTTPException
from app.services.explanation_service import ExplanationService
import logging

logger = logging.getLogger(__name__)
router = APIRouter()

explanation_service = ExplanationService()

@router.get("/shap/{job_id}")
async def get_shap_explanations(job_id: str):
    """
    Get SHAP explanations for trained model
    """
    try:
        logger.info(f"Getting explanations for job: {job_id}")
        result = explanation_service.explain_model(job_id)
        return result
        
    except ValueError as e:
        logger.error(f"Job not found: {str(e)}")
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Explanation endpoint error: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))