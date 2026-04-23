"""
================================================================================
Feature Engineering API
================================================================================

PURPOSE:
    Create new features from existing columns to improve model performance.
    Transforms raw data into model-ready features.

OPERATIONS:

1. POLYNOMIAL FEATURES
   - Create power terms: col^2, col^3, etc.
   - Useful for capturing non-linear relationships

2. LOG TRANSFORMATIONS
   - Apply log1p (log(x+1))
   - Handles zero values
   - Normalizes skewed distributions
   - Clip to ensure non-negative input

3. INTERACTION FEATURES
   - Multiply two columns: col1 * col2
   - Captures joint effect of features
   - Example: age * income captures demographic-economic interaction

4. BINNING/DISCRETIZATION
   - Convert continuous to categorical
   - Create quantile-based bins
   - Labels as integers (0, 1, 2, ...)

NEW FEATURE NAMING CONVENTION:
   - Polynomial: {column}_pow{degree}
     Example: age_pow2, price_pow3
   - Log: {column}_log
     Example: income_log
   - Interaction: {col1}_x_{col2}
     Example: age_x_income
   - Binning: {column}_binned
     Example: age_binned

================================================================================
"""

from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import pandas as pd
import numpy as np

from app.api.data import router, get_current_dataset, logger, make_json_safe
from app.services.data_service import DataService
from app.core.exceptions import NotFoundError, ValidationError, DataProcessingError


class FeatureEngineeringRequest(BaseModel):
    """
    Request model for feature engineering.
    
    Attributes:
        operation: Type of operation (polynomial, log, interaction, binning)
        columns: Columns to apply operation on
        params: Operation-specific parameters
    """
    operation: str
    columns: List[str]
    params: Optional[Dict[str, Any]] = None


@router.post("/engineer")
async def engineer_features(request: FeatureEngineeringRequest, session_id: str = "default"):
    """
    Create new features from existing columns.
    
    Request Body:
        {
            "operation": "polynomial",     # Operation type
            "columns": ["age", "income"],  # Columns to use
            "params": {                    # Operation parameters
                "degree": 2               # (for polynomial)
            }
        }
    
    Operations:
    
    1. POLYNOMIAL:
       {"operation": "polynomial", "columns": ["age"], "params": {"degree": 2}}
       Creates: age_pow2 = age^2
       
    2. LOG:
       {"operation": "log", "columns": ["income"]}
       Creates: income_log = log(income + 1)
       Note: Clips negative values to 0 first
       
    3. INTERACTION:
       {"operation": "interaction", "columns": ["age", "income"]}
       Creates: age_x_income = age * income
       
    4. BINNING:
       {"operation": "binning", "columns": ["age"], "params": {"bins": 5}}
       Creates: age_binned = discretized age (0, 1, 2, 3, 4)
       Uses pd.cut with 5 bins
    
    Returns:
        {
            "status": "success",
            "operation": "polynomial",
            "new_columns": ["age_pow2"],
            "total_columns": 11,
            "preview": {"age_pow2": [0, 4, 9, 16, ...]},
            "dataset_info": {
                "rows": 1000,
                "columns": ["col1", "age", "age_pow2", ...],
                ...
            }
        }
    
    Raises:
        NotFoundError: No dataset loaded
        ValidationError: Invalid operation/columns
        DataProcessingError: Transformation failed
    """
    state = get_current_dataset(session_id)
    df_current = state.get("df")
    
    if df_current is None:
        raise NotFoundError("No dataset loaded")

    try:
        # Create copy to avoid modifying original
        df = df_current.copy()
        new_columns = []
        params = request.params or {}

        # =====================================================================
        # OPERATION: POLYNOMIAL FEATURES
        # =====================================================================
        # Creates power terms: col^degree
        # Example: age_pow2, age_pow3
        if request.operation == "polynomial":
            degree = params.get("degree", 2)
            for col in request.columns:
                # Only apply to numeric columns
                if col in df.columns and df[col].dtype in [np.float64, np.int64]:
                    new_col = f"{col}_pow{degree}"
                    df[new_col] = df[col] ** degree
                    new_columns.append(new_col)

        # =====================================================================
        # OPERATION: LOG TRANSFORMATION
        # =====================================================================
        # Applies log1p (log(x + 1)) to handle zero values
        # Also clips negative values to 0 first
        # Useful for: income, population, counts
        elif request.operation == "log":
            for col in request.columns:
                if col in df.columns and df[col].dtype in [np.float64, np.int64]:
                    new_col = f"{col}_log"
                    # log1p = log(x + 1), safe for zeros
                    # clip(lower=0) ensures no negative values
                    df[new_col] = np.log1p(df[col].clip(lower=0))
                    new_columns.append(new_col)

        # =====================================================================
        # OPERATION: INTERACTION FEATURES
        # =====================================================================
        # Multiplies two columns together
        # Captures joint effect
        # Example: age * income = demographic-economic interaction
        elif request.operation == "interaction":
            if len(request.columns) >= 2:
                col1, col2 = request.columns[0], request.columns[1]
                if col1 in df.columns and col2 in df.columns:
                    new_col = f"{col1}_x_{col2}"
                    df[new_col] = df[col1] * df[col2]
                    new_columns.append(new_col)

        # =====================================================================
        # OPERATION: BINNING/DISCRETIZATION
        # =====================================================================
        # Converts continuous variable to categorical bins
        # Uses quantile-based binning
        # Returns integer labels (0, 1, 2, ...)
        elif request.operation == "binning":
            n_bins = params.get("bins", 5)
            for col in request.columns:
                if col in df.columns and df[col].dtype in [np.float64, np.int64]:
                    new_col = f"{col}_binned"
                    # pd.cut creates categorical bins
                    # labels=False returns integer codes
                    df[new_col] = pd.cut(df[col], bins=n_bins, labels=False)
                    new_columns.append(new_col)

        # =====================================================================
        # UPDATE STATE AND DATASERVICE
        # =====================================================================
        state["df"] = df
        DataService().set_dataframe(
            df,
            session_id=session_id,
            filename=state["info"]["filename"] if state.get("info") else None
        )

        # Generate preview of new columns
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
    except (NotFoundError, ValidationError):
        raise
    except Exception as e:
        logger.error(f"Feature engineering error: {str(e)}", exc_info=True)
        raise DataProcessingError(f"Feature engineering failed: {str(e)}")