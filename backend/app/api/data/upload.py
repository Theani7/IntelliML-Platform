"""
Data Upload & Info Endpoints
Handles file upload, dataset info, columns, and test-data.
"""

from fastapi import File, UploadFile
from pydantic import BaseModel
import pandas as pd
import tempfile
import os

from app.api.data import router, get_current_dataset, data_service, logger, make_json_safe
from app.services.data_service import DataService
from app.core.exceptions import ValidationError, NotFoundError, DataProcessingError

from app.config import settings

@router.post("/upload")
async def upload_file(file: UploadFile = File(...), session_id: str = "default"):
    """
    Upload a CSV file and store it in session registry
    """
    # Use FastAPI's file size attribute if available, otherwise read a bit to check
    # But for simplicity and because we need content anyway, we'll read it once.
    content = await file.read()
    file_size = len(content)
    
    if file_size > settings.MAX_FILE_SIZE:
        raise ValidationError(
            f"File too large. Maximum size is {settings.MAX_FILE_SIZE // (1024*1024)}MB",
            details={"max_size_mb": settings.MAX_FILE_SIZE // (1024*1024)}
        )

    if not file.filename.endswith('.csv'):
        # For now, the endpoint logic below is CSV-centric, 
        # but DataService supports Excel/JSON. 
        # Let's keep it CSV-only for now as per original code or expand if needed.
        if not file.filename.endswith(('.xlsx', '.xls', '.json')):
             raise ValidationError(
                "Unsupported file format",
                details={"supported_types": [".csv", ".xlsx", ".xls", ".json"]}
            )

    logger.info(f"Uploading file: {file.filename} ({file_size} bytes)")

    try:
        # Process once using DataService (which handles format detection and parsing)
        info = data_service.process_uploaded_file(content, file.filename, session_id=session_id)
        
        # Sync to local registry (used by other endpoints in this package)
        df = data_service.get_dataframe(session_id)
        state = get_current_dataset(session_id)
        state["df"] = df
        state["info"] = info
        
        logger.info(f"✓ File uploaded and synced successfully: {info.get('rows', 'unknown')} rows")

        return info

    except (ValidationError, DataProcessingError):
        raise
    except Exception as e:
        logger.error(f"Upload error: {str(e)}", exc_info=True)
        raise DataProcessingError(f"Upload failed: {str(e)}")


@router.get("/info")
async def get_dataset_info(session_id: str = "default"):
    """Get information about the session dataset"""
    state = get_current_dataset(session_id)
    if state["df"] is None:
        raise NotFoundError("No dataset loaded")

    return state["info"]


@router.get("/columns")
async def get_columns(session_id: str = "default"):
    """Get list of columns in the session dataset"""
    state = get_current_dataset(session_id)
    if state["df"] is None:
        raise NotFoundError("No dataset loaded")

    return {
        "columns": state["df"].columns.tolist()
    }


@router.get("/test-data")
async def test_data(session_id: str = "default"):
    """Test endpoint to verify data is loaded correctly"""
    try:
        state = get_current_dataset(session_id)
        if state["df"] is None:
            return {
                "status": "no_data",
                "message": "No dataset loaded",
                "data_info": None
            }

        df = state["df"]
        info = state["info"]

        return {
            "status": "data_loaded",
            "message": f"Dataset loaded with {len(df)} rows and {len(df.columns)} columns",
            "data_info": {
                "filename": info.get("filename"),
                "rows": len(df),
                "columns": len(df.columns),
                "column_names": df.columns.tolist()[:5],
                "sample_data": df.head(3).to_dict('records')
            }
        }
    except Exception as e:
        logger.error(f"Test data error: {str(e)}", exc_info=True)
        return {
            "status": "error",
            "message": f"Error: {str(e)}",
            "data_info": None
        }


@router.post("/reset")
async def reset_session_data(session_id: str = "default"):
    """Reset dataset and session state for the current session_id."""
    try:
        state = get_current_dataset(session_id)
        state["df"] = None
        state["info"] = None
        state["history"] = []
        state["future"] = []

        DataService().clear_session(session_id=session_id)

        return {"status": "ok", "message": "Session reset successfully"}
    except Exception as e:
        logger.error(f"Session reset error: {str(e)}", exc_info=True)
        raise DataProcessingError(f"Failed to reset session: {str(e)}")