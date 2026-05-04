from app.services.ml_service import MLService
from app.ml.engines.explainer import ModelExplainer
from app.core.groq_client import groq_client
from app.core.exceptions import NotFoundError
import logging

logger = logging.getLogger(__name__)

class ExplanationService:
    """
    Service for generating model explanations
    Combines SHAP with natural language explanations
    """
    
    def __init__(self):
        self.ml_service = MLService()
        self.explainer = ModelExplainer()
        self.groq = groq_client
    
    def explain_model(self, job_id: str) -> dict:
        """
        Generate explanations for trained model
        
        Args:
            job_id: Training job ID
            
        Returns:
            SHAP explanations + natural language
        """
        model = None
        feature_names = []
        model_name = "unknown"
        X_sample = None
        best_model_info = None

        try:
            # 1. Try Memory First
            job = self.ml_service.jobs.get(job_id)
            if job and job.get('trainer'):
                trainer = job['trainer']
                best_server = trainer.get_best_model_server()
                if best_server and best_server.trained_model:
                    model = best_server.trained_model
                    feature_names = getattr(trainer, 'feature_names', [])
                    best_model_info = job['results']['best_model']
                    model_name = best_model_info['model_name']
                    # Try to get X_sample from memory
                    x_train = getattr(trainer, 'X_train', None)
                    if x_train is not None and hasattr(x_train, 'shape') and x_train.shape[0] > 0:
                        X_sample = x_train[:min(100, x_train.shape[0])]
            
            # 2. Try Disk if memory was incomplete
            if model is None or X_sample is None:
                from app.core.model_store import model_store
                disk_model = model_store.load_model(job_id, "best_model")
                metadata = model_store.load_metadata(job_id, "best_model")
                disk_x_sample = model_store.load_background_data(job_id)

                if disk_model and metadata:
                    model = disk_model
                    feature_names = metadata.get("feature_names", [])
                    model_name = metadata.get("model_name", "unknown")
                    best_model_info = {"model_name": model_name, "test_score": metadata.get("score", 0), "metric_name": metadata.get("model_type", "metric")}
                    
                if disk_x_sample is not None:
                    X_sample = disk_x_sample

            if model is None:
                raise NotFoundError("Model could not be recovered from memory or disk.")
            if X_sample is None:
                raise NotFoundError("Background data could not be recovered from memory or disk.")

            # Generate SHAP explanations
            shap_results = self.explainer.explain_model(
                model,
                X_sample,
                feature_names
            )
            
            # Make results JSON-safe
            def make_safe(obj):
                if isinstance(obj, dict):
                    return {k: make_safe(v) for k, v in obj.items()}
                elif isinstance(obj, list):
                    return [make_safe(item) for item in obj]
                elif hasattr(obj, 'tolist'):
                    return obj.tolist()
                elif isinstance(obj, float):
                    if obj != obj or obj == float('inf') or obj == float('-inf'):
                        return None
                return obj
            
            safe_results = make_safe(shap_results)
            
            # Generate natural language explanation
            nl_explanation = self._generate_nl_explanation(
                best_model_info,
                safe_results['feature_importance']
            )
            
            return {
                'shap_results': safe_results,
                'explanation': nl_explanation,
                'model_name': model_name,
                'status': 'success'
            }
            
        except Exception as e:
            logger.error(f"Explanation error: {str(e)}", exc_info=True)
            # Full Fallback: if everything else failed, generate a static feature importance summary
            try:
                if model:
                    feature_importance = []
                    # Tree-based
                    if hasattr(model, 'feature_importances_'):
                        imps = model.feature_importances_
                        if feature_names:
                            feature_importance = [{'feature': name, 'importance': float(imp)} for name, imp in zip(feature_names, imps)]
                    # Linear models
                    elif hasattr(model, 'coef_'):
                        import numpy as np
                        coefs = np.abs(model.coef_[0]) if len(model.coef_.shape) > 1 else np.abs(model.coef_)
                        if feature_names:
                            feature_importance = [{'feature': name, 'importance': float(imp)} for name, imp in zip(feature_names, coefs)]
                            
                    if not feature_importance and feature_names:
                        importance_val = 1.0 / len(feature_names) if len(feature_names) > 0 else 1.0
                        feature_importance = [{'feature': name, 'importance': importance_val} for name in feature_names]
                            
                    if feature_importance:
                        feature_importance.sort(key=lambda x: x['importance'], reverse=True)
                        return {
                            'shap_results': {
                                'feature_importance': feature_importance,
                                'plots': {},
                                'fallback': True
                            },
                            'explanation': f"SHAP analysis encountered an error or lacked background data. Here's the model's standardized structural Feature Importance instead: {model_name}.",
                            'model_name': model_name,
                            'status': 'fallback'
                        }
            except Exception as inner_e:
                logger.error(f"Explanation fallback also failed: {inner_e}")
                
            raise e
    
    def _generate_nl_explanation(self, best_model: dict, feature_importance: list) -> str:
        """Generate natural language explanation"""
        top_features = feature_importance[:5]
        
        prompt = f"""Explain this ML model in simple terms:

Model: {best_model['model_name']}
Score: {best_model['test_score']:.3f}

Top 5 Most Important Features:
{chr(10).join([f"{i+1}. {f['feature']}: {f['importance']:.4f}" for i, f in enumerate(top_features)])}

Provide a brief explanation (3-4 sentences):
1. What makes this model work well
2. Which features matter most and why
3. How reliable the predictions are

Be clear and non-technical."""

        messages = [{"role": "user", "content": prompt}]
        return self.groq.chat_completion(messages, temperature=0.7)