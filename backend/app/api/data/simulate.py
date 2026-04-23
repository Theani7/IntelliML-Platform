from pydantic import BaseModel
from typing import Dict, Any, List
import pandas as pd
import numpy as np

from app.api.data import router, get_current_dataset, logger, make_json_safe
from app.services.ml_service import ml_service
from app.core.exceptions import ValidationError, NotFoundError, MLTrainingError

class SimulateRequest(BaseModel):
    features: Dict[str, Any]

@router.get("/simulate/schema/{job_id}")
async def get_simulation_schema(job_id: str, session_id: str = "default"):
    """Returns the required feature schema to build the frontend simulation form."""
    job = ml_service.jobs.get(job_id)
    if not job:
        raise NotFoundError(f"Job {job_id} not found")

    state = get_current_dataset(session_id)
    df = state.get("df")
    if df is None:
        raise ValidationError("Original dataset not found in memory")

    feature_names = job['results'].get('feature_names', [])
    if not feature_names:
        raise ValidationError("Feature names not found in job results")

    target_column = job.get('target_column')
    trainer = job.get('trainer')
    dropped_cols = set(getattr(trainer, '_dropped_columns', [])) if trainer else set()
    
    original_features = [col for col in df.columns if col != target_column and col not in dropped_cols]

    schema = []
    for col in original_features:
        series = df[col]
        if pd.api.types.is_numeric_dtype(series):
            min_val = float(series.min())
            max_val = float(series.max())
            span = max_val - min_val
            step = 1.0 if pd.api.types.is_integer_dtype(series) else max(span / 100.0, 0.01)
            schema.append({
                "name": col,
                "type": "numeric",
                "min": min_val,
                "max": max_val,
                "mean": float(series.mean()),
                "step": step
            })
        else:
            categories = series.dropna().unique().tolist()
            if not categories:
                categories = [""]
            schema.append({
                "name": col,
                "type": "categorical",
                "categories": categories
            })

    return {"schema": schema, "target_column": target_column}

@router.post("/simulate/predict/{job_id}")
async def simulate_prediction(job_id: str, request: SimulateRequest, session_id: str = "default"):
    """
    Accepts raw UI features, processes them exactly like the training data,
    predicts the outcome using the best model, and runs a localized SHAP explanation.
    """
    try:
        import shap
        
        job = ml_service.jobs.get(job_id)
        if not job:
            raise NotFoundError(f"Job {job_id} not found")

        trainer = job.get('trainer')
        if not trainer:
            raise ValidationError("Model trainer object lost from memory")

        feature_names = job['results'].get('feature_names', [])

        best_server = trainer.get_best_model_server()
        if not best_server or not hasattr(best_server, 'trained_model'):
            raise ValidationError("Trained model lost from memory")

        input_df = pd.DataFrame([request.features])
        features_array = trainer.preprocess_for_inference(input_df)

        model = best_server.trained_model
        prediction = model.predict(features_array)[0]
        
        probability = None
        if hasattr(model, 'predict_proba'):
            try:
                proba = model.predict_proba(features_array)[0]
                probability = float(max(proba))
            except Exception:
                pass

        raw_prediction = prediction
        if hasattr(trainer, 'label_encoder') and trainer.label_encoder is not None:
            try:
                prediction = trainer.label_encoder.inverse_transform([int(prediction)])[0]
            except Exception:
                pass

        try:
            explainer = shap.TreeExplainer(model)
            shap_values = explainer.shap_values(features_array)
        except Exception:
            background = trainer.X_train[:50] if hasattr(trainer, 'X_train') and trainer.X_train is not None else features_array
            explainer = shap.KernelExplainer(model.predict, background)
            shap_values = explainer.shap_values(features_array, nsamples=100)

        if isinstance(shap_values, list):
            pred_class = int(raw_prediction) if hasattr(raw_prediction, '__int__') else 0
            shap_vals = shap_values[pred_class][0] if pred_class < len(shap_values) else shap_values[0][0]
        else:
            shap_vals = shap_values[0]

        explanations = []
        for i, (name, val) in enumerate(zip(feature_names, shap_vals)):
            explanations.append({
                "feature": name,
                "value": float(features_array[0][i]),
                "shap_value": float(val),
                "contribution": "positive" if val > 0 else "negative"
            })
        
        explanations.sort(key=lambda x: abs(x["shap_value"]), reverse=True)

        return {
            "prediction": prediction if not hasattr(prediction, 'item') else prediction.item(),
            "probability": probability,
            "base_value": float(explainer.expected_value[0]) if isinstance(explainer.expected_value, (list, np.ndarray)) else float(explainer.expected_value),
            "explanations": explanations[:15]
        }

    except (NotFoundError, ValidationError):
        raise
    except Exception as e:
        logger.error(f"Simulation prediction error: {e}", exc_info=True)
        raise MLTrainingError(f"Simulation prediction failed: {str(e)}")