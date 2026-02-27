"""
Data Cleaning Endpoints
Handles data cleaning operations (drop, fill, rename, cast, etc.) and quality analysis.
"""

from fastapi import HTTPException
import pandas as pd
import numpy as np
from typing import Dict, Any
import json

from app.api.data import router, get_current_dataset, logger, make_json_safe
from app.services.data_service import DataService


@router.post("/clean")
async def clean_data(request: Dict[str, Any], session_id: str = "default"):
    """
    Apply data cleaning operations to the current dataset.
    ...
    """
    state = get_current_dataset(session_id)
    df = state.get("df")
    
    if df is None:
        raise HTTPException(status_code=404, detail="No dataset loaded. Please upload a file first.")

    try:
        operation = request.get("operation")
        params = request.get("params", {})

        df = state["df"]
        logger.info(f"Applying operation '{operation}' with params: {params}")

        # Helper to get history status
        def get_history_status():
            return {
                "can_undo": len(state["history"]) > 0,
                "can_redo": len(state["future"]) > 0
            }

        # --- UNDO / REDO LOGIC ---
        if operation == "undo":
            if not state["history"]:
                raise HTTPException(status_code=400, detail="Nothing to undo")

            # Save current to future
            state["future"].append((df.copy(), state["info"]))

            # Pop from history
            prev_df, prev_info = state["history"].pop()
            state["df"] = prev_df
            state["info"] = prev_info
            # Sync to shared data service session
            DataService().set_dataframe(prev_df, session_id=session_id, filename=state["info"]["filename"] if state.get("info") else None)

            return {
                "status": "success",
                "message": "Undone last operation",
                "dataset_info": prev_info,
                "history_status": get_history_status()
            }

        elif operation == "redo":
            if not state["future"]:
                raise HTTPException(status_code=400, detail="Nothing to redo")

            # Save current to history
            state["history"].append((df.copy(), state["info"]))

            # Pop from future
            next_df, next_info = state["future"].pop()
            state["df"] = next_df
            state["info"] = next_info
            # Sync to shared data service session
            DataService().set_dataframe(next_df, session_id=session_id, filename=state["info"]["filename"] if state.get("info") else None)

            return {
                "status": "success",
                "message": "Redone last operation",
                "dataset_info": next_info,
                "history_status": get_history_status()
            }

        # --- NORMAL OPERATIONS ---
        # Save state before modification
        if operation in ["drop_column", "fill_na", "drop_na", "drop_duplicates", "rename", "cast", "encode", "handle_outliers", "scale"]:
            # Limit history size to 20 to prevent memory explosion
            if len(state["history"]) >= 20:
                state["history"].pop(0)

            state["history"].append((df.copy(), state["info"]))
            # Clear future stack on new operation
            state["future"] = []

        if operation == "drop_column":
            col = params.get("column")
            if col and col in df.columns:
                df.drop(columns=[col], inplace=True)

        elif operation == "fill_na":
            col = params.get("column")
            value = params.get("value")
            method = params.get("method")  # 'mean', 'median', 'mode'

            if col and col in df.columns:
                if method:
                    if method == 'mean' and pd.api.types.is_numeric_dtype(df[col]):
                        fill_val = df[col].mean()
                    elif method == 'median' and pd.api.types.is_numeric_dtype(df[col]):
                        fill_val = df[col].median()
                    elif method == 'mode':
                        mode_res = df[col].mode()
                        fill_val = mode_res.iloc[0] if not mode_res.empty else 0
                    else:
                        fill_val = 0  # Default fallback
                    df[col] = df[col].fillna(fill_val)
                elif value is not None:
                    df[col] = df[col].fillna(value)
            elif not col:
                pass

        elif operation == "drop_na":
            df.dropna(inplace=True)
            df.reset_index(drop=True, inplace=True)

        elif operation == "drop_duplicates":
            df.drop_duplicates(inplace=True)
            df.reset_index(drop=True, inplace=True)

        elif operation == "rename":
            old_name = params.get("column")
            new_name = params.get("new_name")
            if old_name in df.columns and new_name:
                df.rename(columns={old_name: new_name}, inplace=True)

        elif operation == "cast":
            col = params.get("column")
            dtype = params.get("type")
            if col in df.columns:
                try:
                    if dtype == 'int':
                        df[col] = pd.to_numeric(df[col], errors='coerce').fillna(0).astype(int)
                    elif dtype == 'float' or dtype == 'numeric':
                        df[col] = pd.to_numeric(df[col], errors='coerce')
                    elif dtype == 'datetime':
                        df[col] = pd.to_datetime(df[col], errors='coerce')
                    elif dtype == 'categorical':
                        df[col] = df[col].astype('category')
                    elif dtype == 'string':
                        df[col] = df[col].astype('string')
                except Exception as e:
                    logger.warning(f"Cast failed for {col} to {dtype}: {e}")
                    raise HTTPException(status_code=400, detail=f"Failed to cast {col} to {dtype}")

        elif operation == "encode":
            col = params.get("column")
            method = params.get("method")  # 'one_hot', 'label'
            if col in df.columns:
                if method == 'one_hot':
                    dummies = pd.get_dummies(df[col], prefix=col, drop_first=True)
                    dummies = dummies.astype(int)
                    df = pd.concat([df, dummies], axis=1)
                    df.drop(columns=[col], inplace=True)
                elif method == 'label':
                    from sklearn.preprocessing import LabelEncoder
                    le = LabelEncoder()
                    temp_col = df[col].astype(str)
                    df[col] = le.fit_transform(temp_col)

        elif operation == "handle_outliers":
            col = params.get("column")
            method = params.get("method")  # 'clip', 'drop'
            threshold = float(params.get("threshold", 1.5))

            if col in df.columns and pd.api.types.is_numeric_dtype(df[col]):
                Q1 = df[col].quantile(0.25)
                Q3 = df[col].quantile(0.75)
                IQR = Q3 - Q1
                lower_bound = Q1 - threshold * IQR
                upper_bound = Q3 + threshold * IQR

                if method == 'clip':
                    df[col] = df[col].clip(lower=lower_bound, upper=upper_bound)
                elif method == 'drop':
                    df = df[(df[col] >= lower_bound) & (df[col] <= upper_bound)]
                    df.reset_index(drop=True, inplace=True)

        elif operation == "scale":
            col = params.get("column")
            method = params.get("method")  # 'standard', 'minmax'

            if col in df.columns and pd.api.types.is_numeric_dtype(df[col]):
                from sklearn.preprocessing import StandardScaler, MinMaxScaler

                data_reshaped = df[col].values.reshape(-1, 1)

                if method == 'standard':
                    scaler = StandardScaler()
                    df[col] = scaler.fit_transform(data_reshaped).flatten()
                elif method == 'minmax':
                    scaler = MinMaxScaler()
                    df[col] = scaler.fit_transform(data_reshaped).flatten()
            else:
                raise HTTPException(status_code=400, detail=f"Column {col} is not numeric or not found")

        else:
            raise HTTPException(status_code=400, detail=f"Unknown operation: {operation}")

        # Update state reference (and Service sync)
        state["df"] = df
        # Sync to shared data service session
        DataService().set_dataframe(df, session_id=session_id, filename=state["info"]["filename"] if state.get("info") else None)

        # Regenerate info
        preview_records = []
        for _, row in df.head(10).iterrows():
            safe_row = {col: make_json_safe(val) for col, val in row.items()}
            preview_records.append(safe_row)

        new_info = {
            "filename": state["info"]["filename"],
            "rows": len(df),
            "columns": df.columns.tolist(),
            "dtypes": {col: str(dtype) for col, dtype in df.dtypes.items()},
            "preview": preview_records
        }
        state["info"] = new_info

        return {
            "status": "success",
            "message": f"Operation {operation} applied successfully",
            "dataset_info": new_info,
            "history_status": get_history_status()
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Cleaning error: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/quality")
async def analyze_quality(session_id: str = "default"):
    """
    Analyze data quality (missing values, types, outliers, encoding) and get AI recommendations.
    """
    state = get_current_dataset(session_id)
    df = state.get("df")
    
    if df is None:
        raise HTTPException(status_code=404, detail="No dataset loaded")

    try:
        df = state["df"]
        total_rows = len(df)

        # 1. Missing Values
        missing_summary = []
        for col in df.columns:
            missing_count = int(df[col].isnull().sum())
            if missing_count > 0:
                dtype = str(df[col].dtype)
                missing_pct = round((missing_count / total_rows) * 100, 2)

                recommendation = "impute"
                if missing_pct > 50: recommendation = "drop_column"
                elif missing_pct < 5: recommendation = "drop_rows"

                missing_summary.append({
                    "column": col,
                    "count": missing_count,
                    "percentage": missing_pct,
                    "dtype": dtype,
                    "heuristic_recommendation": recommendation
                })

        # 2. Encoding Needs (Categorical columns)
        encoding_summary = []
        categorical_cols = df.select_dtypes(include=['object', 'category', 'string']).columns

        for col in categorical_cols:
            if col not in [m['column'] for m in missing_summary]:
                unique_count = df[col].nunique()
                rec = "one_hot" if unique_count < 10 else "label"
                encoding_summary.append({
                    "column": col,
                    "cardinality": unique_count,
                    "dtype": str(df[col].dtype),
                    "heuristic_recommendation": rec
                })

        # 3. Outlier Detection (Numeric columns)
        outlier_summary = []
        numeric_cols = df.select_dtypes(include=[np.number]).columns

        for col in numeric_cols:
            Q1 = df[col].quantile(0.25)
            Q3 = df[col].quantile(0.75)
            IQR = Q3 - Q1
            lower = Q1 - 1.5 * IQR
            upper = Q3 + 1.5 * IQR

            outliers = df[(df[col] < lower) | (df[col] > upper)]
            outlier_count = len(outliers)

            if outlier_count > 0:
                outlier_pct = round((outlier_count / total_rows) * 100, 2)
                outlier_summary.append({
                    "column": col,
                    "count": outlier_count,
                    "percentage": outlier_pct,
                    "heuristic_recommendation": "clip"
                })

        # 4. Get AI Recommendations
        ai_recommendations = {}
        if missing_summary or encoding_summary or outlier_summary:
            from app.core.groq_client import groq_client

            prompt = f"""
            Analyze these data quality issues and suggest the BEST cleaning strategy for each.

            Dataset Context: {total_rows} rows.

            1. Missing Values:
            {json.dumps(missing_summary, indent=2)}

            2. Categorical Columns (Need Encoding?):
            {json.dumps(encoding_summary, indent=2)}

            3. Outliers Identified:
            {json.dumps(outlier_summary, indent=2)}

            Return ONLY a valid JSON object mapping column names to strategies.
            Format:
            {{
                "column_name": {{
                    "strategy": "mean" | "median" | "mode" | "drop_rows" | "drop_column" | "one_hot" | "label" | "clip" | "drop_outliers",
                    "reasoning": "Brief explanation why"
                }}
            }}
            """

            try:
                import re
                ai_response = groq_client.chat_completion([
                    {"role": "system", "content": "You are a data cleaning expert. Output valid JSON only."},
                    {"role": "user", "content": prompt}
                ])

                json_match = re.search(r'\{.*\}', ai_response, re.DOTALL)
                if json_match:
                    ai_recommendations = json.loads(json_match.group(0))
            except Exception as e:
                logger.error(f"AI recommendation failed: {e}")

        # Helper to merge AI recommendation
        def enhance_summary(summary_list, default_rec_key="heuristic_recommendation"):
            for item in summary_list:
                col = item["column"]
                if col in ai_recommendations:
                    rec = ai_recommendations[col]
                    item["ai_recommendation"] = rec.get("strategy")
                    item["ai_reasoning"] = rec.get("reasoning")
                else:
                    item["ai_recommendation"] = item[default_rec_key]
                    item["ai_reasoning"] = "Heuristic suggestion (AI unavailable)"

        enhance_summary(missing_summary)
        enhance_summary(encoding_summary)
        enhance_summary(outlier_summary)

        return {
            "status": "success",
            "total_rows": total_rows,
            "columns_with_missing": len(missing_summary),
            "missing_summary": missing_summary,
            "encoding_summary": encoding_summary,
            "outlier_summary": outlier_summary
        }

    except Exception as e:
        logger.error(f"Quality analysis error: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
