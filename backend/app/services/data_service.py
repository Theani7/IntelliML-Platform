import pandas as pd
import numpy as np
from io import BytesIO
from typing import Optional, Dict, Any
import logging

logger = logging.getLogger(__name__)

class DataService:
    """
    Service for data processing and management
    Handles file uploads, parsing, and data storage
    """
    
    _instance = None
    _sessions: Dict[str, Dict[str, Any]] = {} # Keyed by session_id
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(DataService, cls).__new__(cls)
        return cls._instance
    
    def __init__(self):
        # Don't reinitialize if already initialized
        if not hasattr(self, '_initialized'):
            self._initialized = True
            
    def _get_session(self, session_id: str = "default") -> Dict[str, Any]:
        """Internal helper to get or create session data"""
        if session_id not in DataService._sessions:
            DataService._sessions[session_id] = {
                "df": None,
                "filename": None
            }
        return DataService._sessions[session_id]
    
    def process_uploaded_file(self, content: bytes, filename: str, session_id: str = "default") -> Dict[str, Any]:
        """
        Process uploaded file and store in session
        """
        try:
            logger.info(f"Processing file: {filename}, session: {session_id}, size: {len(content)} bytes")
            
            # Determine file type and read accordingly
            if filename.endswith('.csv'):
                df = pd.read_csv(BytesIO(content))
            elif filename.endswith(('.xlsx', '.xls')):
                df = pd.read_excel(BytesIO(content))
            elif filename.endswith('.json'):
                df = pd.read_json(BytesIO(content))
            else:
                raise ValueError(f"Unsupported file type: {filename}")
            
            # Store DataFrame in session
            session = self._get_session(session_id)
            session["df"] = df
            session["filename"] = filename
            
            logger.info(f"Loaded dataset for session {session_id}: {df.shape[0]} rows, {df.shape[1]} columns")
            
            # Return dataset info
            return self.get_dataset_info(session_id)
            
        except Exception as e:
            logger.error(f"File processing error: {str(e)}")
            raise ValueError(f"Failed to process file: {str(e)}")

    def set_dataframe(self, df: pd.DataFrame, session_id: str = "default", filename: Optional[str] = None) -> None:
        """
        Persist a dataframe for a specific session.
        Used by cleaning/feature/outlier operations so downstream services
        (ML, chat, analysis) read the same updated dataset.
        """
        session = self._get_session(session_id)
        session["df"] = df
        if filename is not None:
            session["filename"] = filename
    
    def get_dataset_info(self, session_id: str = "default") -> Dict[str, Any]:
        """Get comprehensive information about session dataset"""
        session = self._get_session(session_id)
        df = session["df"]
        
        if df is None:
            logger.warning(f"No dataset loaded for session: {session_id}")
            return None
        
        # Convert dtypes to string for JSON serialization
        dtypes = {col: str(dtype) for col, dtype in df.dtypes.items()}
        
        # Get preview data (first 10 rows)
        preview_data = df.head(10).replace({np.nan: None}).values.tolist()
        
        info = {
            "filename": session["filename"],
            "shape": list(df.shape),
            "columns": df.columns.tolist(),
            "dtypes": dtypes,
            "rows": preview_data,
            "missing_values": {str(k): int(v) for k, v in df.isnull().sum().to_dict().items()},
            "memory_usage": int(df.memory_usage(deep=True).sum()),
        }
        
        logger.info(f"Returning info for {session_id}: {len(df)} rows")
        return info
    
    def get_dataframe(self, session_id: str = "default") -> pd.DataFrame:
        """Get DataFrame for current session"""
        session = self._get_session(session_id)
        df = session["df"]
        
        if df is None:
            raise ValueError(f"No dataset loaded for session: {session_id}")
        return df.copy()
    
    def get_columns(self, session_id: str = "default") -> list:
        """Get list of column names for current session"""
        session = self._get_session(session_id)
        df = session["df"]
        return df.columns.tolist() if df is not None else []
    
    def get_column_type(self, column: str, session_id: str = "default") -> str:
        """Get data type of a column in current session"""
        session = self._get_session(session_id)
        df = session["df"]
        if df is None:
            raise ValueError(f"No dataset loaded for session: {session_id}")
        return str(df[column].dtype)

    def clear_session(self, session_id: str = "default") -> None:
        """Clear all dataset state for a specific session."""
        DataService._sessions[session_id] = {
            "df": None,
            "filename": None,
        }
