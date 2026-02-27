"""
Feature Engineering Endpoints
Handles polynomial, log, interaction, and binning feature creation.
"""

from fastapi import HTTPException
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import pandas as pd
import numpy as np

from app.api.data import router, get_current_dataset, logger, make_json_safe
from app.services.data_service import DataService


class FeatureEngineeringRequest(BaseModel):
    operation: str  # polynomial, log, interaction, binning
    columns: List[str]
    params: Optional[Dict[str, Any]] = None


@router.post("/engineer")
async def engineer_features(request: FeatureEngineeringRequest, session_id: str = "default"):
    """Create new features from existing columns"""
    state = get_current_dataset(session_id)
    df_current = state.get("df")
    
    if df_current is None:
        raise HTTPException(status_code=404, detail="No dataset loaded")

    try:
        df = df_current.copy()
        new_columns = []
        params = request.params or {}

        if request.operation == "polynomial":
            degree = params.get("degree", 2)
            for col in request.columns:
                if col in df.columns and df[col].dtype in [np.float64, np.int64]:
                    new_col = f"{col}_pow{degree}"
                    df[new_col] = df[col] ** degree
                    new_columns.append(new_col)

        elif request.operation == "log":
            for col in request.columns:
                if col in df.columns and df[col].dtype in [np.float64, np.int64]:
                    new_col = f"{col}_log"
                    df[new_col] = np.log1p(df[col].clip(lower=0))
                    new_columns.append(new_col)

        elif request.operation == "interaction":
            if len(request.columns) >= 2:
                col1, col2 = request.columns[0], request.columns[1]
                if col1 in df.columns and col2 in df.columns:
                    new_col = f"{col1}_x_{col2}"
                    df[new_col] = df[col1] * df[col2]
                    new_columns.append(new_col)

        elif request.operation == "binning":
            n_bins = params.get("bins", 5)
            for col in request.columns:
                if col in df.columns and df[col].dtype in [np.float64, np.int64]:
                    new_col = f"{col}_binned"
                    df[new_col] = pd.cut(df[col], bins=n_bins, labels=False)
                    new_columns.append(new_col)

        # Update state dataset
        state["df"] = df
        DataService().set_dataframe(
            df,
            session_id=session_id,
            filename=state["info"]["filename"] if state.get("info") else None
        )

        preview_records = []
        for _, row in df.head(10).iterrows():
            safe_row = {col: make_json_safe(val) for col, val in row.items()}
            preview_records.append(safe_row)

        dataset_info = {
            "filename": state["info"]["filename"] if state.get("info") else "dataset.csv",
            "rows": len(df),
            "columns": df.columns.tolist(),
            "dtypes": {col: str(dtype) for col, dtype in df.dtypes.items()},
            "preview": preview_records
        }
        state["info"] = dataset_info

        return {
            "status": "success",
            "operation": request.operation,
            "new_columns": new_columns,
            "total_columns": len(df.columns),
            "preview": df[new_columns].head(5).to_dict() if new_columns else {},
            "dataset_info": dataset_info
        }
    except Exception as e:
        logger.error(f"Feature engineering error: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
