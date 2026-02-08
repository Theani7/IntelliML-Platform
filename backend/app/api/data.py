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
            
            # IMPORTANT: Also sync to DataService for MLService to access
            DataService._dataframe = df
            DataService._filename = file.filename
            logger.info("✓ DataFrame synced to DataService for MLService access")
            
            # Helper function to make values JSON-safe
            def make_json_safe(val):
                if pd.isna(val):
                    return None
                if isinstance(val, float):
                    if val != val or val == float('inf') or val == float('-inf'):  # NaN or Inf check
                        return None
                return val
            
            # Create JSON-safe preview
            preview_records = []
            for _, row in df.head(10).iterrows():
                safe_row = {col: make_json_safe(val) for col, val in row.items()}
                preview_records.append(safe_row)
            
            # Get dataset info
            info = {
                "filename": file.filename,
                "rows": len(df),
                "columns": df.columns.tolist(),
                "dtypes": {col: str(dtype) for col, dtype in df.dtypes.items()},
                "preview": preview_records
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
    Analyze the current dataset and return comprehensive statistics, 
    chart data, and AI-powered insights for the Data Insights Dashboard.
    """
    if current_dataset["df"] is None:
        raise HTTPException(status_code=404, detail="No dataset loaded. Please upload a file first.")
    
    try:
        df = current_dataset["df"]
        rows, cols = df.shape
        
        # Identify column types
        numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
        categorical_cols = df.select_dtypes(include=['object', 'category']).columns.tolist()
        
        # ========== 1. Basic Info ==========
        basic_info = {
            "num_rows": rows,
            "num_columns": cols,
            "numeric_columns": len(numeric_cols),
            "categorical_columns": len(categorical_cols),
            "column_names": df.columns.tolist(),
            "column_types": {col: str(dtype) for col, dtype in df.dtypes.items()}
        }
        
        # ========== 2. Missing Values Analysis ==========
        missing_per_col = df.isnull().sum()
        total_missing = int(missing_per_col.sum())
        
        missing_values = {
            "total_missing": total_missing,
            "missing_percentage": round((total_missing / (rows * cols)) * 100, 2) if rows * cols > 0 else 0,
            "per_column": {col: int(count) for col, count in missing_per_col.items() if count > 0}
        }
        
        # ========== 3. Data Quality Scoring ==========
        # Start with 100 and deduct for issues
        quality_score = 100
        issues = []
        
        # Check for missing values
        if total_missing > 0:
            missing_pct = (total_missing / (rows * cols)) * 100
            if missing_pct > 20:
                quality_score -= 30
                issues.append(f"High missing values: {missing_pct:.1f}% of data is missing")
            elif missing_pct > 5:
                quality_score -= 15
                issues.append(f"Moderate missing values: {missing_pct:.1f}% of data is missing")
            else:
                quality_score -= 5
                issues.append(f"Low missing values: {missing_pct:.1f}% of data is missing")
        
        # Check for duplicates
        duplicate_count = int(df.duplicated().sum())
        if duplicate_count > 0:
            dup_pct = (duplicate_count / rows) * 100
            if dup_pct > 10:
                quality_score -= 20
                issues.append(f"High duplicates: {duplicate_count} duplicate rows ({dup_pct:.1f}%)")
            else:
                quality_score -= 10
                issues.append(f"{duplicate_count} duplicate rows found ({dup_pct:.1f}%)")
        
        # Check for columns with single value
        for col in df.columns:
            if df[col].nunique() == 1:
                quality_score -= 5
                issues.append(f"Column '{col}' has only one unique value")
        
        quality_score = max(0, quality_score)  # Don't go below 0
        
        data_quality = {
            "quality_score": quality_score,
            "issues": issues,
            "duplicate_rows": duplicate_count,
            "completeness": round(100 - (total_missing / (rows * cols) * 100), 2) if rows * cols > 0 else 100
        }

        # ========== 3b. Descriptive Statistics ==========
        descriptive_stats = {}
        if len(numeric_cols) > 0:
            try:
                # Basic describe
                desc = df[numeric_cols].describe().T
                
                # Skewness and Kurtosis
                skew = df[numeric_cols].skew()
                kurt = df[numeric_cols].kurtosis()
                
                for col in numeric_cols:
                    stats_dict = desc.loc[col].to_dict()
                    stats_dict['skew'] = round(skew.get(col, 0), 4)
                    stats_dict['kurtosis'] = round(kurt.get(col, 0), 4)
                for col in numeric_cols:
                    stats_dict = desc.loc[col].to_dict()
                    stats_dict['skew'] = round(skew.get(col, 0), 4)
                    stats_dict['kurtosis'] = round(kurt.get(col, 0), 4)
                    
                    # Round other values
                    for k, v in stats_dict.items():
                        if isinstance(v, float):
                            stats_dict[k] = round(v, 4)
                    descriptive_stats[col] = stats_dict

            except Exception as e:
                logger.warning(f"Could not calculate descriptive stats: {e}")
        
        # ========== 4. Generate Chart Data ==========
        chart_data = {}
        
        # Helper function to make values JSON-safe
        def safe_float(val):
            if pd.isna(val) or val != val or val == float('inf') or val == float('-inf'):
                return None
            return float(val)
        
        def safe_list(arr):
            return [safe_float(x) for x in arr]
        
        # 4a. Distribution charts for numeric columns
        distributions = []
        for col in numeric_cols[:8]:  # Limit to 8 columns
            try:
                col_data = df[col].dropna()
                if len(col_data) > 0:
                    hist_counts, bin_edges = np.histogram(col_data, bins=20)
                    distributions.append({
                        "column": col,
                        "bins": safe_list(bin_edges[:-1]),  # Left edges of bins
                        "counts": [int(c) for c in hist_counts],
                        "mean": safe_float(col_data.mean()),
                        "median": safe_float(col_data.median())
                    })
            except Exception as e:
                logger.warning(f"Could not generate distribution for {col}: {e}")
        chart_data["distributions"] = distributions
        
        # 4b. Categorical value counts
        categorical_counts = []
        for col in categorical_cols[:8]:  # Limit to 8 columns
            try:
                value_counts = df[col].value_counts().head(10)
                categorical_counts.append({
                    "column": col,
                    "categories": value_counts.index.tolist(),
                    "counts": [int(c) for c in value_counts.values]
                })
            except Exception as e:
                logger.warning(f"Could not generate categorical counts for {col}: {e}")
        chart_data["categorical_counts"] = categorical_counts
        
        # 4c. Correlation heatmap (for numeric columns)
        if len(numeric_cols) >= 2:
            try:
                corr_cols = numeric_cols[:10]  # Limit to 10 columns
                corr_matrix = df[corr_cols].corr()
                # Replace NaN with 0 for JSON
                corr_matrix = corr_matrix.fillna(0)
                chart_data["correlation_heatmap"] = {
                    "columns": corr_cols,
                    "values": [[safe_float(v) or 0 for v in row] for row in corr_matrix.values]
                }
            except Exception as e:
                logger.warning(f"Could not generate correlation heatmap: {e}")
                chart_data["correlation_heatmap"] = {"columns": [], "values": []}
        else:
            chart_data["correlation_heatmap"] = {"columns": [], "values": []}
        
        # 4d. Missing values chart
        cols_with_missing = [(col, int(count)) for col, count in missing_per_col.items() if count > 0]
        if cols_with_missing:
            chart_data["missing_values_chart"] = {
                "columns": [c[0] for c in cols_with_missing],
                "counts": [c[1] for c in cols_with_missing],
                "percentages": [round((c[1] / rows) * 100, 2) for c in cols_with_missing]
            }
        else:
            chart_data["missing_values_chart"] = None
        
        # 4e. Box plots for numeric columns
        box_plots = []
        for col in numeric_cols[:6]:  # Limit to 6 columns
            try:
                col_data = df[col].dropna()
                if len(col_data) > 0:
                    q1 = float(col_data.quantile(0.25))
                    q3 = float(col_data.quantile(0.75))
                    iqr = q3 - q1
                    lower_bound = q1 - 1.5 * iqr
                    upper_bound = q3 + 1.5 * iqr
                    outliers = col_data[(col_data < lower_bound) | (col_data > upper_bound)]
                    
                    box_plots.append({
                        "column": col,
                        "min": safe_float(col_data.min()),
                        "q1": safe_float(q1),
                        "median": safe_float(col_data.median()),
                        "q3": safe_float(q3),
                        "max": safe_float(col_data.max()),
                        "outliers": safe_list(outliers.head(50).tolist())  # Limit outliers
                    })
            except Exception as e:
                logger.warning(f"Could not generate box plot for {col}: {e}")
        chart_data["box_plots"] = box_plots
        
        # 4f. Scatter plot matrix (pairs of highly correlated columns)
        scatter_matrix = []
        if len(numeric_cols) >= 2:
            try:
                corr_matrix = df[numeric_cols[:8]].corr()
                pairs_added = set()
                
                # Find interesting correlations (not 1.0 and abs > 0.3)
                for i, col1 in enumerate(numeric_cols[:8]):
                    for j, col2 in enumerate(numeric_cols[:8]):
                        if i < j:
                            pair_key = tuple(sorted([col1, col2]))
                            if pair_key not in pairs_added:
                                corr_val = corr_matrix.loc[col1, col2]
                                if pd.notna(corr_val) and abs(corr_val) > 0.3:
                                    # Sample data for scatter plot (max 200 points)
                                    sample_df = df[[col1, col2]].dropna()
                                    if len(sample_df) > 200:
                                        sample_df = sample_df.sample(200, random_state=42)
                                    
                                    scatter_matrix.append({
                                        "x_column": col1,
                                        "y_column": col2,
                                        "x_values": safe_list(sample_df[col1].tolist()),
                                        "y_values": safe_list(sample_df[col2].tolist()),
                                        "correlation": safe_float(corr_val) or 0
                                    })
                                    pairs_added.add(pair_key)
                                    
                                    if len(scatter_matrix) >= 6:  # Limit to 6 scatter plots
                                        break
                    if len(scatter_matrix) >= 6:
                        break
            except Exception as e:
                logger.warning(f"Could not generate scatter matrix: {e}")
        chart_data["scatter_matrix"] = scatter_matrix
        
        # ========== 5. Recommendations ==========
        recommendations = []
        
        if total_missing > 0:
            recommendations.append("Consider handling missing values using imputation or removal")
        
        if duplicate_count > 0:
            recommendations.append("Review and remove duplicate rows if they are not intentional")
        
        if len(categorical_cols) > 0:
            recommendations.append("Encode categorical variables before training ML models")
        
        # Check for high cardinality categorical columns
        for col in categorical_cols:
            if df[col].nunique() > 50:
                recommendations.append(f"Column '{col}' has high cardinality ({df[col].nunique()} unique values) - consider binning")
                break
        
        # Check for potential target detection
        for col in numeric_cols:
            unique_ratio = df[col].nunique() / len(df)
            if unique_ratio < 0.05 and df[col].nunique() <= 10:
                recommendations.append(f"Column '{col}' appears suitable for classification (low cardinality)")
                break
        
        if len(recommendations) == 0:
            recommendations.append("Dataset looks well-prepared for analysis!")
        
        # ========== 6. AI Insights ==========
        insights = generate_insights(df, basic_info)
        
        # ========== Compile Result ==========
        result = {
            "analysis": {
                "basic_info": basic_info,
                "data_quality": data_quality,
                "missing_values": missing_values,
                "descriptive_stats": descriptive_stats,
                "chart_data": chart_data,
                "recommendations": recommendations
            },
            "ai_insights": {
                "insights": "\n".join(insights),
                "timestamp": pd.Timestamp.now().isoformat()
            }
        }
        
        logger.info("✓ Comprehensive analysis completed successfully")
        return result
        
    except Exception as e:
        logger.error(f"Analysis failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))








@router.get("/report")
def get_report():
    """
    Generate and download EDA PDF Report with AI Analysis
    """
    from fastapi.responses import StreamingResponse
    from app.utils.pdf_generator import generate_eda_pdf
    from app.core.groq_client import groq_client
    import json

    df = data_service.get_dataframe()
    if df is None:
        raise HTTPException(status_code=404, detail="No dataset loaded")
    
    # 1. Prepare Data Summary for AI
    description = df.describe().to_dict()
    missing = df.isnull().sum().to_dict()
    
    # Calculate correlations for context
    numeric_df = df.select_dtypes(include=[np.number])
    correlations = {}
    if not numeric_df.empty:
        corr_matrix = numeric_df.corr().abs()
        # Get top pairs
        pairs = (corr_matrix.where(np.triu(np.ones(corr_matrix.shape), k=1).astype(bool))
                 .stack()
                 .sort_values(ascending=False))
        if not pairs.empty:
            # Convert tuple keys to string for JSON serialization
            top_corr = pairs.head(5).to_dict()
            correlations = {f"{k[0]} vs {k[1]}": v for k, v in top_corr.items()}

    # 2. Generate AI Analysis
    ai_analysis_text = "AI Analysis unavailable."
    try:
        prompt = f"""
        You are an expert Senior Data Scientist. Write a detailed Exploratory Data Analysis (EDA) report based on this dataset summary:
        
        Dataset Info: {len(df)} rows, {len(df.columns)} columns.
        Columns: {', '.join(df.columns)}
        
        Descriptive Statistics:
        {json.dumps(description, indent=2)}
        
        Missing Values:
        {json.dumps(missing, indent=2)}
        
        Top Correlations (Absolute Values):
        {json.dumps(correlations, indent=2)}
        
        Instructions:
        1. Write a comprehensive "Executive Summary" analyzing the data quality, distributions, and relationships.
        2. Specifically explain what the charts (Distribution, Heatmap, Boxplots) would likely show based on these stats.
        3. Highlight any anomalies, outliers, or strong relationships.
        4. Use professional, markdown-free formatting (paragraphs only).
        5. Keep it under 400 words.
        """
        
        response = groq_client.chat_completion([
            {"role": "system", "content": "You are a helpful data science assistant."},
            {"role": "user", "content": prompt}
        ])
        ai_analysis_text = response
        
    except Exception as e:
        logger.error(f"AI Report Generation Failed: {e}")
        ai_analysis_text = f"Could not generate AI analysis due to an error: {str(e)}"

    analysis_results = {
        'descriptive_stats': description,
        'data_quality': {
            'quality_score': 'N/A', 
            'missing_values': missing
        },
        'ai_analysis': ai_analysis_text
    }
    
    # generate_eda_pdf now handles chart generation internally using the df
    pdf_buffer = generate_eda_pdf(df, analysis_results)
    
    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=eda_report.pdf"}
    )


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
        from sklearn.metrics import (
            accuracy_score, r2_score, mean_absolute_error, mean_squared_error,
            precision_score, recall_score, f1_score, confusion_matrix, roc_curve, auc, roc_auc_score
        )
        import uuid
        
        # Prepare data
        X = df.drop(columns=[target_column])
        y = df[target_column]
        
        # Convert categorical columns to numeric using get_dummies
        X_numeric = pd.get_dummies(X, drop_first=True)
        
        # Handle NaN values relatively simply for this demo (impute with mean)
        X_numeric = X_numeric.fillna(X_numeric.mean())
        
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(
            X_numeric, y, test_size=0.2, random_state=42
        )
        
        # Determine if classification or regression
        # Heuristic: < 20 unique values and object/int -> Classification
        is_classification = y.nunique() < 20 and (y.dtype == 'object' or pd.api.types.is_integer_dtype(y))
        
        results = []
        suggestions = []
        
        if is_classification:
            # Ensure y is numeric for some metrics / models if needed, but sklearn handles strings for target usually
            # However, for ROC/AUC we need numeric or label encoding.
            # Let's do simple LabelEncoding for target if it's object
            from sklearn.preprocessing import LabelEncoder
            le = LabelEncoder()
            y_train_enc = le.fit_transform(y_train)
            y_test_enc = le.transform(y_test)
            
            # Train classification models
            models = {
                "Random Forest": RandomForestClassifier(n_estimators=100, random_state=42),
                "Logistic Regression": LogisticRegression(max_iter=1000, random_state=42)
            }
            
            for name, model in models.items():
                try:
                    model.fit(X_train, y_train_enc)
                    y_pred = model.predict(X_test)
                    
                    # Probabilities for ROC
                    if hasattr(model, "predict_proba"):
                        y_prob = model.predict_proba(X_test)
                        # Handle binary vs multi-class for ROC
                        if len(le.classes_) == 2:
                            flattr_prob = y_prob[:, 1]
                            fpr, tpr, _ = roc_curve(y_test_enc, flattr_prob)
                            roc_auc = auc(fpr, tpr)
                            roc_data = [{"x": float(f), "y": float(t)} for f, t in zip(fpr[::10], tpr[::10])] # Sample to reduce size
                            # Ensure (0,0) and (1,1) are included
                            if roc_data[0]['x'] != 0: roc_data.insert(0, {"x": 0, "y": 0})
                            if roc_data[-1]['x'] != 1: roc_data.append({"x": 1, "y": 1})
                        else:
                            # Multiclass ROC is complex, simplify for now or use macro average
                            roc_data = []
                            roc_auc = 0.0 # Placeholder
                    else:
                        roc_data = []
                        roc_auc = 0.0
                    
                    # Metrics
                    acc = accuracy_score(y_test_enc, y_pred)
                    prec = precision_score(y_test_enc, y_pred, average='weighted', zero_division=0)
                    rec = recall_score(y_test_enc, y_pred, average='weighted', zero_division=0)
                    f1 = f1_score(y_test_enc, y_pred, average='weighted', zero_division=0)
                    
                    # Confusion Matrix
                    cm = confusion_matrix(y_test_enc, y_pred)
                    cm_formatted = []
                    for i, row in enumerate(cm):
                        row_dict = {}
                        for j, val in enumerate(row):
                            row_dict[str(le.classes_[j])] = int(val)
                        row_dict["Actual"] = str(le.classes_[i])
                        cm_formatted.append(row_dict)
                    
                    # Convert class labels for frontend
                    cm_labels = [str(c) for c in le.classes_]

                    results.append({
                        "model_name": name,
                        "model_type": "classification",
                        "score": float(acc), # Main sorting metric
                        "metric": "accuracy",
                        "metrics": {
                            "accuracy": float(acc),
                            "precision": float(prec),
                            "recall": float(rec),
                            "f1": float(f1),
                            "auc": float(roc_auc)
                        },
                        "confusion_matrix": cm_formatted,
                        "confusion_matrix_labels": cm_labels,
                        "roc_curve": roc_data
                    })
                    logger.info(f"✓ {name} trained: {acc:.4f} accuracy")
                except Exception as e:
                    logger.warning(f"Failed to train {name}: {e}")
                    
            # Generate Classification Suggestions
            if results:
                best = max(results, key=lambda x: x['score'])
                if best['score'] < 0.7:
                    suggestions.append("Model accuracy is low (< 70%). Consider collecting more data or engineering new features.")
                if best['metrics']['precision'] < 0.6:
                    suggestions.append("Precision is low. The model has a high false-positive rate.")
                if best['metrics']['recall'] < 0.6:
                    suggestions.append("Recall is low. The model is missing many positive instances.")
                
                # Check for class imbalance in original data
                try:
                    class_counts = y.value_counts(normalize=True)
                    if class_counts.min() < 0.1: # Less than 10% representation
                        suggestions.append("Significant class imbalance detected. Consider techniques like SMOTE oversampling or class weighting.")
                except: pass

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
                    
                    r2 = r2_score(y_test, y_pred)
                    mae = mean_absolute_error(y_test, y_pred)
                    mse = mean_squared_error(y_test, y_pred)
                    rmse = np.sqrt(mse)
                    
                    results.append({
                        "model_name": name,
                        "model_type": "regression",
                        "score": float(r2),
                        "metric": "r2_score",
                        "metrics": {
                            "r2": float(r2),
                            "mae": float(mae),
                            "mse": float(mse),
                            "rmse": float(rmse)
                        },
                        "confusion_matrix": None,
                        "roc_curve": None
                    })
                    logger.info(f"✓ {name} trained: {r2:.4f} R²")
                except Exception as e:
                    logger.warning(f"Failed to train {name}: {e}")

            # Generate Regression Suggestions
            if results:
                best = max(results, key=lambda x: x['score'])
                if best['score'] < 0.5:
                     suggestions.append("R² score is low (< 0.5). The model explains less than 50% of the variance.")
                # Check for outliers roughly
                if X_numeric.apply(lambda x: (x - x.mean()).abs() > 3*x.std()).any().any():
                    suggestions.append("Outliers detected in feature columns. Consider robust scaling or clipping outliers.")
        
        if not results:
            raise HTTPException(status_code=500, detail="All models failed to train")
        
        # Sort by score and get best model
        results.sort(key=lambda x: x["score"], reverse=True)
        best_model = results[0]
        
        # Add general suggestions
        suggestions.append("Try training on a larger subset of data if available.")
        suggestions.append("Feature selection (removing noisy columns) might improve performance.")

        job_id = str(uuid.uuid4())
        
        response = {
            "job_id": job_id,
            "target_column": target_column,
            "results": results,
            "best_model": best_model,
            "suggestions": suggestions,
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


@router.post("/clean")
async def clean_data(request: Dict[str, Any]):
    """
    Apply data cleaning operations to the current dataset.
    
    Supported operations:
    - drop_column: Remove a column
    - fill_na: Fill missing values
    - drop_na: Drop rows with missing values
    - rename: Rename a column
    - cast: Change column type
    - drop_duplicates: Remove duplicate rows
    """
    if current_dataset["df"] is None:
        raise HTTPException(status_code=404, detail="No dataset loaded. Please upload a file first.")

    try:
        operation = request.get("operation")
        params = request.get("params", {})
        
        df = current_dataset["df"]
        logger.info(f"Applying operation '{operation}' with params: {params}")

        if operation == "drop_column":
            col = params.get("column")
            if col and col in df.columns:
                df.drop(columns=[col], inplace=True)
        
        elif operation == "fill_na":
            col = params.get("column")
            value = params.get("value")
            method = params.get("method") # 'mean', 'median', 'mode'
            
            if col and col in df.columns:
                if method:
                    if method == 'mean' and pd.api.types.is_numeric_dtype(df[col]):
                        fill_val = df[col].mean()
                    elif method == 'median' and pd.api.types.is_numeric_dtype(df[col]):
                        fill_val = df[col].median()
                    elif method == 'mode':
                         mode_res = df[col].mode()
                         fill_val = mode_res.iloc[0] if not mode_res.empty else 0
                    else:
                        fill_val = 0 # Default fallback
                    df[col] = df[col].fillna(fill_val)
                elif value is not None:
                    df[col] = df[col].fillna(value)
            elif not col: # Fill all
                 # Simple fill all 0 for now if no col specified, or implement more complex logic
                 pass

        elif operation == "drop_na":
            # Remove rows with ANY missing values
            df.dropna(inplace=True)
            df.reset_index(drop=True, inplace=True)

        elif operation == "drop_duplicates":
            df.drop_duplicates(inplace=True)
            df.reset_index(drop=True, inplace=True)

        elif operation == "rename":
            old_name = params.get("column")
            new_name = params.get("new_name")
            if old_name in df.columns and new_name:
                df.rename(columns={old_name: new_name}, inplace=True)

        elif operation == "cast":
            col = params.get("column")
            dtype = params.get("type") # 'numeric', 'categorical', 'datetime', 'string'
            if col in df.columns:
                try:
                    if dtype == 'numeric':
                        df[col] = pd.to_numeric(df[col], errors='coerce')
                    elif dtype == 'datetime':
                        df[col] = pd.to_datetime(df[col], errors='coerce')
                    elif dtype == 'categorical':
                        df[col] = df[col].astype('category')
                    elif dtype == 'string':
                        df[col] = df[col].astype('string')
                except Exception as e:
                     logger.warning(f"Cast failed for {col} to {dtype}: {e}")
                     raise HTTPException(status_code=400, detail=f"Failed to cast {col} to {dtype}")

        elif operation == "encode":
            col = params.get("column")
            method = params.get("method") # 'one_hot', 'label'
            if col in df.columns:
                if method == 'one_hot':
                    # One-hot encode and join back
                    dummies = pd.get_dummies(df[col], prefix=col, drop_first=True)
                    # Convert bools to ints for better JSON compatibility
                    dummies = dummies.astype(int)
                    df = pd.concat([df, dummies], axis=1)
                    df.drop(columns=[col], inplace=True)
                elif method == 'label':
                    from sklearn.preprocessing import LabelEncoder
                    le = LabelEncoder()
                    # fill na before encoding to avoid error, or treat as a class
                    temp_col = df[col].astype(str)
                    df[col] = le.fit_transform(temp_col)

        elif operation == "handle_outliers":
            col = params.get("column")
            method = params.get("method") # 'clip', 'drop'
            threshold = float(params.get("threshold", 1.5))
            
            if col in df.columns and pd.api.types.is_numeric_dtype(df[col]):
                Q1 = df[col].quantile(0.25)
                Q3 = df[col].quantile(0.75)
                IQR = Q3 - Q1
                lower_bound = Q1 - threshold * IQR
                upper_bound = Q3 + threshold * IQR
                
                if method == 'clip':
                    df[col] = df[col].clip(lower=lower_bound, upper=upper_bound)
                elif method == 'drop':
                    # Drop rows where value is outlier
                    df = df[(df[col] >= lower_bound) & (df[col] <= upper_bound)]
                    df.reset_index(drop=True, inplace=True)

        elif operation == "scale":
            col = params.get("column")
            method = params.get("method") # 'standard', 'minmax'
            
            if col in df.columns and pd.api.types.is_numeric_dtype(df[col]):
                from sklearn.preprocessing import StandardScaler, MinMaxScaler
                import numpy as np
                
                # Reshape for sklearn
                data_reshaped = df[col].values.reshape(-1, 1)
                
                if method == 'standard':
                    scaler = StandardScaler()
                    df[col] = scaler.fit_transform(data_reshaped).flatten()
                elif method == 'minmax':
                    scaler = MinMaxScaler()
                    df[col] = scaler.fit_transform(data_reshaped).flatten()
            else:
                 raise HTTPException(status_code=400, detail=f"Column {col} is not numeric or not found")

        else:
             raise HTTPException(status_code=400, detail=f"Unknown operation: {operation}")

        # Update global reference (and Service sync)
        current_dataset["df"] = df
        DataService._dataframe = df # Sync to ML Engine service
        
        # Regenerate info
        # Helper function to make values JSON-safe (reused from upload)
        def make_json_safe(val):
            if pd.isna(val): return None
            if isinstance(val, float):
                if val != val or val == float('inf') or val == float('-inf'): return None
            return val
        
        preview_records = []
        for _, row in df.head(10).iterrows():
            safe_row = {col: make_json_safe(val) for col, val in row.items()}
            preview_records.append(safe_row)

        new_info = {
            "filename": current_dataset["info"]["filename"],
            "rows": len(df),
            "columns": df.columns.tolist(),
            "dtypes": {col: str(dtype) for col, dtype in df.dtypes.items()},
            "preview": preview_records
        }
        current_dataset["info"] = new_info
        
        return {
            "status": "success",
            "message": f"Operation {operation} applied successfully",
            "dataset_info": new_info
        }

    except Exception as e:
        logger.error(f"Cleaning error: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/quality")
async def analyze_quality():
    """
    Analyze data quality (missing values, types, outliers, encoding) and get AI recommendations.
    """
    if current_dataset["df"] is None:
        raise HTTPException(status_code=404, detail="No dataset loaded")

    try:
        df = current_dataset["df"]
        total_rows = len(df)
        
        # 1. Missing Values
        missing_summary = []
        for col in df.columns:
            missing_count = int(df[col].isnull().sum())
            if missing_count > 0:
                dtype = str(df[col].dtype)
                missing_pct = round((missing_count / total_rows) * 100, 2)
                
                recommendation = "impute"
                if missing_pct > 50: recommendation = "drop_column"
                elif missing_pct < 5: recommendation = "drop_rows"
                
                missing_summary.append({
                    "column": col,
                    "count": missing_count,
                    "percentage": missing_pct,
                    "dtype": dtype,
                    "heuristic_recommendation": recommendation
                })

        # 2. Encoding Needs (Categorical columns)
        encoding_summary = []
        categorical_cols = df.select_dtypes(include=['object', 'category', 'string']).columns
        
        for col in categorical_cols:
            if col not in [m['column'] for m in missing_summary]: # Skip if it has missing values (fix those first)
                unique_count = df[col].nunique()
                # Basic heuristic
                rec = "one_hot" if unique_count < 10 else "label"
                encoding_summary.append({
                    "column": col,
                    "cardinality": unique_count,
                    "dtype": str(df[col].dtype),
                    "heuristic_recommendation": rec
                })

        # 3. Outlier Detection (Numeric columns)
        outlier_summary = []
        numeric_cols = df.select_dtypes(include=[np.number]).columns
        
        for col in numeric_cols:
            Q1 = df[col].quantile(0.25)
            Q3 = df[col].quantile(0.75)
            IQR = Q3 - Q1
            lower = Q1 - 1.5 * IQR
            upper = Q3 + 1.5 * IQR
            
            outliers = df[(df[col] < lower) | (df[col] > upper)]
            outlier_count = len(outliers)
            
            if outlier_count > 0:
                outlier_pct = round((outlier_count / total_rows) * 100, 2)
                outlier_summary.append({
                    "column": col,
                    "count": outlier_count,
                    "percentage": outlier_pct,
                    "heuristic_recommendation": "clip" # Default safe approach
                })

        
        # 4. Get AI Recommendations
        ai_recommendations = {}
        if missing_summary or encoding_summary or outlier_summary:
            from app.core.groq_client import groq_client
            
            prompt = f"""
            Analyze these data quality issues and suggest the BEST cleaning strategy for each.
            
            Dataset Context: {total_rows} rows.

            1. Missing Values:
            {json.dumps(missing_summary, indent=2)}

            2. Categorical Columns (Need Encoding?):
            {json.dumps(encoding_summary, indent=2)}
            
            3. Outliers Identified:
            {json.dumps(outlier_summary, indent=2)}
            
            Return ONLY a valid JSON object mapping column names to strategies.
            Format:
            {{
                "column_name": {{
                    "strategy": "mean" | "median" | "mode" | "drop_rows" | "drop_column" | "one_hot" | "label" | "clip" | "drop_outliers",
                    "reasoning": "Brief explanation why"
                }}
            }}
            """
            
            try:
                ai_response = groq_client.chat_completion([
                    {"role": "system", "content": "You are a data cleaning expert. Output valid JSON only."},
                    {"role": "user", "content": prompt}
                ])
                
                import re
                json_match = re.search(r'\{.*\}', ai_response, re.DOTALL)
                if json_match:
                    ai_recommendations = json.loads(json_match.group(0))
            except Exception as e:
                logger.error(f"AI recommendation failed: {e}")

        # Helper to merge AI recommendation
        def enhance_summary(summary_list, default_rec_key="heuristic_recommendation"):
            for item in summary_list:
                col = item["column"]
                if col in ai_recommendations:
                    rec = ai_recommendations[col]
                    item["ai_recommendation"] = rec.get("strategy")
                    item["ai_reasoning"] = rec.get("reasoning")
                else:
                    item["ai_recommendation"] = item[default_rec_key]
                    item["ai_reasoning"] = "Heuristic suggestion (AI unavailable)"

        enhance_summary(missing_summary)
        enhance_summary(encoding_summary)
        enhance_summary(outlier_summary)

        return {
            "status": "success",
            "total_rows": total_rows,
            "columns_with_missing": len(missing_summary),
            "missing_summary": missing_summary,
            "encoding_summary": encoding_summary,
            "outlier_summary": outlier_summary
        }

    except Exception as e:
        logger.error(f"Quality analysis error: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# ==================== OUTLIER DETECTION ====================

from pydantic import BaseModel
from typing import Optional

class OutlierRequest(BaseModel):
    columns: Optional[List[str]] = None
    method: str = "iqr"  # iqr or zscore
    threshold: float = 1.5  # IQR multiplier or Z-score threshold

@router.post("/outliers/detect")
async def detect_outliers(request: OutlierRequest):
    """Detect outliers in numeric columns using IQR or Z-score method"""
    if current_dataset["df"] is None:
        raise HTTPException(status_code=404, detail="No dataset loaded")
    
    try:
        df = current_dataset["df"]
        numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
        
        # Filter to requested columns or use all numeric
        target_cols = request.columns if request.columns else numeric_cols
        target_cols = [c for c in target_cols if c in numeric_cols]
        
        outlier_info = []
        total_outlier_rows = set()
        
        for col in target_cols:
            col_data = df[col].dropna()
            
            if request.method == "zscore":
                from scipy import stats
                z_scores = np.abs(stats.zscore(col_data))
                outlier_mask = z_scores > request.threshold
            else:  # IQR
                q1 = col_data.quantile(0.25)
                q3 = col_data.quantile(0.75)
                iqr = q3 - q1
                lower = q1 - request.threshold * iqr
                upper = q3 + request.threshold * iqr
                outlier_mask = (col_data < lower) | (col_data > upper)
            
            outlier_indices = col_data[outlier_mask].index.tolist()
            total_outlier_rows.update(outlier_indices)
            
            outlier_info.append({
                "column": col,
                "outlier_count": int(outlier_mask.sum()),
                "percentage": round((outlier_mask.sum() / len(col_data)) * 100, 2),
                "sample_values": col_data[outlier_mask].head(5).tolist()
            })
        
        return {
            "method": request.method,
            "threshold": request.threshold,
            "total_outlier_rows": len(total_outlier_rows),
            "columns_analyzed": len(target_cols),
            "details": outlier_info
        }
    except Exception as e:
        logger.error(f"Outlier detection error: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/outliers/remove")
async def remove_outliers(request: OutlierRequest):
    """Remove outliers from dataset"""
    if current_dataset["df"] is None:
        raise HTTPException(status_code=404, detail="No dataset loaded")
    
    try:
        df = current_dataset["df"].copy()
        original_rows = len(df)
        numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
        
        target_cols = request.columns if request.columns else numeric_cols
        target_cols = [c for c in target_cols if c in numeric_cols]
        
        rows_to_remove = set()
        
        for col in target_cols:
            col_data = df[col]
            
            if request.method == "zscore":
                from scipy import stats
                z_scores = np.abs(stats.zscore(col_data.dropna()))
                mask = pd.Series(False, index=df.index)
                mask.loc[col_data.dropna().index] = z_scores > request.threshold
            else:  # IQR
                q1 = col_data.quantile(0.25)
                q3 = col_data.quantile(0.75)
                iqr = q3 - q1
                lower = q1 - request.threshold * iqr
                upper = q3 + request.threshold * iqr
                mask = (col_data < lower) | (col_data > upper)
            
            rows_to_remove.update(df[mask].index.tolist())
        
        # Remove outlier rows
        df = df.drop(index=list(rows_to_remove))
        
        # Update global dataset
        current_dataset["df"] = df
        DataService._dataframe = df
        
        return {
            "status": "success",
            "original_rows": original_rows,
            "removed_rows": len(rows_to_remove),
            "remaining_rows": len(df),
            "columns_processed": target_cols
        }
    except Exception as e:
        logger.error(f"Outlier removal error: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# ==================== FEATURE ENGINEERING ====================

class FeatureEngineeringRequest(BaseModel):
    operation: str  # polynomial, log, interaction, binning
    columns: List[str]
    params: Optional[Dict[str, Any]] = None

@router.post("/engineer")
async def engineer_features(request: FeatureEngineeringRequest):
    """Create new features from existing columns"""
    if current_dataset["df"] is None:
        raise HTTPException(status_code=404, detail="No dataset loaded")
    
    try:
        df = current_dataset["df"].copy()
        new_columns = []
        params = request.params or {}
        
        if request.operation == "polynomial":
            degree = params.get("degree", 2)
            for col in request.columns:
                if col in df.columns and df[col].dtype in [np.float64, np.int64]:
                    new_col = f"{col}_pow{degree}"
                    df[new_col] = df[col] ** degree
                    new_columns.append(new_col)
        
        elif request.operation == "log":
            for col in request.columns:
                if col in df.columns and df[col].dtype in [np.float64, np.int64]:
                    new_col = f"{col}_log"
                    # Add small value to avoid log(0)
                    df[new_col] = np.log1p(df[col].clip(lower=0))
                    new_columns.append(new_col)
        
        elif request.operation == "interaction":
            if len(request.columns) >= 2:
                col1, col2 = request.columns[0], request.columns[1]
                if col1 in df.columns and col2 in df.columns:
                    new_col = f"{col1}_x_{col2}"
                    df[new_col] = df[col1] * df[col2]
                    new_columns.append(new_col)
        
        elif request.operation == "binning":
            n_bins = params.get("bins", 5)
            for col in request.columns:
                if col in df.columns and df[col].dtype in [np.float64, np.int64]:
                    new_col = f"{col}_binned"
                    df[new_col] = pd.cut(df[col], bins=n_bins, labels=False)
                    new_columns.append(new_col)
        
        # Update global dataset
        current_dataset["df"] = df
        DataService._dataframe = df
        
        return {
            "status": "success",
            "operation": request.operation,
            "new_columns": new_columns,
            "total_columns": len(df.columns),
            "preview": df[new_columns].head(5).to_dict() if new_columns else {}
        }
    except Exception as e:
        logger.error(f"Feature engineering error: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# Log router initialization
logger.info("=" * 60)
logger.info("Data API Router Loaded")
logger.info("=" * 60)