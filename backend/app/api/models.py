from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.services.ml_service import MLService
from typing import Optional, List
import logging

logger = logging.getLogger(__name__)
router = APIRouter()

# Create singleton instance
ml_service = MLService()

class TrainRequest(BaseModel):
    target_column: str
    model_types: Optional[List[str]] = None

@router.post("/train")
async def train_models(request: TrainRequest):
    """
    Train ML models on current dataset
    """
    try:
        logger.info(f"Received training request for target: {request.target_column}")
        
        result = ml_service.train_models(
            target_column=request.target_column,
            model_types=request.model_types
        )
        
        logger.info(f"Training successful. Job ID: {result['job_id']}")
        return result
        
    except ValueError as e:
        logger.error(f"Validation error: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Model training endpoint error: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/status/{job_id}")
async def get_training_status(job_id: str):
    """Get status of training job"""
    try:
        status = ml_service.get_job_status(job_id)
        return status
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Get status error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/results/{job_id}")
async def get_model_results(job_id: str):
    """Get complete results of training job"""
    try:
        results = ml_service.get_job_results(job_id)
        return results
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Get results error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))