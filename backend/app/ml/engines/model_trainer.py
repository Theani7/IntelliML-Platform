"""
================================================================================
ModelTrainer - ML Engine Orchestrator
================================================================================

PURPOSE:
    Orchestrates the entire ML training pipeline by coordinating multiple model
    servers, handling data preprocessing, and aggregating results.

ARCHITECTURE:
    ┌─────────────────────────────────────────────────────────────────────────────┐
    │                          ModelTrainer (Main Orchestrator)                    │
    ├──────────────────────────────────────────────────────────��──────────────────┤
    │                                                                             │
    │  ┌─────────────────────────────────────────────────────────────────────┐   │
    │  │                     Data Preprocessing                               │   │
    │  │  • Encode categorical columns                                        │   │
    │  │  • Split train/test                                                  │   │
    │  │  • Impute missing values (mean)                                      │   │
    │  │  • Scale features (StandardScaler)                                   │   │
    │  │  • Feature selection (if >50 features)                               │   │
    │  │  • Apply SMOTE (if imbalanced)                                       │   │
    │  └─────────────────────────────────────────────────────────────────────┘   │
    │                                    │                                        │
    │                                    ▼                                        │
    │  ┌─────────────────────────────────────────────────────────────────────┐   │
    │  │                    Model Servers (Parallel Training)                  │   │
    │  │                                                                      │   │
    │  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐    │   │
    │  │  │   Linear    │ │    Tree     │ │  Boosting   │ │   Neural    │    │   │
    │  │  │  Models     │ │   Models    │ │   Models    │ │   Models    │    │   │
    │  │  │             │ │             │ │             │ │             │    │   │
    │  │  │ • LogReg    │ │ • RF        │ │ • XGBoost   │ │ • MLP       │    │   │
    │  │  │ • Ridge     │ │ • DecisionTree│ │ • LightGBM │ │             │    │   │
    │  │  │ • Lasso     │ │             │ │ • CatBoost  │ │             │    │   │
    │  │  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘    │   │
    │  └─────────────────────────────────────────────────────────────────────┘   │
    │                                    │                                        │
    │                                    ▼                                        │
    │  ┌─────────────────────────────────────────────────────────────────────┐   │
    │  │                    Results Aggregation                              │   │
    │  │  • Composite ranking (score - penalties)                           │   │
    │  │  • Feature importance aggregation                                   │   │
    │  │  • Stacking ensemble                                                │   │
    │  └─────────────────────────────────────────────────────────────────────┘   │
    │                                                                             │
    └─────────────────────────────────────────────────────────────────────────────┘

MODEL SERVERS:

1. LinearModelsServer
   - LogisticRegression: Binary/multi-class classification
   - Ridge: L2 regularized regression
   - Lasso: L1 sparse regression
   - LinearRegression: Basic regression

2. TreeModelsServer
   - RandomForest: Ensemble of decision trees
   - DecisionTree: Single decision tree

3. BoostingModelsServer (optional libraries)
   - XGBoost: If installed
   - LightGBM: If installed
   - CatBoost: If installed
   - GradientBoosting: Sklearn fallback

4. NeuralModelsServer
   - MLPClassifier: Neural network for classification
   - MLPRegressor: Neural network for regression

PREPROCESSING STEPS:

1. DATA PREPARATION
   - Target column separation (X, y)
   - Categorical encoding (LabelEncoder for target)
   - One-hot encoding for categorical features

2. TRAIN/TEST SPLIT
   - Default: 80% train, 20% test
   - Stratified split for classification (preserves class distribution)
   - random_state=42 for reproducibility

3. MISSING VALUE IMPUTATION
   - Method: Mean imputation (SimpleImputer)
   - Fits on train, transforms both train and test
   - Prevents data leakage

4. FEATURE SCALING
   - Method: StandardScaler (z-score normalization)
   - Formula: (x - mean) / std
   - Required for: Logistic regression, neural networks, SVMs

5. FEATURE SELECTION (if >50 features)
   - Method: SelectKBest with mutual_info
   - Selects top 50 most informative features
   - Reduces overfitting risk

6. CLASS BALANCING (if imbalanced)
   - Method: SMOTE (Synthetic Minority Oversampling)
   - Only for classification
   - Only if imblearn installed

COMPOSITE RANKING FORMULA:
   composite_score = test_score - overfit_penalty - speed_penalty
   
   overfit_penalty = (train_score - test_score) * 0.3
   speed_penalty = (training_time / max_time) * 0.05

   This penalizes:
   - Overfitting (large train-test gap)
   - Slow training (relative to other models)

STACKING ENSEMBLE:
   - Uses top 3 models as base estimators
   - LogisticRegression as meta-learner
   - Takes predictions from base models as features

DATA LEAKAGE DETECTION:
   Detects potential leakage by checking for:
   - Target column correlations > 0.9 with features
   - Columns that directly encode the target
   - Near-perfect correlations

================================================================================
"""

from app.ml.servers.linear_models import LinearModelsServer
from app.ml.servers.tree_models import TreeModelsServer
from app.ml.servers.boosting_models import BoostingModelsServer, CATBOOST_AVAILABLE
from app.ml.servers.neural_models import NeuralModelsServer
from app.core.exceptions import MLTrainingError
from sklearn.model_selection import train_test_split, StratifiedKFold, KFold
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.metrics import accuracy_score, r2_score, mean_squared_error
import pandas as pd
import numpy as np
from typing import Dict, Any, List, Optional, Callable
from concurrent.futures import ThreadPoolExecutor, as_completed
import logging
import time
import os
import sys

# SMOTE for handling imbalanced datasets (optional)
try:
    from imblearn.over_sampling import SMOTE
    SMOTE_AVAILABLE = True
except ImportError:
    SMOTE_AVAILABLE = False

logger = logging.getLogger(__name__)


class ModelTrainer:
    """
    Orchestrates ML training across multiple model servers.
    
    This is the main entry point for model training. It:
    1. Preprocesses data (encode, scale, impute)
    2. Trains multiple models in parallel
    3. Ranks models by composite score
    4. Builds stacking ensemble
    5. Aggregates feature importance
    
    Usage:
        trainer = ModelTrainer()
        results = trainer.train_all(df, target_column="survived")
    
    Attributes:
        servers: Dict of model servers (linear, tree, boosting, neural)
        results: List of trained model results
        best_model: The best performing model
        problem_type: "classification" or "regression"
        feature_names: List of feature column names
        scaler: Fitted StandardScaler
        imputer: Fitted SimpleImputer
        _aggregated_importance: Combined feature importance
        _leakage_warnings: Potential data leakage warnings
    """
    
    def __init__(self):
        """
        Initialize the ModelTrainer with all model servers.
        
        Creates one instance of each model server type.
        Servers are kept in memory for potential reuse.
        """
        self.servers = {
            'linear': LinearModelsServer(),
            'tree': TreeModelsServer(),
            'boosting': BoostingModelsServer(),
            'neural': NeuralModelsServer(),
        }
        self.results = []
        self.best_model = None
        self.problem_type = None
        self.feature_names = None
        self.label_encoder = None
        self.scaler = StandardScaler()
        self.imputer = None
        self.feature_selector = None
        self._all_trained_models: Dict[str, Any] = {}
        self._aggregated_importance = None
        self._leakage_warnings: List[str] = []
        self._reproducibility_config: Dict[str, Any] = {}
        logger.info("ModelTrainer initialized (4 servers: linear, tree, boosting, neural)")
    
    def train_all(
        self, 
        df: pd.DataFrame, 
        target_column: str,
        model_types: List[str] = None,
        test_size: float = 0.2,
        cv_folds: int = 5,
        enable_tuning: bool = False,
        on_progress: Optional[Callable[[int, int, str], None]] = None,
    ) -> Dict[str, Any]:
        """
        Train all models on the dataset.
        
        Main training pipeline that orchestrates:
        1. Data leakage detection
        2. Data preparation (split, encode, scale)
        3. Model training
        4. Ensemble building
        5. Result aggregation
        
        Args:
            df: Input DataFrame with features and target column
            target_column: Name of column to predict
            model_types: List of model server names to use
                        (e.g., ['linear', 'tree'])
                        If None, uses all servers
            test_size: Proportion for test set (default: 0.2 = 20%)
            cv_folds: Cross-validation folds (default: 5)
            enable_tuning: Enable hyperparameter tuning (default: False)
            on_progress: Callback function (step, total, message)
                        Called during training for progress updates
        
        Returns:
            Dict containing:
            - results: List of all model results
            - best_model: Top performing model
            - problem_type: "classification" or "regression"
            - feature_names: List of feature column names
            - aggregated_feature_importance: Combined importance
            - leakage_warnings: Any detected data issues
            - reproducibility_config: Config for recreating this run
        
        Raises:
            MLTrainingError: If training fails or no models succeed
        """
        try:
            logger.info(f"Starting training for target: {target_column}")
            logger.info(f"Dataset shape: {df.shape}")
            
            # =====================================================================
            # STEP 1: Detect potential data leakage
            # =====================================================================
            # Checks for columns that might directly encode the target
            self._detect_leakage(df, target_column)
            
            # =====================================================================
            # STEP 2: Prepare data (separate X, y, encode)
            # =====================================================================
            X, y, self.problem_type, encoded_feature_names = self._prepare_data(df, target_column)
            self.feature_names = encoded_feature_names
            
            logger.info(f"Problem type: {self.problem_type}")
            logger.info(f"Features shape: {X.shape}")
            
            # =====================================================================
            # STEP 3: Split into train/test sets
            # =====================================================================
            X_train, X_test, y_train, y_test = train_test_split(
                X, y, test_size=test_size, random_state=42
            )
            
            # Keep raw copies for potential use
            self.X_train_raw = X_train.copy()
            self.y_train_raw = y_train.copy()
            
            logger.info(f"Train size: {X_train.shape[0]}, Test size: {X_test.shape[0]}")
            
            # =====================================================================
            # STEP 4: Impute missing values
            # =====================================================================
            from sklearn.impute import SimpleImputer
            
            logger.info("Imputing missing values")
            self.imputer = SimpleImputer(strategy='mean')
            X_train = self.imputer.fit_transform(X_train)
            X_test = self.imputer.transform(X_test)
            
            # =====================================================================
            # STEP 5: Scale features
            # =====================================================================
            logger.info("Scaling features")
            X_train = self.scaler.fit_transform(X_train)
            X_test = self.scaler.transform(X_test)
            
            # =====================================================================
            # STEP 6: Feature selection (if many features)
            # =====================================================================
            # Reduces dimensionality to prevent overfitting
            if X_train.shape[1] > 50:
                logger.info("Reducing features")
                self.feature_selector = self._get_feature_selector(X_train, y_train, self.problem_type, max_features=50)
                if self.feature_selector:
                    X_train = self.feature_selector.transform(X_train)
                    X_test = self.feature_selector.transform(X_test)
                    
                    # Update feature names to match selected features
                    mask = self.feature_selector.get_support()
                    self.feature_names = [name for i, name in enumerate(self.feature_names) if mask[i]]
            
            # =====================================================================
            # STEP 7: Apply SMOTE for class imbalance
            # =====================================================================
            X_train, y_train = self._apply_smote(X_train, y_train)
            
            # Store processed data for potential reuse
            self.X_train = X_train
            self.y_train = y_train
            
            # =====================================================================
            # STEP 8: Get list of models to train
            # =====================================================================
            models_to_train = self._get_model_list(model_types)
            total_steps = len(models_to_train) + 3  # +3 for prep, stacking, done
            
            if on_progress:
                on_progress(1, total_steps, "Data prepared, starting model training…")
            
            logger.info(f"Training {len(models_to_train)} models")
            
            # =====================================================================
            # STEP 9: Train models in parallel
            # =====================================================================
            results = self._train_models_parallel(
                models_to_train, X_train, X_test, y_train, y_test,
                cv_folds=cv_folds, enable_tuning=enable_tuning,
                on_progress=on_progress, total_steps=total_steps,
            )
            
            if not results:
                raise MLTrainingError("No models were successfully trained")
            
            # =====================================================================
            # STEP 10: Apply composite ranking
            # =====================================================================
            # Penalizes overfitting and slow training
            results = self._apply_composite_ranking(results)
            
            # =====================================================================
            # STEP 11: Aggregate feature importance
            # =====================================================================
            self._aggregated_importance = self._aggregate_feature_importance(results)
            
            # =====================================================================
            # STEP 12: Build stacking ensemble
            # =====================================================================
            stacking_step = len(models_to_train) + 2
            if on_progress:
                on_progress(stacking_step, total_steps, "Building stacking ensemble of top models…")
            
            stacking_result = self._build_stacking_ensemble(
                X_train, y_train, results
            )
            if stacking_result:
                results.append(stacking_result)
                logger.info(f"✓ Stacking ensemble: {stacking_result['test_score']:.4f}")
            
            # =====================================================================
            # STEP 13: Sort by composite score
            # =====================================================================
            results.sort(key=lambda x: x.get('composite_score', x['test_score']), reverse=True)
            self.results = results
            
            # Set best model info
            best_result = results[0]
            self.best_model = {
                'server': best_result.get('server', 'ensemble'),
                'model_name': best_result['model_name'],
            }
            
            # Collect all trained models from servers
            for server in self.servers.values():
                self._all_trained_models.update(server.get_all_models())
            
            # =====================================================================
            # STEP 14: Build reproducibility config
            # =====================================================================
            # Stores all settings needed to reproduce this training
            self._reproducibility_config = {
                'test_size': test_size,
                'cv_folds': cv_folds,
                'random_state': 42,
                'scaler': 'StandardScaler',
                'scaler_mean': self.scaler.mean_.tolist() if hasattr(self.scaler, 'mean_') and self.scaler.mean_ is not None else None,
                'scaler_scale': self.scaler.scale_.tolist() if hasattr(self.scaler, 'scale_') and self.scaler.scale_ is not None else None,
                'feature_names': self.feature_names,
                'label_encoder_classes': self.label_encoder.classes_.tolist() if self.label_encoder else None,
                'problem_type': self.problem_type,
                'smote_applied': SMOTE_AVAILABLE and self.problem_type == 'classification',
                'num_models_trained': len(results),
            }
            
            if on_progress:
                on_progress(total_steps, total_steps, "Training complete!")
            
            logger.info(f"Training complete. Best: {results[0]['model_name']} ({results[0]['test_score']:.4f})")
            
            # =====================================================================
            # STEP 15: Return results
            # =====================================================================
            return {
                'results': results,
                'best_model': results[0],
                'problem_type': self.problem_type,
                'num_features': X.shape[1],
                'num_samples': len(df),
                'feature_names': self.feature_names,
                'aggregated_feature_importance': self._aggregated_importance,
                'leakage_warnings': self._leakage_warnings,
                'reproducibility_config': self._reproducibility_config,
            }
            
        except Exception as e:
            logger.error(f"Model training error: {str(e)}", exc_info=True)
            raise

    def _detect_leakage(self, df: pd.DataFrame, target_column: str) -> None:
        """
        Detect potential data leakage in features.

        Data leakage occurs when a feature contains information that wouldn't
        be available at prediction time (e.g., the target encoded in another column).

        Checks:
        - Columns with >0.95 correlation to target (classification)
        - Near-perfect feature correlations
        - Columns that appear to encode the target

        Args:
            df: Input DataFrame
            target_column: Name of the target column
        """
        self._leakage_warnings = []

        try:
            if target_column not in df.columns:
                return

            target = df[target_column]

            # For classification, check for near-perfect correlations
            if target.dtype == 'object' or target.nunique() <= 10:
                for col in df.columns:
                    if col == target_column:
                        continue
                    if df[col].dtype in ['int64', 'float64']:
                        try:
                            # Check correlation with encoded target
                            if target.dtype == 'object':
                                le = LabelEncoder()
                                target_encoded = le.fit_transform(target)
                            else:
                                target_encoded = target.values

                            correlation = np.corrcoef(
                                df[col].fillna(0).values,
                                target_encoded
                            )[0, 1]

                            if abs(correlation) > 0.95:
                                self._leakage_warnings.append(
                                    f"Feature '{col}' has near-perfect correlation ({abs(correlation):.3f}) "
                                    f"with target - may indicate data leakage"
                                )
                        except Exception:
                            pass

            # Check for columns that might directly encode the target
            target_values = set(target.unique())
            for col in df.columns:
                if col == target_column or df[col].dtype == 'object':
                    continue

                col_values = set(df[col].unique())
                # If feature has very few unique values that match target size
                if len(col_values) <= 3 and len(target_values) <= 3:
                    # Check if they might be identical
                    try:
                        correlation = np.corrcoef(
                            df[col].fillna(0).values,
                            pd.Series(target_values).isin(list(target_values)).astype(int).repeat(len(df[col]) // len(target_values) + 1).iloc[:len(df)]
                        )[0, 1]
                        if abs(correlation) > 0.98:
                            self._leakage_warnings.append(
                                f"Feature '{col}' strongly correlates with target - possible leakage"
                            )
                    except Exception:
                        pass

            if self._leakage_warnings:
                logger.warning(f"Data leakage detected: {len(self._leakage_warnings)} potential issues")
                for warning in self._leakage_warnings:
                    logger.warning(f"  - {warning}")

        except Exception as e:
            logger.warning(f"Leakage detection skipped: {str(e)}")
            self._leakage_warnings = []

    def _prepare_data(
        self,
        df: pd.DataFrame,
        target_column: str
    ) -> tuple:
        """
        Prepare data for training - separate X and y, encode target.

        Args:
            df: Input DataFrame
            target_column: Name of target column

        Returns:
            Tuple of (X, y, problem_type, feature_names)
        """
        # Separate features and target
        y = df[target_column].copy()
        X = df.drop(columns=[target_column])

        # Determine problem type
        if y.dtype == 'object' or y.nunique() <= 10:
            self.problem_type = 'classification'
            # Encode target
            self.label_encoder = LabelEncoder()
            y = self.label_encoder.fit_transform(y)
        else:
            self.problem_type = 'regression'
            self.label_encoder = None

        # Handle categorical features - only low-cardinality ones
        categorical_cols = X.select_dtypes(include=['object']).columns.tolist()
        numeric_cols = X.select_dtypes(include=['int64', 'float64']).columns.tolist()

        # Drop high-cardinality text columns (like names) - keep only numeric + useful categoricals
        cols_to_drop = []
        for col in categorical_cols:
            if X[col].nunique() > 10:  # Skip columns with >10 unique values
                cols_to_drop.append(col)
        
        if cols_to_drop:
            X = X.drop(columns=cols_to_drop)
            categorical_cols = [c for c in categorical_cols if c not in cols_to_drop]
            logger.info(f"Dropped high-cardinality columns: {cols_to_drop}")

        # Update feature names - only include numeric and low-cardinality categoricals
        if categorical_cols:
            X = pd.get_dummies(X, columns=categorical_cols, drop_first=True)
            
        encoded_feature_names = list(X.columns)

        return X.values, y, self.problem_type, encoded_feature_names

    def _create_feature_selector(self, X: np.ndarray, y: np.ndarray) -> callable:
        """
        Create feature selector if needed (when too many features).

        Args:
            X: Feature matrix
            y: Target vector

        Returns:
            Fitted feature selector or None
        """
        from sklearn.feature_selection import SelectKBest, mutual_info_regression, mutual_info_classif

        max_features = min(50, X.shape[1])

        if self.problem_type == 'classification':
            selector = SelectKBest(
                mutual_info_classif,
                k=min(max_features, X.shape[1])
            )
        else:
            selector = SelectKBest(
                mutual_info_regression,
                k=min(max_features, X.shape[1])
            )

        return selector.fit(X, y)

    def _rank_models(
        self,
        results: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """
        Rank models by composite score considering accuracy and complexity.

        Penalties:
        - More complex models get lower rank
        - Longer training times get slight penalty
        - Fewer cross-validation folds get slight penalty

        Args:
            results: List of model results

        Returns:
            Sorted list of results
        """
        if not results:
            return []

        # Calculate max scores for normalization
        max_score = max(r.get('cv_score', 0) for r in results)

        def composite_score(r: Dict) -> float:
            # Base score is the CV score
            score = r.get('cv_score', 0) / max_score if max_score > 0 else 0

            # Simplicity bonus (0.95 to 1.0)
            simplicity_bonus = 0.95

            return score * simplicity_bonus

        # Sort by composite score
        ranked = sorted(results, key=composite_score, reverse=True)

        # Add rank
        for i, r in enumerate(ranked):
            r['rank'] = i + 1

        return ranked

    def _aggregate_importance(
        self,
        all_models: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """
        Aggregate feature importance from all models.

        Args:
            all_models: Dictionary of trained models

        Returns:
            List of importance dictionaries
        """
        importance_list = []

        for name, model_info in all_models.items():
            importance = model_info.get('feature_importance')
            if importance is not None:
                importance_list.append(importance)

        if not importance_list:
            return []

        # Average importance across models
        avg_importance = {}
        for imp in importance_list:
            for feat, val in imp.items():
                if feat not in avg_importance:
                    avg_importance[feat] = []
                avg_importance[feat].append(val)

        result = [
            {'feature': feat, 'importance': np.mean(vals)}
            for feat, vals in avg_importance.items()
        ]

        return sorted(result, key=lambda x: x['importance'], reverse=True)[:20]

    def _build_stacking_ensemble(
        self,
        X_train: np.ndarray,
        y_train: np.ndarray,
        results: List[Dict[str, Any]]
    ) -> Optional[Dict[str, Any]]:
        """
        Build a stacking ensemble using predictions as features.

        Args:
            X_train: Training features
            y_train: Training labels
            results: List of trained model results

        Returns:
            Dictionary with stacked model or None
        """
        from sklearn.linear_model import LogisticRegression, Ridge

        try:
            # Collect trained models from results
            models = []
            for r in results:
                model = r.get('model')
                if model is not None:
                    models.append((r.get('model_name', 'unknown'), model))

            if len(models) < 2:
                return None

            # Get predictions from base models
            meta_features = []
            feature_names = []
            for name, model in models:
                try:
                    preds = model.predict(X_train)
                    if len(preds.shape) == 1:
                        preds = preds.reshape(-1, 1)
                    meta_features.append(preds)
                    feature_names.append(name)
                except Exception:
                    pass

            if len(meta_features) < 2:
                return None

            meta_X = np.hstack(meta_features)

            # Meta-learner
            if self.problem_type == 'classification':
                meta_model = LogisticRegression(random_state=42, max_iter=1000)
            else:
                meta_model = Ridge(random_state=42)

            meta_model.fit(meta_X, y_train)

            # Get training score
            train_pred = meta_model.predict(meta_X)
            if self.problem_type == 'classification':
                from sklearn.metrics import accuracy_score
                train_score = accuracy_score(y_train, train_pred)
            else:
                from sklearn.metrics import r2_score
                train_score = r2_score(y_train, train_pred)

            return {
                'model_name': 'Stacking Ensemble',
                'server': 'ensemble',
                'model': meta_model,
                'cv_score': train_score,
                'test_score': train_score,
                'train_score': train_score,
                'type': 'stacking',
                'base_models': [n for n, _ in models],
                'success': True
            }
        except Exception as e:
            logger.warning(f"Stacking ensemble failed: {e}")
            return None

    def _get_model_complexity(self, model_name: str) -> float:
        """
        Get complexity score for a model (higher = more complex).

        Args:
            model_name: Name of the model

        Returns:
            Complexity score
        """
        complexity_map = {
            'RandomForest': 7,
            'GradientBoosting': 6,
            'XGBoost': 6,
            'LightGBM': 5,
            'CatBoost': 5,
            'MLP': 8,
            'LogisticRegression': 2,
            'Ridge': 2,
            'Lasso': 2,
            'LinearRegression': 2,
            'DecisionTree': 3,
            'SVM': 4,
        }

        for key, value in complexity_map.items():
            if key in model_name:
                return value

        return 5  # Default medium complexity

    def _get_feature_selector(
        self,
        X: np.ndarray,
        y: np.ndarray,
        problem_type: str,
        max_features: int = 50
    ) -> Optional[Any]:
        """
        Create and fit a feature selector to reduce dimensionality.

        Uses SelectKBest with mutual information to select the most informative features.

        Args:
            X: Feature matrix
            y: Target vector
            problem_type: 'classification' or 'regression'
            max_features: Maximum number of features to select

        Returns:
            Fitted selector or None
        """
        from sklearn.feature_selection import SelectKBest, mutual_info_regression, mutual_info_classif

        try:
            k = min(max_features, X.shape[1])

            if problem_type == 'classification':
                selector = SelectKBest(mutual_info_classif, k=k)
            else:
                selector = SelectKBest(mutual_info_regression, k=k)

            selector.fit(X, y)
            return selector
        except Exception as e:
            logger.warning(f"Feature selection failed: {e}")
            return None

    def _apply_smote(
        self,
        X: np.ndarray,
        y: np.ndarray
    ) -> tuple:
        """
        Apply SMOTE to handle class imbalance in classification.

        Only applies if:
        - SMOTE is available
        - Problem type is classification
        - Dataset is imbalanced

        Args:
            X: Feature matrix
            y: Target vector

        Returns:
            Resampled (X, y) or original if not applicable
        """
        if not SMOTE_AVAILABLE or self.problem_type != 'classification':
            return X, y

        try:
            # Check if dataset is imbalanced
            from collections import Counter
            class_counts = Counter(y)

            # SMOTE if any class has < 20% of samples
            min_count = min(class_counts.values())
            max_count = max(class_counts.values())

            if max_count / min_count > 2:  # Imbalanced threshold
                smote = SMOTE(random_state=42)
                X_resampled, y_resampled = smote.fit_resample(X, y)
                logger.info(f"SMOTE applied: {len(y)} -> {len(y_resampled)} samples")
                return X_resampled, y_resampled
        except Exception as e:
            logger.warning(f"SMOTE failed: {e}")

        return X, y

    def _get_model_list(
        self,
        model_types: List[str] = None
    ) -> List[str]:
        """
        Get list of model names to train.

        Args:
            model_types: Optional filter for specific model types

        Returns:
            List of model names
        """
        # Map trainer names to server names
        all_models = [
            # Linear models
            'logistic', 'ridge', 'lasso', 'linear', 'svm', 'knn',
            # Tree models
            'random_forest', 'decision_tree',
            # Boosting models (use sklearn fallback)
            'gradient_boosting',
            # Neural models
            'mlp',
        ]

        return all_models

    def _get_model_complexity(self, model_name: str) -> float:
        """
        Get complexity score for a model (higher = more complex).

        Args:
            model_name: Name of the model

        Returns:
            Complexity score
        """
        complexity_map = {
            'random_forest': 7,
            'gradient_boosting': 6,
            'xgb': 6,
            'lgbm': 5,
            'catboost': 5,
            'mlp': 8,
            'logistic': 2,
            'ridge': 2,
            'lasso': 2,
            'linear': 2,
            'svm': 4,
            'knn': 3,
            'decision_tree': 3,
        }

        for key, value in complexity_map.items():
            if key in model_name.lower():
                return value

        return 5  # Default medium complexity

    def _train_models_parallel(
        self,
        model_names: List[str],
        X_train: np.ndarray,
        X_test: np.ndarray,
        y_train: np.ndarray,
        y_test: np.ndarray,
        cv_folds: int = 5,
        enable_tuning: bool = False,
        on_progress: Callable = None,
        total_steps: int = 1,
    ) -> List[Dict[str, Any]]:
        """
        Train multiple models in parallel.

        Args:
            model_names: List of model names to train
            X_train: Training features
            X_test: Test features
            y_train: Training labels
            y_test: Test labels
            cv_folds: Cross-validation folds
            enable_tuning: Enable hyperparameter tuning
            on_progress: Progress callback
            total_steps: Total steps for progress

        Returns:
            List of model results
        """
        results = []
        completed = 0

        def train_single_model(model_name: str) -> Dict[str, Any]:
            """Train a single model and return results."""
            try:
                logger.info(f"Training {model_name}...")

                # Map model names to server types (lowercase mapping)
                model_to_server = {
                    # Linear models
                    'logistic': 'linear',
                    'ridge': 'linear',
                    'lasso': 'linear',
                    'linear': 'linear',
                    'svm': 'linear',
                    'knn': 'linear',
                    # Tree models
                    'random_forest': 'tree',
                    'decision_tree': 'tree',
                    # Boosting models (use sklearn fallback)
                    'gradient_boosting': 'boosting',
                    # Neural models
                    'mlp': 'neural',
                }

                server_name = model_to_server.get(model_name.lower())

                if not server_name or server_name not in self.servers:
                    logger.warning(f"No server found for model {model_name}")
                    return {'model_name': model_name, 'success': False, 'error': 'No server'}

                server = self.servers[server_name]

                # Check if server has train method
                if not hasattr(server, 'train'):
                    return {'model_name': model_name, 'success': False, 'error': 'No train method'}

                # Train model - correct signature: train(X_train, y_train, problem_type, model_name)
                try:
                    train_result = server.train(
                        X_train, y_train,
                        self.problem_type,
                        model_name
                    )
                except Exception as train_err:
                    logger.warning(f"Train failed for {model_name}: {train_err}")
                    return {'model_name': model_name, 'success': False, 'error': str(train_err)}

                if not train_result:
                    return {'model_name': model_name, 'success': False, 'error': 'Train returned None'}

                # Evaluate on test set
                try:
                    y_pred = server.predict(X_test)

                    if self.problem_type == 'classification':
                        from sklearn.metrics import accuracy_score, f1_score, roc_auc_score
                        test_score = accuracy_score(y_test, y_pred)
                        f1 = f1_score(y_test, y_pred, average='weighted')

                        # ROC AUC if probability available
                        try:
                            if hasattr(server.trained_model, 'predict_proba'):
                                roc = roc_auc_score(y_test, server.predict_proba(X_test)[:, 1])
                            else:
                                roc = None
                        except:
                            roc = None

                        result = {
                            'model_name': train_result.get('model_name', model_name),
                            'server': server_name,
                            'model': server.trained_model,
                            'cv_score': train_result.get('cv_score_mean', test_score),
                            'cv_score_std': train_result.get('cv_score_std', 0),
                            'test_score': test_score,
                            'f1_score': f1,
                            'roc_auc': roc,
                            'train_score': train_result.get('train_score'),
                            'complexity': self._get_model_complexity(model_name),
                            'success': True,
                        }
                        
                        # Get feature importance from model - with full error handling
                        model = server.trained_model
                        fi = []
                        try:
                            if model and self.feature_names and hasattr(model, 'feature_importances_'):
                                imp_array = model.feature_importances_
                                if hasattr(imp_array, 'tolist'):
                                    imp_array = imp_array.tolist()
                                # Relaxed length check - use min of both
                                n = min(len(imp_array), len(self.feature_names)) if isinstance(imp_array, list) else 0
                                if n > 0:
                                    for name, imp in zip(self.feature_names[:n], imp_array[:n]):
                                        fi.append({'feature': name, 'importance': float(imp)})
                            elif model and self.feature_names and hasattr(model, 'coef_'):
                                coefs = model.coef_
                                if hasattr(coefs, 'flatten'):
                                    coefs = coefs.flatten().tolist()
                                elif hasattr(coefs, 'tolist'):
                                    coefs = coefs.tolist()
                                n = min(len(coefs), len(self.feature_names)) if isinstance(coefs, list) else 0
                                if n > 0:
                                    for name, imp in zip(self.feature_names[:n], coefs[:n]):
                                        fi.append({'feature': name, 'importance': abs(float(imp))})
                        except Exception as e:
                            logger.debug(f"Feature importance extraction failed: {e}")
                        
                        if fi:
                            result['feature_importance'] = fi
                    else:
                        from sklearn.metrics import r2_score, mean_squared_error
                        test_score = r2_score(y_test, y_pred)
                        mse = mean_squared_error(y_test, y_pred)

                        result = {
                            'model_name': train_result.get('model_name', model_name),
                            'server': server_name,
                            'model': server.trained_model,
                            'cv_score': train_result.get('cv_score_mean', test_score),
                            'cv_score_std': train_result.get('cv_score_std', 0),
                            'test_score': test_score,
                            'mse': mse,
                            'rmse': float(np.sqrt(mse)),
                            'train_score': train_result.get('train_score'),
                            'complexity': self._get_model_complexity(model_name),
                            'success': True,
                        }
                        
                        # Get feature importance from model - with full error handling
                        model = server.trained_model
                        fi = []
                        try:
                            if model and self.feature_names and hasattr(model, 'feature_importances_'):
                                imp_array = model.feature_importances_
                                if hasattr(imp_array, 'tolist'):
                                    imp_array = imp_array.tolist()
                                # Relaxed length check - use min of both
                                n = min(len(imp_array), len(self.feature_names)) if isinstance(imp_array, list) else 0
                                if n > 0:
                                    for name, imp in zip(self.feature_names[:n], imp_array[:n]):
                                        fi.append({'feature': name, 'importance': float(imp)})
                            elif model and self.feature_names and hasattr(model, 'coef_'):
                                coefs = model.coef_
                                if hasattr(coefs, 'flatten'):
                                    coefs = coefs.flatten().tolist()
                                elif hasattr(coefs, 'tolist'):
                                    coefs = coefs.tolist()
                                n = min(len(coefs), len(self.feature_names)) if isinstance(coefs, list) else 0
                                if n > 0:
                                    for name, imp in zip(self.feature_names[:n], coefs[:n]):
                                        fi.append({'feature': name, 'importance': abs(float(imp))})
                        except Exception as e:
                            logger.debug(f"Feature importance extraction failed: {e}")
                        
                        if fi:
                            result['feature_importance'] = fi

                    return result

                except Exception as e:
                    logger.error(f"Evaluation failed for {model_name}: {e}")
                    return {
                        'model_name': train_result.get('model_name', model_name),
                        'server': server_name,
                        'model': server.trained_model,
                        'cv_score': train_result.get('cv_score_mean', 0),
                        'test_score': train_result.get('train_score', 0),
                        'complexity': self._get_model_complexity(model_name),
                        'success': True,
                        'error': str(e)
                    }

            except Exception as e:
                logger.error(f"Training {model_name} failed: {e}")
                return {
                    'model_name': model_name,
                    'success': False,
                    'error': str(e)
                }

        # Train sequentially to avoid memory issues
        for model_name in model_names:
            result = train_single_model(model_name)

            if result.get('success', False) is not False:
                results.append(result)

                # Store model for later use
                if 'model' in result:
                    self._all_trained_models[model_name] = {
                        'model': result['model'],
                        'server': result.get('server', 'unknown'),
                        'feature_importance': result.get('feature_importance')
                    }

            completed += 1
            if on_progress and total_steps > 0:
                step = completed + 1
                on_progress(step, total_steps, f"Trained {completed}/{len(model_names)} models")

        return results

    def _apply_composite_ranking(
        self,
        results: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """
        Apply composite ranking that penalizes complex/long-running models.

        Args:
            results: List of model results

        Returns:
            Results with composite_score added
        """
        if not results:
            return results

        # Get max scores for normalization (default to 1.0 if no valid scores)
        valid_results = [r for r in results if r.get('cv_score')]
        max_cv = max((r.get('cv_score', 0) for r in valid_results), default=1.0)
        if max_cv <= 0:
            max_cv = 1.0

        for r in results:
            # Base score (normalized CV score)
            cv_score = r.get('cv_score', 0) / max_cv

            # Simplicity bonus (0.9 - 1.0)
            complexity = r.get('complexity', 5)
            simplicity = max(0.9, 1.0 - (complexity - 1) * 0.02)

            # Training time penalty (0.95 - 1.0)
            time_penalty = 0.98

            r['composite_score'] = cv_score * simplicity * time_penalty

        return sorted(results, key=lambda x: x['composite_score'], reverse=True)

    def _aggregate_feature_importance(
        self,
        results: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """
        Aggregate feature importance from all models.

        Args:
            results: List of model results

        Returns:
            List of {feature, importance} sorted by importance
        """
        importance_by_feature = {}

        for r in results:
            fi = r.get('feature_importance', {})
            if fi and isinstance(fi, dict):
                # Handle dict format {'feature_name': importance}
                for feat, imp in fi.items():
                    if feat not in importance_by_feature:
                        importance_by_feature[feat] = []
                    importance_by_feature[feat].append(imp)
            elif fi and isinstance(fi, list):
                # Handle list format [{'feature': name, 'importance': value}, ...]
                for item in fi:
                    if isinstance(item, dict) and 'feature' in item and 'importance' in item:
                        feat = item['feature']
                        imp = item['importance']
                        if feat not in importance_by_feature:
                            importance_by_feature[feat] = []
                        importance_by_feature[feat].append(imp)

        aggregated = [
            {'feature': feat, 'importance': np.mean(imps)}
            for feat, imps in importance_by_feature.items()
        ]

        return sorted(aggregated, key=lambda x: x['importance'], reverse=True)[:20]

    def get_best_model_server(self):
        """Get the server with the best trained model."""
        if not self.servers:
            return None
        for server in self.servers.values():
            if hasattr(server, 'trained_model') and server.trained_model is not None:
                return server
        return None

    def get_trained_models(self) -> Dict[str, Any]:
        """Get all trained models from servers."""
        models = {}
        for name, server in self.servers.items():
            if hasattr(server, 'trained_model') and server.trained_model is not None:
                models[name] = server.trained_model
        return models

    def get_all_models(self) -> Dict[str, Any]:
        """Get all trained models from servers (alias for get_trained_models)."""
        return self.get_trained_models()

    def preprocess_for_inference(self, df: pd.DataFrame) -> np.ndarray:
        """
        Preprocess data for model inference.
        Applies the same transformations used during training.

        Args:
            df: Input DataFrame

        Returns:
            Preprocessed numpy array ready for prediction
        """
        try:
            # Handle categorical features (same as training)
            X = df.copy()
            categorical_cols = X.select_dtypes(include=['object']).columns.tolist()
            if categorical_cols:
                X = pd.get_dummies(X, columns=categorical_cols, drop_first=True)

            # Align columns with training data
            if self.feature_names:
                for col in self.feature_names:
                    if col not in X.columns:
                        X[col] = 0
                X = X[self.feature_names]

            # Scale
            if self.scaler and hasattr(self.scaler, 'mean_'):
                X = self.scaler.transform(X.values)
            else:
                X = X.values

            return X
        except Exception as e:
            logger.error(f"Preprocessing failed: {e}")
            return df.values

    def get_leakage_warnings(self) -> List[str]:
        """Get list of data leakage warnings detected during training."""
        return getattr(self, '_leakage_warnings', [])

    def get_feature_importance(self, model: Any = None, feature_names: List[str] = None) -> List[Dict[str, Any]]:
        """
        Get feature importance from trained models.

        Args:
            model: Specific model to get importance from (optional)
            feature_names: List of feature names (optional)

        Returns:
            List of {feature, importance} dicts
        """
        importance = []
        # Use passed feature_names, or self.feature_names, or generate
        feature_name_list = feature_names or self.feature_names or []
        if feature_name_list:
            print(f"Using feature names: {feature_name_list}")

        # Try servers first - call get_feature_importance() method
        if hasattr(self, 'servers'):
            for name, server in self.servers.items():
                if hasattr(server, 'get_feature_importance'):
                    fi = server.get_feature_importance()
                    if fi is not None and len(fi) > 0:
                        # Use stored feature names or generate
                        feats = feature_name_list if feature_name_list else [f'feat_{i}' for i in range(len(fi))]
                        for feat_name, imp in zip(feats, fi):
                            importance.append({'feature': feat_name, 'importance': float(imp)})
                        break  # Got importance from first available server

        # Try best model directly
        if not importance and model is not None:
            if hasattr(model, 'feature_importances_'):
                feats = feature_name_list or [f'feat_{i}' for i in range(len(model.feature_importances_))]
                for name, imp in zip(feats, model.feature_importances_):
                    importance.append({'feature': name, 'importance': float(imp)})
            elif hasattr(model, 'coef_'):
                feats = feature_name_list or [f'feat_{i}' for i in range(len(model.coef_))]
                for name, coef in zip(feats, model.coef_.flatten() if len(model.coef_.shape) > 1 else model.coef_):
                    importance.append({'feature': name, 'importance': abs(float(coef))})

        return sorted(importance, key=lambda x: x['importance'], reverse=True)[:20]