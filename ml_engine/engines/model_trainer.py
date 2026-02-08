import sys
sys.path.append('/home/claude/intelliml-platform/ml_engine')

from ml_engine.mcp_servers.linear_models import LinearModelsServer
from ml_engine.mcp_servers.tree_models import TreeModelsServer
from ml_engine.mcp_servers.boosting_models import BoostingModelsServer
from sklearn.model_selection import train_test_split, StratifiedKFold, KFold
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.metrics import accuracy_score, r2_score, mean_squared_error
import pandas as pd
import numpy as np
from typing import Dict, Any, List
import logging

logger = logging.getLogger(__name__)

class ModelTrainer:
    """
    Orchestrates training across multiple MCP model servers
    """
    
    def __init__(self):
        self.servers = {
            'linear': LinearModelsServer(),
            'tree': TreeModelsServer(),
            'boosting': BoostingModelsServer(),
        }
        self.results = []
        self.best_model = None
        self.problem_type = None
        self.feature_names = None
        self.label_encoder = None
        self.scaler = StandardScaler()
        logger.info("ModelTrainer initialized")
    
    def train_all(
        self, 
        df: pd.DataFrame, 
        target_column: str,
        model_types: List[str] = None,
        test_size: float = 0.2,
        cv_folds: int = 5,
        enable_tuning: bool = False
    ) -> Dict[str, Any]:
        """
        Train multiple models and compare results
        
        Args:
            df: Input DataFrame
            target_column: Target column name
            model_types: List of model types to train
            test_size: Proportion of data for testing
            cv_folds: Number of cross-validation folds (3, 5, or 10)
            enable_tuning: Whether to enable hyperparameter tuning
        """
        try:
            logger.info(f"Starting training for target: {target_column}")
            logger.info(f"Dataset shape: {df.shape}")
            logger.info(f"Columns: {df.columns.tolist()}")
            
            # Prepare data
            X, y, self.problem_type = self._prepare_data(df, target_column)
            self.feature_names = [col for col in df.columns if col != target_column]
            
            logger.info(f"Problem type: {self.problem_type}")
            logger.info(f"Features shape: {X.shape}")
            logger.info(f"Target shape: {y.shape}")
            
            # Train-test split
            X_train, X_test, y_train, y_test = train_test_split(
                X, y, test_size=test_size, random_state=42
            )
            
            logger.info(f"Train size: {X_train.shape[0]}, Test size: {X_test.shape[0]}")
            
            # Determine which models to train
            if model_types is None:
                # Classification-specific models
                if self.problem_type == 'classification':
                    models_to_train = [
                        ('linear', 'auto'),           # Logistic Regression
                        ('linear', 'svc'),            # Support Vector Classifier
                        ('linear', 'knn'),            # K-Nearest Neighbors
                        ('linear', 'naive_bayes'),    # Gaussian Naive Bayes
                        ('tree', 'random_forest'),    # Random Forest
                        ('tree', 'decision_tree'),    # Decision Tree
                        ('boosting', 'xgboost'),      # XGBoost
                        ('boosting', 'lightgbm'),     # LightGBM
                        ('boosting', 'gradient_boosting'),  # Sklearn GradientBoosting
                        # ('boosting', 'catboost'),   # CatBoost (optional, needs install)
                    ]
                else:  # Regression
                    models_to_train = [
                        ('linear', 'auto'),           # Linear Regression
                        ('linear', 'ridge'),          # Ridge Regression
                        ('linear', 'lasso'),          # Lasso Regression
                        ('linear', 'elasticnet'),     # ElasticNet
                        ('linear', 'svr'),            # Support Vector Regressor
                        ('linear', 'knn'),            # K-Nearest Neighbors
                        ('tree', 'random_forest'),    # Random Forest
                        ('tree', 'decision_tree'),    # Decision Tree
                        ('boosting', 'xgboost'),      # XGBoost
                        ('boosting', 'lightgbm'),     # LightGBM
                        ('boosting', 'gradient_boosting'),  # Sklearn GradientBoosting
                        # ('boosting', 'catboost'),   # CatBoost (optional, needs install)
                    ]
            else:
                models_to_train = [(mt.split('_')[0], mt) for mt in model_types]
            
            logger.info(f"Training {len(models_to_train)} models")
            
            # Train each model
            results = []
            for idx, (server_name, model_name) in enumerate(models_to_train, 1):
                try:
                    logger.info(f"Training model {idx}/{len(models_to_train)}: {model_name}")
                    result = self._train_single_model(
                        server_name, model_name, 
                        X_train, X_test, y_train, y_test,
                        cv_folds=cv_folds,
                        enable_tuning=enable_tuning
                    )
                    results.append(result)
                    logger.info(f"Model {model_name} trained. Score: {result['test_score']:.4f}")
                except Exception as e:
                    logger.error(f"Error training {model_name}: {str(e)}", exc_info=True)
            
            if not results:
                raise ValueError("No models were successfully trained")
            
            # Sort by score
            results.sort(key=lambda x: x['test_score'], reverse=True)
            self.results = results
            
            logger.info(f"Training complete. Best model: {results[0]['model_name']} ({results[0]['test_score']:.4f})")
            
            # Store best model
            best_result = results[0]
            self.best_model = {
                'server': best_result['server'],
                'model_name': best_result['model_name'],
            }
            
            return {
                'results': results,
                'best_model': results[0],
                'problem_type': self.problem_type,
                'num_features': X.shape[1],
                'num_samples': len(df),
                'feature_names': self.feature_names,
            }
            
        except Exception as e:
            logger.error(f"Model training error: {str(e)}", exc_info=True)
            raise
    
    def _prepare_data(self, df: pd.DataFrame, target_column: str):
        """Prepare data for training"""
        logger.info("Preparing data...")
        
        # Separate features and target
        X = df.drop(columns=[target_column])
        y = df[target_column]
        
        logger.info(f"Target column type: {y.dtype}")
        logger.info(f"Target unique values: {y.nunique()}")
        
        # Determine problem type
        if y.dtype == 'object' or y.nunique() < 10:
            problem_type = 'classification'
            logger.info("Detected classification problem")
            # Encode target
            self.label_encoder = LabelEncoder()
            y = self.label_encoder.fit_transform(y)
            logger.info(f"Encoded {len(self.label_encoder.classes_)} classes")
        else:
            problem_type = 'regression'
            logger.info("Detected regression problem")
        
        # Handle categorical features
        for col in X.select_dtypes(include=['object']).columns:
            logger.info(f"Encoding categorical column: {col}")
            le = LabelEncoder()
            X[col] = le.fit_transform(X[col].astype(str))
        
        # Fill missing values
        if X.isnull().any().any():
            logger.info("Filling missing values")
            X = X.fillna(X.mean())
        
        # Convert to numpy
        X = X.values
        y = y.values if hasattr(y, 'values') else y
        
        # Scale features
        logger.info("Scaling features")
        X = self.scaler.fit_transform(X)
        
        return X, y, problem_type
    
    def _train_single_model(
        self, 
        server_name: str, 
        model_name: str,
        X_train, X_test, y_train, y_test,
        cv_folds: int = 5,
        enable_tuning: bool = False
    ) -> Dict[str, Any]:
        """Train a single model and evaluate with configurable CV"""
        server = self.servers[server_name]
        
        # Train (optionally with tuning)
        if enable_tuning:
            train_info = self._train_with_tuning(
                server, model_name, X_train, y_train, cv_folds
            )
        else:
            train_info = server.train(X_train, y_train, self.problem_type, model_name)
            
            # Re-calculate CV score with specified folds
            if cv_folds != 5:
                from sklearn.model_selection import cross_val_score
                if self.problem_type == 'classification':
                    cv = StratifiedKFold(n_splits=cv_folds, shuffle=True, random_state=42)
                else:
                    cv = KFold(n_splits=cv_folds, shuffle=True, random_state=42)
                cv_scores = cross_val_score(server.trained_model, X_train, y_train, cv=cv)
                train_info['cv_score_mean'] = float(cv_scores.mean())
                train_info['cv_score_std'] = float(cv_scores.std())
        
        # Predict on test set
        y_pred = server.predict(X_test)
        
        # Calculate metrics
        # Calculate metrics
        metrics = {}
        confusion_matrix_data = None
        roc_curve_data = None
        
        if self.problem_type == 'classification':
             # Use safe scoring imports (assuming they are imported at top, else add them)
            from sklearn.metrics import precision_score, recall_score, f1_score, confusion_matrix, roc_curve, auc
            
            test_score = accuracy_score(y_test, y_pred)
            metric_name = 'accuracy'
            
            # Simple average for multiclass, or binary
            is_binary = len(np.unique(y_test)) == 2
            avg_method = 'binary' if is_binary else 'weighted'
            
            metrics = {
                'accuracy': float(test_score),
                'precision': float(precision_score(y_test, y_pred, average=avg_method, zero_division=0)),
                'recall': float(recall_score(y_test, y_pred, average=avg_method, zero_division=0)),
                'f1': float(f1_score(y_test, y_pred, average=avg_method, zero_division=0)),
            }
            
            # Confusion Matrix
            cm = confusion_matrix(y_test, y_pred)
            if self.label_encoder:
                 classes = self.label_encoder.classes_
            else:
                 classes = [str(c) for c in np.unique(y_test)]
            
            confusion_matrix_data = []
            for i, row in enumerate(cm):
                row_dict = {}
                for j, val in enumerate(row):
                    # Use index if classes length mismatch (safety)
                    col_label = str(classes[j]) if j < len(classes) else str(j)
                    row_dict[col_label] = int(val)
                
                row_label = str(classes[i]) if i < len(classes) else str(i)
                row_dict["Actual"] = row_label
                confusion_matrix_data.append(row_dict)
            
            # Add labels for frontend
            confusion_matrix_labels = [str(c) for c in classes]

            # ROC Curve (only if model supports predict_proba and binary for now to keep simple)
            try:
                if is_binary and hasattr(server, 'trained_model') and hasattr(server.trained_model, "predict_proba"):
                     y_prob = server.trained_model.predict_proba(X_test)[:, 1]
                     fpr, tpr, _ = roc_curve(y_test, y_prob)
                     roc_auc = auc(fpr, tpr)
                     metrics['auc'] = float(roc_auc)
                     
                     # Sample ROC to reduce payload size
                     roc_curve_data = [{"x": float(f), "y": float(t)} for f, t in zip(fpr[::5], tpr[::5])]
                     if roc_curve_data[0]['x'] != 0: roc_curve_data.insert(0, {"x": 0, "y": 0})
                     if roc_curve_data[-1]['x'] != 1: roc_curve_data.append({"x": 1, "y": 1})
            except Exception as e:
                logger.warning(f"ROC curve calculation failed: {e}")
                metrics['auc'] = 0.0

        else:
            from sklearn.metrics import mean_absolute_error
            test_score = r2_score(y_test, y_pred)
            metric_name = 'r2_score'
            mse = mean_squared_error(y_test, y_pred)
            rmse = np.sqrt(mse)
            mae = mean_absolute_error(y_test, y_pred)
            
            metrics = {
                'r2': float(test_score),
                'mse': float(mse),
                'rmse': float(rmse),
                'mae': float(mae)
            }
            train_info['rmse'] = float(rmse)
        
        # Get feature importance
        feature_importance = server.get_feature_importance()
        
        result_dict = {
            'server': server_name,
            'model_name': train_info['model_name'],
            'test_score': float(test_score),
            'cv_score': float(train_info['cv_score_mean']),
            'metric_name': metric_name,
            'metrics': metrics,
            'feature_importance': feature_importance.tolist() if feature_importance is not None else None,
            'confusion_matrix': confusion_matrix_data,
            'confusion_matrix_labels': confusion_matrix_labels if 'confusion_matrix_labels' in locals() else None,
            'roc_curve': roc_curve_data,
            **train_info
        }
        return result_dict
    
    def get_best_model_server(self):
        """Get the server containing the best model"""
        if self.best_model is None:
            return None
        return self.servers[self.best_model['server']]
    
    def _train_with_tuning(
        self,
        server,
        model_name: str,
        X_train,
        y_train,
        cv_folds: int = 5
    ) -> Dict[str, Any]:
        """
        Train with hyperparameter tuning using RandomizedSearchCV
        """
        from sklearn.model_selection import RandomizedSearchCV
        
        logger.info(f"Training with hyperparameter tuning: {model_name}")
        
        # Define parameter grids for each model
        param_grids = {
            'auto': {'C': [0.01, 0.1, 1, 10], 'solver': ['lbfgs', 'saga']},
            'svc': {'C': [0.1, 1, 10], 'kernel': ['rbf', 'linear'], 'gamma': ['scale', 'auto']},
            'knn': {'n_neighbors': [3, 5, 7, 11], 'weights': ['uniform', 'distance']},
            'random_forest': {'n_estimators': [50, 100, 200], 'max_depth': [5, 10, 15, None]},
            'decision_tree': {'max_depth': [5, 10, 15, None], 'min_samples_split': [2, 5, 10]},
            'xgboost': {'n_estimators': [50, 100], 'max_depth': [3, 6, 10], 'learning_rate': [0.01, 0.1]},
            'lightgbm': {'n_estimators': [50, 100], 'max_depth': [3, 6, 10], 'learning_rate': [0.01, 0.1]},
            'gradient_boosting': {'n_estimators': [50, 100], 'max_depth': [3, 6], 'learning_rate': [0.01, 0.1]},
            'ridge': {'alpha': [0.01, 0.1, 1, 10, 100]},
            'lasso': {'alpha': [0.01, 0.1, 1, 10, 100]},
            'elasticnet': {'alpha': [0.01, 0.1, 1, 10], 'l1_ratio': [0.2, 0.5, 0.8]},
            'svr': {'C': [0.1, 1, 10], 'kernel': ['rbf', 'linear']},
        }
        
        # First train normally to get base model
        train_info = server.train(X_train, y_train, self.problem_type, model_name)
        base_model = server.trained_model
        param_grid = param_grids.get(model_name, {})
        
        if not param_grid:
            logger.info(f"No param grid for {model_name}, using default")
            return train_info
        
        # Setup CV
        if self.problem_type == 'classification':
            cv = StratifiedKFold(n_splits=cv_folds, shuffle=True, random_state=42)
            scoring = 'accuracy'
        else:
            cv = KFold(n_splits=cv_folds, shuffle=True, random_state=42)
            scoring = 'r2'
        
        try:
            model_class = type(base_model)
            fresh_model = model_class()
            
            search = RandomizedSearchCV(
                fresh_model, param_distributions=param_grid,
                n_iter=8, cv=cv, scoring=scoring,
                random_state=42, n_jobs=-1
            )
            search.fit(X_train, y_train)
            
            server.trained_model = search.best_estimator_
            server.model_type = f"{train_info['model_name']} (Tuned)"
            
            logger.info(f"Best params: {search.best_params_}, Best score: {search.best_score_:.4f}")
            
            return {
                "model_name": server.model_type,
                "cv_score_mean": float(search.best_score_),
                "cv_score_std": float(search.cv_results_['std_test_score'][search.best_index_]),
                "num_features": X_train.shape[1],
                "training_samples": X_train.shape[0],
            }
        except Exception as e:
            logger.warning(f"Tuning failed for {model_name}: {e}")
            return train_info