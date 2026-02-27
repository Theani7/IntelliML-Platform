"""
Model Training & Explanation Endpoints
Handles ML model training and SHAP/feature importance explanations.
"""

from fastapi import HTTPException
import pandas as pd
import numpy as np
from typing import Dict, Any, List
import uuid

from app.api.data import router, get_current_dataset, logger
from app.core.model_store import model_store


@router.post("/train")
async def train_models(request: Dict[str, Any], session_id: str = "default"):
    """
    Train machine learning models on the dataset

    Body parameters:
        target_column: Name of the column to predict
    """
    state = get_current_dataset(session_id)
    df = state["df"]
    
    if df is None:
        raise HTTPException(status_code=404, detail="No dataset loaded. Please upload a file first.")

    try:
        target_column = request.get("target_column")
        test_size = request.get("test_size", 0.2)
        cv_folds = request.get("cv_folds", 5)
        enable_tuning = request.get("enable_tuning", False)

        if not target_column:
            raise HTTPException(status_code=400, detail="target_column is required")

        if target_column not in df.columns:
            raise HTTPException(
                status_code=400,
                detail=f"Column '{target_column}' not found in dataset"
            )

        logger.info(f"Starting training for target: {target_column}")

        # ===== Use the full ML Engine (9–11 models) =====
        import sys, os
        ml_engine_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))), 'ml_engine')
        if ml_engine_path not in sys.path:
            sys.path.insert(0, os.path.dirname(ml_engine_path))

        try:
            from ml_engine.engines.model_trainer import ModelTrainer
            trainer = ModelTrainer()

            logger.info("Using ML Engine ModelTrainer (full model suite)")
            engine_results = trainer.train_all(
                df, 
                target_column,
                test_size=test_size,
                cv_folds=cv_folds,
                enable_tuning=enable_tuning
            )

            results = engine_results['results']
            best_model = engine_results['best_model']
            problem_type = engine_results['problem_type']
            feature_names = engine_results.get('feature_names', [])

            # Add train_score for frontend chart (CV score ≈ train performance)
            for r in results:
                if 'train_score' not in r:
                    r['train_score'] = r.get('cv_score', r.get('cv_score_mean', r.get('test_score', 0)))
                if 'test_score' not in r:
                    r['test_score'] = r.get('score', r.get('test_score', 0))
                if 'score' not in r:
                    r['score'] = r.get('test_score', 0)

            # Generate suggestions
            suggestions = []
            if best_model and best_model.get('test_score', 0) < 0.7:
                suggestions.append("Best model score is below 0.7. Consider feature engineering or trying hyperparameter tuning.")
            if len(results) >= 2:
                scores = [r['test_score'] for r in results]
                if max(scores) - min(scores) < 0.02:
                    suggestions.append("All models perform similarly — the dataset might benefit from additional features.")
            suggestions.append("Enable hyperparameter tuning for potentially better results.")
            suggestions.append("Feature selection (removing noisy columns) might improve performance.")

            # Persist models
            job_id = str(uuid.uuid4())

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
                    # Take up to 100 rows of background data for SHAP
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

            # Persist ALL trained models (from get_trained_models)
            all_models = trainer.get_trained_models()
            for model_name_key, model_obj in all_models.items():
                try:
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
                except Exception:
                    pass

            # Add leakage warnings to suggestions
            leakage_warnings = engine_results.get('leakage_warnings', [])
            for w in leakage_warnings:
                suggestions.insert(0, w)

            # Register job in memory cache
            import time
            from app.services.ml_service import ml_service
            ml_service.jobs[job_id] = {
                "id": job_id,
                "target_column": target_column,
                "status": "completed",
                "results": {
                    "results": results,
                    "best_model": best_model,
                    "feature_names": feature_names,
                },
                "trainer": trainer,
                "created_at": time.time()
            }

            response = {
                "job_id": job_id,
                "target_column": target_column,
                "results": results,
                "best_model": best_model,
                "problem_type": problem_type,
                "suggestions": suggestions,
                "feature_names": feature_names,
                "model_type": problem_type,
                "aggregated_feature_importance": engine_results.get('aggregated_feature_importance'),
                "leakage_warnings": leakage_warnings,
                "reproducibility_config": engine_results.get('reproducibility_config'),
                "timestamp": pd.Timestamp.now().isoformat()
            }

            logger.info(f"✓ Training completed with ML Engine. {len(results)} models trained. Best: {best_model['model_name']} ({best_model['test_score']:.4f})")
            return response

        except ImportError as ie:
            logger.warning(f"ML Engine import failed ({ie}), falling back to basic training")
            # ===== Fallback: basic sklearn training =====
            from sklearn.model_selection import train_test_split
            from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
            from sklearn.linear_model import LogisticRegression, LinearRegression
            from sklearn.metrics import accuracy_score, r2_score

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
                raise HTTPException(status_code=500, detail="All models failed to train")

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

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Training error: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Training failed: {str(e)}")


@router.get("/explain/{job_id}")
async def get_explanations(job_id: str, session_id: str = "default"):
    """
    Get model explanations (real feature importance from the persisted model)
    """
    state = get_current_dataset(session_id)
    if state.get("df") is None:
        raise HTTPException(status_code=404, detail="No dataset loaded")

    try:
        # Try loading the persisted model for real feature importance
        model = model_store.load_model(job_id, "best_model")
        metadata = model_store.load_metadata(job_id, "best_model")

        if model is not None and metadata is not None:
            feature_names = metadata.get("feature_names", [])
            feature_importance = _extract_feature_importance(model, feature_names)
        else:
            # Fallback: use dataset columns with heuristic importance
            logger.warning(f"Model not found for job {job_id}, using heuristic importance")
            df = state["df"]
            numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()[:10]
            feature_importance = {}
            for i, col in enumerate(numeric_cols):
                # Use column variance as a rough proxy
                feature_importance[col] = float(df[col].var()) if df[col].var() == df[col].var() else 0.0

        # Sort by importance descending
        feature_importance = dict(sorted(
            feature_importance.items(),
            key=lambda x: abs(x[1]),
            reverse=True
        ))

        feature_importance_items = [
            {"feature": name, "importance": float(val)}
            for name, val in feature_importance.items()
        ]

        explanation = {
            "job_id": job_id,
            "feature_importance": feature_importance,
            "shap_results": {
                "feature_importance": feature_importance_items,
                "plots": {},
                "fallback": True,
            },
            "explanation_type": "feature_importance",
            "model_name": metadata.get("model_name", "unknown") if metadata else "unknown",
            "source": "persisted_model" if model is not None else "heuristic",
            "timestamp": pd.Timestamp.now().isoformat()
        }

        logger.info(f"✓ Explanations generated for job {job_id} (source: {explanation['source']})")
        return explanation

    except Exception as e:
        logger.error(f"Explanation error: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to generate explanations: {str(e)}")


def _extract_feature_importance(model, feature_names: List[str]) -> Dict[str, float]:
    """Extract real feature importance from a trained sklearn model."""
    importance_values = None

    # Tree-based models (RandomForest, GradientBoosting, XGBoost, etc.)
    if hasattr(model, 'feature_importances_'):
        importance_values = model.feature_importances_
    # Linear models (LogisticRegression, LinearRegression, etc.)
    elif hasattr(model, 'coef_'):
        coef = model.coef_
        if coef.ndim > 1:
            importance_values = np.abs(coef).mean(axis=0)
        else:
            importance_values = np.abs(coef)

    if importance_values is not None and len(feature_names) == len(importance_values):
        # Normalize to 0-100 range
        max_val = max(importance_values) if max(importance_values) > 0 else 1
        return {
            name: round(float(val / max_val * 100), 2)
            for name, val in zip(feature_names, importance_values)
        }

    # Fallback for unknown model types
    return {name: 0.0 for name in feature_names}


@router.get("/models")
async def list_saved_models():
    """
    List all persisted trained models with their metadata.
    """
    try:
        jobs = model_store.list_jobs()
        return {
            "models": jobs,
            "count": len(jobs)
        }
    except Exception as e:
        logger.error(f"Failed to list models: {e}")
        raise HTTPException(status_code=500, detail=str(e))
