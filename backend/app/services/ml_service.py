from app.services.data_service import DataService
from app.core.groq_client import groq_client
from app.ml.engines.model_trainer import ModelTrainer
from app.core.exceptions import MLTrainingError, ValidationError, NotFoundError
from typing import Dict, Any, Optional, List
import logging
import uuid
import json
import datetime
import os

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
    
    def _log_experiment(self, job_data: Dict[str, Any]):
        """Log experiment to JSON file"""
        try:
            experiment_entry = {
                "job_id": job_data['job_id'],
                "timestamp": datetime.datetime.now().isoformat(),
                "username": job_data.get("username"),
                "target_column": job_data['target_column'],
                "problem_type": job_data['results']['problem_type'],
                "best_model": job_data['results']['best_model']['model_name'],
                "score": job_data['results']['best_model']['test_score'],
                "metric": job_data['results']['best_model'].get('metric_name', job_data['results']['problem_type']),
                "models_trained": len(job_data['results']['results'])
            }
            
            experiments = []
            if os.path.exists("experiments.json"):
                try:
                    with open("experiments.json", "r") as f:
                        experiments = json.load(f)
                except (json.JSONDecodeError, IOError) as e:
                    logger.warning(f"Could not load experiments.json: {e}")
            
            experiments.append(experiment_entry)
            
            with open("experiments.json", "w") as f:
                json.dump(experiments, f, indent=2)
                
        except Exception as e:
            logger.error(f"Failed to log experiment: {e}")

    def train_models(
        self, 
        target_column: str,
        model_types: Optional[List[str]] = None,
        test_size: float = 0.2,
        cv_folds: int = 5,
        enable_tuning: bool = False,
        session_id: str = "default",
        username: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Start model training job
        """
        try:
            logger.info(f"Starting model training for target: {target_column}, test_size: {test_size}, cv_folds: {cv_folds}, enable_tuning: {enable_tuning}")
            
            # Get dataset
            df = self.data_service.get_dataframe(session_id=session_id)
            logger.info(f"Got dataset with shape: {df.shape}")
            logger.info(f"Columns: {df.columns.tolist()}")
            
            # Validate target column
            if target_column not in df.columns:
                available_cols = df.columns.tolist()
                raise ValidationError(
                    f"Column '{target_column}' not found in dataset",
                    details={"available_columns": available_cols}
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
            
            # Make results JSON-safe (convert numpy arrays to lists, handle NaN, strip non-serializable objects)
            def make_json_safe(obj, depth=0):
                if depth > 10:  # Prevent infinite recursion
                    return None
                if obj is None:
                    return None
                if isinstance(obj, dict):
                    return {k: make_json_safe(v, depth+1) for k, v in obj.items() if k != 'model'}
                elif isinstance(obj, list):
                    return [make_json_safe(item, depth+1) for item in obj]
                elif hasattr(obj, 'tolist'):  # numpy array/matrix
                    return obj.tolist()
                elif isinstance(obj, (float, int, str, bool)):
                    return obj
                elif hasattr(obj, '__dict__'):  # sklearn models or other objects - skip
                    return None
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
                'session_id': session_id,
                'username': username,
                'results': clean_results,
                'suggestions': suggestions,
                'explanation': explanation,
                'trainer': trainer,  # Store trainer for later use (not returned in response)
            }
            
            self.jobs[job_id] = job_result
            self._log_experiment(job_result) # Log to history
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
            raise MLTrainingError(
                f"Training failed: {str(e)}",
                details={"target_column": target_column}
            )
    
    def get_job_status(self, job_id: str) -> Dict[str, Any]:
        """Get training job status"""
        if job_id not in self.jobs:
            raise NotFoundError(f"Job {job_id} not found")
        
        job = self.jobs[job_id]
        return {
            'job_id': job_id,
            'status': job['status'],
            'target_column': job['target_column'],
        }
    
    def get_job_results(self, job_id: str) -> Dict[str, Any]:
        """Get complete job results"""
        if job_id not in self.jobs:
            raise NotFoundError(f"Job {job_id} not found")

        job = self.jobs[job_id]

        # Create clean response with only serializable data
        response = {}
        for k, v in job.items():
            if k == 'trainer':
                continue  # Skip non-serializable trainer
            if hasattr(v, '__dict__') and not hasattr(v, '__slots__'):
                # Skip objects with __dict__ (likely non-serializable)
                continue
            try:
                # Test if serializable
                import json
                json.dumps(v)
                response[k] = v
            except (TypeError, ValueError):
                # Skip non-serializable values
                continue

        return response
    
    def _generate_model_explanation(self, results: Dict[str, Any]) -> str:
        """Generate natural language explanation of results"""
        try:
            best_model = results['best_model']
            
            prompt = f"""You are explaining ML model results to a non-technical user.

Training Results:
- Best Model: {best_model['model_name']}
- Score: {best_model['test_score']:.3f} ({best_model.get('metric_name', results.get('problem_type', 'accuracy'))})
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

ml_service = MLService()
