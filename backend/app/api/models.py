from fastapi import APIRouter, HTTPException, Response, UploadFile, File, Depends
from pydantic import BaseModel
from app.services.ml_service import MLService
from typing import Optional, List
import logging
import io
import joblib
from app.models.user import User
from app.core.auth_utils import get_current_active_user

logger = logging.getLogger(__name__)
router = APIRouter()

# Create singleton instance
ml_service = MLService()

class TrainRequest(BaseModel):
    target_column: str
    model_types: Optional[List[str]] = None
    test_size: float = 0.2
    cv_folds: int = 5
    enable_tuning: bool = False

@router.post("/train")
async def train_models(
    request: TrainRequest,
    session_id: str = "default",
    current_user: User = Depends(get_current_active_user),
):
    """
    Train ML models on current dataset
    """
    try:
        logger.info(f"Received training request for target: {request.target_column}, test_size: {request.test_size}, cv_folds: {request.cv_folds}, enable_tuning: {request.enable_tuning}")
        
        result = ml_service.train_models(
            target_column=request.target_column,
            model_types=request.model_types,
            test_size=request.test_size,
            cv_folds=request.cv_folds,
            enable_tuning=request.enable_tuning,
            session_id=session_id,
            username=current_user.username if current_user else None,
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

@router.get("/experiments")
async def get_experiments(current_user: User = Depends(get_current_active_user)):
    """Get list of past training experiments"""
    try:
        import os
        import json
        
        if not os.path.exists("experiments.json"):
            return []
            
        with open("experiments.json", "r") as f:
            experiments = json.load(f)

        experiments = [e for e in experiments if e.get("username") == current_user.username]
            
        # Reverse sort by timestamp (newest first)
        experiments.reverse()
        return experiments
    except Exception as e:
        logger.error(f"Get experiments error: {str(e)}")
        # Return empty list on error to avoid breaking UI
        return []

@router.get("/export/{job_id}")
async def export_model(job_id: str):
    """Export the best trained model as a downloadable joblib file"""
    try:
        from app.core.model_store import model_store
        
        model = None
        best_model_name = "model"
        
        # 1. Try Memory First
        job = ml_service.jobs.get(job_id)
        if job and job.get('trainer'):
            trainer = job['trainer']
            best_server = trainer.get_best_model_server()
            if best_server and hasattr(best_server, 'trained_model'):
                model = best_server.trained_model
                best_model_name = job['results']['best_model']['model_name'].replace(' ', '_').lower()
        
        # 2. Try Disk if memory failed
        if model is None:
            model = model_store.load_model(job_id, "best_model")
            metadata = model_store.load_metadata(job_id, "best_model")
            if model and metadata:
                best_model_name = metadata.get("model_name", "model").replace(' ', '_').lower()
                
        if model is None:
            raise HTTPException(status_code=404, detail=f"Job or Model {job_id} not found")
        
        # Serialize model to bytes
        buffer = io.BytesIO()
        joblib.dump(model, buffer)
        buffer.seek(0)
        
        return Response(
            content=buffer.read(),
            media_type="application/octet-stream",
            headers={
                "Content-Disposition": f"attachment; filename={best_model_name}.joblib"
            }
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Export model error: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/learning-curves/{job_id}")
async def get_learning_curves(job_id: str):
    """Compute learning curves for the best model."""
    try:
        import numpy as np
        from sklearn.model_selection import learning_curve, StratifiedKFold, KFold

        job = ml_service.jobs.get(job_id)
        if not job:
            raise HTTPException(status_code=404, detail=f"Job {job_id} not found")

        trainer = job.get('trainer')
        if not trainer:
            raise HTTPException(status_code=400, detail="Trainer not in memory")

        best_server = trainer.get_best_model_server()
        if not best_server or not hasattr(best_server, 'trained_model'):
            raise HTTPException(status_code=400, detail="Trained model not found")

        X_train = getattr(trainer, 'X_train', None)
        y_train = getattr(trainer, 'y_train', None)
        if X_train is None or y_train is None:
            raise HTTPException(status_code=400, detail="Training data not in memory. Please re-train the model to enable learning curves.")

        problem_type = job['results'].get('problem_type', 'classification')
        scoring = 'accuracy' if problem_type == 'classification' else 'r2'

        if problem_type == 'classification':
            cv = StratifiedKFold(n_splits=3, shuffle=True, random_state=42)
        else:
            cv = KFold(n_splits=3, shuffle=True, random_state=42)

        # Use a fresh clone of the model to avoid state issues
        from sklearn.base import clone
        model_clone = clone(best_server.trained_model)

        train_sizes_abs, train_scores, val_scores = learning_curve(
            model_clone, X_train, y_train,
            train_sizes=[0.2, 0.4, 0.6, 0.8, 1.0],
            cv=cv, scoring=scoring, n_jobs=-1,
            random_state=42,
        )

        data = []
        for i in range(len(train_sizes_abs)):
            data.append({
                "train_size": int(train_sizes_abs[i]),
                "train_score": float(np.mean(train_scores[i])),
                "val_score": float(np.mean(val_scores[i])),
            })

        # Diagnose the learning curve
        final_gap = data[-1]["train_score"] - data[-1]["val_score"]
        final_val = data[-1]["val_score"]
        if final_gap > 0.15:
            diagnosis = "Overfitting — the model performs much better on training data than validation. Consider regularization or more data."
        elif final_val < 0.6:
            diagnosis = "Underfitting — both scores are low. Consider a more complex model or better features."
        else:
            diagnosis = "Good fit — training and validation scores are converging."

        return {
            "data": data,
            "scoring": scoring,
            "model_name": job['results']['best_model']['model_name'],
            "diagnosis": diagnosis,
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Learning curves error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


class PredictRequest(BaseModel):
    features: List[float]

@router.post("/predict/{job_id}")
async def predict(job_id: str, request: PredictRequest):
    """Make a prediction using the best trained model"""
    try:
        job = ml_service.jobs.get(job_id)
        if not job:
            raise HTTPException(status_code=404, detail=f"Job {job_id} not found")
        
        trainer = job.get('trainer')
        if not trainer:
            raise HTTPException(status_code=400, detail="No trainer found for this job")
        
        best_server = trainer.get_best_model_server()
        if not best_server or not hasattr(best_server, 'trained_model'):
            raise HTTPException(status_code=400, detail="No trained model found")
        
        import pandas as pd
        import numpy as np
        
        feature_names = job['results'].get('feature_names', [f'feature_{i}' for i in range(len(request.features))])
        
        # If we have exactly the right number of features, we can construct the DF accurately
        if len(feature_names) == len(request.features):
            input_df = pd.DataFrame([request.features], columns=feature_names)
        else:
            input_df = pd.DataFrame([request.features])
            
        features_array = trainer.preprocess_for_inference(input_df)
        
        prediction = best_server.trained_model.predict(features_array)
        
        # Get probability if available
        probability = None
        if hasattr(best_server.trained_model, 'predict_proba'):
            try:
                proba = best_server.trained_model.predict_proba(features_array)
                probability = proba[0].tolist()
            except:
                pass
        
        # Decode label if encoder exists
        result = prediction[0]
        if hasattr(trainer, 'label_encoder') and trainer.label_encoder is not None:
            try:
                result = trainer.label_encoder.inverse_transform([int(prediction[0])])[0]
            except:
                pass
        
        return {
            "prediction": result if not hasattr(result, 'item') else result.item(),
            "probability": probability,
            "model_name": job['results']['best_model']['model_name']
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Prediction error: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

class ExplainRequest(BaseModel):
    features: List[float]

@router.post("/explain/{job_id}")
async def explain_prediction(job_id: str, request: ExplainRequest):
    """Explain a prediction using SHAP values"""
    try:
        import shap
        import numpy as np
        
        job = ml_service.jobs.get(job_id)
        if not job:
            raise HTTPException(status_code=404, detail=f"Job {job_id} not found")
        
        trainer = job.get('trainer')
        if not trainer:
            raise HTTPException(status_code=400, detail="No trainer found for this job")
        
        best_server = trainer.get_best_model_server()
        if not best_server or not hasattr(best_server, 'trained_model'):
            raise HTTPException(status_code=400, detail="No trained model found")
        
        model = best_server.trained_model
        feature_names = job['results'].get('feature_names', [f'Feature {i}' for i in range(len(request.features))])
        
        # Prepare features using the unified inference pipeline
        import pandas as pd
        
        # Build DataFrame with proper column names if possible
        if len(feature_names) == len(request.features):
            input_df = pd.DataFrame([request.features], columns=feature_names)
        else:
            input_df = pd.DataFrame([request.features])
            
        try:
            features_array = trainer.preprocess_for_inference(input_df)
        except Exception as e:
            logger.error(f"SHAP preprocessing failed: {e}")
            raise HTTPException(status_code=400, detail=f"Data preprocessing failed: {str(e)}")
        
        # Create SHAP explainer based on model type
        try:
            # Try TreeExplainer for tree-based models
            explainer = shap.TreeExplainer(model)
            shap_values = explainer.shap_values(features_array)
        except:
            try:
                # Fall back to KernelExplainer for other models
                # Use a small background sample if available
                background = trainer.X_train[:50] if hasattr(trainer, 'X_train') and trainer.X_train is not None else features_array
                explainer = shap.KernelExplainer(model.predict, background)
                shap_values = explainer.shap_values(features_array, nsamples=100)
            except Exception as e:
                logger.warning(f"SHAP failed: {e}")
                return {"error": "SHAP not supported for this model type", "shap_values": None}
        
        # Handle multi-class output
        if isinstance(shap_values, list):
            # For classification, take the values for the predicted class
            prediction = model.predict(features_array)[0]
            pred_class = int(prediction) if hasattr(prediction, '__int__') else 0
            shap_vals = shap_values[pred_class][0] if pred_class < len(shap_values) else shap_values[0][0]
        else:
            shap_vals = shap_values[0]
        
        # Create explanation data for frontend
        explanations = []
        for i, (name, val) in enumerate(zip(feature_names, shap_vals)):
            explanations.append({
                "feature": name,
                "value": float(request.features[i]),
                "shap_value": float(val),
                "contribution": "positive" if val > 0 else "negative"
            })
        
        # Sort by absolute SHAP value
        explanations.sort(key=lambda x: abs(x["shap_value"]), reverse=True)
        
        return {
            "explanations": explanations[:10],  # Top 10 features
            "base_value": float(explainer.expected_value[0]) if isinstance(explainer.expected_value, (list, np.ndarray)) else float(explainer.expected_value),
            "model_name": job['results']['best_model']['model_name']
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Explain error: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/predict-batch/{job_id}")
async def predict_batch(job_id: str, file: UploadFile = File(...)):
    """Batch prediction - upload CSV and get predictions"""
    from fastapi.responses import StreamingResponse
    import pandas as pd
    import io
    
    try:
        job = ml_service.jobs.get(job_id)
        if not job:
            raise HTTPException(status_code=404, detail=f"Job {job_id} not found")
        
        trainer = job.get('trainer')
        if not trainer:
            raise HTTPException(status_code=400, detail="No trainer found for this job")
        
        best_server = trainer.get_best_model_server()
        if not best_server or not hasattr(best_server, 'trained_model'):
            raise HTTPException(status_code=400, detail="No trained model found")
        
        # Read uploaded CSV
        content = await file.read()
        df = pd.read_csv(io.BytesIO(content))
        
        # Prepare features using the exact same pipeline from training
        # (This handles missing columns, encoding, imputation, and scaling)
        try:
            features_array = trainer.preprocess_for_inference(df)
        except Exception as e:
            logger.error(f"Batch preprocessing failed: {e}")
            raise HTTPException(status_code=400, detail=f"Data preprocessing failed: {str(e)}")
        
        # Predict
        predictions = best_server.trained_model.predict(features_array)
        
        # Decode labels if needed
        if hasattr(trainer, 'label_encoder') and trainer.label_encoder is not None:
            try:
                predictions = trainer.label_encoder.inverse_transform(predictions.astype(int))
            except:
                pass
        
        # Add predictions to dataframe
        df['prediction'] = predictions
        
        # Get probabilities if available
        if hasattr(best_server.trained_model, 'predict_proba'):
            try:
                proba = best_server.trained_model.predict_proba(features_array)
                df['prediction_confidence'] = proba.max(axis=1)
            except:
                pass
        
        # Create CSV response
        output = io.StringIO()
        df.to_csv(output, index=False)
        output.seek(0)
        
        return StreamingResponse(
            io.BytesIO(output.getvalue().encode()),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=predictions_{job_id}.csv"}
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Batch prediction error: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
