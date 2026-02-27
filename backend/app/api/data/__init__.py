"""
Data API Router Package
Handles data upload, analysis, cleaning, training, outliers, and feature engineering.
Split into sub-modules for easier debugging and maintenance.
"""

from fastapi import APIRouter
import logging
import pandas as pd
import numpy as np
from typing import Dict, Any, List
from app.services.data_service import DataService

# Initialize DataService singleton to sync with MLService
data_service = DataService()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Create router
router = APIRouter(
    tags=["data"]
)

# Session registry for datasets (keyed by session_id)
_dataset_registry: Dict[str, Dict[str, Any]] = {}

def get_current_dataset(session_id: str = "default") -> Dict[str, Any]:
    """Get or create session data registry entry"""
    if session_id not in _dataset_registry:
        _dataset_registry[session_id] = {
            "df": None,
            "info": None,
            "history": [],
            "future": []
        }
    return _dataset_registry[session_id]

# Helper function used across sub-modules
def make_json_safe(val):
    """Make a value JSON-serializable (handle NaN, Inf)."""
    if pd.isna(val):
        return None
    if isinstance(val, float):
        if val != val or val == float('inf') or val == float('-inf'):
            return None
    return val


# Import sub-modules to register their routes on the router.
# These must be imported AFTER router and current_dataset are defined.
from app.api.data import upload      # noqa: E402, F401
from app.api.data import eda         # noqa: E402, F401
from app.api.data import training    # noqa: E402, F401
from app.api.data import cleaning    # noqa: E402, F401
from app.api.data import outliers    # noqa: E402, F401
from app.api.data import features    # noqa: E402, F401
from app.api.data import ws_training # noqa: E402, F401
from app.api.data import simulate    # noqa: E402, F401

# Log router initialization
logger.info("=" * 60)
logger.info("Data API Router Loaded (package)")
logger.info("=" * 60)
