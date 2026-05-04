from sklearn.linear_model import LinearRegression, LogisticRegression, Ridge, Lasso, ElasticNet
from sklearn.svm import SVC, SVR
from sklearn.neighbors import KNeighborsClassifier, KNeighborsRegressor
from sklearn.naive_bayes import GaussianNB
import numpy as np
from typing import Dict, Any, Optional
import logging
from app.core.exceptions import NotFoundError

logger = logging.getLogger(__name__)


class LinearModelsServer:
    """
    MCP Server for Linear Model Family
    Handles Linear Regression, Logistic Regression, Ridge, Lasso, ElasticNet,
    SVC/SVR, KNN, and Naive Bayes.

    Stores ALL trained models (not just the last one) so they can be
    persisted and compared after training.
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
        model_name: str = "auto"
    ) -> Dict[str, Any]:
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
                else:
                    model = LogisticRegression(max_iter=1000, random_state=42)
                    self.model_type = "Logistic Regression"
            else:
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
                else:
                    model = LinearRegression()
                    self.model_type = "Linear Regression"

            model.fit(X_train, y_train)
            self.trained_model = model
            self.trained_models[self.model_type] = model

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
            logger.error(f"Linear model training error: {str(e)}")
            raise

    def predict(self, X_test: np.ndarray) -> np.ndarray:
        if self.trained_model is None:
            raise NotFoundError("Model not trained")
        return self.trained_model.predict(X_test)

    def get_feature_importance(self) -> Optional[np.ndarray]:
        if self.trained_model is None:
            return None

        if hasattr(self.trained_model, 'coef_'):
            coef = np.abs(self.trained_model.coef_)
            return coef.ravel()
        return None

    def get_all_models(self) -> Dict[str, Any]:
        return self.trained_models