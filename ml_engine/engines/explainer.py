import shap
import numpy as np
from typing import Dict, Any, Optional
import logging
import matplotlib
matplotlib.use('Agg')  # Non-interactive backend
import matplotlib.pyplot as plt
import base64
from io import BytesIO

logger = logging.getLogger(__name__)

class ModelExplainer:
    """
    SHAP-based model explanation engine
    Generates interpretable explanations for ML models
    """
    
    def __init__(self):
        self.explainer = None
        self.shap_values = None
    
    def explain_model(
        self, 
        model, 
        X: np.ndarray,
        feature_names: list,
        max_samples: int = 100
    ) -> Dict[str, Any]:
        """
        Generate SHAP explanations for model
        
        Args:
            model: Trained model with predict method
            X: Feature data
            feature_names: List of feature names
            max_samples: Max samples to use for explanation
            
        Returns:
            Dictionary with SHAP values and plots
        """
        try:
            logger.info("Generating SHAP explanations")
            
            # Use subset of data for speed
            if len(X) > max_samples:
                indices = np.random.choice(len(X), max_samples, replace=False)
                X_sample = X[indices]
            else:
                X_sample = X
            
            # Create SHAP explainer
            self.explainer = shap.Explainer(model.predict, X_sample)
            self.shap_values = self.explainer(X_sample)
            
            # Generate feature importance
            feature_importance = self._get_feature_importance(feature_names)
            
            # Generate plots
            plots = self._generate_plots(feature_names)
            
            return {
                'feature_importance': feature_importance,
                'plots': plots,
                'num_samples_explained': len(X_sample),
            }
            
        except Exception as e:
            logger.error(f"SHAP explanation error: {str(e)}")
            # Return basic feature importance if SHAP fails
            if hasattr(model, 'feature_importances_'):
                importance = model.feature_importances_
                return {
                    'feature_importance': [
                        {'feature': name, 'importance': float(imp)}
                        for name, imp in zip(feature_names, importance)
                    ],
                    'plots': {},
                    'shap_failed': True,
                }
            raise
    
    def _get_feature_importance(self, feature_names: list) -> list:
        """Extract feature importance from SHAP values"""
        # Mean absolute SHAP value per feature
        importance = np.abs(self.shap_values.values).mean(axis=0)
        
        # Sort by importance
        feature_importance = [
            {'feature': name, 'importance': float(imp)}
            for name, imp in zip(feature_names, importance)
        ]
        feature_importance.sort(key=lambda x: x['importance'], reverse=True)
        
        return feature_importance
    
    def _generate_plots(self, feature_names: list) -> Dict[str, str]:
        """Generate SHAP plots as base64 encoded images"""
        plots = {}
        
        try:
            # Summary plot
            plt.figure(figsize=(10, 6))
            shap.summary_plot(
                self.shap_values.values, 
                feature_names=feature_names,
                show=False
            )
            plots['summary'] = self._plot_to_base64()
            plt.close()
            
            # Bar plot
            plt.figure(figsize=(10, 6))
            shap.summary_plot(
                self.shap_values.values,
                feature_names=feature_names,
                plot_type='bar',
                show=False
            )
            plots['bar'] = self._plot_to_base64()
            plt.close()
            
        except Exception as e:
            logger.error(f"Plot generation error: {str(e)}")
        
        return plots
    
    def _plot_to_base64(self) -> str:
        """Convert matplotlib plot to base64 string"""
        buffer = BytesIO()
        plt.savefig(buffer, format='png', bbox_inches='tight', dpi=100)
        buffer.seek(0)
        image_base64 = base64.b64encode(buffer.read()).decode()
        buffer.close()
        return f"data:image/png;base64,{image_base64}"