import pandas as pd
import numpy as np
from typing import Dict, Any, List
import logging

logger = logging.getLogger(__name__)

class DataAnalyzer:
    """
    Automated data analysis engine with visualization data
    """
    
    def analyze(self, df: pd.DataFrame) -> Dict[str, Any]:
        """
        Perform complete data analysis with chart data
        """
        logger.info(f"Analyzing dataset: {df.shape}")
        
        analysis = {
            "basic_info": self._get_basic_info(df),
            "numeric_stats": self._get_numeric_stats(df),
            "categorical_stats": self._get_categorical_stats(df),
            "missing_values": self._analyze_missing_values(df),
            "data_quality": self._assess_data_quality(df),
            "correlations": self._get_correlations(df),
            "recommendations": self._generate_recommendations(df),
            "chart_data": self._generate_chart_data(df),  # NEW
        }
        
        return analysis
    
    def _get_basic_info(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Get basic dataset information"""
        return {
            "num_rows": int(len(df)),
            "num_columns": int(len(df.columns)),
            "memory_usage_mb": float(df.memory_usage(deep=True).sum() / 1024**2),
            "duplicate_rows": int(df.duplicated().sum()),
            "numeric_columns": int(len(df.select_dtypes(include=[np.number]).columns)),
            "categorical_columns": int(len(df.select_dtypes(include=['object']).columns)),
        }
    
    def _get_numeric_stats(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Get statistics for numeric columns"""
        numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
        
        if not numeric_cols:
            return {}
        
        stats = {}
        for col in numeric_cols:
            col_data = df[col].dropna()
            stats[col] = {
                "mean": float(col_data.mean()),
                "median": float(col_data.median()),
                "std": float(col_data.std()),
                "min": float(col_data.min()),
                "max": float(col_data.max()),
                "q25": float(col_data.quantile(0.25)),
                "q75": float(col_data.quantile(0.75)),
                "skewness": float(col_data.skew()),
                "kurtosis": float(col_data.kurtosis()),
                "unique_values": int(col_data.nunique()),
                "zeros_count": int((col_data == 0).sum()),
            }
        
        return stats
    
    def _get_categorical_stats(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Get statistics for categorical columns"""
        categorical_cols = df.select_dtypes(include=['object', 'category']).columns.tolist()
        
        if not categorical_cols:
            return {}
        
        stats = {}
        for col in categorical_cols:
            value_counts = df[col].value_counts()
            stats[col] = {
                "unique_values": int(df[col].nunique()),
                "most_common": str(value_counts.index[0]) if len(value_counts) > 0 else None,
                "most_common_count": int(value_counts.iloc[0]) if len(value_counts) > 0 else 0,
                "top_10_values": {str(k): int(v) for k, v in value_counts.head(10).items()},
            }
        
        return stats
    
    def _analyze_missing_values(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Analyze missing values"""
        missing = df.isnull().sum()
        missing_pct = (missing / len(df) * 100).round(2)
        
        return {
            "total_missing": int(missing.sum()),
            "columns_with_missing": {str(k): int(v) for k, v in missing[missing > 0].items()},
            "missing_percentage": {str(k): float(v) for k, v in missing_pct[missing_pct > 0].items()},
        }
    
    def _assess_data_quality(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Assess overall data quality"""
        issues = []
        
        # Check for high missing values
        missing_pct = (df.isnull().sum() / len(df) * 100)
        high_missing = missing_pct[missing_pct > 50].to_dict()
        if high_missing:
            issues.append(f"High missing values in: {list(high_missing.keys())}")
        
        # Check for duplicate rows
        if df.duplicated().sum() > 0:
            issues.append(f"{df.duplicated().sum()} duplicate rows found")
        
        # Check for constant columns
        constant_cols = [col for col in df.columns if df[col].nunique() == 1]
        if constant_cols:
            issues.append(f"Constant columns: {constant_cols}")
        
        # Check for high cardinality
        for col in df.select_dtypes(include=['object']).columns:
            if df[col].nunique() > 0.9 * len(df):
                issues.append(f"High cardinality in {col}")
        
        return {
            "quality_score": max(0, 100 - len(issues) * 10),
            "issues": issues,
        }
    
    def _get_correlations(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Calculate correlations for numeric columns"""
        numeric_df = df.select_dtypes(include=[np.number])
        
        if numeric_df.shape[1] < 2:
            return {}
        
        corr_matrix = numeric_df.corr()
        
        # Find strong correlations (> 0.7 or < -0.7)
        strong_corr = []
        for i in range(len(corr_matrix.columns)):
            for j in range(i + 1, len(corr_matrix.columns)):
                corr_value = corr_matrix.iloc[i, j]
                if abs(corr_value) > 0.7:
                    strong_corr.append({
                        "col1": str(corr_matrix.columns[i]),
                        "col2": str(corr_matrix.columns[j]),
                        "correlation": float(corr_value),
                    })
        
        return {
            "correlation_matrix": {str(k): {str(k2): float(v2) for k2, v2 in v.items()} 
                                  for k, v in corr_matrix.to_dict().items()},
            "strong_correlations": strong_corr,
        }
    
    def _generate_recommendations(self, df: pd.DataFrame) -> List[str]:
        """Generate actionable recommendations"""
        recommendations = []
        
        # Missing value recommendations
        missing_pct = (df.isnull().sum() / len(df) * 100)
        if missing_pct.max() > 5:
            recommendations.append("Consider handling missing values before training models")
        
        # Duplicate recommendations
        if df.duplicated().sum() > 0:
            recommendations.append("Remove duplicate rows to improve data quality")
        
        # Scaling recommendation
        numeric_cols = df.select_dtypes(include=[np.number]).columns
        if len(numeric_cols) > 0:
            ranges = df[numeric_cols].max() - df[numeric_cols].min()
            if ranges.max() > 100 * ranges.min():
                recommendations.append("Consider feature scaling due to different value ranges")
        
        # Encoding recommendation
        categorical_cols = df.select_dtypes(include=['object']).columns
        if len(categorical_cols) > 0:
            recommendations.append("Categorical variables will need encoding for ML models")
        
        return recommendations
    
    def _generate_chart_data(self, df: pd.DataFrame) -> Dict[str, Any]:
        """
        Generate data for various chart types
        """
        chart_data = {
            "distributions": self._get_distribution_data(df),
            "categorical_counts": self._get_categorical_count_data(df),
            "correlation_heatmap": self._get_correlation_heatmap_data(df),
            "missing_values_chart": self._get_missing_values_chart_data(df),
            "box_plots": self._get_box_plot_data(df),
            "scatter_matrix": self._get_scatter_matrix_data(df),
            "time_series": self._get_time_series_data(df),
        }
        
        return chart_data
    
    def _get_distribution_data(self, df: pd.DataFrame) -> List[Dict]:
        """Generate histogram data for numeric columns"""
        numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()[:6]  # Limit to 6
        distributions = []
        
        for col in numeric_cols:
            col_data = df[col].dropna()
            hist, bin_edges = np.histogram(col_data, bins=20)
            
            distributions.append({
                "column": str(col),
                "bins": [float(x) for x in bin_edges[:-1]],
                "counts": [int(x) for x in hist],
                "mean": float(col_data.mean()),
                "median": float(col_data.median()),
            })
        
        return distributions
    
    def _get_categorical_count_data(self, df: pd.DataFrame) -> List[Dict]:
        """Generate bar chart data for categorical columns"""
        categorical_cols = df.select_dtypes(include=['object', 'category']).columns.tolist()[:6]
        categorical_data = []
        
        for col in categorical_cols:
            value_counts = df[col].value_counts().head(10)
            
            categorical_data.append({
                "column": str(col),
                "categories": [str(x) for x in value_counts.index.tolist()],
                "counts": [int(x) for x in value_counts.values.tolist()],
            })
        
        return categorical_data
    
    def _get_correlation_heatmap_data(self, df: pd.DataFrame) -> Dict:
        """Generate correlation heatmap data"""
        numeric_df = df.select_dtypes(include=[np.number])
        
        if numeric_df.shape[1] < 2:
            return {}
        
        corr_matrix = numeric_df.corr()
        
        return {
            "columns": [str(x) for x in corr_matrix.columns.tolist()],
            "values": [[float(v) for v in row] for row in corr_matrix.values.tolist()],
        }
    
    def _get_missing_values_chart_data(self, df: pd.DataFrame) -> Dict:
        """Generate missing values chart data"""
        missing = df.isnull().sum()
        missing = missing[missing > 0].sort_values(ascending=False)
        
        if len(missing) == 0:
            return {}
        
        return {
            "columns": [str(x) for x in missing.index.tolist()],
            "counts": [int(x) for x in missing.values.tolist()],
            "percentages": [float(x / len(df) * 100) for x in missing.values.tolist()],
        }
    
    def _get_box_plot_data(self, df: pd.DataFrame) -> List[Dict]:
        """Generate box plot data for numeric columns"""
        numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()[:6]
        box_plots = []
        
        for col in numeric_cols:
            col_data = df[col].dropna()
            
            box_plots.append({
                "column": str(col),
                "min": float(col_data.min()),
                "q1": float(col_data.quantile(0.25)),
                "median": float(col_data.median()),
                "q3": float(col_data.quantile(0.75)),
                "max": float(col_data.max()),
                "outliers": [float(x) for x in col_data[
                    (col_data < col_data.quantile(0.25) - 1.5 * (col_data.quantile(0.75) - col_data.quantile(0.25))) |
                    (col_data > col_data.quantile(0.75) + 1.5 * (col_data.quantile(0.75) - col_data.quantile(0.25)))
                ].values[:50]],  # Limit outliers
            })
        
        return box_plots
    
    def _get_scatter_matrix_data(self, df: pd.DataFrame) -> List[Dict]:
        """Generate scatter plot data for pairs of numeric columns"""
        numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()[:4]  # Limit to 4 columns
        
        if len(numeric_cols) < 2:
            return []
        
        scatter_data = []
        for i in range(len(numeric_cols)):
            for j in range(i + 1, len(numeric_cols)):
                col1, col2 = numeric_cols[i], numeric_cols[j]
                
                # Sample data if too large
                sample_df = df[[col1, col2]].dropna()
                if len(sample_df) > 500:
                    sample_df = sample_df.sample(500)
                
                scatter_data.append({
                    "x_column": str(col1),
                    "y_column": str(col2),
                    "x_values": [float(x) for x in sample_df[col1].values.tolist()],
                    "y_values": [float(x) for x in sample_df[col2].values.tolist()],
                    "correlation": float(df[col1].corr(df[col2])),
                })
        
        return scatter_data
    
    def _get_time_series_data(self, df: pd.DataFrame) -> List[Dict]:
        """Detect and generate time series data if datetime columns exist"""
        time_series = []
        
        # Try to find datetime columns
        datetime_cols = df.select_dtypes(include=['datetime64']).columns.tolist()
        
        # Also check for columns that might be dates
        for col in df.columns:
            if df[col].dtype == 'object':
                try:
                    pd.to_datetime(df[col].head(100))
                    datetime_cols.append(col)
                except:
                    pass
        
        if not datetime_cols:
            return []
        
        # Get numeric columns for time series
        numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()[:3]
        
        for date_col in datetime_cols[:1]:  # Use first datetime column
            for num_col in numeric_cols:
                try:
                    temp_df = df[[date_col, num_col]].copy()
                    temp_df[date_col] = pd.to_datetime(temp_df[date_col])
                    temp_df = temp_df.sort_values(date_col)
                    temp_df = temp_df.dropna()
                    
                    # Sample if too large
                    if len(temp_df) > 1000:
                        temp_df = temp_df.iloc[::len(temp_df)//1000]
                    
                    time_series.append({
                        "date_column": str(date_col),
                        "value_column": str(num_col),
                        "dates": [str(x) for x in temp_df[date_col].dt.strftime('%Y-%m-%d').tolist()],
                        "values": [float(x) for x in temp_df[num_col].values.tolist()],
                    })
                except:
                    pass
        
        return time_series