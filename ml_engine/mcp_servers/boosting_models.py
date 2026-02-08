import xgboost as xgb
from lightgbm import LGBMClassifier, LGBMRegressor
from sklearn.ensemble import GradientBoostingClassifier, GradientBoostingRegressor
from sklearn.model_selection import cross_val_score
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
    Handles XGBoost, LightGBM, CatBoost, and sklearn GradientBoosting
    """
    
    def __init__(self):
        self.trained_model = None
        self.model_type = None
    
    def train(
        self, 
        X_train: np.ndarray, 
        y_train: np.ndarray, 
        problem_type: str,
        model_name: str = "xgboost"
    ) -> Dict[str, Any]:
        """
        Train boosting model
        
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
            
            if problem_type == "classification":
                if model_name == "xgboost":
                    model = xgb.XGBClassifier(
                        n_estimators=100,
                        max_depth=6,
                        learning_rate=0.1,
                        random_state=42,
                        n_jobs=-1
                    )
                    self.model_type = "XGBoost"
                elif model_name == "lightgbm":
                    model = LGBMClassifier(
                        n_estimators=100,
                        max_depth=6,
                        learning_rate=0.1,
                        random_state=42,
                        n_jobs=-1,
                        verbose=-1
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
                        n_estimators=100,
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
                        n_jobs=-1
                    )
                    self.model_type = "XGBoost"
            else:  # regression
                if model_name == "xgboost":
                    model = xgb.XGBRegressor(
                        n_estimators=100,
                        max_depth=6,
                        learning_rate=0.1,
                        random_state=42,
                        n_jobs=-1
                    )
                    self.model_type = "XGBoost"
                elif model_name == "lightgbm":
                    model = LGBMRegressor(
                        n_estimators=100,
                        max_depth=6,
                        learning_rate=0.1,
                        random_state=42,
                        n_jobs=-1,
                        verbose=-1
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
                        n_estimators=100,
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
                        n_jobs=-1
                    )
                    self.model_type = "XGBoost"
            
            # Train
            model.fit(X_train, y_train)
            self.trained_model = model
            
            # Cross-validation
            cv_scores = cross_val_score(model, X_train, y_train, cv=5)
            
            return {
                "model_name": self.model_type,
                "cv_score_mean": float(cv_scores.mean()),
                "cv_score_std": float(cv_scores.std()),
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
            return self.trained_model.feature_importances_
        return None