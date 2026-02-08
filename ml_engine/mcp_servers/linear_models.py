from sklearn.linear_model import LinearRegression, LogisticRegression, Ridge, Lasso, ElasticNet
from sklearn.svm import SVC, SVR
from sklearn.neighbors import KNeighborsClassifier, KNeighborsRegressor
from sklearn.naive_bayes import GaussianNB
from sklearn.model_selection import cross_val_score
import numpy as np
from typing import Dict, Any, Optional
import logging

logger = logging.getLogger(__name__)

class LinearModelsServer:
    """
    MCP Server for Linear Model Family
    Handles Linear Regression, Logistic Regression, Ridge, Lasso, ElasticNet,
    SVC/SVR, KNN, and Naive Bayes
    """
    
    def __init__(self):
        self.models = {}
        self.trained_model = None
        self.model_type = None
    
    def train(
        self, 
        X_train: np.ndarray, 
        y_train: np.ndarray, 
        problem_type: str,
        model_name: str = "auto"
    ) -> Dict[str, Any]:
        """
        Train linear model
        
        Args:
            X_train: Training features
            y_train: Training target
            problem_type: 'classification' or 'regression'
            model_name: Specific model to use or 'auto'
            
        Returns:
            Training results
        """
        try:
            logger.info(f"Training linear model: {model_name} for {problem_type}")
            
            if problem_type == "classification":
                if model_name == "svc":
                    model = SVC(kernel='rbf', probability=True, random_state=42)
                    self.model_type = "Support Vector Classifier"
                elif model_name == "knn":
                    model = KNeighborsClassifier(n_neighbors=5, n_jobs=-1)
                    self.model_type = "K-Nearest Neighbors"
                elif model_name == "naive_bayes":
                    model = GaussianNB()
                    self.model_type = "Gaussian Naive Bayes"
                else:  # auto or logistic
                    model = LogisticRegression(max_iter=1000, random_state=42)
                    self.model_type = "Logistic Regression"
            else:  # regression
                if model_name == "ridge":
                    model = Ridge(random_state=42)
                    self.model_type = "Ridge Regression"
                elif model_name == "lasso":
                    model = Lasso(random_state=42)
                    self.model_type = "Lasso Regression"
                elif model_name == "elasticnet":
                    model = ElasticNet(random_state=42)
                    self.model_type = "ElasticNet"
                elif model_name == "svr":
                    model = SVR(kernel='rbf')
                    self.model_type = "Support Vector Regressor"
                elif model_name == "knn":
                    model = KNeighborsRegressor(n_neighbors=5, n_jobs=-1)
                    self.model_type = "K-Nearest Neighbors"
                else:  # auto or linear
                    model = LinearRegression()
                    self.model_type = "Linear Regression"
            
            # Train
            model.fit(X_train, y_train)
            self.trained_model = model
            
            # Cross-validation score
            cv_scores = cross_val_score(model, X_train, y_train, cv=5)
            
            return {
                "model_name": self.model_type,
                "cv_score_mean": float(cv_scores.mean()),
                "cv_score_std": float(cv_scores.std()),
                "num_features": X_train.shape[1],
                "training_samples": X_train.shape[0],
            }
            
        except Exception as e:
            logger.error(f"Linear model training error: {str(e)}")
            raise
    
    def predict(self, X_test: np.ndarray) -> np.ndarray:
        """Make predictions"""
        if self.trained_model is None:
            raise ValueError("Model not trained")
        return self.trained_model.predict(X_test)
    
    def get_feature_importance(self) -> Optional[np.ndarray]:
        """Get coefficients as feature importance"""
        if self.trained_model is None:
            return None
        
        if hasattr(self.trained_model, 'coef_'):
            return np.abs(self.trained_model.coef_)
        elif hasattr(self.trained_model, 'feature_importances_'):
            return self.trained_model.feature_importances_
        return None