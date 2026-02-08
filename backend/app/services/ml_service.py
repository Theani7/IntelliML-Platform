import sys
sys.path.append('/home/claude/intelliml-platform/ml_engine')

from app.services.data_service import DataService
from app.core.groq_client import groq_client
from ml_engine.engines.model_trainer import ModelTrainer
from typing import Dict, Any, Optional, List
import logging
import uuid
import json

logger = logging.getLogger(__name__)

class MLService:
    """
    Service for ML training orchestration
    Manages model training jobs and results
    """
    
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(MLService, cls).__new__(cls)
        return cls._instance
    
    def __init__(self):
        if not hasattr(self, '_initialized'):
            self.data_service = DataService()
            self.groq = groq_client
            self.jobs = {}  # Store training jobs
            self._initialized = True
    
    def train_models(
        self, 
        target_column: str,
        model_types: Optional[List[str]] = None,
        test_size: float = 0.2,
        cv_folds: int = 5,
        enable_tuning: bool = False
    ) -> Dict[str, Any]:
        """
        Start model training job
        """
        try:
            logger.info(f"Starting model training for target: {target_column}, test_size: {test_size}, cv_folds: {cv_folds}, enable_tuning: {enable_tuning}")
            
            # Get dataset
            df = self.data_service.get_dataframe()
            logger.info(f"Got dataset with shape: {df.shape}")
            logger.info(f"Columns: {df.columns.tolist()}")
            
            # Validate target column
            if target_column not in df.columns:
                available_cols = df.columns.tolist()
                raise ValueError(
                    f"Column '{target_column}' not found in dataset. "
                    f"Available columns: {available_cols}"
                )
            
            # Create job ID
            job_id = str(uuid.uuid4())
            logger.info(f"Created job ID: {job_id}")
            
            # Create trainer and train
            trainer = ModelTrainer()
            logger.info("Training models...")
            results = trainer.train_all(
                df, target_column, model_types, 
                test_size=test_size, 
                cv_folds=cv_folds, 
                enable_tuning=enable_tuning
            )
            logger.info(f"Training complete. Trained {len(results['results'])} models")
            
            # Generate AI explanation
            explanation = self._generate_model_explanation(results)
            
            # Make results JSON-safe (convert numpy arrays to lists, handle NaN)
            def make_json_safe(obj):
                if isinstance(obj, dict):
                    return {k: make_json_safe(v) for k, v in obj.items()}
                elif isinstance(obj, list):
                    return [make_json_safe(item) for item in obj]
                elif hasattr(obj, 'tolist'):  # numpy array
                    return obj.tolist()
                elif isinstance(obj, float):
                    if obj != obj or obj == float('inf') or obj == float('-inf'):
                        return None
                    return obj
                return obj
            
            # Generate Suggestions
            suggestions = []
            if results['results']:
                best = results['results'][0] # Already sorted by test_score
                
                # Performance-based suggestions
                if results['problem_type'] == 'classification':
                    if best['test_score'] < 0.7:
                         suggestions.append("Model accuracy is low (< 70%). Consider collecting more data or engineering new features.")
                    if best.get('metrics', {}).get('precision', 1) < 0.6:
                         suggestions.append("Precision is low. The model has a high false-positive rate.")
                    if best.get('metrics', {}).get('recall', 1) < 0.6:
                         suggestions.append("Recall is low. The model is missing many positive instances.")
                else:
                    if best['test_score'] < 0.5:
                         suggestions.append("R² score is low (< 0.5). The model explains less than 50% of the variance.")

            # General suggestions
            suggestions.append("Try removing noisy features to improve generalization.")
            suggestions.append("Collect more diverse training samples if possible.")
            
            clean_results = make_json_safe(results)
            
            # Store job results (including trainer for later use)
            job_result = {
                'job_id': job_id,
                'status': 'completed',
                'target_column': target_column,
                'results': clean_results,
                'suggestions': suggestions,
                'explanation': explanation,
                'trainer': trainer,  # Store trainer for later use (not returned in response)
            }
            
            self.jobs[job_id] = job_result
            logger.info(f"Job {job_id} completed and stored")
            
            # Return JSON-safe response (without trainer)
            return {
                'job_id': job_id,
                'status': 'completed',
                'target_column': target_column,
                'results': clean_results,
                'suggestions': suggestions,
                'explanation': explanation,
            }
            
        except Exception as e:
            logger.error(f"Model training error: {str(e)}", exc_info=True)
            raise
    
    def get_job_status(self, job_id: str) -> Dict[str, Any]:
        """Get training job status"""
        if job_id not in self.jobs:
            raise ValueError(f"Job {job_id} not found")
        
        job = self.jobs[job_id]
        return {
            'job_id': job_id,
            'status': job['status'],
            'target_column': job['target_column'],
        }
    
    def get_job_results(self, job_id: str) -> Dict[str, Any]:
        """Get complete job results"""
        if job_id not in self.jobs:
            raise ValueError(f"Job {job_id} not found")
        
        job = self.jobs[job_id]
        
        # Remove trainer from response (not JSON serializable)
        response = {k: v for k, v in job.items() if k != 'trainer'}
        
        return response
    
    def _generate_model_explanation(self, results: Dict[str, Any]) -> str:
        """Generate natural language explanation of results"""
        try:
            best_model = results['best_model']
            
            prompt = f"""You are explaining ML model results to a non-technical user.

Training Results:
- Best Model: {best_model['model_name']}
- Score: {best_model['test_score']:.3f} ({best_model['metric_name']})
- Problem Type: {results['problem_type']}
- Features: {results['num_features']}
- Samples: {results['num_samples']}

All Models Tested:
{json.dumps([{'name': r['model_name'], 'score': r['test_score']} for r in results['results']], indent=2)}

Provide a brief explanation (3-4 sentences) covering:
1. Which model performed best and why
2. What the score means in practical terms
3. Whether the results are good or if improvements are needed

Be encouraging and helpful."""

            messages = [{"role": "user", "content": prompt}]
            explanation = self.groq.chat_completion(messages, temperature=0.7)
            
            return explanation if explanation else "Model training completed successfully."
            
        except Exception as e:
            logger.error(f"Explanation generation error: {str(e)}")
            return "Model training completed. Unable to generate explanation at this time."