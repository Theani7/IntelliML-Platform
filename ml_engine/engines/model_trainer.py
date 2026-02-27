"""
ModelTrainer — orchestrates training across MCP model servers.

Features:
- 10+ classification / 12+ regression models from 4 server families
- pd.get_dummies() for features (not LabelEncoder)
- SMOTE for imbalanced classes (auto-detect, graceful fallback)
- Data leakage detection (features correlated >0.99 with target)
- Automatic feature selection (SelectKBest when >50 features)
- Training time tracking per model
- Weighted feature importance aggregation across all models
- Composite model ranking (test score + overfitting penalty + speed)
- Ensemble stacking of top-3 models
- Progress callback for real-time UI updates
- Parallel server-group training via ThreadPoolExecutor
- Auto-includes CatBoost when available
- Unified result schema + reproducibility config
"""

import os
import sys
import time

# Ensure ml_engine package is importable
_ml_engine_parent = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _ml_engine_parent not in sys.path:
    sys.path.insert(0, _ml_engine_parent)

from ml_engine.mcp_servers.linear_models import LinearModelsServer
from ml_engine.mcp_servers.tree_models import TreeModelsServer
from ml_engine.mcp_servers.boosting_models import BoostingModelsServer, CATBOOST_AVAILABLE
from ml_engine.mcp_servers.neural_models import NeuralModelsServer
from sklearn.model_selection import train_test_split, StratifiedKFold, KFold
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.metrics import accuracy_score, r2_score, mean_squared_error
import pandas as pd
import numpy as np
from typing import Dict, Any, List, Optional, Callable
from concurrent.futures import ThreadPoolExecutor, as_completed
import logging

# Optional: SMOTE for imbalanced classes
try:
    from imblearn.over_sampling import SMOTE
    SMOTE_AVAILABLE = True
except ImportError:
    SMOTE_AVAILABLE = False

logger = logging.getLogger(__name__)


class ModelTrainer:
    """
    Orchestrates training across multiple MCP model servers.
    """
    
    def __init__(self):
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
        Train multiple models and compare results.
        """
        try:
            logger.info(f"Starting training for target: {target_column}")
            logger.info(f"Dataset shape: {df.shape}")
            
            # ---- Step 1: Data leakage detection ----
            self._detect_leakage(df, target_column)
            
            # ---- Step 2: Prepare data ----
            X, y, self.problem_type, encoded_feature_names = self._prepare_data(df, target_column)
            self.feature_names = encoded_feature_names
            
            logger.info(f"Problem type: {self.problem_type}")
            logger.info(f"Features shape: {X.shape}")
            
            # ---- Step 3: Train-test split ----
            X_train, X_test, y_train, y_test = train_test_split(
                X, y, test_size=test_size, random_state=42
            )
            
            # Store raw versions for CV Pipeline (Leakage prevention)
            self.X_train_raw = X_train.copy()
            self.y_train_raw = y_train.copy()
            
            logger.info(f"Train size: {X_train.shape[0]}, Test size: {X_test.shape[0]}")
            
            # ---- Step 3.5: Prevent Leakage (Impute, Scale, Select) ----
            from sklearn.impute import SimpleImputer
            
            logger.info("Imputing missing values")
            self.imputer = SimpleImputer(strategy='mean')
            X_train = self.imputer.fit_transform(X_train)
            X_test = self.imputer.transform(X_test)
            
            logger.info("Scaling features")
            X_train = self.scaler.fit_transform(X_train)
            X_test = self.scaler.transform(X_test)
            
            if X_train.shape[1] > 50:
                logger.info("Reducing features")
                self.feature_selector = self._get_feature_selector(X_train, y_train, self.problem_type, max_features=50)
                if self.feature_selector:
                    X_train = self.feature_selector.transform(X_train)
                    X_test = self.feature_selector.transform(X_test)
                    
                    mask = self.feature_selector.get_support()
                    self.feature_names = [name for i, name in enumerate(self.feature_names) if mask[i]]
            
            # ---- Step 4: SMOTE for imbalanced classes ----
            X_train, y_train = self._apply_smote(X_train, y_train)
            
            # Save X_train for SHAP background data
            self.X_train = X_train
            self.y_train = y_train
            
            # ---- Step 5: Build model list ----
            models_to_train = self._get_model_list(model_types)
            total_steps = len(models_to_train) + 3  # +prep, +stacking, +finalize
            
            if on_progress:
                on_progress(1, total_steps, "Data prepared, starting model training…")
            
            logger.info(f"Training {len(models_to_train)} models")
            
            # ---- Step 6: Train models (parallel by server group) ----
            results = self._train_models_parallel(
                models_to_train, X_train, X_test, y_train, y_test,
                cv_folds=cv_folds, enable_tuning=enable_tuning,
                on_progress=on_progress, total_steps=total_steps,
            )
            
            if not results:
                raise ValueError("No models were successfully trained")
            
            # ---- Step 7: Composite ranking ----
            results = self._apply_composite_ranking(results)
            
            # ---- Step 8: Aggregate feature importance ----
            self._aggregated_importance = self._aggregate_feature_importance(results)
            
            # ---- Step 9: Stacking ensemble of top-3 ----
            stacking_step = len(models_to_train) + 2
            if on_progress:
                on_progress(stacking_step, total_steps, "Building stacking ensemble of top models…")
            
            stacking_result = self._build_stacking_ensemble(
                results, X_train, X_test, y_train, y_test
            )
            if stacking_result:
                results.append(stacking_result)
                logger.info(f"✓ Stacking ensemble: {stacking_result['test_score']:.4f}")
            
            # Sort by composite_score (or test_score)
            results.sort(key=lambda x: x.get('composite_score', x['test_score']), reverse=True)
            self.results = results
            
            # Best model
            best_result = results[0]
            self.best_model = {
                'server': best_result.get('server', 'ensemble'),
                'model_name': best_result['model_name'],
            }
            
            # Gather all trained model objects
            # Do NOT clear the dict, so we don't erase Stacking Ensemble!
            for server in self.servers.values():
                self._all_trained_models.update(server.get_all_models())
            
            # Store reproducibility config
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
    
    # ================================================================
    # DATA LEAKAGE DETECTION
    # ================================================================
    
    def _detect_leakage(self, df: pd.DataFrame, target_column: str):
        """
        Check for features with >0.99 correlation with target.
        These indicate data leakage and are flagged + dropped.
        """
        self._leakage_warnings = []
        try:
            numeric_df = df.select_dtypes(include=[np.number])
            if target_column not in numeric_df.columns:
                return
            
            correlations = numeric_df.corr()[target_column].abs().drop(target_column, errors='ignore')
            leaky = correlations[correlations > 0.99]
            
            for col, corr in leaky.items():
                warning = f"⚠ Possible data leakage: '{col}' has {corr:.3f} correlation with target '{target_column}'"
                self._leakage_warnings.append(warning)
                logger.warning(warning)
            
            # ---- Check for temporal leakage (Date/Time columns with random shuffle) ----
            date_cols = df.select_dtypes(include=['datetime', 'datetimetz']).columns.tolist()
            # Also check for column names containing date, time, year, etc.
            potential_date_cols = [c for c in df.columns if any(x in c.lower() for x in ['date', 'time', 'timestamp', 'year', 'month', 'day'])]
            all_date_like = list(set(date_cols + potential_date_cols))
            
            if all_date_like:
                warning = f"⚠ Temporal leakage risk: Dataset contains date-like columns {all_date_like}. Random shuffling may leak future information."
                self._leakage_warnings.append(warning)
                logger.warning(warning)

        except Exception as e:
            logger.debug(f"Leakage detection skipped: {e}")
    
    # ================================================================
    # DATA PREPARATION
    # ================================================================
    
    def _prepare_data(self, df: pd.DataFrame, target_column: str):
        """
        Prepare data for training.
        - Uses pd.get_dummies() for categorical features
        - Drops high-cardinality text columns (>30 unique)
        - Auto feature selection when >50 features
        """
        logger.info("Preparing data...")
        
        X = df.drop(columns=[target_column])
        y = df[target_column]
        
        logger.info(f"Target column type: {y.dtype}")
        logger.info(f"Target unique values: {y.nunique()}")
        
        # Determine problem type
        if y.dtype == 'object' or y.nunique() < 10:
            problem_type = 'classification'
            logger.info("Detected classification problem")
            self.label_encoder = LabelEncoder()
            y = self.label_encoder.fit_transform(y)
            logger.info(f"Encoded {len(self.label_encoder.classes_)} classes")
        else:
            problem_type = 'regression'
            logger.info("Detected regression problem")
        
        # Drop data-leakage columns
        leaky_cols = []
        for warning in self._leakage_warnings:
            # Extract column name from warning
            col = warning.split("'")[1]
            if col in X.columns:
                leaky_cols.append(col)
                logger.info(f"Dropping leaky column: '{col}'")
        if leaky_cols:
            X = X.drop(columns=leaky_cols)
        
        # Drop high-cardinality categorical columns (>30 unique)
        high_card_cols = []
        for col in X.select_dtypes(include=['object']).columns:
            n_unique = X[col].nunique()
            if n_unique > 30:
                high_card_cols.append(col)
                logger.info(f"Dropping high-cardinality column '{col}' ({n_unique} unique values)")
        if high_card_cols:
            X = X.drop(columns=high_card_cols)
        
        # Store which columns were dropped so simulate endpoint can exclude them
        self._dropped_columns = list(set(leaky_cols + high_card_cols))
        
        # One-hot encode remaining categoricals
        X = pd.get_dummies(X, drop_first=True)
        logger.info(f"Feature matrix shape after encoding: {X.shape}")
        
        # Save encoded column names for alignment in simulation
        encoded_column_names = list(X.columns)
        
        # We no longer impute, scale, or select here to prevent data leakage.
        # It is now done in train_all AFTER train_test_split.
        X_np = X.values
        y_np = y.values if hasattr(y, 'values') else y
        
        return X_np, y_np, problem_type, encoded_column_names
    
    def _get_feature_selector(self, X_train, y_train, problem_type, max_features=50):
        """Fit and return a SelectKBest selector."""
        from sklearn.feature_selection import SelectKBest, mutual_info_classif, mutual_info_regression
        
        k = min(max_features, X_train.shape[1])
        if k == X_train.shape[1]:
            return None
            
        if problem_type == 'classification':
            selector = SelectKBest(mutual_info_classif, k=k)
        else:
            selector = SelectKBest(mutual_info_regression, k=k)
        
        selector.fit(X_train, y_train)
        return selector
    
    def preprocess_for_inference(self, df: pd.DataFrame) -> Any:
        """
        Unified method to preprocess a DataFrame for prediction.
        Replicates exact training steps and uses fitted transformers.
        """
        input_df = df.copy()
        
        # 1. Drop columns that were dropped during training
        dropped_cols = getattr(self, '_dropped_columns', [])
        for col in dropped_cols:
            if col in input_df.columns:
                input_df = input_df.drop(columns=[col])
                
        # 2. Apply dummy encoding
        encoded_df = pd.get_dummies(input_df, drop_first=True)
        
        # 3. Align columns to exactly match encoded feature names
        if hasattr(self, 'feature_names') and self.feature_names:
            # Add missing columns
            for col in self.feature_names:
                if col not in encoded_df.columns:
                    encoded_df[col] = 0
            # Drop extra columns and enforce order
            encoded_df = encoded_df[self.feature_names]
            
        X_np = encoded_df.values
        
        # 4. Apply Imputer
        if getattr(self, 'imputer', None) is not None:
            X_np = self.imputer.transform(X_np)
        elif pd.DataFrame(X_np).isnull().any().any():
            # Fallback if no imputer exists (old models)
            X_np = pd.DataFrame(X_np).fillna(0).values
            
        # 5. Apply Scaler
        if getattr(self, 'scaler', None) is not None:
            X_np = self.scaler.transform(X_np)
            
        # 6. Apply Feature Selection
        if getattr(self, 'feature_selector', None) is not None:
            X_np = self.feature_selector.transform(X_np)
            
        return X_np
    
    # ================================================================
    # SMOTE FOR IMBALANCED CLASSES
    # ================================================================
    
    def _apply_smote(self, X_train, y_train):
        """Auto-detect class imbalance and apply SMOTE if needed."""
        if self.problem_type != 'classification' or not SMOTE_AVAILABLE:
            return X_train, y_train
        
        try:
            unique, counts = np.unique(y_train, return_counts=True)
            ratios = counts / counts.sum()
            min_ratio = ratios.min()
            
            if min_ratio < 0.15:
                logger.info(f"Class imbalance detected (minority={min_ratio:.1%}). Applying SMOTE…")
                
                # SMOTE needs at least k_neighbors + 1 samples for minority class
                min_count = counts.min()
                k_neighbors = min(5, min_count - 1)
                
                if k_neighbors >= 1:
                    smote = SMOTE(random_state=42, k_neighbors=k_neighbors)
                    X_resampled, y_resampled = smote.fit_resample(X_train, y_train)
                    logger.info(f"SMOTE: {X_train.shape[0]} → {X_resampled.shape[0]} samples")
                    return X_resampled, y_resampled
                else:
                    logger.warning("Not enough minority samples for SMOTE, skipping")
            else:
                logger.info(f"Class balance OK (minority={min_ratio:.1%}), no SMOTE needed")
        except Exception as e:
            logger.warning(f"SMOTE failed: {e}")
        
        return X_train, y_train
    
    # ================================================================
    # MODEL LIST
    # ================================================================
    
    def _get_model_list(self, model_types: Optional[List[str]] = None) -> List[tuple]:
        """Build list of (server_name, model_name) tuples to train"""
        if model_types is not None:
            return [(mt.split('_')[0], mt) for mt in model_types]
        
        if self.problem_type == 'classification':
            models = [
                ('linear', 'auto'),           # Logistic Regression
                ('linear', 'svc'),            # Support Vector Classifier
                ('linear', 'knn'),            # K-Nearest Neighbors
                ('linear', 'naive_bayes'),    # Gaussian Naive Bayes
                ('tree', 'random_forest'),    # Random Forest
                ('tree', 'decision_tree'),    # Decision Tree
                ('boosting', 'xgboost'),      # XGBoost
                ('boosting', 'lightgbm'),     # LightGBM
                ('boosting', 'gradient_boosting'),  # Sklearn GradientBoosting
                ('neural', 'mlp'),            # Neural Network (MLP)
            ]
        else:  # Regression
            models = [
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
                ('neural', 'mlp'),            # Neural Network (MLP)
            ]
        
        # Auto-include CatBoost if available
        if CATBOOST_AVAILABLE:
            models.append(('boosting', 'catboost'))
            logger.info("CatBoost detected — adding to model list")
        
        return models
    
    # ================================================================
    # TRAINING (PARALLEL)
    # ================================================================
    
    def _train_models_parallel(
        self,
        models_to_train: List[tuple],
        X_train, X_test, y_train, y_test,
        cv_folds: int = 3,
        enable_tuning: bool = False,
        on_progress: Optional[Callable] = None,
        total_steps: int = 10,
    ) -> List[Dict[str, Any]]:
        """
        Train models with parallelism across server groups.
        Models within the same server are sequential; different servers run concurrently.
        """
        server_groups: Dict[str, List[str]] = {}
        for server_name, model_name in models_to_train:
            server_groups.setdefault(server_name, []).append(model_name)
        
        all_results = []
        step_counter = [1]
        
        def train_server_group(server_name: str, model_names: List[str]):
            group_results = []
            for model_name in model_names:
                try:
                    step_counter[0] += 1
                    step = step_counter[0]
                    
                    display_name = self._get_display_name(server_name, model_name)
                    logger.info(f"Training model {step}/{total_steps}: {display_name}")
                    
                    if on_progress:
                        on_progress(step, total_steps, f"Training {display_name}…")
                    
                    result = self._train_single_model(
                        server_name, model_name,
                        X_train, X_test, y_train, y_test,
                        cv_folds=cv_folds, enable_tuning=enable_tuning
                    )
                    group_results.append(result)
                    logger.info(f"✓ {result['model_name']}: test={result['test_score']:.4f} "
                               f"train={result['train_score']:.4f} "
                               f"time={result['training_time_seconds']:.2f}s")
                except Exception as e:
                    logger.error(f"Error training {model_name}: {str(e)}")
            return group_results
        
        with ThreadPoolExecutor(max_workers=4) as executor:
            futures = {
                executor.submit(train_server_group, sn, mn): sn
                for sn, mn in server_groups.items()
            }
            for future in as_completed(futures):
                try:
                    group_results = future.result()
                    all_results.extend(group_results)
                except Exception as e:
                    logger.error(f"Server group failed: {e}")
        
        return all_results
    
    def _get_display_name(self, server_name: str, model_name: str) -> str:
        name_map = {
            ('linear', 'auto'): 'Logistic Regression' if self.problem_type == 'classification' else 'Linear Regression',
            ('linear', 'svc'): 'SVM Classifier',
            ('linear', 'svr'): 'SVM Regressor',
            ('linear', 'knn'): 'K-Nearest Neighbors',
            ('linear', 'naive_bayes'): 'Naive Bayes',
            ('linear', 'ridge'): 'Ridge Regression',
            ('linear', 'lasso'): 'Lasso Regression',
            ('linear', 'elasticnet'): 'ElasticNet',
            ('tree', 'random_forest'): 'Random Forest',
            ('tree', 'decision_tree'): 'Decision Tree',
            ('boosting', 'xgboost'): 'XGBoost',
            ('boosting', 'lightgbm'): 'LightGBM',
            ('boosting', 'catboost'): 'CatBoost',
            ('boosting', 'gradient_boosting'): 'Gradient Boosting',
            ('neural', 'mlp'): 'Neural Network (MLP)',
        }
        return name_map.get((server_name, model_name), model_name)
    
    # ================================================================
    # SINGLE MODEL TRAINING (with time tracking)
    # ================================================================
    
    def _train_single_model(
        self, 
        server_name: str, 
        model_name: str,
        X_train, X_test, y_train, y_test,
        cv_folds: int = 3,
        enable_tuning: bool = False
    ) -> Dict[str, Any]:
        """Train a single model, measure time, evaluate."""
        server = self.servers[server_name]
        
        # ---- Time tracking ----
        start_time = time.time()
        
        # Capture raw data for CV if available, else fallback
        X_train_to_use = getattr(self, 'X_train_raw', X_train)
        y_train_to_use = getattr(self, 'y_train_raw', y_train)

        if enable_tuning:
            train_info = self._train_with_tuning(
                server, model_name, X_train, y_train, cv_folds
            )
        else:
            train_info = server.train(X_train, y_train, self.problem_type, model_name)
        
        # ---- Pipeline-based Cross-Validation (Leakage Prevention) ----
        try:
            from sklearn.pipeline import Pipeline as SKPipeline
            from sklearn.impute import SimpleImputer
            from sklearn.preprocessing import StandardScaler
            from sklearn.base import clone
            from sklearn.model_selection import cross_val_score
            
            # Determine if we need imblearn pipeline for SMOTE
            use_smote = (self.problem_type == 'classification' and SMOTE_AVAILABLE and 
                         len(np.unique(y_train_to_use)) >= 2)
            
            if use_smote:
                from imblearn.pipeline import Pipeline
            else:
                from sklearn.pipeline import Pipeline

            # 1. Build CV Pipeline steps
            cv_steps = [
                ('imputer', SimpleImputer(strategy='mean')),
                ('scaler', StandardScaler())
            ]
            
            if getattr(self, 'feature_selector', None) is not None:
                 from sklearn.feature_selection import SelectKBest, mutual_info_classif, mutual_info_regression
                 k = self.feature_selector.k
                 score_func = mutual_info_classif if self.problem_type == 'classification' else mutual_info_regression
                 cv_steps.append(('selector', SelectKBest(score_func, k=k)))

            if use_smote:
                cv_steps.append(('smote', SMOTE(random_state=42)))
                
            # Add the model itself (cloned to ensure a fresh start for EACH CV fold)
            model_clone = clone(server.trained_model)
            cv_steps.append(('model', model_clone))
            
            cv_pipeline = Pipeline(cv_steps)

            # 2. Get CV folds
            adjusted_cv_folds = cv_folds
            if self.problem_type == 'classification':
                unique, counts = np.unique(y_train_to_use, return_counts=True)
                min_class_size = counts.min()
                if adjusted_cv_folds > min_class_size:
                    adjusted_cv_folds = max(2, int(min_class_size))
                cv = StratifiedKFold(n_splits=adjusted_cv_folds, shuffle=True, random_state=42)
            else:
                n_samples = X_train_to_use.shape[0]
                if adjusted_cv_folds > n_samples:
                    adjusted_cv_folds = max(2, n_samples)
                cv = KFold(n_splits=adjusted_cv_folds, shuffle=True, random_state=42)
            
            if adjusted_cv_folds >= 2:
                # RUN CV ON PIPELINE to prevent leakage
                cv_scores = cross_val_score(cv_pipeline, X_train_to_use, y_train_to_use, cv=cv)
                train_info['cv_score_mean'] = float(cv_scores.mean())
                train_info['cv_score_std'] = float(cv_scores.std())
        except Exception as cv_e:
            logger.warning(f"Pipeline CV failed for {model_name}: {cv_e}")
            train_info['cv_score_mean'] = 0.0
            train_info['cv_score_std'] = 0.0
        
        training_time = time.time() - start_time
        
        # Predict
        y_pred = server.predict(X_test)
        y_train_pred = server.predict(X_train)
        
        # Metrics
        metrics = {}
        confusion_matrix_data = None
        confusion_matrix_labels = None
        roc_curve_data = None
        
        if self.problem_type == 'classification':
            from sklearn.metrics import precision_score, recall_score, f1_score, confusion_matrix, roc_curve, auc
            
            test_score = accuracy_score(y_test, y_pred)
            train_score = accuracy_score(y_train, y_train_pred)
            metric_name = 'accuracy'
            
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
            classes = self.label_encoder.classes_ if self.label_encoder else [str(c) for c in np.unique(y_test)]
            
            confusion_matrix_data = []
            for i, row in enumerate(cm):
                row_dict = {}
                for j, val in enumerate(row):
                    col_label = str(classes[j]) if j < len(classes) else str(j)
                    row_dict[col_label] = int(val)
                row_label = str(classes[i]) if i < len(classes) else str(i)
                row_dict["Actual"] = row_label
                confusion_matrix_data.append(row_dict)
            confusion_matrix_labels = [str(c) for c in classes]
            
            # ROC Curve
            try:
                if is_binary and hasattr(server.trained_model, "predict_proba"):
                    y_prob = server.trained_model.predict_proba(X_test)[:, 1]
                    fpr, tpr, _ = roc_curve(y_test, y_prob)
                    roc_auc = auc(fpr, tpr)
                    metrics['auc'] = float(roc_auc)
                    
                    roc_curve_data = [{"x": float(f), "y": float(t)} for f, t in zip(fpr[::5], tpr[::5])]
                    if roc_curve_data[0]['x'] != 0: roc_curve_data.insert(0, {"x": 0, "y": 0})
                    if roc_curve_data[-1]['x'] != 1: roc_curve_data.append({"x": 1, "y": 1})
            except Exception:
                metrics['auc'] = 0.0
        else:
            from sklearn.metrics import mean_absolute_error
            test_score = r2_score(y_test, y_pred)
            train_score = r2_score(y_train, y_train_pred)
            metric_name = 'r2_score'
            mse = mean_squared_error(y_test, y_pred)
            rmse = np.sqrt(mse)
            mae = mean_absolute_error(y_test, y_pred)
            metrics = {'r2': float(test_score), 'mse': float(mse), 'rmse': float(rmse), 'mae': float(mae)}
        
        # Feature importance
        feature_importance = server.get_feature_importance()
        
        # ---- Unified result ----
        return {
            'server': server_name,
            'model_name': train_info['model_name'],
            'score': float(test_score),
            'test_score': float(test_score),
            'train_score': float(train_score),
            'cv_score_mean': float(train_info.get('cv_score_mean', 0)),
            'cv_score_std': float(train_info.get('cv_score_std', 0)),
            'training_time_seconds': round(training_time, 3),
            'metric_name': metric_name,
            'model_type': self.problem_type,
            'metrics': metrics,
            'feature_importance': feature_importance.tolist() if feature_importance is not None else None,
            'confusion_matrix': confusion_matrix_data,
            'confusion_matrix_labels': confusion_matrix_labels,
            'roc_curve': roc_curve_data,
        }
    
    # ================================================================
    # COMPOSITE RANKING
    # ================================================================
    
    def _apply_composite_ranking(self, results: List[Dict]) -> List[Dict]:
        """
        Composite score = test_score - overfitting_penalty - speed_penalty
        - Overfitting penalty: (train_score - test_score) * 0.3
        - Speed penalty: normalized training time * 0.05
        """
        if not results:
            return results
        
        max_time = max(r['training_time_seconds'] for r in results) or 1.0
        
        for r in results:
            overfit_gap = max(0, r['train_score'] - r['test_score'])
            overfit_penalty = overfit_gap * 0.3
            speed_penalty = (r['training_time_seconds'] / max_time) * 0.05
            
            r['composite_score'] = round(r['test_score'] - overfit_penalty - speed_penalty, 6)
            r['overfit_gap'] = round(overfit_gap, 4)
        
        logger.info("Composite ranking applied (test_score - overfit_penalty - speed_penalty)")
        return results
    
    # ================================================================
    # AGGREGATED FEATURE IMPORTANCE
    # ================================================================
    
    def _aggregate_feature_importance(self, results: List[Dict]) -> Optional[List[Dict]]:
        """
        Weighted-average feature importance across all models.
        Weighted by test_score so better models contribute more.
        """
        importances = []
        weights = []
        
        for r in results:
            fi = r.get('feature_importance')
            if fi is not None:
                importances.append(np.array(fi))
                weights.append(max(r['test_score'], 0.01))
        
        if not importances:
            return None
        
        # All importance vectors must be same length
        min_len = min(len(fi) for fi in importances)
        importances = [fi[:min_len] for fi in importances]
        
        weights = np.array(weights)
        weights = weights / weights.sum()
        
        aggregated = np.zeros(min_len)
        for i, (fi, w) in enumerate(zip(importances, weights)):
            try:
                # Force everything into 1D arrays to absolutely prevent broadcasting bugs
                fi_flat = np.array(fi).flatten()[:min_len]
                w_scalar = float(w)
                
                # Normalize each model's importance safely
                fi_max = fi_flat.max()
                if fi_max == 0:
                   fi_norm = fi_flat
                else:
                   fi_norm = fi_flat / fi_max
                   
                aggregated += fi_norm * w_scalar
            except Exception as e:
                logger.error(f"Error skipping feature aggregation for model {i}: {e}")
                continue
        
        # Build result list
        feature_names = self.feature_names[:min_len] if self.feature_names else [f"f{i}" for i in range(min_len)]
        
        result = sorted(
            [{"feature": name, "importance": round(float(imp), 4)} 
             for name, imp in zip(feature_names, aggregated)],
            key=lambda x: x['importance'],
            reverse=True
        )
        
        logger.info(f"Aggregated feature importance computed from {len(importances)} models")
        return result[:20]  # Top 20
    
    # ================================================================
    # STACKING ENSEMBLE
    # ================================================================
    
    def _build_stacking_ensemble(
        self, results: List[Dict],
        X_train, X_test, y_train, y_test
    ) -> Optional[Dict]:
        """Build a stacking ensemble from the top-2 base models."""
        try:
            from sklearn.ensemble import StackingClassifier, StackingRegressor
            from sklearn.linear_model import LogisticRegression, Ridge
            
            # Get top-2 models by test_score
            top_results = sorted(results, key=lambda x: x['test_score'], reverse=True)[:2]
            
            estimators = []
            for r in top_results:
                server = self.servers.get(r['server'])
                if server and r['model_name'] in server.trained_models:
                    model_obj = server.trained_models[r['model_name']]
                    estimators.append((r['model_name'].replace(' ', '_'), model_obj))
            
            if len(estimators) < 2:
                logger.info("Not enough base models for stacking")
                return None
            
            start_time = time.time()
            
            if self.problem_type == 'classification':
                stacker = StackingClassifier(
                    estimators=estimators,
                    final_estimator=LogisticRegression(max_iter=1000, random_state=42),
                    cv=2,
                    n_jobs=-1,
                    passthrough=False,
                )
            else:
                stacker = StackingRegressor(
                    estimators=estimators,
                    final_estimator=Ridge(random_state=42),
                    cv=2,
                    n_jobs=-1,
                    passthrough=False,
                )
            
            stacker.fit(X_train, y_train)
            training_time = time.time() - start_time
            
            y_pred = stacker.predict(X_test)
            y_train_pred = stacker.predict(X_train)
            
            # Store stacking model
            self._all_trained_models["Stacking Ensemble"] = stacker
            
            if self.problem_type == 'classification':
                test_score = accuracy_score(y_test, y_pred)
                train_score = accuracy_score(y_train, y_train_pred)
                metrics = {'accuracy': float(test_score)}
            else:
                test_score = r2_score(y_test, y_pred)
                train_score = r2_score(y_train, y_train_pred)
                metrics = {'r2': float(test_score)}
            
            base_names = [e[0] for e in estimators]
            
            return {
                'server': 'ensemble',
                'model_name': 'Stacking Ensemble',
                'score': float(test_score),
                'test_score': float(test_score),
                'train_score': float(train_score),
                'cv_score_mean': float(test_score),
                'cv_score_std': 0.0,
                'training_time_seconds': round(training_time, 3),
                'metric_name': 'accuracy' if self.problem_type == 'classification' else 'r2_score',
                'model_type': self.problem_type,
                'metrics': metrics,
                'feature_importance': None,
                'confusion_matrix': None,
                'confusion_matrix_labels': None,
                'roc_curve': None,
                'base_models': base_names,
                'composite_score': float(test_score),
            }
        except Exception as e:
            logger.warning(f"Stacking ensemble failed: {e}")
            return None
    
    # ================================================================
    # ACCESSORS
    # ================================================================
    
    def get_best_model_server(self):
        """Get the server containing the best model"""
        if getattr(self, 'best_model', None) is None:
            return None
        server_name = self.best_model.get('server', '')
        
        if server_name == 'ensemble':
            # Stacking ensemble doesn't have a real MCP server, so we create a dummy one
            class EnsembleServer:
                def __init__(self, model):
                    self.trained_model = model
                    
                def predict(self, X):
                    return self.trained_model.predict(X)
                    
            if 'Stacking Ensemble' in getattr(self, '_all_trained_models', {}):
                return EnsembleServer(self._all_trained_models['Stacking Ensemble'])
            return None
            
        return self.servers.get(server_name)
    
    def get_trained_models(self) -> Dict[str, Any]:
        """Return ALL trained model objects across all servers."""
        return self._all_trained_models
    
    def get_aggregated_importance(self) -> Optional[List[Dict]]:
        """Return weighted-average feature importance across all models."""
        return self._aggregated_importance
    
    def get_reproducibility_config(self) -> Dict[str, Any]:
        """Return config needed to reproduce training."""
        return self._reproducibility_config
    
    # ================================================================
    # HYPERPARAMETER TUNING
    # ================================================================
    
    def _train_with_tuning(self, server, model_name, X_train, y_train, cv_folds=5):
        """Train with hyperparameter tuning using RandomizedSearchCV"""
        from sklearn.model_selection import RandomizedSearchCV
        
        logger.info(f"Training with hyperparameter tuning: {model_name}")
        
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
            'mlp': {'hidden_layer_sizes': [(64,), (128, 64), (64, 32)], 'learning_rate_init': [0.001, 0.01]},
        }
        
        train_info = server.train(X_train, y_train, self.problem_type, model_name)
        base_model = server.trained_model
        param_grid = param_grids.get(model_name, {})
        
        if not param_grid:
            return train_info
        
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
            server.trained_models[server.model_type] = search.best_estimator_
            
            logger.info(f"Best params: {search.best_params_}, Best score: {search.best_score_:.4f}")
            
            return {
                "model_name": server.model_type,
                "cv_score_mean": float(search.best_score_),
                "cv_score_std": float(search.cv_results_['std_test_score'][search.best_index_]),
                "train_score": float(search.best_score_),
                "num_features": X_train.shape[1],
                "training_samples": X_train.shape[0],
            }
        except Exception as e:
            logger.warning(f"Tuning failed for {model_name}: {e}")
            return train_info