from sklearn.tree import DecisionTreeClassifier, DecisionTreeRegressor
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
from sklearn.model_selection import cross_val_score
import numpy as np
from typing import Dict, Any, Optional
import logging
from app.core.exceptions import NotFoundError

logger = logging.getLogger(__name__)


class TreeModelsServer:
    """
    MCP Server for Tree-Based Model Family
    Handles Decision Trees and Random Forests.
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
        model_name: str = "random_forest"
    ) -> Dict[str, Any]:
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
            logger.error(f"Tree model training error: {str(e)}")
            raise

    def predict(self, X_test: np.ndarray) -> np.ndarray:
        if self.trained_model is None:
            raise NotFoundError("Model not trained")
        return self.trained_model.predict(X_test)

    def get_feature_importance(self) -> Optional[np.ndarray]:
        if self.trained_model is None:
            return None

        if hasattr(self.trained_model, 'feature_importances_'):
            return self.trained_model.feature_importances_.ravel()
        return None

    def get_all_models(self) -> Dict[str, Any]:
        return self.trained_models