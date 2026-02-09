from app.services.ml_service import MLService
from ml_engine.engines.explainer import ModelExplainer
from app.core.groq_client import groq_client
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
        try:
            # Get job results
            job = self.ml_service.jobs.get(job_id)
            if not job:
                raise ValueError(f"Job {job_id} not found")
            
            trainer = job.get('trainer')
            if not trainer:
                raise ValueError("No trainer found for this job")
            
            # Get best model server
            best_server = trainer.get_best_model_server()
            if not best_server or not best_server.trained_model:
                raise ValueError("No trained model found")
            
            # Get the feature names from trainer
            feature_names = trainer.feature_names
            
            # Get training data and preprocess the same way trainer did
            df = self.ml_service.data_service.get_dataframe()
            target_column = job['target_column']
            
            # Prepare features (replicating trainer's preprocessing)
            X = df.drop(columns=[target_column]).copy()
            
            # Encode categorical features same way as training
            from sklearn.preprocessing import LabelEncoder
            for col in X.select_dtypes(include=['object']).columns:
                le = LabelEncoder()
                X[col] = le.fit_transform(X[col].astype(str))
            
            # Fill missing values
            X = X.fillna(X.mean())
            
            # Convert to numpy and scale
            X_np = X.values
            X_scaled = trainer.scaler.transform(X_np)
            
            # Use subset for SHAP (faster)
            sample_size = min(100, len(X_scaled))
            X_sample = X_scaled[:sample_size]
            
            # Generate SHAP explanations
            shap_results = self.explainer.explain_model(
                best_server.trained_model,
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
                job['results']['best_model'],
                safe_results['feature_importance']
            )
            
            return {
                'shap_results': safe_results,
                'explanation': nl_explanation,
                'model_name': job['results']['best_model']['model_name'],
                'status': 'success'
            }
            
        except Exception as e:
            logger.error(f"Explanation error: {str(e)}", exc_info=True)
            # Return fallback with feature importance from model
            try:
                job = self.ml_service.jobs.get(job_id)
                if job and job.get('trainer'):
                    trainer = job['trainer']
                    best_server = trainer.get_best_model_server()
                    if best_server and hasattr(best_server.trained_model, 'feature_importances_'):
                        importance = best_server.trained_model.feature_importances_
                        feature_names = trainer.feature_names
                        feature_importance = [
                            {'feature': name, 'importance': float(imp)}
                            for name, imp in zip(feature_names, importance)
                        ]
                        feature_importance.sort(key=lambda x: x['importance'], reverse=True)
                        return {
                            'shap_results': {
                                'feature_importance': feature_importance,
                                'plots': {},
                                'fallback': True
                            },
                            'explanation': f"SHAP analysis failed, showing model's built-in feature importance. Error: {str(e)}",
                            'model_name': job['results']['best_model']['model_name'],
                            'status': 'fallback'
                        }
            except:
                pass
            raise
    
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