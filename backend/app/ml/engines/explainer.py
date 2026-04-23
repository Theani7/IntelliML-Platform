import shap
import numpy as np
from typing import Dict, Any, Optional
import logging
import matplotlib
matplotlib.use('Agg')
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
        try:
            logger.info("Generating SHAP explanations")
            
            if len(X) > max_samples:
                indices = np.random.choice(len(X), max_samples, replace=False)
                X_sample = X[indices]
            else:
                X_sample = X
            
            self.explainer = shap.Explainer(model.predict, X_sample)
            self.shap_values = self.explainer(X_sample)
            
            feature_importance = self._get_feature_importance(feature_names)
            plots = self._generate_plots(feature_names)
            
            return {
                'feature_importance': feature_importance,
                'plots': plots,
                'num_samples_explained': len(X_sample),
            }
            
        except Exception as e:
            logger.error(f"SHAP explanation error: {str(e)}")
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
        importance = np.abs(self.shap_values.values).mean(axis=0)
        
        feature_importance = [
            {'feature': name, 'importance': float(imp)}
            for name, imp in zip(feature_names, importance)
        ]
        feature_importance.sort(key=lambda x: x['importance'], reverse=True)
        
        return feature_importance
    
    def _generate_plots(self, feature_names: list) -> Dict[str, str]:
        plots = {}
        
        try:
            plt.figure(figsize=(10, 6))
            shap.summary_plot(
                self.shap_values.values, 
                feature_names=feature_names,
                show=False
            )
            plots['summary'] = self._plot_to_base64()
            plt.close()
            
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
        buffer = BytesIO()
        plt.savefig(buffer, format='png', bbox_inches='tight', dpi=100)
        buffer.seek(0)
        image_base64 = base64.b64encode(buffer.read()).decode()
        buffer.close()
        return f"data:image/png;base64,{image_base64}"