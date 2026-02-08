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
    _dataframe = None
    _filename = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(DataService, cls).__new__(cls)
        return cls._instance
    
    def __init__(self):
        # Don't reinitialize if already initialized
        if not hasattr(self, '_initialized'):
            self._initialized = True
    
    def process_uploaded_file(self, content: bytes, filename: str) -> Dict[str, Any]:
        """
        Process uploaded file and store as DataFrame
        """
        try:
            logger.info(f"Processing file: {filename}, size: {len(content)} bytes")
            
            # Determine file type and read accordingly
            if filename.endswith('.csv'):
                df = pd.read_csv(BytesIO(content))
            elif filename.endswith(('.xlsx', '.xls')):
                df = pd.read_excel(BytesIO(content))
            elif filename.endswith('.json'):
                df = pd.read_json(BytesIO(content))
            else:
                raise ValueError(f"Unsupported file type: {filename}")
            
            # Store DataFrame as class variable
            DataService._dataframe = df
            DataService._filename = filename
            
            logger.info(f"Loaded dataset: {df.shape[0]} rows, {df.shape[1]} columns")
            logger.info(f"Columns: {df.columns.tolist()}")
            
            # Return dataset info
            return self.get_dataset_info()
            
        except Exception as e:
            logger.error(f"File processing error: {str(e)}")
            raise ValueError(f"Failed to process file: {str(e)}")
    
    def get_dataset_info(self) -> Dict[str, Any]:
        """Get comprehensive information about current dataset"""
        if DataService._dataframe is None:
            logger.warning("No dataset loaded")
            return None
        
        df = DataService._dataframe
        
        # Convert dtypes to string for JSON serialization
        dtypes = {col: str(dtype) for col, dtype in df.dtypes.items()}
        
        # Get preview data (first 10 rows)
        preview_data = df.head(10).replace({np.nan: None}).values.tolist()
        
        info = {
            "filename": DataService._filename,
            "shape": list(df.shape),
            "columns": df.columns.tolist(),
            "dtypes": dtypes,
            "rows": preview_data,
            "missing_values": {str(k): int(v) for k, v in df.isnull().sum().to_dict().items()},
            "memory_usage": int(df.memory_usage(deep=True).sum()),
        }
        
        logger.info(f"Returning dataset info for {len(df)} rows")
        return info
    
    def get_dataframe(self) -> pd.DataFrame:
        """Get current DataFrame"""
        if DataService._dataframe is None:
            raise ValueError("No dataset loaded. Please upload a file first.")
        logger.info(f"Returning dataframe with shape: {DataService._dataframe.shape}")
        return DataService._dataframe.copy()
    
    def get_columns(self) -> list:
        """Get list of column names"""
        if DataService._dataframe is None:
            return []
        return DataService._dataframe.columns.tolist()
    
    def get_column_type(self, column: str) -> str:
        """Get data type of a column"""
        if DataService._dataframe is None:
            raise ValueError("No dataset loaded")
        return str(DataService._dataframe[column].dtype)