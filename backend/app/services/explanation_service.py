import sys
sys.path.append('/home/claude/intelliml-platform/ml_engine')

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
            
            trainer = job['trainer']
            
            # Get best model server
            best_server = trainer.get_best_model_server()
            if not best_server or not best_server.trained_model:
                raise ValueError("No trained model found")
            
            # Get training data (simplified - should store this properly)
            df = self.ml_service.data_service.get_dataframe()
            target_column = job['target_column']
            
            # Prepare features
            X = df.drop(columns=[target_column]).values
            feature_names = [col for col in df.columns if col != target_column]
            
            # Generate SHAP explanations
            shap_results = self.explainer.explain_model(
                best_server.trained_model,
                X[:100],  # Use subset for speed
                feature_names
            )
            
            # Generate natural language explanation
            nl_explanation = self._generate_nl_explanation(
                job['results']['best_model'],
                shap_results['feature_importance']
            )
            
            return {
                'shap_results': shap_results,
                'explanation': nl_explanation,
                'model_name': job['results']['best_model']['model_name'],
            }
            
        except Exception as e:
            logger.error(f"Explanation error: {str(e)}")
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