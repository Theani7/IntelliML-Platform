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
        model_types: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        Start model training job
        """
        try:
            logger.info(f"Starting model training for target: {target_column}")
            
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
            results = trainer.train_all(df, target_column, model_types)
            logger.info(f"Training complete. Trained {len(results['results'])} models")
            
            # Generate AI explanation
            explanation = self._generate_model_explanation(results)
            
            # Store job results
            job_result = {
                'job_id': job_id,
                'status': 'completed',
                'target_column': target_column,
                'results': results,
                'explanation': explanation,
                'trainer': trainer,  # Store trainer for later use
            }
            
            self.jobs[job_id] = job_result
            logger.info(f"Job {job_id} completed and stored")
            
            return job_result
            
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