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

MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB

class UploadResponse(BaseModel):
    filename: str
    rows: int
    columns: list
    dtypes: dict
    preview: list


@router.post("/upload")
async def upload_file(file: UploadFile = File(...), session_id: str = "default"):
    """
    Upload a CSV file and store it in session registry
    """
    content = await file.read()
    
    if len(content) > MAX_FILE_SIZE:
        raise ValidationError(
            f"File too large. Maximum size is {MAX_FILE_SIZE // (1024*1024)}MB",
            details={"max_size_mb": MAX_FILE_SIZE // (1024*1024)}
        )

    if not file.filename.endswith('.csv'):
        raise ValidationError(
            "Only CSV files are supported",
            details={"supported_types": [".csv"]}
        )

    logger.info(f"Uploading file: {file.filename} ({len(content)} bytes)")

    with tempfile.NamedTemporaryFile(delete=False, suffix='.csv', mode='wb') as temp_file:
        temp_file.write(content)
        temp_path = temp_file.name

    try:
        df = pd.read_csv(temp_path)
        
        if df.empty:
            raise ValidationError("The CSV file is empty")
        
        state = get_current_dataset(session_id)
        state["df"] = df

        data_service.process_uploaded_file(content, file.filename, session_id=session_id)
        logger.info("✓ DataFrame synced to DataService for session access")

        preview_records = []
        for _, row in df.head(10).iterrows():
            safe_row = {col: make_json_safe(val) for col, val in row.items()}
            preview_records.append(safe_row)

        info = {
            "filename": file.filename,
            "rows": len(df),
            "columns": df.columns.tolist(),
            "dtypes": {col: str(dtype) for col, dtype in df.dtypes.items()},
            "preview": preview_records
        }

        state["info"] = info
        logger.info(f"✓ File uploaded successfully: {info['rows']} rows")

        return info

    except (ValidationError, DataProcessingError):
        raise
    except pd.errors.ParserError as e:
        raise DataProcessingError(f"Failed to parse CSV: {str(e)}")
    except Exception as e:
        logger.error(f"Upload error: {str(e)}", exc_info=True)
        raise DataProcessingError(f"Upload failed: {str(e)}")
    finally:
        if os.path.exists(temp_path):
            os.unlink(temp_path)


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