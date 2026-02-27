import xgboost as xgb
from lightgbm import LGBMClassifier, LGBMRegressor
from sklearn.ensemble import GradientBoostingClassifier, GradientBoostingRegressor
from sklearn.model_selection import cross_val_score, train_test_split
import numpy as np
from typing import Dict, Any, Optional
import logging

# Try to import CatBoost (optional dependency)
try:
    from catboost import CatBoostClassifier, CatBoostRegressor
    CATBOOST_AVAILABLE = True
except ImportError:
    CATBOOST_AVAILABLE = False

logger = logging.getLogger(__name__)

class BoostingModelsServer:
    """
    MCP Server for Gradient Boosting Model Family
    Handles XGBoost, LightGBM, CatBoost, and sklearn GradientBoosting.
    
    Features:
    - Stores ALL trained models (not just the last one)
    - Early stopping for XGBoost/LightGBM using a validation split
    - Auto-detects CatBoost availability
    """
    
    def __init__(self):
        self.trained_models: Dict[str, Any] = {}   # name → sklearn model
        self.trained_model = None                   # last trained (legacy compat)
        self.model_type = None
    
    def train(
        self, 
        X_train: np.ndarray, 
        y_train: np.ndarray, 
        problem_type: str,
        model_name: str = "xgboost"
    ) -> Dict[str, Any]:
        """
        Train boosting model with optional early stopping.
        
        Args:
            X_train: Training features
            y_train: Training target
            problem_type: 'classification' or 'regression'
            model_name: 'xgboost', 'lightgbm', 'catboost', or 'gradient_boosting'
            
        Returns:
            Training results
        """
        try:
            logger.info(f"Training boosting model: {model_name} for {problem_type}")
            
            # Early stopping: split a small validation set for XGBoost/LightGBM
            use_early_stopping = model_name in ("xgboost", "lightgbm")
            if use_early_stopping and len(X_train) > 50:
                X_tr, X_val, y_tr, y_val = train_test_split(
                    X_train, y_train, test_size=0.15, random_state=42
                )
            else:
                X_tr, y_tr = X_train, y_train
                X_val, y_val = None, None
                use_early_stopping = False
            
            if problem_type == "classification":
                if model_name == "xgboost":
                    model = xgb.XGBClassifier(
                        n_estimators=100,
                        max_depth=6,
                        learning_rate=0.1,
                        random_state=42,
                        n_jobs=-1,
                        early_stopping_rounds=15 if use_early_stopping else None,
                    )
                    self.model_type = "XGBoost"
                elif model_name == "lightgbm":
                    model = LGBMClassifier(
                        n_estimators=100,
                        max_depth=6,
                        learning_rate=0.1,
                        random_state=42,
                        n_jobs=-1,
                        verbose=-1,
                    )
                    self.model_type = "LightGBM"
                elif model_name == "catboost":
                    if not CATBOOST_AVAILABLE:
                        raise ImportError("CatBoost is not installed. Run: pip install catboost")
                    model = CatBoostClassifier(
                        n_estimators=100,
                        max_depth=6,
                        learning_rate=0.1,
                        random_state=42,
                        verbose=0
                    )
                    self.model_type = "CatBoost"
                elif model_name == "gradient_boosting":
                    model = GradientBoostingClassifier(
                        n_estimators=50,
                        max_depth=6,
                        learning_rate=0.1,
                        random_state=42
                    )
                    self.model_type = "Gradient Boosting"
                else:
                    # Default to XGBoost
                    model = xgb.XGBClassifier(
                        n_estimators=100,
                        max_depth=6,
                        learning_rate=0.1,
                        random_state=42,
                        n_jobs=-1,
                        early_stopping_rounds=15 if use_early_stopping else None,
                    )
                    self.model_type = "XGBoost"
            else:  # regression
                if model_name == "xgboost":
                    model = xgb.XGBRegressor(
                        n_estimators=100,
                        max_depth=6,
                        learning_rate=0.1,
                        random_state=42,
                        n_jobs=-1,
                        early_stopping_rounds=15 if use_early_stopping else None,
                    )
                    self.model_type = "XGBoost"
                elif model_name == "lightgbm":
                    model = LGBMRegressor(
                        n_estimators=100,
                        max_depth=6,
                        learning_rate=0.1,
                        random_state=42,
                        n_jobs=-1,
                        verbose=-1,
                    )
                    self.model_type = "LightGBM"
                elif model_name == "catboost":
                    if not CATBOOST_AVAILABLE:
                        raise ImportError("CatBoost is not installed. Run: pip install catboost")
                    model = CatBoostRegressor(
                        n_estimators=100,
                        max_depth=6,
                        learning_rate=0.1,
                        random_state=42,
                        verbose=0
                    )
                    self.model_type = "CatBoost"
                elif model_name == "gradient_boosting":
                    model = GradientBoostingRegressor(
                        n_estimators=50,
                        max_depth=6,
                        learning_rate=0.1,
                        random_state=42
                    )
                    self.model_type = "Gradient Boosting"
                else:
                    # Default to XGBoost
                    model = xgb.XGBRegressor(
                        n_estimators=100,
                        max_depth=6,
                        learning_rate=0.1,
                        random_state=42,
                        n_jobs=-1,
                        early_stopping_rounds=15 if use_early_stopping else None,
                    )
                    self.model_type = "XGBoost"
            
            # Train — with early stopping eval set for XGB/LGBM
            if use_early_stopping and X_val is not None:
                if model_name == "xgboost":
                    model.fit(X_tr, y_tr, eval_set=[(X_val, y_val)], verbose=False)
                elif model_name == "lightgbm":
                    callbacks = [
                        __import__('lightgbm').early_stopping(15, verbose=False),
                        __import__('lightgbm').log_evaluation(period=0),
                    ]
                    model.fit(X_tr, y_tr, eval_set=[(X_val, y_val)], callbacks=callbacks)
                else:
                    model.fit(X_tr, y_tr)
            else:
                model.fit(X_train, y_train)
            
            self.trained_model = model
            self.trained_models[self.model_type] = model  # store ALL models
            
            # Train score
            from sklearn.metrics import accuracy_score, r2_score
            y_train_pred = model.predict(X_train)
            if problem_type == "classification":
                train_score_val = float(accuracy_score(y_train, y_train_pred))
            else:
                train_score_val = float(r2_score(y_train, y_train_pred))
            
            return {
                "model_name": self.model_type,
                "cv_score_mean": 0.0,
                "cv_score_std": 0.0,
                "train_score": train_score_val,
                "num_features": X_train.shape[1],
                "training_samples": X_train.shape[0],
            }
            
        except Exception as e:
            logger.error(f"Boosting model training error: {str(e)}")
            raise
    
    def predict(self, X_test: np.ndarray) -> np.ndarray:
        """Make predictions"""
        if self.trained_model is None:
            raise ValueError("Model not trained")
        return self.trained_model.predict(X_test)
    
    def get_feature_importance(self) -> Optional[np.ndarray]:
        """Get feature importance"""
        if self.trained_model is None:
            return None
        
        if hasattr(self.trained_model, 'feature_importances_'):
            return self.trained_model.feature_importances_.ravel()
        return None
    
    def get_all_models(self) -> Dict[str, Any]:
        """Return all trained models"""
        return self.trained_models