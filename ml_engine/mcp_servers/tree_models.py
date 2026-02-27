from sklearn.tree import DecisionTreeClassifier, DecisionTreeRegressor
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
from sklearn.model_selection import cross_val_score
import numpy as np
from typing import Dict, Any, Optional
import logging

logger = logging.getLogger(__name__)

class TreeModelsServer:
    """
    MCP Server for Tree-Based Model Family
    Handles Decision Trees and Random Forests.
    
    Stores ALL trained models (not just the last one) so they can be
    persisted and compared after training.
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
        model_name: str = "random_forest"
    ) -> Dict[str, Any]:
        """
        Train tree-based model
        
        Args:
            X_train: Training features
            y_train: Training target
            problem_type: 'classification' or 'regression'
            model_name: 'decision_tree' or 'random_forest'
            
        Returns:
            Training results
        """
        try:
            logger.info(f"Training tree model: {model_name} for {problem_type}")
            
            if problem_type == "classification":
                if model_name == "decision_tree":
                    model = DecisionTreeClassifier(
                        max_depth=10, 
                        min_samples_split=10,
                        random_state=42
                    )
                    self.model_type = "Decision Tree"
                else:
                    model = RandomForestClassifier(
                        n_estimators=100,
                        max_depth=15,
                        min_samples_split=5,
                        random_state=42,
                        n_jobs=-1
                    )
                    self.model_type = "Random Forest"
            else:
                if model_name == "decision_tree":
                    model = DecisionTreeRegressor(
                        max_depth=10,
                        min_samples_split=10,
                        random_state=42
                    )
                    self.model_type = "Decision Tree"
                else:
                    model = RandomForestRegressor(
                        n_estimators=100,
                        max_depth=15,
                        min_samples_split=5,
                        random_state=42,
                        n_jobs=-1
                    )
                    self.model_type = "Random Forest"
            
            # Train
            model.fit(X_train, y_train)
            self.trained_model = model
            self.trained_models[self.model_type] = model  # store ALL models
            
            # Train score
            from sklearn.metrics import accuracy_score, r2_score
            y_train_pred = model.predict(X_train)
            if problem_type == "classification":
                train_score = float(accuracy_score(y_train, y_train_pred))
            else:
                train_score = float(r2_score(y_train, y_train_pred))
            
            return {
                "model_name": self.model_type,
                "cv_score_mean": 0.0,
                "cv_score_std": 0.0,
                "train_score": train_score,
                "num_features": X_train.shape[1],
                "training_samples": X_train.shape[0],
            }
            
        except Exception as e:
            logger.error(f"Tree model training error: {str(e)}")
            raise
    
    def predict(self, X_test: np.ndarray) -> np.ndarray:
        """Make predictions"""
        if self.trained_model is None:
            raise ValueError("Model not trained")
        return self.trained_model.predict(X_test)
    
    def get_feature_importance(self) -> Optional[np.ndarray]:
        """Get feature importance from tree model"""
        if self.trained_model is None:
            return None
        
        if hasattr(self.trained_model, 'feature_importances_'):
            return self.trained_model.feature_importances_.ravel()
        return None
    
    def get_all_models(self) -> Dict[str, Any]:
        """Return all trained models"""
        return self.trained_models