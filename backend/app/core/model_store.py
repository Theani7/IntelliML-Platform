"""
Model Store — Persist trained ML models with joblib.
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

logger = logging.getLogger(__name__)

# Store models under /tmp so they auto-clean on restart
MODEL_DIR = Path("/tmp/intelliml_models")


class ModelStore:
    """Save, load, and list trained sklearn models."""

    def __init__(self, base_dir: Path = MODEL_DIR):
        self.base_dir = base_dir
        self.base_dir.mkdir(parents=True, exist_ok=True)

    # ------------------------------------------------------------------
    # Save
    # ------------------------------------------------------------------

    def save_model(
        self,
        job_id: str,
        model_name: str,
        model: Any,
        metadata: Dict[str, Any],
    ) -> str:
        """
        Persist a trained model and its metadata.

        Args:
            job_id: Unique training job identifier.
            model_name: Human-readable model name (e.g. "RandomForest").
            model: The sklearn model object.
            metadata: Dict with target_column, feature_names, metrics, etc.

        Returns:
            Path to the saved model file.
        """
        job_dir = self.base_dir / job_id
        job_dir.mkdir(parents=True, exist_ok=True)

        # Save model
        safe_name = model_name.replace(" ", "_").lower()
        model_path = job_dir / f"{safe_name}.joblib"
        joblib.dump(model, model_path)

        # Generate checksum for integrity
        with open(model_path, "rb") as f:
            checksum = hashlib.sha256(f.read()).hexdigest()

        # Save metadata
        meta = {
            "job_id": job_id,
            "model_name": model_name,
            "model_file": model_path.name,
            "checksum": checksum,
            "saved_at": time.time(),
            **metadata,
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
        """Save model and mark it as the best for this job."""
        self.save_model(job_id, model_name, model, metadata)

        # Also save as 'best_model' for quick access
        job_dir = self.base_dir / job_id
        best_path = job_dir / "best_model.joblib"
        joblib.dump(model, best_path)

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

        if X_sample is not None:
            joblib.dump(X_sample, job_dir / "background_data.joblib")

        logger.info(f"✓ Marked '{model_name}' as best model for job {job_id}")
        return str(best_path)

    # ------------------------------------------------------------------
    # Load
    # ------------------------------------------------------------------

    def load_model(self, job_id: str, model_name: str = "best_model") -> Optional[Any]:
        """Load a saved model by job ID and name."""
        safe_name = model_name.replace(" ", "_").lower()
        model_path = self.base_dir / job_id / f"{safe_name}.joblib"

        if not model_path.exists():
            logger.warning(f"Model not found: {model_path}")
            return None

        # Verify integrity before loading
        try:
            meta = self.load_metadata(job_id, model_name)
            if meta and "checksum" in meta:
                with open(model_path, "rb") as f:
                    actual_checksum = hashlib.sha256(f.read()).hexdigest()
                if actual_checksum != meta["checksum"]:
                    logger.error(f"❌ INTEGRITY BREACH: Model {model_name} checksum mismatch!")
                    return None
        except Exception as e:
            logger.warning(f"Could not verify model integrity: {e}")

        return joblib.load(model_path)

    def load_metadata(self, job_id: str, model_name: str = "best_model") -> Optional[Dict]:
        """Load metadata for a saved model."""
        safe_name = model_name.replace(" ", "_").lower()
        meta_path = self.base_dir / job_id / f"{safe_name}_meta.json"

        if not meta_path.exists():
            return None

        with open(meta_path) as f:
            return json.load(f)

    def load_background_data(self, job_id: str) -> Optional[Any]:
        """Load the background dataset sample for SHAP explanations."""
        data_path = self.base_dir / job_id / "background_data.joblib"
        if not data_path.exists():
            return None
        return joblib.load(data_path)

    # ------------------------------------------------------------------
    # List / Query
    # ------------------------------------------------------------------

    def list_jobs(self) -> List[Dict[str, Any]]:
        """List all saved training jobs with their metadata."""
        jobs = []
        if not self.base_dir.exists():
            return jobs

        for job_dir in sorted(self.base_dir.iterdir(), reverse=True):
            if job_dir.is_dir():
                best_meta = self.load_metadata(job_dir.name, "best_model")
                if best_meta:
                    jobs.append(best_meta)

        return jobs

    def get_feature_names(self, job_id: str) -> Optional[List[str]]:
        """Get feature names used during training."""
        meta = self.load_metadata(job_id, "best_model")
        if meta:
            return meta.get("feature_names", [])
        return None

    # ------------------------------------------------------------------
    # Cleanup
    # ------------------------------------------------------------------

    def delete_job(self, job_id: str) -> bool:
        """Delete all saved models for a job."""
        job_dir = self.base_dir / job_id
        if job_dir.exists():
            shutil.rmtree(job_dir)
            logger.info(f"Deleted models for job {job_id}")
            return True
        return False

    def clear_all(self) -> int:
        """Delete all saved models. Returns count of jobs removed."""
        count = 0
        if self.base_dir.exists():
            for job_dir in self.base_dir.iterdir():
                if job_dir.is_dir():
                    shutil.rmtree(job_dir)
                    count += 1
        logger.info(f"Cleared {count} saved jobs")
        return count


# Singleton instance
model_store = ModelStore()
