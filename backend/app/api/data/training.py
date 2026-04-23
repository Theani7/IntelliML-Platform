"""
================================================================================
Training API - ML Model Training & Explanations
================================================================================

PURPOSE:
    Handles machine learning model training and explanation generation.
    Provides endpoints to:
    - Train multiple ML models on user data
    - Compare model performance
    - Generate feature importance explanations

ML PIPELINE:
    
    ┌──────────────────────────────────────────────────────────────────────────────┐
    │                           TRAINING PIPELINE                                   │
    ├──────────────────────────────────────────────────────────────────────────────┤
    │                                                                               │
    │  1. DATA PREPARATION                                                         │
    │     ├── Select target column                                                  │
    │     ├── Separate features (X) and target (y)                                  │
    │     ├── Encode categorical variables                                          │
    │     └── Split: train (80%) / test (20%)                                       │
    │                                                                               │
    │  2. PREPROCESSING                                                             │
    │     ├── Impute missing values (mean)                                          │
    │     ├── Scale features (StandardScaler)                                       │
    │     └── Reduce features if > 50 (SelectKBest)                                │
    │                                                                               │
    │  3. MODEL TRAINING (Parallel)                                                 │
    │     ├── Linear: LogisticRegression, LinearRegression                          │
    │     ├── Tree: RandomForest, DecisionTree                                     │
    │     ├── Boosting: XGBoost, LightGBM, CatBoost (if available)                  │
    │     ├── Neural: MLPClassifier, MLPRegressor                                  │
    │     └── Each with 5-fold Cross-Validation                                    │
    │                                                                               │
    │  4. MODEL RANKING                                                             │
    │     ├── Composite Score = test_score - overfit_penalty - speed_penalty        │
    │     └── Sort by composite score                                               │
    │                                                                               │
    │  5. ENSEMBLE (Optional)                                                       │
    │     └── Stacking Ensemble of top performers                                  │
    │                                                                               │
    │  6. PERSISTENCE                                                               │
    │     └── Save best model + all models to disk                                  │
    │                                                                               │
    └──────────────────────────────────────────────────────────────────────────────┘

MODELS TRAINED:
    Classification:
    - Logistic Regression: Linear decision boundary
    - Random Forest: Ensemble of decision trees
    - XGBoost: Gradient boosting (if available)
    - LightGBM: Light gradient boosting (if available)
    - CatBoost: Categorical boosting (if available)
    - MLP Neural Network: Deep learning
    
    Regression:
    - Linear Regression: Linear relationships
    - Ridge/Lasso: Regularized regression
    - Random Forest Regressor: Ensemble trees
    - XGBoost Regressor: Gradient boosting
    - LightGBM Regressor: Light gradient boosting
    - MLP Regressor: Neural network

EVALUATION METRICS:
    Classification:
    - Accuracy: (TP + TN) / Total
    - Precision: TP / (TP + FP)
    - Recall: TP / (TP + FN)
    - F1: Harmonic mean of precision/recall
    
    Regression:
    - R² Score: Explained variance
    - MSE: Mean squared error
    - RMSE: Root MSE
    - MAE: Mean absolute error

FEATURE IMPORTANCE:
    - Aggregated from all models
    - Weighted by model performance
    - Returns top 20 features with importance scores

PROBLEM TYPE DETECTION:
    Automatically determined from target column:
    - If < 20 unique values → Classification
    - Otherwise → Regression

================================================================================
"""

import pandas as pd
import numpy as np
from typing import Dict, Any, List
import uuid

from app.api.data import router, get_current_dataset, logger
from app.core.model_store import model_store
from app.core.exceptions import ValidationError, NotFoundError, MLTrainingError


@router.post("/train")
async def train_models(request: Dict[str, Any], session_id: str = "default"):
    """
    Train machine learning models on the dataset.
    
    This is the main ML training endpoint. It:
    1. Prepares the data (split features/target, encode, scale)
    2. Trains multiple models in parallel
    3. Evaluates with cross-validation
    4. Ranks models by composite score
    5. Saves best model for predictions/explanations
    
    Request Body:
        {
            "target_column": "survived",      # REQUIRED: Column to predict
            "test_size": 0.2,                 # Test set proportion (default: 0.2)
            "cv_folds": 5,                    # Cross-validation folds (default: 5)
            "enable_tuning": false           # Hyperparameter tuning (default: false)
        }
    
    Returns:
        {
            "job_id": "uuid",                # Unique training job ID
            "target_column": "survived",
            "problem_type": "classification",
            "results": [                      # All trained models
                {
                    "model_name": "Random Forest",
                    "test_score": 0.85,
                    "train_score": 0.92,
                    "cv_score_mean": 0.83,
                    "composite_score": 0.84,
                    "feature_importance": [...]
                },
                ...
            ],
            "best_model": {                   # Top performer
                "model_name": "XGBoost",
                "test_score": 0.89,
                ...
            },
            "suggestions": [...],             # Improvement recommendations
            "feature_names": ["age", "fare"], # Features used
            "aggregated_feature_importance": [...]
        }
    
    Raises:
        NotFoundError: No dataset loaded
        ValidationError: Invalid target column
        MLTrainingError: Training failed
    """
    # Get the current dataset from session
    state = get_current_dataset(session_id)
    df = state["df"]

    if df is None:
        raise NotFoundError("No dataset loaded. Please upload a file first.")

    # ========================================================================
    # VALIDATE REQUEST PARAMETERS
    # ========================================================================
    target_column = request.get("target_column")
    test_size = request.get("test_size", 0.2)        # 20% for testing
    cv_folds = request.get("cv_folds", 5)            # 5-fold CV
    enable_tuning = request.get("enable_tuning", False)  # Hyperparameter tuning

    if not target_column:
        raise ValidationError("target_column is required")

    if target_column not in df.columns:
        raise ValidationError(
            f"Column '{target_column}' not found in dataset",
            details={"available_columns": df.columns.tolist()}
        )

    logger.info(f"Starting training for target: {target_column}")

    # ========================================================================
    # USE ML ENGINE (Full Model Suite)
    # ========================================================================
    try:
        from app.ml.engines.model_trainer import ModelTrainer
        trainer = ModelTrainer()

        logger.info("Using ML Engine ModelTrainer (full model suite)")
        engine_results = trainer.train_all(
            df,
            target_column,
            test_size=test_size,
            cv_folds=cv_folds,
            enable_tuning=enable_tuning
        )

        # Unpack results
        results = engine_results['results']
        best_model = engine_results['best_model']
        problem_type = engine_results['problem_type']
        raw_feature_names = engine_results.get('feature_names', [])
        
        # Deduplicate and clean feature names
        feature_names = []
        seen = set()
        for name in raw_feature_names:
            if name not in seen and name:
                seen.add(name)
                feature_names.append(name)
        
        logger.info(f"Feature names for prediction: {feature_names}")

        # ====================================================================
        # NORMALIZE SCORE FIELD NAMES
        # ====================================================================
        # Frontend may expect different field names
        # Ensure consistency across all models
        for r in results:
            if 'train_score' not in r:
                r['train_score'] = r.get('cv_score', r.get('cv_score_mean', r.get('test_score', 0)))
            if 'test_score' not in r:
                r['test_score'] = r.get('score', r.get('test_score', 0))
            if 'score' not in r:
                r['score'] = r.get('test_score', 0)

        

        # ====================================================================
        # GENERATE SUGGESTIONS
        # ====================================================================
        suggestions = []
        if best_model and best_model.get('test_score', 0) < 0.7:
            suggestions.append("Best model score is below 0.7. Consider feature engineering or trying hyperparameter tuning.")
        if len(results) >= 2:
            scores = [r['test_score'] for r in results]
            if max(scores) - min(scores) < 0.02:
                suggestions.append("All models perform similarly — the dataset might benefit from additional features.")
        suggestions.append("Enable hyperparameter tuning for potentially better results.")
        suggestions.append("Feature selection (removing noisy columns) might improve performance.")

        # ====================================================================
        # PERSIST MODELS FOR LATER USE
        # ====================================================================
        job_id = str(uuid.uuid4())

        # Save best model
        best_server = trainer.get_best_model_server()
        if best_server and best_server.trained_model:
            try:
                best_meta = {
                    "target_column": target_column,
                    "feature_names": feature_names,
                    "model_type": problem_type,
                    "metrics": best_model.get("metrics", {}),
                    "score": best_model.get("test_score", 0),
                }
                # Sample of training data for SHAP (limit to 100 rows)
                x_sample = getattr(trainer, 'X_train', None)
                if x_sample is not None and hasattr(x_sample, 'shape') and x_sample.shape[0] > 0:
                    x_sample = x_sample[:min(100, x_sample.shape[0])]

                model_store.save_best_model(
                    job_id,
                    best_model["model_name"],
                    best_server.trained_model,
                    best_meta,
                    X_sample=x_sample
                )
                logger.info(f"✓ Best model '{best_model['model_name']}' persisted for job {job_id}")
            except Exception as e:
                logger.warning(f"Failed to persist best model: {e}")

        # Save all trained models
        all_models = trainer.get_trained_models()
        for model_name_key, model_obj in all_models.items():
            try:
                # Find matching result for metadata
                matching = [r for r in results if r["model_name"] == model_name_key]
                meta = {
                    "target_column": target_column,
                    "feature_names": feature_names,
                    "model_type": problem_type,
                }
                if matching:
                    meta["metrics"] = matching[0]["metrics"]
                    meta["score"] = matching[0]["test_score"]
                model_store.save_model(job_id, model_name_key, model_obj, meta)
            except Exception as e:
                logger.warning(f"Failed to persist model {model_name_key}: {e}")

        # Add leakage warnings to suggestions
        leakage_warnings = engine_results.get('leakage_warnings', [])
        for w in leakage_warnings:
            suggestions.insert(0, w)

        # Clean BEFORE caching - remove all non-serializable objects
        import copy
        clean_results = copy.deepcopy(results)
        for r in clean_results:
            r.pop('model', None)
            for key in ['test_score', 'train_score', 'cv_score', 'cv_score_std', 'score', 'complexity', 'composite_score', 'f1_score', 'roc_auc', 'mse', 'rmse']:
                if key in r and r[key] is not None:
                    r[key] = float(r[key])
        clean_best = copy.deepcopy(best_model)
        clean_best.pop('model', None)
        for key in ['test_score', 'train_score', 'cv_score', 'cv_score_std', 'score', 'complexity', 'composite_score', 'f1_score', 'roc_auc', 'mse', 'rmse']:
            if key in clean_best and clean_best[key] is not None:
                clean_best[key] = float(clean_best[key])

        # Clean feature importance values
        agg_fi = engine_results.get('aggregated_feature_importance', [])
        if agg_fi:
            agg_fi = copy.deepcopy(agg_fi)
            for item in agg_fi:
                if 'importance' in item and item['importance'] is not None:
                    item['importance'] = float(item['importance'])

        # Clean reproducibility config
        repro = engine_results.get('reproducibility_config', {})
        if repro:
            repro = copy.deepcopy(repro)
            if 'scaler_mean' in repro and repro['scaler_mean'] is not None:
                repro['scaler_mean'] = list(repro['scaler_mean']) if hasattr(repro['scaler_mean'], 'tolist') else repro['scaler_mean']
            if 'scaler_scale' in repro and repro['scaler_scale'] is not None:
                repro['scaler_scale'] = list(repro['scaler_scale']) if hasattr(repro['scaler_scale'], 'tolist') else repro['scaler_scale']
            if 'label_encoder_classes' in repro and repro['label_encoder_classes'] is not None:
                repro['label_encoder_classes'] = list(repro['label_encoder_classes'])

        # Register job in memory cache with CLEANED data only
        import time
        from app.services.ml_service import ml_service
        ml_service.jobs[job_id] = {
            "id": job_id,
            "target_column": target_column,
            "status": "completed",
            "results": {
                "results": clean_results,
                "best_model": clean_best,
                "feature_names": feature_names,
            },
            # Don't cache trainer - just store serializable metadata
            "problem_type": problem_type,
            "created_at": time.time()
        }

        # Build response with CLEAN data
        response = {
            "job_id": job_id,
            "target_column": target_column,
            "results": clean_results,
            "best_model": clean_best,
            "problem_type": problem_type,
            "suggestions": suggestions,
            "feature_names": feature_names,
            "model_type": problem_type,
            "aggregated_feature_importance": agg_fi,
            "leakage_warnings": leakage_warnings,
            "reproducibility_config": repro,
            "timestamp": pd.Timestamp.now().isoformat()
        }

        logger.info(f"✓ Training completed with ML Engine. {len(clean_results)} models trained. Best: {clean_best['model_name']} ({clean_best['test_score']:.4f})")
        return response

    except ImportError as ie:
        # ====================================================================
        # FALLBACK: Basic sklearn training (ML Engine unavailable)
        # ====================================================================
        logger.warning(f"ML Engine import failed ({ie}), falling back to basic training")
        
        from sklearn.model_selection import train_test_split
        from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
        from sklearn.linear_model import LogisticRegression, LinearRegression
        from sklearn.metrics import accuracy_score, r2_score

        # Basic data preparation
        X = df.drop(columns=[target_column])
        y = df[target_column]
        X_numeric = pd.get_dummies(X, drop_first=True).fillna(0)
        feature_names = X_numeric.columns.tolist()

        X_train, X_test, y_train, y_test = train_test_split(X_numeric, y, test_size=0.2, random_state=42)
        is_classification = y.nunique() < 20 and (y.dtype == 'object' or pd.api.types.is_integer_dtype(y))

        if is_classification:
            from sklearn.preprocessing import LabelEncoder
            le = LabelEncoder()
            y_train = le.fit_transform(y_train)
            y_test = le.transform(y_test)

        # Train basic models
        models_dict = {}
        if is_classification:
            models_dict = {
                "Random Forest": RandomForestClassifier(n_estimators=100, random_state=42),
                "Logistic Regression": LogisticRegression(max_iter=1000, random_state=42),
            }
        else:
            models_dict = {
                "Random Forest": RandomForestRegressor(n_estimators=100, random_state=42),
                "Linear Regression": LinearRegression(),
            }

        results = []
        for name, model in models_dict.items():
            try:
                model.fit(X_train, y_train)
                y_pred = model.predict(X_test)
                score = accuracy_score(y_test, y_pred) if is_classification else r2_score(y_test, y_pred)
                train_pred = model.predict(X_train)
                train_sc = accuracy_score(y_train, train_pred) if is_classification else r2_score(y_train, train_pred)
                results.append({
                    "model_name": name,
                    "model_type": "classification" if is_classification else "regression",
                    "score": float(score),
                    "train_score": float(train_sc),
                    "test_score": float(score),
                    "metrics": {"accuracy": float(score)} if is_classification else {"r2": float(score)},
                })
            except Exception as e:
                logger.warning(f"Fallback: failed {name}: {e}")

        if not results:
            raise MLTrainingError("All models failed to train")

        results.sort(key=lambda x: x["score"], reverse=True)
        job_id = str(uuid.uuid4())

        return {
            "job_id": job_id,
            "target_column": target_column,
            "results": results,
            "best_model": results[0],
            "problem_type": "classification" if is_classification else "regression",
            "model_type": "classification" if is_classification else "regression",
            "suggestions": ["ML Engine unavailable — trained with basic models only."],
            "feature_names": feature_names,
            "timestamp": pd.Timestamp.now().isoformat()
        }

    except Exception as e:
        logger.error(f"Training error: {str(e)}", exc_info=True)
        raise MLTrainingError(f"Training failed: {str(e)}")


@router.get("/explain/{job_id}")
async def get_explanations(job_id: str, session_id: str = "default"):
    """
    Get model explanations (feature importance).
    
    Generates explanations for a trained model by analyzing:
    - Feature importance from the model itself
    - Aggregated importance across all models
    
    This helps users understand which features drive predictions.
    
    Args:
        job_id: The training job ID (from /train response)
        session_id: User session
    
    Returns:
        {
            "job_id": "uuid",
            "feature_importance": [           # Top features
                {"feature": "age", "importance": 0.35},
                {"feature": "fare", "importance": 0.28},
                ...
            ],
            "method": "feature_importance",    # or "shap"
            "explanation_type": "feature_importance",
            "model_name": "Random Forest",
            "source": "persisted_model",        # or "heuristic"
            "timestamp": "2024-01-15T10:30:00"
        }
    
    Raises:
        NotFoundError: No dataset loaded
        MLTrainingError: Explanation generation failed
    """
    state = get_current_dataset(session_id)
    if state.get("df") is None:
        raise NotFoundError("No dataset loaded")

    try:
        # Initialize importance list
        importance = []
        feature_names = []
        
        # Try loading the persisted model for real feature importance
        model = model_store.load_model(job_id, "best_model")
        metadata = model_store.load_metadata(job_id, "best_model")
        
        logger.info(f"Explain: loaded model={type(model) if model else None}, metadata={type(metadata) if metadata else None}")

        if model is not None:
            # Get feature names from metadata
            feature_names = metadata.get("feature_names", []) if metadata else []
            logger.info(f"Explain: feature_names from metadata={feature_names[:5] if feature_names else []}")
            
            if hasattr(model, 'feature_importances_'):
                feats = feature_names or [f'feature_{i}' for i in range(len(model.feature_importances_))]
                for name, imp in zip(feats, model.feature_importances_):
                    importance.append({'feature': name, 'importance': float(imp)})
                logger.info(f"Explain: got {len(importance)} from model.feature_importances_")
            elif hasattr(model, 'coef_'):
                feats = feature_names or [f'feature_{i}' for i in range(len(model.coef_))]
                for name, coef in zip(feats, model.coef_.flatten() if len(model.coef_.shape) > 1 else model.coef_):
                    importance.append({'feature': name, 'importance': abs(float(coef))})
                logger.info(f"Explain: got {len(importance)} from model.coef_")
        
        # Fallback: get from training results (aggregated or from model results)
        if not importance:
            from app.services.ml_service import ml_service
            job = ml_service.jobs.get(job_id)
            if job:
                results = job.get('results', {})
                # Get from nested results list
                nested_results = results.get('results', []) if isinstance(results, dict) else results
                if isinstance(nested_results, list) and len(nested_results) > 0:
                    for r in nested_results[:3]:
                        if isinstance(r, dict) and 'feature_importance' in r:
                            fi = r['feature_importance']
                            if fi and isinstance(fi, list) and len(fi) > 0:
                                importance = fi
                                break
                # Also check aggregated_feature_importance if still empty
                if not importance and isinstance(results, dict):
                    agg = results.get('aggregated_feature_importance')
                    if agg and isinstance(agg, list) and len(agg) > 0:
                        importance = agg

        explanation = {
            "job_id": job_id,
            "feature_importance": importance,
            "feature_names": feature_names,
            "method": "feature_importance" if importance else "none",
            "explanation_type": "feature_importance",
            "model_name": (metadata.get("model_name", "unknown") if metadata else "unknown") if model else "in_memory",
            "source": "persisted_model" if model else "memory",
            "timestamp": pd.Timestamp.now().isoformat()
        }

        logger.info(f"✓ Explanations generated: {len(importance)} features, source: {explanation['source']}")
        logger.info(f"  -> importance sample: {importance[:3] if importance else 'empty'}")
        return explanation

    except Exception as e:
        logger.error(f"Explanation error: {str(e)}", exc_info=True)
        raise MLTrainingError(f"Failed to generate explanations: {str(e)}")


@router.get("/models")
async def list_models():
    """
    List all trained model jobs.
    
    Returns metadata for all saved models from the model store.
    Useful for:
    - Showing user's trained models
    - Selecting a model for prediction
    - Model management UI
    
    Returns:
        {
            "models": [
                {
                    "job_id": "uuid",
                    "model_name": "Random Forest",
                    "target_column": "survived",
                    "score": 0.85,
                    "saved_at": 1699999999
                },
                ...
            ],
            "count": 5
        }
    """
    try:
        jobs = model_store.list_jobs()
        return {
            "models": jobs,
            "count": len(jobs)
        }
    except Exception as e:
        logger.error(f"Failed to list models: {e}")
        raise MLTrainingError(f"Failed to list models: {str(e)}")