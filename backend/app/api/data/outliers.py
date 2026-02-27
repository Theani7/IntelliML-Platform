"""
Outlier Detection & Removal Endpoints
Handles outlier detection (IQR/Z-score) and removal.
"""

from fastapi import HTTPException
from pydantic import BaseModel
from typing import Optional, List
import pandas as pd
import numpy as np

from app.api.data import router, get_current_dataset, logger, make_json_safe
from app.services.data_service import DataService


class OutlierRequest(BaseModel):
    columns: Optional[List[str]] = None
    method: str = "iqr"  # iqr or zscore
    threshold: float = 1.5  # IQR multiplier or Z-score threshold


@router.post("/outliers/detect")
async def detect_outliers(request: OutlierRequest, session_id: str = "default"):
    """Detect outliers in numeric columns using IQR or Z-score method"""
    state = get_current_dataset(session_id)
    df = state.get("df")
    
    if df is None:
        raise HTTPException(status_code=404, detail="No dataset loaded")

    try:
        df = state["df"]
        numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()

        # Filter to requested columns or use all numeric
        target_cols = request.columns if request.columns else numeric_cols
        target_cols = [c for c in target_cols if c in numeric_cols]

        outlier_info = []
        total_outlier_rows = set()

        for col in target_cols:
            col_data = df[col].dropna()

            if request.method == "zscore":
                from scipy import stats
                z_scores = np.abs(stats.zscore(col_data))
                outlier_mask = z_scores > request.threshold
            else:  # IQR
                q1 = col_data.quantile(0.25)
                q3 = col_data.quantile(0.75)
                iqr = q3 - q1
                lower = q1 - request.threshold * iqr
                upper = q3 + request.threshold * iqr
                outlier_mask = (col_data < lower) | (col_data > upper)

            outlier_indices = col_data[outlier_mask].index.tolist()
            total_outlier_rows.update(outlier_indices)

            outlier_info.append({
                "column": col,
                "outlier_count": int(outlier_mask.sum()),
                "percentage": round((outlier_mask.sum() / len(col_data)) * 100, 2),
                "sample_values": col_data[outlier_mask].head(5).tolist()
            })

        return {
            "method": request.method,
            "threshold": request.threshold,
            "total_outlier_rows": len(total_outlier_rows),
            "columns_analyzed": len(target_cols),
            "details": outlier_info
        }
    except Exception as e:
        logger.error(f"Outlier detection error: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/outliers/remove")
async def remove_outliers(request: OutlierRequest, session_id: str = "default"):
    """Remove outliers from dataset"""
    state = get_current_dataset(session_id)
    df_current = state.get("df")
    
    if df_current is None:
        raise HTTPException(status_code=404, detail="No dataset loaded")

    try:
        df = df_current.copy()
        original_rows = len(df)
        numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()

        target_cols = request.columns if request.columns else numeric_cols
        target_cols = [c for c in target_cols if c in numeric_cols]

        rows_to_remove = set()

        for col in target_cols:
            col_data = df[col]

            if request.method == "zscore":
                from scipy import stats
                z_scores = np.abs(stats.zscore(col_data.dropna()))
                mask = pd.Series(False, index=df.index)
                mask.loc[col_data.dropna().index] = z_scores > request.threshold
            else:  # IQR
                q1 = col_data.quantile(0.25)
                q3 = col_data.quantile(0.75)
                iqr = q3 - q1
                lower = q1 - request.threshold * iqr
                upper = q3 + request.threshold * iqr
                mask = (col_data < lower) | (col_data > upper)

            rows_to_remove.update(df[mask].index.tolist())

        # Remove outlier rows
        df = df.drop(index=list(rows_to_remove))

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
            "original_rows": original_rows,
            "removed_rows": len(rows_to_remove),
            "remaining_rows": len(df),
            "columns_processed": target_cols,
            "dataset_info": dataset_info
        }
    except Exception as e:
        logger.error(f"Outlier removal error: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
