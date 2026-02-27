"""
MCP Server for Neural Network models (sklearn MLP).
"""

from sklearn.neural_network import MLPClassifier, MLPRegressor
from sklearn.model_selection import cross_val_score
import numpy as np
from typing import Dict, Any, Optional
import logging

logger = logging.getLogger(__name__)


class NeuralModelsServer:
    """
    MCP Server for Neural Network Model Family.
    Handles MLPClassifier and MLPRegressor from sklearn.
    
    Stores ALL trained models (not just the last one).
    """
    
    def __init__(self):
        self.trained_models: Dict[str, Any] = {}
        self.trained_model = None
        self.model_type = None
    
    def train(
        self,
        X_train: np.ndarray,
        y_train: np.ndarray,
        problem_type: str,
        model_name: str = "mlp"
    ) -> Dict[str, Any]:
        """
        Train neural network model.
        
        Args:
            X_train: Training features (should be scaled)
            y_train: Training target
            problem_type: 'classification' or 'regression'
            model_name: 'mlp' (default)
        """
        try:
            logger.info(f"Training neural model: {model_name} for {problem_type}")
            
            # Determine architecture based on feature count
            n_features = X_train.shape[1]
            hidden_layer_1 = min(128, max(32, n_features))
            hidden_layer_2 = min(64, max(16, n_features // 2))
            
            if problem_type == "classification":
                model = MLPClassifier(
                    hidden_layer_sizes=(hidden_layer_1, hidden_layer_2),
                    activation='relu',
                    solver='adam',
                    max_iter=200,
                    early_stopping=True,
                    validation_fraction=0.15,
                    n_iter_no_change=10,
                    random_state=42,
                    verbose=False,
                )
                self.model_type = "Neural Network (MLP)"
            else:
                model = MLPRegressor(
                    hidden_layer_sizes=(hidden_layer_1, hidden_layer_2),
                    activation='relu',
                    solver='adam',
                    max_iter=200,
                    early_stopping=True,
                    validation_fraction=0.15,
                    n_iter_no_change=10,
                    random_state=42,
                    verbose=False,
                )
                self.model_type = "Neural Network (MLP)"
            
            # Train
            model.fit(X_train, y_train)
            self.trained_model = model
            self.trained_models[self.model_type] = model
            
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
                "architecture": f"{hidden_layer_1}-{hidden_layer_2}",
                "epochs_run": model.n_iter_,
            }
        except Exception as e:
            logger.error(f"Neural model training error: {str(e)}")
            raise
    
    def predict(self, X_test: np.ndarray) -> np.ndarray:
        """Make predictions"""
        if self.trained_model is None:
            raise ValueError("Model not trained")
        return self.trained_model.predict(X_test)
    
    def get_feature_importance(self) -> Optional[np.ndarray]:
        """
        Approximate feature importance from MLP weights.
        Uses absolute sum of first-layer weights per feature.
        """
        if self.trained_model is None:
            return None
        
        if hasattr(self.trained_model, 'coefs_') and len(self.trained_model.coefs_) > 0:
            # Sum of absolute weights from input layer to first hidden layer
            return np.abs(self.trained_model.coefs_[0]).sum(axis=1).ravel()
        return None
    
    def get_all_models(self) -> Dict[str, Any]:
        """Return all trained models"""
        return self.trained_models
