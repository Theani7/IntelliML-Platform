from fastapi import APIRouter, HTTPException, Response, UploadFile, File
from pydantic import BaseModel
from app.services.ml_service import MLService
from typing import Optional, List
import logging
import io
import joblib

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
async def train_models(request: TrainRequest):
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
            enable_tuning=request.enable_tuning
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
async def get_experiments():
    """Get list of past training experiments"""
    try:
        import os
        import json
        
        if not os.path.exists("experiments.json"):
            return []
            
        with open("experiments.json", "r") as f:
            experiments = json.load(f)
            
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
        # Get job with trainer
        job = ml_service.jobs.get(job_id)
        if not job:
            raise HTTPException(status_code=404, detail=f"Job {job_id} not found")
        
        trainer = job.get('trainer')
        if not trainer:
            raise HTTPException(status_code=400, detail="No trainer found for this job")
        
        # Get best model server
        best_server = trainer.get_best_model_server()
        if not best_server or not hasattr(best_server, 'trained_model'):
            raise HTTPException(status_code=400, detail="No trained model found")
        
        # Serialize model to bytes
        buffer = io.BytesIO()
        joblib.dump(best_server.trained_model, buffer)
        buffer.seek(0)
        
        # Get model name for filename
        best_model_name = job['results']['best_model']['model_name'].replace(' ', '_').lower()
        
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
        
        import numpy as np
        features_array = np.array([request.features])
        
        # Scale features if scaler exists
        if hasattr(trainer, 'scaler') and trainer.scaler is not None:
            features_array = trainer.scaler.transform(features_array)
        
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
        
        # Prepare features
        features_array = np.array([request.features])
        if hasattr(trainer, 'scaler') and trainer.scaler is not None:
            features_array = trainer.scaler.transform(features_array)
        
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
        
        # Get feature names from training (need to match)
        feature_names = job['results'].get('feature_names', [])
        
        # Prepare features - only keep columns that were used in training
        available_cols = [c for c in feature_names if c in df.columns]
        if len(available_cols) < len(feature_names):
            missing = set(feature_names) - set(available_cols)
            logger.warning(f"Missing columns in batch file: {missing}")
        
        X = df[available_cols] if available_cols else df.select_dtypes(include=['number'])
        
        # Handle missing values
        X = X.fillna(X.mean())
        
        # Scale if scaler exists
        import numpy as np
        features_array = X.values
        if hasattr(trainer, 'scaler') and trainer.scaler is not None:
            features_array = trainer.scaler.transform(features_array)
        
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