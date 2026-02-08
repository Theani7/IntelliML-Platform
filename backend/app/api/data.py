"""
Data API Router
Handles data upload, analysis, and ML operations
"""

from fastapi import APIRouter, File, UploadFile, HTTPException
from fastapi.responses import JSONResponse
import logging
import pandas as pd
import numpy as np
from pathlib import Path
import tempfile
import os
from typing import Dict, Any, List
import json

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

# Global storage for current dataset (in production, use proper database)
current_dataset = {
    "df": None,
    "info": None
}


@router.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    """
    Upload a CSV file and store it in memory
    
    Returns dataset info including preview, columns, and statistics
    """
    try:
        # Validate file type
        if not file.filename.endswith('.csv'):
            raise HTTPException(
                status_code=400,
                detail="Only CSV files are supported"
            )
        
        logger.info(f"Uploading file: {file.filename}")
        
        # Read file content
        content = await file.read()
        
        # Save to temporary file
        with tempfile.NamedTemporaryFile(delete=False, suffix='.csv', mode='wb') as temp_file:
            temp_file.write(content)
            temp_path = temp_file.name
        
        try:
            # Read CSV with pandas
            df = pd.read_csv(temp_path)
            
            # Store in global variable (in production, use database)
            current_dataset["df"] = df
            
            # Get dataset info
            info = {
                "filename": file.filename,
                "rows": len(df),
                "columns": df.columns.tolist(),
                "dtypes": {col: str(dtype) for col, dtype in df.dtypes.items()},
                "preview": df.head(10).to_dict(orient='records')
            }
            
            current_dataset["info"] = info
            
            logger.info(f"✓ File uploaded successfully: {info['rows']} rows, {len(info['columns'])} columns")
            
            return info
            
        finally:
            # Clean up temp file
            if os.path.exists(temp_path):
                os.unlink(temp_path)
    
    except pd.errors.EmptyDataError:
        raise HTTPException(status_code=400, detail="The CSV file is empty")
    except pd.errors.ParserError as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse CSV: {str(e)}")
    except Exception as e:
        logger.error(f"Upload error: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")


@router.get("/info")
async def get_dataset_info():
    """
    Get information about the currently loaded dataset
    """
    if current_dataset["df"] is None:
        raise HTTPException(status_code=404, detail="No dataset loaded. Please upload a file first.")
    
    return current_dataset["info"]


@router.get("/columns")
async def get_columns():
    """
    Get list of columns in the current dataset
    """
    if current_dataset["df"] is None:
        raise HTTPException(status_code=404, detail="No dataset loaded. Please upload a file first.")
    
    return {
        "columns": current_dataset["df"].columns.tolist()
    }


@router.get("/analyze")
async def analyze_data():
    """
    Analyze the current dataset and return statistics and insights
    """
    if current_dataset["df"] is None:
        raise HTTPException(status_code=404, detail="No dataset loaded. Please upload a file first.")
    
    try:
        df = current_dataset["df"]
        
        # Basic statistics
        numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
        categorical_cols = df.select_dtypes(include=['object']).columns.tolist()
        
        analysis = {
            "shape": {
                "rows": len(df),
                "columns": len(df.columns)
            },
            "column_types": {
                "numeric": len(numeric_cols),
                "categorical": len(categorical_cols)
            },
            "missing_values": df.isnull().sum().to_dict(),
            "numeric_summary": {},
            "categorical_summary": {}
        }
        
        # Numeric statistics
        if numeric_cols:
            numeric_stats = df[numeric_cols].describe().to_dict()
            analysis["numeric_summary"] = numeric_stats
        
        # Categorical statistics
        if categorical_cols:
            for col in categorical_cols[:10]:  # Limit to 10 columns
                analysis["categorical_summary"][col] = {
                    "unique_values": int(df[col].nunique()),
                    "top_values": df[col].value_counts().head(5).to_dict()
                }
        
        # AI-powered insights
        insights = generate_insights(df, analysis)
        
        result = {
            "analysis": analysis,
            "ai_insights": {
                "insights": insights,
                "timestamp": pd.Timestamp.now().isoformat()
            }
        }
        
        logger.info("✓ Analysis completed successfully")
        return result
        
    except Exception as e:
        logger.error(f"Analysis error: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")


def generate_insights(df: pd.DataFrame, analysis: Dict) -> List[str]:
    """
    Generate AI-powered insights about the dataset
    """
    insights = []
    
    # Data size insight
    rows, cols = df.shape
    insights.append(f"Dataset contains {rows:,} rows and {cols} columns")
    
    # Missing values insight
    missing_total = df.isnull().sum().sum()
    if missing_total > 0:
        missing_pct = (missing_total / (rows * cols)) * 100
        insights.append(f"Found {missing_total:,} missing values ({missing_pct:.1f}% of total data)")
    else:
        insights.append("No missing values detected - data is complete!")
    
    # Column types insight
    numeric_cols = df.select_dtypes(include=[np.number]).columns
    categorical_cols = df.select_dtypes(include=['object']).columns
    
    if len(numeric_cols) > 0:
        insights.append(f"Found {len(numeric_cols)} numeric columns suitable for modeling")
    
    if len(categorical_cols) > 0:
        insights.append(f"Found {len(categorical_cols)} categorical columns that may need encoding")
    
    # Check for potential target variables
    for col in df.columns:
        if df[col].dtype in [np.int64, np.float64]:
            unique_ratio = df[col].nunique() / len(df)
            if unique_ratio < 0.1 and df[col].nunique() < 20:
                insights.append(f"Column '{col}' might be a good classification target (low cardinality)")
    
    # Data quality insights
    duplicate_count = df.duplicated().sum()
    if duplicate_count > 0:
        insights.append(f"Warning: Found {duplicate_count} duplicate rows")
    
    return insights


@router.get("/test-data")
async def test_data():
    """
    Test endpoint to verify data is loaded correctly
    """
    try:
        if current_dataset["df"] is None:
            return {
                "status": "no_data",
                "message": "No dataset loaded",
                "data_info": None
            }
        
        df = current_dataset["df"]
        info = current_dataset["info"]
        
        return {
            "status": "data_loaded",
            "message": f"Dataset loaded with {len(df)} rows and {len(df.columns)} columns",
            "data_info": {
                "filename": info.get("filename"),
                "rows": len(df),
                "columns": len(df.columns),
                "column_names": df.columns.tolist()[:5],  # First 5 columns
                "sample_data": df.head(3).to_dict('records')  # First 3 rows
            }
        }
    except Exception as e:
        logger.error(f"Test data error: {str(e)}", exc_info=True)
        return {
            "status": "error",
            "message": f"Error: {str(e)}",
            "data_info": None
        }


@router.post("/train")
async def train_models(request: Dict[str, Any]):
    """
    Train machine learning models on the dataset
    
    Body parameters:
        target_column: Name of the column to predict
    """
    if current_dataset["df"] is None:
        raise HTTPException(status_code=404, detail="No dataset loaded. Please upload a file first.")
    
    try:
        target_column = request.get("target_column")
        if not target_column:
            raise HTTPException(status_code=400, detail="target_column is required")
        
        df = current_dataset["df"]
        
        if target_column not in df.columns:
            raise HTTPException(
                status_code=400, 
                detail=f"Column '{target_column}' not found in dataset"
            )
        
        logger.info(f"Starting training for target: {target_column}")
        
        # Simple mock training (replace with actual ML pipeline)
        from sklearn.model_selection import train_test_split
        from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
        from sklearn.linear_model import LogisticRegression, LinearRegression
        from sklearn.metrics import accuracy_score, r2_score
        import uuid
        
        # Prepare data
        X = df.drop(columns=[target_column])
        y = df[target_column]
        
        # Convert categorical columns to numeric
        X_numeric = pd.get_dummies(X, drop_first=True)
        
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(
            X_numeric, y, test_size=0.2, random_state=42
        )
        
        # Determine if classification or regression
        is_classification = y.nunique() < 20 and y.dtype in ['object', 'int64', 'bool']
        
        results = []
        
        if is_classification:
            # Train classification models
            models = {
                "Random Forest": RandomForestClassifier(n_estimators=100, random_state=42),
                "Logistic Regression": LogisticRegression(max_iter=1000, random_state=42)
            }
            
            for name, model in models.items():
                try:
                    model.fit(X_train, y_train)
                    y_pred = model.predict(X_test)
                    score = accuracy_score(y_test, y_pred)
                    
                    results.append({
                        "model_name": name,
                        "model_type": "classification",
                        "score": float(score),
                        "metric": "accuracy"
                    })
                    logger.info(f"✓ {name} trained: {score:.4f} accuracy")
                except Exception as e:
                    logger.warning(f"Failed to train {name}: {e}")
        else:
            # Train regression models
            models = {
                "Random Forest": RandomForestRegressor(n_estimators=100, random_state=42),
                "Linear Regression": LinearRegression()
            }
            
            for name, model in models.items():
                try:
                    model.fit(X_train, y_train)
                    y_pred = model.predict(X_test)
                    score = r2_score(y_test, y_pred)
                    
                    results.append({
                        "model_name": name,
                        "model_type": "regression",
                        "score": float(score),
                        "metric": "r2_score"
                    })
                    logger.info(f"✓ {name} trained: {score:.4f} R²")
                except Exception as e:
                    logger.warning(f"Failed to train {name}: {e}")
        
        if not results:
            raise HTTPException(status_code=500, detail="All models failed to train")
        
        # Sort by score and get best model
        results.sort(key=lambda x: x["score"], reverse=True)
        best_model = results[0]
        
        job_id = str(uuid.uuid4())
        
        response = {
            "job_id": job_id,
            "target_column": target_column,
            "results": results,
            "best_model": best_model,
            "model_type": "classification" if is_classification else "regression",
            "timestamp": pd.Timestamp.now().isoformat()
        }
        
        logger.info(f"✓ Training completed. Best model: {best_model['model_name']} ({best_model['score']:.4f})")
        
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Training error: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Training failed: {str(e)}")


@router.get("/explain/{job_id}")
async def get_explanations(job_id: str):
    """
    Get model explanations (SHAP values, feature importance)
    """
    if current_dataset["df"] is None:
        raise HTTPException(status_code=404, detail="No dataset loaded")
    
    try:
        # Mock explanation data (replace with actual SHAP implementation)
        df = current_dataset["df"]
        numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
        
        feature_importance = {}
        for i, col in enumerate(numeric_cols[:10]):
            # Generate mock importance scores
            feature_importance[col] = float(np.random.random() * 100)
        
        # Sort by importance
        feature_importance = dict(sorted(
            feature_importance.items(), 
            key=lambda x: x[1], 
            reverse=True
        ))
        
        explanation = {
            "job_id": job_id,
            "feature_importance": feature_importance,
            "explanation_type": "feature_importance",
            "timestamp": pd.Timestamp.now().isoformat()
        }
        
        logger.info(f"✓ Explanations generated for job {job_id}")
        
        return explanation
        
    except Exception as e:
        logger.error(f"Explanation error: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to generate explanations: {str(e)}")


# Log router initialization
logger.info("=" * 60)
logger.info("Data API Router Loaded")
logger.info("=" * 60)