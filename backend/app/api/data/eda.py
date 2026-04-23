"""
================================================================================
EDA (Exploratory Data Analysis) API
================================================================================

PURPOSE:
    Provides comprehensive data analysis and reporting capabilities.
    Generates statistics, charts, and AI-powered insights.

ANALYSIS COMPONENTS:

1. BASIC INFO
   - Number of rows/columns
   - Column names and types
   - Numeric vs categorical breakdown

2. DATA QUALITY SCORING
   - Composite score (0-100)
   - Weighted by:
     - Missing values (30% penalty max)
     - Duplicates (20% penalty max)
     - Single-value columns (5% penalty each)

3. DESCRIPTIVE STATISTICS
   - Count, mean, std, min, max
   - Percentiles (25%, 50%, 75%)
   - Skewness and kurtosis
   - Per numeric column

4. CHART DATA
   - Distribution histograms (numeric columns)
   - Categorical value counts (bar charts)
   - Correlation heatmap (numeric pairs)
   - Missing values chart
   - Box plots with outliers
   - Scatter plot matrix

5. AI INSIGHTS
   - Dataset summary
   - Potential target columns
   - Data quality observations
   - Recommendations

6. EDA REPORT (PDF)
   - Comprehensive PDF export
   - AI-generated narrative
   - Charts and statistics
   - Downloadable

================================================================================
"""

from fastapi.responses import StreamingResponse
import pandas as pd
import numpy as np
from typing import Dict, List
import json

from app.api.data import router, get_current_dataset, data_service, logger
from app.core.cache import analysis_cache
from app.core.exceptions import NotFoundError, DataProcessingError


def safe_float(val):
    """
    Convert value to JSON-safe float.
    
    Handles special float values that can't be JSON serialized:
    - NaN (not a number)
    - Infinity / -Infinity
    
    Args:
        val: Any numeric value
        
    Returns:
        float or None (for invalid values)
    """
    if pd.isna(val) or val != val or val == float('inf') or val == float('-inf'):
        return None
    return float(val)


def safe_list(arr):
    """
    Convert array to JSON-safe list of floats.
    
    Args:
        arr: Iterable of numeric values
        
    Returns:
        List of floats (None for invalid values)
    """
    return [safe_float(x) for x in arr]


def generate_insights(df: pd.DataFrame, analysis: Dict) -> List[str]:
    """
    Generate AI-powered insights about the dataset.
    
    Creates human-readable insights covering:
    - Dataset size
    - Missing values
    - Column types
    - Potential target columns
    - Data quality issues
    
    Args:
        df: Input DataFrame
        analysis: Basic analysis dict for context
        
    Returns:
        List of insight strings
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
    # Good targets have low cardinality and numeric type
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


@router.get("/analyze")
async def analyze_data(session_id: str = "default"):
    """
    Analyze the dataset and return comprehensive statistics.
    
    Performs full EDA including:
    - Basic statistics
    - Data quality scoring
    - Distribution analysis
    - Correlation analysis
    - Outlier detection
    - AI-generated insights
    
    Results are cached to avoid redundant computation.
    
    Returns:
        {
            "analysis": {
                "basic_info": {
                    "num_rows": 1000,
                    "num_columns": 10,
                    "numeric_columns": 7,
                    "categorical_columns": 3,
                    "column_names": [...],
                    "column_types": {...}
                },
                "data_quality": {
                    "quality_score": 85,
                    "issues": [...],
                    "duplicate_rows": 5,
                    "completeness": 98.5
                },
                "missing_values": {
                    "total_missing": 50,
                    "missing_percentage": 0.5,
                    "per_column": {"col1": 30, "col2": 20}
                },
                "descriptive_stats": {
                    "age": {"mean": 30, "std": 12, "min": 0, "max": 100, ...},
                    ...
                },
                "chart_data": {
                    "distributions": [...],      # Histogram data
                    "categorical_counts": [...],  # Bar chart data
                    "correlation_heatmap": {...}, # Heatmap matrix
                    "box_plots": [...],           # Box plot data
                    "scatter_matrix": [...],      # Scatter plot data
                    "missing_values_chart": {...} # Missing values viz
                },
                "recommendations": [...]
            },
            "ai_insights": {
                "insights": "Human-readable insights string",
                "timestamp": "2024-01-15T10:30:00"
            },
            "warnings": [...]
        }
    """
    state = get_current_dataset(session_id)
    df = state.get("df")

    if df is None:
        raise NotFoundError("No dataset loaded. Please upload a file first.")

    try:
        # =====================================================================
        # CHECK CACHE (avoid redundant computation)
        # =====================================================================
        cached = analysis_cache.get("analysis", df)
        if cached is not None:
            return cached

        rows, cols = df.shape

        # Accumulate non-fatal warnings to surface to the frontend
        warnings: List[str] = []

        # Identify column types
        numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
        categorical_cols = df.select_dtypes(include=['object', 'category']).columns.tolist()

        # =====================================================================
        # 1. BASIC INFO
        # =====================================================================
        basic_info = {
            "num_rows": rows,
            "num_columns": cols,
            "numeric_columns": len(numeric_cols),
            "categorical_columns": len(categorical_cols),
            "column_names": df.columns.tolist(),
            "column_types": {col: str(dtype) for col, dtype in df.dtypes.items()}
        }

        # =====================================================================
        # 2. MISSING VALUES ANALYSIS
        # =====================================================================
        missing_per_col = df.isnull().sum()
        total_missing = int(missing_per_col.sum())

        missing_values = {
            "total_missing": total_missing,
            "missing_percentage": round((total_missing / (rows * cols)) * 100, 2) if rows * cols > 0 else 0,
            "per_column": {col: int(count) for col, count in missing_per_col.items() if count > 0}
        }

        # =====================================================================
        # 3. DATA QUALITY SCORING
        # =====================================================================
        quality_score = 100
        issues = []

        # Penalize for missing values
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

        # Penalize for duplicates
        duplicate_count = int(df.duplicated().sum())
        if duplicate_count > 0:
            dup_pct = (duplicate_count / rows) * 100
            if dup_pct > 10:
                quality_score -= 20
                issues.append(f"High duplicates: {duplicate_count} duplicate rows ({dup_pct:.1f}%)")
            else:
                quality_score -= 10
                issues.append(f"{duplicate_count} duplicate rows found ({dup_pct:.1f}%)")

        # Penalize constant columns
        for col in df.columns:
            if df[col].nunique() == 1:
                quality_score -= 5
                issues.append(f"Column '{col}' has only one unique value")

        quality_score = max(0, quality_score)  # Don't go negative

        data_quality = {
            "quality_score": quality_score,
            "issues": issues,
            "duplicate_rows": duplicate_count,
            "completeness": round(100 - (total_missing / (rows * cols) * 100), 2) if rows * cols > 0 else 100
        }

        # =====================================================================
        # 3b. DESCRIPTIVE STATISTICS
        # =====================================================================
        descriptive_stats = {}
        if len(numeric_cols) > 0:
            try:
                desc = df[numeric_cols].describe().T
                skew = df[numeric_cols].skew()
                kurt = df[numeric_cols].kurtosis()

                for col in numeric_cols:
                    stats_dict = desc.loc[col].to_dict()
                    stats_dict['skew'] = round(skew.get(col, 0), 4)
                    stats_dict['kurtosis'] = round(kurt.get(col, 0), 4)

                    # Round floats for cleaner output
                    for k, v in stats_dict.items():
                        if isinstance(v, float):
                            stats_dict[k] = round(v, 4)
                    descriptive_stats[col] = stats_dict

            except Exception as e:
                logger.warning(f"Could not calculate descriptive stats: {e}")
                warnings.append(f"Descriptive statistics unavailable: {e}")

        # =====================================================================
        # 4. CHART DATA GENERATION
        # =====================================================================
        chart_data = {}

        # 4a. Distribution histograms (first 8 numeric columns)
        distributions = []
        for col in numeric_cols[:8]:
            try:
                col_data = df[col].dropna()
                if len(col_data) > 0:
                    hist_counts, bin_edges = np.histogram(col_data, bins=20)
                    distributions.append({
                        "column": col,
                        "bins": safe_list(bin_edges[:-1]),
                        "counts": [int(c) for c in hist_counts],
                        "mean": safe_float(col_data.mean()),
                        "median": safe_float(col_data.median())
                    })
            except Exception as e:
                logger.warning(f"Could not generate distribution for {col}: {e}")
        chart_data["distributions"] = distributions

        # 4b. Categorical value counts (first 8 categorical columns)
        categorical_counts = []
        for col in categorical_cols[:8]:
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

        # 4c. Correlation heatmap (first 10 numeric columns)
        if len(numeric_cols) >= 2:
            try:
                corr_cols = numeric_cols[:10]
                corr_matrix = df[corr_cols].corr()
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

        # 4e. Box plots with outliers (first 6 numeric columns)
        box_plots = []
        for col in numeric_cols[:6]:
            try:
                col_data = df[col].dropna()
                if len(col_data) > 0:
                    q1 = float(col_data.quantile(0.25))
                    q3 = float(col_data.quantile(0.75))
                    iqr = q3 - q1
                    lower_bound = q1 - 1.5 * iqr
                    upper_bound = q3 + 1.5 * iqr
                    outliers_data = col_data[(col_data < lower_bound) | (col_data > upper_bound)]

                    box_plots.append({
                        "column": col,
                        "min": safe_float(col_data.min()),
                        "q1": safe_float(q1),
                        "median": safe_float(col_data.median()),
                        "q3": safe_float(q3),
                        "max": safe_float(col_data.max()),
                        "outliers": safe_list(outliers_data.head(50).tolist())  # Limit outliers
                    })
            except Exception as e:
                logger.warning(f"Could not generate box plot for {col}: {e}")
        chart_data["box_plots"] = box_plots

        # 4f. Scatter plot matrix (top correlated pairs)
        scatter_matrix = []
        if len(numeric_cols) >= 2:
            try:
                corr_matrix_scatter = df[numeric_cols[:8]].corr()
                pairs_added = set()

                for i, col1 in enumerate(numeric_cols[:8]):
                    for j, col2 in enumerate(numeric_cols[:8]):
                        if i < j:
                            pair_key = tuple(sorted([col1, col2]))
                            if pair_key not in pairs_added:
                                corr_val = corr_matrix_scatter.loc[col1, col2]
                                if pd.notna(corr_val) and abs(corr_val) > 0.3:
                                    sample_df = df[[col1, col2]].dropna()
                                    # Sample for large datasets
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

                                    if len(scatter_matrix) >= 6:
                                        break
                    if len(scatter_matrix) >= 6:
                        break
            except Exception as e:
                logger.warning(f"Could not generate scatter matrix: {e}")
        chart_data["scatter_matrix"] = scatter_matrix

        # =====================================================================
        # 5. RECOMMENDATIONS
        # =====================================================================
        recommendations = []

        if total_missing > 0:
            recommendations.append("Consider handling missing values using imputation or removal")

        if duplicate_count > 0:
            recommendations.append("Review and remove duplicate rows if they are not intentional")

        if len(categorical_cols) > 0:
            recommendations.append("Encode categorical variables before training ML models")

        # High cardinality warning
        for col in categorical_cols:
            if df[col].nunique() > 50:
                recommendations.append(f"Column '{col}' has high cardinality ({df[col].nunique()} unique values) - consider binning")
                break

        # Potential classification target
        for col in numeric_cols:
            unique_ratio = df[col].nunique() / len(df)
            if unique_ratio < 0.05 and df[col].nunique() <= 10:
                recommendations.append(f"Column '{col}' appears suitable for classification (low cardinality)")
                break

        if len(recommendations) == 0:
            recommendations.append("Dataset looks well-prepared for analysis!")

        # =====================================================================
        # 6. AI INSIGHTS
        # =====================================================================
        insights = generate_insights(df, basic_info)

        # =====================================================================
        # COMPILE AND CACHE RESULT
        # =====================================================================
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
            },
            "warnings": warnings
        }

        logger.info("✓ Comprehensive analysis completed successfully")
        analysis_cache.set("analysis", result, df)
        return result

    except Exception as e:
        logger.error(f"Analysis failed: {str(e)}")
        raise DataProcessingError(f"Analysis failed: {str(e)}")


@router.get("/report")
def get_report(session_id: str = "default"):
    """
    Generate and download a comprehensive EDA PDF report.
    
    Creates a downloadable PDF containing:
    - Executive summary
    - Dataset statistics
    - Charts (Distribution, Heatmap, Boxplots)
    - AI-generated narrative analysis
    - Recommendations
    
    PDF is generated using reportlab and includes:
    - Professional formatting
    - Charts as images
    - Table data
    
    Returns:
        StreamingResponse with PDF content-type
        
    Headers:
        Content-Disposition: attachment; filename=eda_report.pdf
    """
    from app.utils.pdf_generator import generate_eda_pdf
    from app.core.groq_client import groq_client

    state = get_current_dataset(session_id)
    df = state.get("df")
    if df is None:
        raise NotFoundError("No dataset loaded")

    # 1. Prepare Data Summary for AI
    description = df.describe().to_dict()
    missing = df.isnull().sum().to_dict()

    # Calculate correlations for context
    numeric_df = df.select_dtypes(include=[np.number])
    correlations = {}
    if not numeric_df.empty:
        corr_matrix = numeric_df.corr().abs()
        pairs = (corr_matrix.where(np.triu(np.ones(corr_matrix.shape), k=1).astype(bool))
                 .stack()
                 .sort_values(ascending=False))
        if not pairs.empty:
            top_corr = pairs.head(5).to_dict()
            correlations = {f"{k[0]} vs {k[1]}": v for k, v in top_corr.items()}

    # 2. Generate AI Analysis (if Groq available)
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

    # 3. Prepare analysis results for PDF
    analysis_results = {
        'descriptive_stats': description,
        'data_quality': {
            'quality_score': 'N/A',
            'missing_values': missing
        },
        'ai_analysis': ai_analysis_text
    }

    # 4. Generate PDF
    pdf_buffer = generate_eda_pdf(df, analysis_results)

    # 5. Return as downloadable file
    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=eda_report.pdf"}
    )