from fastapi import APIRouter
from app.core.exceptions import NotFoundError, MLTrainingError
import logging

logger = logging.getLogger(__name__)
router = APIRouter()

_explanation_service = None


def get_explanation_service():
    global _explanation_service
    if _explanation_service is None:
        from app.services.explanation_service import ExplanationService
        _explanation_service = ExplanationService()
    return _explanation_service

@router.get("/shap/{job_id}")
async def get_shap_explanations(job_id: str):
    """Get SHAP explanations for trained model"""
    try:
        logger.info(f"Getting explanations for job: {job_id}")
        explanation_service = get_explanation_service()
        result = explanation_service.explain_model(job_id)
        return result
        
    except NotFoundError:
        raise
    except Exception as e:
        logger.error(f"Explanation endpoint error: {str(e)}", exc_info=True)
        raise MLTrainingError(f"Failed to get explanations: {str(e)}")
