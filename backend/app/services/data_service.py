"""
================================================================================
Data Service - File Upload, Parsing, and Session Management
================================================================================

PURPOSE:
    Handles all data file operations including upload, parsing, and in-memory
    storage. Provides a session-based system for multi-user support.

ARCHITECTURE:
    ┌─────────────────────────────────────────────────────────────────────────────┐
    │                            DataService (Singleton)                          │
    ├─────────────────────────────────────────────────────────────────────────────┤
    │  Sessions Store (per user):                                                │
    │  {                                                                       │
    │    "session_id": {                                                         │
    │      "df": DataFrame,        # The loaded data                             │
    │      "filename": "data.csv"   # Original filename                         │
    │    }                                                                       │
    │  }                                                                         │
    └─────────────────────────────────────────────────────────────────────────────┘

SUPPORTED FILE FORMATS:
    - CSV (.csv): Comma-separated values, auto-detected delimiter
    - Excel (.xlsx, .xls): Microsoft Excel spreadsheets
    - JSON (.json): JSON array format ([{col1: val1, col2: val2}, ...])

SESSION MANAGEMENT:
    - Each browser session gets a unique session_id (UUID)
    - Sessions stored in memory (Dict)
    - Sessions persist until server restart
    - Default session: "default" (for simple use cases)

WHY SINGLETON?
    - One instance shared across all requests
    - Maintains session state without database
    - Thread-safe for concurrent requests

DATA FLOW:
    File Upload Request
           │
           ▼
    ┌─────────────────┐
    │  Content-Type   │ ─── Validate format
    │    Detection   │
    └────────┬────────┘
             │
             ▼
    ┌─────────────────┐
    │  Format Parser   │ ─── CSV → DataFrame
    │  (pandas)       │ ─── Excel → DataFrame
    │                 │ ─── JSON → DataFrame
    └────────┬────────┘
             │
             ▼
    ┌─────────────────┐
    │ Session Store   │ ─── Save to session
    └────────┬────────┘
             │
             ▼
         Response

================================================================================
"""

import pandas as pd
import numpy as np
from io import BytesIO
from typing import Optional, Dict, Any
import logging
from app.core.exceptions import ValidationError, NotFoundError

logger = logging.getLogger(__name__)


class DataService:
    """
    Service for data processing and management.
    
    Handles:
    - File upload and parsing (CSV, Excel, JSON)
    - Session-based data storage
    - Dataset metadata generation
    
    Singleton Pattern:
        One instance shared across all requests.
        Use: DataService() or import data_service instance.
    
    Thread Safety:
        The sessions dict is shared. For production with heavy concurrency,
        consider using a thread-safe storage (Redis, database, etc.).
    
    Example:
        service = DataService()
        info = service.process_uploaded_file(content, "data.csv")
        df = service.get_dataframe("session-123")
    """
    
    # Class-level storage (shared by all instances)
    _instance = None
    _sessions: Dict[str, Dict[str, Any]] = {}
    
    def __new__(cls):
        """
        Singleton pattern implementation.
        
        Returns the existing instance if already created,
        otherwise creates a new one.
        
        This ensures only one DataService exists in the application,
        sharing the same sessions across all requests.
        """
        if cls._instance is None:
            cls._instance = super(DataService, cls).__new__(cls)
        return cls._instance
    
    def __init__(self):
        """
        Initialize the singleton.
        
        Only runs once (tracked by _initialized flag).
        """
        if not hasattr(self, '_initialized'):
            self._initialized = True
    
    def _get_session(self, session_id: str = "default") -> Dict[str, Any]:
        """
        Internal helper to get or create session data.
        
        Creates empty session if it doesn't exist.
        
        Args:
            session_id: Unique identifier for the session
                       Default: "default" (for simple single-user cases)
        
        Returns:
            Session dict with 'df' and 'filename' keys
        """
        if session_id not in DataService._sessions:
            DataService._sessions[session_id] = {
                "df": None,
                "filename": None
            }
        return DataService._sessions[session_id]
    
    def process_uploaded_file(
        self, 
        content: bytes, 
        filename: str, 
        session_id: str = "default"
    ) -> Dict[str, Any]:
        """
        Process an uploaded file and store in session.
        
        This is the main entry point for file uploads:
        1. Detects file format from extension
        2. Parses into pandas DataFrame
        3. Stores in session
        4. Returns dataset metadata
        
        File Format Detection:
            - .csv → pd.read_csv() with auto delimiter detection
            - .xlsx, .xls → pd.read_excel() (requires openpyxl)
            - .json → pd.read_json() (expects array format)
        
        Args:
            content: Raw bytes of the uploaded file
            filename: Original filename (used for extension detection)
            session_id: Which session to store in
        
        Returns:
            Dict with dataset info:
            {
                "filename": "data.csv",
                "shape": [rows, columns],
                "columns": ["col1", "col2", ...],
                "dtypes": {"col1": "int64", ...},
                "rows": [[val1, val2], ...],  # First 10 rows
                "missing_values": {"col1": 5, ...},
                "memory_usage": 1024
            }
        
        Raises:
            ValidationError: If file format unsupported or parsing fails
        """
        try:
            logger.info(f"Processing file: {filename}, session: {session_id}, size: {len(content)} bytes")
            
            # =================================================================
            # STEP 1: Detect format and parse
            # =================================================================
            if filename.endswith('.csv'):
                # CSV: Most common format
                # pandas auto-detects delimiter (comma, semicolon, tab)
                df = pd.read_csv(BytesIO(content))
                
            elif filename.endswith(('.xlsx', '.xls')):
                # Excel: .xlsx (modern) or .xls (legacy)
                # Requires openpyxl for .xlsx, xlrd for .xls
                df = pd.read_excel(BytesIO(content))
                
            elif filename.endswith('.json'):
                # JSON: Expects array format
                # [{"col1": val1, "col2": val2}, ...]
                df = pd.read_json(BytesIO(content))
                
            else:
                # Unsupported format
                raise ValidationError(
                    f"Unsupported file type: {filename}",
                    details={"supported_types": [".csv", ".xlsx", ".xls", ".json"]}
                )
            
            # =================================================================
            # STEP 2: Store in session
            # =================================================================
            session = self._get_session(session_id)
            session["df"] = df
            session["filename"] = filename
            
            logger.info(f"Loaded dataset for session {session_id}: {df.shape[0]} rows, {df.shape[1]} columns")
            
            # =================================================================
            # STEP 3: Return metadata
            # =================================================================
            return self.get_dataset_info(session_id)
            
        except ValidationError:
            raise  # Re-raise validation errors
        except Exception as e:
            logger.error(f"File processing error: {str(e)}")
            raise ValidationError(f"Failed to process file: {str(e)}")
    
    def set_dataframe(
        self, 
        df: pd.DataFrame, 
        session_id: str = "default", 
        filename: Optional[str] = None
    ) -> None:
        """
        Directly set/update a DataFrame in session.
        
        Used by cleaning operations that modify the data:
        - After dropping columns
        - After filling missing values
        - After feature engineering
        
        Args:
            df: The DataFrame to store
            session_id: Target session
            filename: Optional filename override
        """
        session = self._get_session(session_id)
        session["df"] = df
        if filename is not None:
            session["filename"] = filename
    
    def get_dataframe(self, session_id: str = "default") -> Optional[pd.DataFrame]:
        """
        Get the DataFrame for a session.
        
        Args:
            session_id: Session to get data from
            
        Returns:
            The stored DataFrame, or None if no data loaded
        """
        session = self._get_session(session_id)
        return session.get("df")
    
    def get_dataset_info(self, session_id: str = "default") -> Optional[Dict[str, Any]]:
        """
        Get comprehensive information about the session's dataset.
        
        Returns metadata useful for:
        - UI display (column names, types)
        - Data preview (first rows)
        - Quality checks (missing values)
        
        Args:
            session_id: Session to get info from
            
        Returns:
            Dict containing:
            - filename: Original upload filename
            - shape: [rows, columns]
            - columns: List of column names
            - dtypes: Dict mapping column → data type
            - rows: First 10 rows as nested lists
            - missing_values: Count of nulls per column
            - memory_usage: Memory footprint in bytes
            
        Returns None if no dataset loaded.
        """
        session = self._get_session(session_id)
        df = session["df"]
        
        if df is None:
            logger.warning(f"No dataset loaded for session: {session_id}")
            return None
        
        # Build dtype mapping (convert to strings for JSON serialization)
        dtypes = {col: str(dtype) for col, dtype in df.dtypes.items()}
        
        # Preview data: first 10 rows, NaN → None for JSON compatibility
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
    
    def reset_session(self, session_id: str = "default") -> None:
        """
        Clear all data for a session.
        
        Args:
            session_id: Session to reset
        """
        if session_id in DataService._sessions:
            DataService._sessions[session_id] = {
                "df": None,
                "filename": None
            }
            logger.info(f"Reset session: {session_id}")
    
    @classmethod
    def clear_all_sessions(cls) -> int:
        """
        Clear all sessions.
        
        Useful for testing or reset functionality.
        
        Returns:
            Number of sessions cleared
        """
        count = len(cls._sessions)
        cls._sessions.clear()
        logger.info(f"Cleared {count} sessions")
        return count