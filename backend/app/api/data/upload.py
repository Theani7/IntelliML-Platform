"""
Data Upload & Info Endpoints
Handles file upload, dataset info, columns, and test-data.
"""

from fastapi import File, UploadFile, HTTPException
import pandas as pd
import tempfile
import os

from app.api.data import router, get_current_dataset, data_service, logger, make_json_safe
from app.services.data_service import DataService


MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB

@router.post("/upload")
async def upload_file(file: UploadFile = File(...), session_id: str = "default"):
    """
    Upload a CSV file and store it in session registry
    """
    try:
        # Security Guard: File size limit
        content = await file.read()
        if len(content) > MAX_FILE_SIZE:
             raise HTTPException(
                status_code=413,
                detail=f"File too large. Maximum size is {MAX_FILE_SIZE // (1024*1024)}MB"
            )

        # Validate file type
        if not file.filename.endswith('.csv'):
            raise HTTPException(
                status_code=400,
                detail="Only CSV files are supported"
            )

        logger.info(f"Uploading file: {file.filename} ({len(content)} bytes)")

        # Save to temporary file for pandas
        with tempfile.NamedTemporaryFile(delete=False, suffix='.csv', mode='wb') as temp_file:
            temp_file.write(content)
            temp_path = temp_file.name

        try:
            # Read CSV with pandas
            df = pd.read_csv(temp_path)

            # Store in session registry
            state = get_current_dataset(session_id)
            state["df"] = df

            # Sync to DataService
            data_service.process_uploaded_file(content, file.filename, session_id=session_id)
            logger.info("✓ DataFrame synced to DataService for session access")

            # Create JSON-safe preview
            preview_records = []
            for _, row in df.head(10).iterrows():
                safe_row = {col: make_json_safe(val) for col, val in row.items()}
                preview_records.append(safe_row)

            # Get dataset info
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

        finally:
            # Clean up temp file
            if os.path.exists(temp_path):
                os.unlink(temp_path)

    except pd.errors.EmptyDataError:
        raise HTTPException(status_code=400, detail="The CSV file is empty")
    except pd.errors.ParserError as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse CSV: {str(e)}")
    except Exception as e:
        logger.error(f"Upload error: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")


@router.get("/info")
async def get_dataset_info(session_id: str = "default"):
    """
    Get information about the session dataset
    """
    state = get_current_dataset(session_id)
    if state["df"] is None:
        raise HTTPException(status_code=404, detail="No dataset loaded.")

    return state["info"]


@router.get("/columns")
async def get_columns(session_id: str = "default"):
    """
    Get list of columns in the session dataset
    """
    state = get_current_dataset(session_id)
    if state["df"] is None:
        raise HTTPException(status_code=404, detail="No dataset loaded.")

    return {
        "columns": state["df"].columns.tolist()
    }


@router.get("/test-data")
async def test_data(session_id: str = "default"):
    """
    Test endpoint to verify data is loaded correctly
    """
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
                "column_names": df.columns.tolist()[:5],  # First 5 columns
                "sample_data": df.head(3).to_dict('records')  # First 3 rows
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
    """
    Reset dataset and session state for the current session_id.
    """
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
        raise HTTPException(status_code=500, detail=f"Failed to reset session: {str(e)}")
