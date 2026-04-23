"""
================================================================================
Model Store - Persist and Load Trained ML Models
================================================================================

PURPOSE:
    Handles saving, loading, and managing trained machine learning models.
    Models are serialized using joblib and stored on disk for persistence across
    server restarts.

WHY PERSIST MODELS?
    - Save expensive training time (can take minutes)
    - Deploy models to production
    - Share models between sessions
    - Enable model versioning

STORAGE LOCATION:
    Models are stored in: /tmp/intelliml_models/
    - Temporary directory (Linux/macOS)
    - Auto-cleaned on system reboot
    - Suitable for development/demo purposes
    
    For production, change MODEL_DIR to a persistent location.

FILE STRUCTURE:
    /tmp/intelliml_models/
    ├── {job_id}/
    │   ├── best_model.joblib           # The best model from training
    │   ├── best_model_meta.json        # Metadata (feature names, score, etc.)
    │   ├── background_data.joblib      # Sample data for SHAP explanations
    │   ├── random_forest.joblib        # Individual model
    │   ├── random_forest_meta.json     # Model metadata
    │   ├── xgboost.joblib              # Individual model
    │   └── xgboost_meta.json           # Model metadata
    └── ...

WHY JOBLIB?
    - Native sklearn serialization
    - Handles numpy arrays efficiently
    - Preserves model state exactly
    - Fast loading for large models

METADATA TRACKED:
    - job_id: Unique identifier
    - model_name: Human-readable name
    - target_column: What the model predicts
    - feature_names: Input columns
    - metrics: accuracy, r2_score, etc.
    - checksum: SHA-256 for integrity verification
    - saved_at: Timestamp

SECURITY:
    Checksums verify model integrity:
    - Generated when saving (SHA-256 hash of file)
    - Verified when loading
    - Mismatch = potential tampering = reject model

================================================================================
"""

import json
import logging
import os
import shutil
import time
import hashlib
from pathlib import Path
from typing import Any, Dict, List, Optional

import joblib
import os
import platform

logger = logging.getLogger(__name__)

# Cross-platform model storage
if platform.system() == "Windows":
    MODEL_DIR = Path(os.environ.get("TEMP", ".")) / "intelliml_models"
else:
    MODEL_DIR = Path("/tmp/intelliml_models")


class ModelStore:
    """
    Manages persistence of trained ML models.
    
    Provides methods to:
    - Save models with metadata
    - Load models by job_id
    - List available models
    - Delete models
    
    Singleton Pattern:
        Use the global `model_store` instance, don't create new ones.
    
    Example:
        model_store.save_model(job_id, "RandomForest", trained_model, metadata)
        loaded = model_store.load_model(job_id, "RandomForest")
    """

    def __init__(self, base_dir: Path = MODEL_DIR):
        """
        Initialize the model store.
        
        Args:
            base_dir: Directory to store models
                     Default: /tmp/intelliml_models
        """
        self.base_dir = base_dir
        # Ensure directory exists
        self.base_dir.mkdir(parents=True, exist_ok=True)

    # =========================================================================
    # SAVE METHODS
    # =========================================================================

    def save_model(
        self,
        job_id: str,
        model_name: str,
        model: Any,
        metadata: Dict[str, Any],
    ) -> str:
        """
        Save a trained model and its metadata to disk.
        
        Creates a job_id directory and stores:
        1. Model file: {model_name}.joblib (e.g., "random_forest.joblib")
        2. Metadata: {model_name}_meta.json
        
        Model name sanitization:
        - "Random Forest" → "random_forest.joblib"
        - Spaces replaced with underscores, lowercase
        
        Args:
            job_id: Unique identifier for this training job
                   (usually UUID from training.py)
            model_name: Human-readable name (e.g., "Random Forest", "XGBoost")
            model: The trained sklearn-compatible model object
            metadata: Dict with target_column, feature_names, metrics, etc.
                      Will be merged with auto-generated fields
        
        Returns:
            Path to the saved model file
            
        Example:
            metadata = {
                "target_column": "survived",
                "feature_names": ["age", "fare", "class"],
                "metrics": {"accuracy": 0.85}
            }
            path = model_store.save_model(job_id, "Random Forest", rf_model, metadata)
        """
        # Create job directory
        job_dir = self.base_dir / job_id
        job_dir.mkdir(parents=True, exist_ok=True)

        # Sanitize model name for filename (e.g., "Random Forest" → "random_forest")
        safe_name = model_name.replace(" ", "_").lower()
        model_path = job_dir / f"{safe_name}.joblib"
        
        # Serialize and save model
        joblib.dump(model, model_path)

        # =====================================================================
        # GENERATE CHECKSUM FOR INTEGRITY VERIFICATION
        # =====================================================================
        # Read the saved file and compute SHA-256 hash
        # This allows detecting if model file is corrupted or tampered with
        with open(model_path, "rb") as f:
            checksum = hashlib.sha256(f.read()).hexdigest()

        # =====================================================================
        # CREATE AND SAVE METADATA
        # =====================================================================
        # Metadata includes both provided fields and auto-generated fields
        meta = {
            "job_id": job_id,
            "model_name": model_name,
            "model_file": model_path.name,
            "checksum": checksum,           # For integrity verification
            "saved_at": time.time(),       # Unix timestamp
            **metadata,                     # User-provided metadata (overrides keys above)
        }
        meta_path = job_dir / f"{safe_name}_meta.json"
        with open(meta_path, "w") as f:
            json.dump(meta, f, indent=2, default=str)

        logger.info(f"✓ Saved model '{model_name}' → {model_path}")
        return str(model_path)


    def save_best_model(
        self,
        job_id: str,
        model_name: str,
        model: Any,
        metadata: Dict[str, Any],
        X_sample: Optional[Any] = None,
    ) -> str:
        """
        Save the best model from a training job.
        
        This is a convenience method that:
        1. Saves the model normally (as above)
        2. ALSO saves as "best_model.joblib" for quick access
        3. Optionally saves sample data for SHAP explanations
        
        Use this when you want to easily retrieve the best model later:
            model_store.load_model(job_id)  # Loads best_model by default
        
        Args:
            job_id: Training job identifier
            model_name: The model's name
            model: Trained model object
            metadata: Model metadata
            X_sample: Optional sample of training data for SHAP explanations
                     Should be a numpy array or pandas DataFrame
                     Gets used for background data in SHAP calculations
        
        Returns:
            Path to the best_model.joblib file
        """
        # Save normally first
        self.save_model(job_id, model_name, model, metadata)

        # Also save as 'best_model' for quick access
        job_dir = self.base_dir / job_id
        best_path = job_dir / "best_model.joblib"
        joblib.dump(model, best_path)

        # Create metadata for best model
        best_meta = {
            "job_id": job_id,
            "model_name": model_name,
            "model_file": "best_model.joblib",
            "is_best": True,
            "saved_at": time.time(),
            **metadata,
        }
        with open(job_dir / "best_model_meta.json", "w") as f:
            json.dump(best_meta, f, indent=2, default=str)

        # Optionally save background data for SHAP explanations
        # SHAP needs a sample of training data to compute feature attributions
        if X_sample is not None:
            joblib.dump(X_sample, job_dir / "background_data.joblib")

        logger.info(f"✓ Marked '{model_name}' as best model for job {job_id}")
        return str(best_path)


    # =========================================================================
    # LOAD METHODS
    # =========================================================================

    def load_model(self, job_id: str, model_name: str = "best_model") -> Optional[Any]:
        """
        Load a previously saved model.
        
        Loads the model file and optionally verifies its integrity by comparing
        the stored checksum against a freshly computed one.
        
        Args:
            job_id: The job ID from training
            model_name: Which model to load
                       Default: "best_model" (the marked best model)
                       Can also be specific model names like "random_forest", "xgboost"
        
        Returns:
            The loaded model object, or None if not found/error
            
        Raises:
            No exceptions - returns None on any error
            
        Integrity Check:
            If metadata has a checksum:
            1. Compute SHA-256 of loaded file
            2. Compare with stored checksum
            3. Reject model if mismatch (possible tampering/corruption)
        """
        # Sanitize model name for filename
        safe_name = model_name.replace(" ", "_").lower()
        model_path = self.base_dir / job_id / f"{safe_name}.joblib"

        if not model_path.exists():
            logger.warning(f"Model not found: {model_path}")
            return None

        # =====================================================================
        # INTEGRITY VERIFICATION
        # =====================================================================
        # Check if model file matches expected checksum
        # This catches:
        # - File corruption during write/read
        # - Manual tampering with model files
        # - Disk errors
        try:
            meta = self.load_metadata(job_id, model_name)
            if meta and "checksum" in meta:
                with open(model_path, "rb") as f:
                    actual_checksum = hashlib.sha256(f.read()).hexdigest()
                
                if actual_checksum != meta["checksum"]:
                    # Checksum mismatch = integrity breach!
                    logger.error(f"❌ INTEGRITY BREACH: Model {model_name} checksum mismatch!")
                    return None
        except Exception as e:
            logger.warning(f"Could not verify model integrity: {e}")

        # Load and return the model
        return joblib.load(model_path)


    def load_metadata(self, job_id: str, model_name: str = "best_model") -> Optional[Dict]:
        """
        Load metadata for a saved model.
        
        Useful for:
        - Checking what features were used
        - Getting model performance metrics
        - Finding out when model was saved
        
        Args:
            job_id: Training job identifier
            model_name: Model to get metadata for
                       Default: "best_model"
        
        Returns:
            Dict with metadata, or None if not found
            
        Example metadata:
            {
                "job_id": "abc-123",
                "model_name": "Random Forest",
                "target_column": "survived",
                "feature_names": ["age", "fare", "class"],
                "metrics": {"accuracy": 0.85},
                "checksum": "abc123...",
                "saved_at": 1699999999.0
            }
        """
        safe_name = model_name.replace(" ", "_").lower()
        meta_path = self.base_dir / job_id / f"{safe_name}_meta.json"

        if not meta_path.exists():
            return None

        with open(meta_path) as f:
            return json.load(f)


    def load_background_data(self, job_id: str) -> Optional[Any]:
        """
        Load the background data sample for SHAP explanations.
        
        SHAP (SHapley Additive exPlanations) needs a sample of training data
        to compute feature attributions. This is saved during model training.
        
        Args:
            job_id: Training job identifier
            
        Returns:
            The sample data (numpy array or DataFrame), or None if not saved
        """
        data_path = self.base_dir / job_id / "background_data.joblib"
        if not data_path.exists():
            return None
        return joblib.load(data_path)


    # =========================================================================
    # LIST / QUERY METHODS
    # =========================================================================

    def list_jobs(self) -> List[Dict[str, Any]]:
        """
        List all saved training jobs.
        
        Useful for:
        - Showing available models to users
        - Admin dashboard
        - Model management
        
        Returns:
            List of job metadata dicts, sorted newest first
            
        Example output:
            [
                {"job_id": "abc-123", "model_name": "Random Forest", ...},
                {"job_id": "def-456", "model_name": "XGBoost", ...}
            ]
        """
        jobs = []
        if not self.base_dir.exists():
            return jobs

        # Iterate through all job directories
        for job_dir in sorted(self.base_dir.iterdir(), reverse=True):
            if job_dir.is_dir():
                # Get best_model metadata as representative
                best_meta = self.load_metadata(job_dir.name, "best_model")
                if best_meta:
                    jobs.append(best_meta)

        return jobs


    def get_feature_names(self, job_id: str) -> Optional[List[str]]:
        """
        Get the feature names used when training a model.
        
        Useful for:
        - Preparing prediction input
        - Feature importance display
        - Data validation
        
        Args:
            job_id: Training job identifier
            
        Returns:
            List of feature column names, or None if not available
        """
        meta = self.load_metadata(job_id, "best_model")
        if meta:
            return meta.get("feature_names", [])
        return None


    # =========================================================================
    # DELETE / CLEANUP METHODS
    # =========================================================================

    def delete_job(self, job_id: str) -> bool:
        """
        Delete all models and data for a job.
        
        WARNING: This is permanent! All models for this job will be deleted.
        
        Args:
            job_id: Training job to delete
            
        Returns:
            True if deleted, False if job didn't exist
        """
        job_dir = self.base_dir / job_id
        if job_dir.exists():
            shutil.rmtree(job_dir)  # Recursively delete directory
            logger.info(f"Deleted models for job {job_id}")
            return True
        return False


    def clear_all(self) -> int:
        """
        Delete ALL saved models.
        
        Use for:
        - Reset during testing
        - Cleanup before deployment
        - Storage management
        
        Returns:
            Number of jobs deleted
        """
        count = 0
        if self.base_dir.exists():
            for job_dir in self.base_dir.iterdir():
                if job_dir.is_dir():
                    shutil.rmtree(job_dir)
                    count += 1
        logger.info(f"Cleared {count} saved jobs")
        return count


# =============================================================================
# SINGLETON INSTANCE
# =============================================================================
"""
Global model store instance.

Usage:
    from app.core.model_store import model_store
    
    # Save a model
    model_store.save_model(job_id, "RandomForest", trained_model, metadata)
    
    # Load it later
    model = model_store.load_model(job_id, "best_model")
"""

model_store = ModelStore()