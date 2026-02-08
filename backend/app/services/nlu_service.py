"""
Natural Language Understanding Service
Handles intent parsing and execution for AutoML voice commands
"""

from app.core.groq_client import groq_client
import logging
import json
import re
from typing import Dict, Any, Optional, List

logger = logging.getLogger(__name__)


class NLUService:
    """
    Natural Language Understanding Service
    Parses user intent from transcribed text and executes appropriate actions
    """
    
    # Define supported intents
    SUPPORTED_INTENTS = [
        "ANALYZE_DATA",
        "TRAIN_MODEL",
        "EXPLAIN_MODEL",
        "UPLOAD_DATA",
        "PREDICT",
        "HELP",
        "VIEW_RESULTS",
        "COMPARE_MODELS",
        "UNKNOWN"
    ]
    
    # Intent keywords for fallback parsing
    INTENT_KEYWORDS = {
        "ANALYZE_DATA": ["analyze", "analysis", "explore", "show", "display", "visualize", "statistics", "stats", "summary"],
        "TRAIN_MODEL": ["train", "build", "create model", "fit", "learn", "develop model"],
        "EXPLAIN_MODEL": ["explain", "why", "how does", "interpret", "feature importance", "what affects"],
        "UPLOAD_DATA": ["upload", "load", "import", "add data", "bring data", "use dataset"],
        "PREDICT": ["predict", "forecast", "estimate", "what will", "prediction"],
        "HELP": ["help", "how to", "what can", "guide", "tutorial", "show me how"],
        "VIEW_RESULTS": ["results", "show results", "what happened", "outcome", "performance"],
        "COMPARE_MODELS": ["compare", "which is better", "best model", "difference between"]
    }
    
    def __init__(self):
        """Initialize NLU Service"""
        if groq_client is None:
            raise ValueError("Groq client not initialized. Please check your API configuration.")
        self.client = groq_client
        logger.info("✓ NLUService initialized successfully")
    
    def parse_intent(self, text: str) -> Dict[str, Any]:
        """
        Parse user intent from text using LLM
        
        Args:
            text: User's transcribed speech
            
        Returns:
            Dictionary with intent, entities, confidence, and metadata
        """
        try:
            logger.info(f"Parsing intent for: '{text}'")
            
            # Validate input
            if not text or len(text.strip()) < 2:
                return {
                    "intent": "UNKNOWN",
                    "entities": {},
                    "confidence": 0.0,
                    "needs_clarification": True,
                    "message": "Input too short to understand. Could you say that again?",
                    "original_text": text
                }
            
            # Use Groq LLM to parse intent
            prompt = self._build_intent_prompt(text)
            messages = [{"role": "user", "content": prompt}]
            
            # Get response from Groq
            response = self.client.chat_completion(
                messages=messages,
                temperature=0.1,  # Low temperature for consistent parsing
                max_tokens=500
            )
            
            logger.info(f"LLM raw response: {response}")
            
            # Clean and parse response
            intent_data = self._parse_llm_response(response)
            
            # Validate and enrich the parsed data
            result = self._validate_intent_data(intent_data, text)
            
            logger.info(f"✓ Parsed intent: {result['intent']} (confidence: {result['confidence']:.2f})")
            return result
            
        except Exception as e:
            logger.error(f"Intent parsing error: {e}", exc_info=True)
            return self._fallback_parse(text)
    
    def _build_intent_prompt(self, text: str) -> str:
        """Build the LLM prompt for intent parsing"""
        return f"""You are an AI assistant for an AutoML platform that helps users analyze data and build machine learning models.

User said: "{text}"

Analyze this command and extract the user's intent and relevant entities.

CLASSIFY THE INTENT AS ONE OF:
- ANALYZE_DATA: User wants to explore/analyze uploaded data (EDA, statistics, visualizations)
- TRAIN_MODEL: User wants to train a machine learning model
- EXPLAIN_MODEL: User wants explanation of model results or feature importance
- UPLOAD_DATA: User wants to upload or load data
- PREDICT: User wants to make predictions using a trained model
- VIEW_RESULTS: User wants to see results from previous operations
- COMPARE_MODELS: User wants to compare different models
- HELP: User needs help or guidance
- UNKNOWN: Cannot determine intent

EXTRACT ENTITIES:
- target_column: The column name to predict (for training/prediction)
- model_type: Specific model mentioned (xgboost, random forest, linear regression, etc.)
- dataset_name: Name of dataset mentioned
- file_name: Any file name mentioned
- action_verb: Main action word used
- comparison_type: Type of comparison (accuracy, speed, etc.)

CONFIDENCE LEVELS:
- 0.9-1.0: Very clear and unambiguous
- 0.7-0.9: Clear but might need minor clarification
- 0.5-0.7: Somewhat clear but might need clarification
- 0.0-0.5: Unclear, definitely needs clarification

Return ONLY a valid JSON object in this exact format (no markdown, no explanations):
{{
  "intent": "INTENT_NAME",
  "entities": {{
    "target_column": "column_name or null",
    "model_type": "model_name or null",
    "dataset_name": "name or null",
    "file_name": "filename or null",
    "action_verb": "verb or null"
  }},
  "confidence": 0.85,
  "needs_clarification": false,
  "clarification_question": "question to ask if unclear or null"
}}"""
    
    def _parse_llm_response(self, response: str) -> Dict[str, Any]:
        """Parse and clean the LLM JSON response"""
        response = response.strip()
        
        # Remove markdown code blocks if present
        if response.startswith("```"):
            lines = response.split("\n")
            response = "\n".join(lines[1:-1])  # Remove first and last lines
            if response.startswith("json"):
                response = response[4:].strip()
        
        # Try to parse JSON
        try:
            intent_data = json.loads(response)
            return intent_data
        except json.JSONDecodeError as e:
            logger.error(f"JSON parse error: {e}")
            logger.error(f"Response was: {response}")
            
            # Try to extract JSON from the response using regex
            json_match = re.search(r'\{.*\}', response, re.DOTALL)
            if json_match:
                try:
                    return json.loads(json_match.group())
                except json.JSONDecodeError:
                    pass
            
            raise ValueError("Could not parse LLM response as JSON")
    
    def _validate_intent_data(self, intent_data: Dict[str, Any], original_text: str) -> Dict[str, Any]:
        """Validate and enrich the parsed intent data"""
        # Ensure intent is valid
        intent = intent_data.get("intent", "UNKNOWN")
        if intent not in self.SUPPORTED_INTENTS:
            logger.warning(f"Unknown intent '{intent}', defaulting to UNKNOWN")
            intent = "UNKNOWN"
        
        # Build result with all required fields
        result = {
            "intent": intent,
            "entities": intent_data.get("entities", {}),
            "confidence": float(intent_data.get("confidence", 0.5)),
            "needs_clarification": intent_data.get("needs_clarification", False),
            "original_text": original_text,
            "timestamp": self._get_timestamp()
        }
        
        # Add clarification question if needed
        if result["needs_clarification"]:
            result["clarification_question"] = intent_data.get(
                "clarification_question", 
                "Could you please clarify what you'd like to do?"
            )
        
        # Clean entities (remove null values)
        result["entities"] = {
            k: v for k, v in result["entities"].items() 
            if v is not None and v != "null"
        }
        
        return result
    
    def _fallback_parse(self, text: str) -> Dict[str, Any]:
        """
        Fallback intent parsing using keyword matching
        Used when LLM parsing fails
        """
        logger.info("Using fallback keyword-based intent parsing")
        text_lower = text.lower()
        
        # Find matching intent based on keywords
        best_intent = "UNKNOWN"
        best_confidence = 0.0
        
        for intent, keywords in self.INTENT_KEYWORDS.items():
            matches = sum(1 for keyword in keywords if keyword in text_lower)
            if matches > 0:
                confidence = min(0.7, 0.4 + (matches * 0.1))
                if confidence > best_confidence:
                    best_confidence = confidence
                    best_intent = intent
        
        # Extract basic entities using regex
        entities = self._extract_basic_entities(text)
        
        return {
            "intent": best_intent,
            "entities": entities,
            "confidence": best_confidence,
            "needs_clarification": best_confidence < 0.5,
            "clarification_question": "I'm not quite sure what you want to do. Could you rephrase that?",
            "original_text": text,
            "fallback_used": True,
            "timestamp": self._get_timestamp()
        }
    
    def _extract_basic_entities(self, text: str) -> Dict[str, Any]:
        """Extract basic entities using pattern matching"""
        entities = {}
        
        # Look for column names in quotes
        column_match = re.search(r'["\']([^"\']+)["\']', text)
        if column_match:
            entities["target_column"] = column_match.group(1)
        
        # Look for common model types
        model_types = ["xgboost", "random forest", "linear regression", 
                      "logistic regression", "neural network", "svm"]
        for model in model_types:
            if model in text.lower():
                entities["model_type"] = model
                break
        
        return entities
    
    def execute_intent(self, intent_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Execute the parsed intent by calling appropriate services
        
        Args:
            intent_data: Parsed intent from parse_intent()
            
        Returns:
            Execution result with success status, action, and message
        """
        intent = intent_data.get('intent')
        entities = intent_data.get('entities', {})
        
        try:
            logger.info(f"Executing intent: {intent} with entities: {entities}")
            
            # Import services here to avoid circular dependencies
            from app.services.data_service import DataService
            from app.services.analysis_service import AnalysisService
            from app.services.ml_service import MLService
            
            # Handle HELP intent
            if intent == 'HELP':
                return self._handle_help_intent()
            
            # Check if data is loaded for intents that require it
            data_required_intents = ['ANALYZE_DATA', 'TRAIN_MODEL', 'PREDICT', 'VIEW_RESULTS']
            if intent in data_required_intents:
                data_service = DataService()
                if not data_service.has_data():
                    return {
                        'success': False,
                        'needs_input': True,
                        'action': 'upload_required',
                        'message': 'Please upload a dataset first. You can say "upload data" or use the upload button.',
                        'suggestions': ['Upload data', 'Help']
                    }
            
            # Route to appropriate handler
            if intent == 'ANALYZE_DATA':
                return self._handle_analyze_data(AnalysisService())
            
            elif intent == 'TRAIN_MODEL':
                return self._handle_train_model(MLService(), entities, intent_data)
            
            elif intent == 'EXPLAIN_MODEL':
                return self._handle_explain_model(MLService(), entities)
            
            elif intent == 'UPLOAD_DATA':
                return self._handle_upload_data(entities)
            
            elif intent == 'PREDICT':
                return self._handle_predict(MLService(), entities)
            
            elif intent == 'VIEW_RESULTS':
                return self._handle_view_results(MLService())
            
            elif intent == 'COMPARE_MODELS':
                return self._handle_compare_models(MLService())
            
            else:  # UNKNOWN or unrecognized
                return self._handle_unknown_intent(intent_data)
                
        except Exception as e:
            logger.error(f"Intent execution error: {str(e)}", exc_info=True)
            return {
                'success': False,
                'action': 'execution_error',
                'error': str(e),
                'message': f'Sorry, I encountered an error: {str(e)}',
                'retry_allowed': True
            }
    
    def _handle_help_intent(self) -> Dict[str, Any]:
        """Handle HELP intent"""
        return {
            'success': True,
            'action': 'help_provided',
            'message': 'I can help you with:\n\n'
                      '• Analyze data - Get insights and statistics\n'
                      '• Train models - Build machine learning models\n'
                      '• Explain results - Understand model predictions\n'
                      '• Make predictions - Use trained models\n'
                      '• View results - See previous results\n\n'
                      'What would you like to do?',
            'suggestions': [
                'Analyze my data',
                'Train a model',
                'Explain the model',
                'Show results'
            ]
        }
    
    def _handle_analyze_data(self, analysis_service) -> Dict[str, Any]:
        """Handle ANALYZE_DATA intent"""
        try:
            result = analysis_service.analyze_dataset()
            return {
                'success': True,
                'action': 'analysis_complete',
                'result': result,
                'message': 'I\'ve completed the data analysis. Here are the key insights from your dataset.',
                'next_actions': ['Train a model', 'View detailed statistics']
            }
        except Exception as e:
            logger.error(f"Analysis error: {e}")
            return {
                'success': False,
                'action': 'analysis_failed',
                'error': str(e),
                'message': f'Sorry, I couldn\'t analyze the data: {str(e)}'
            }
    
    def _handle_train_model(self, ml_service, entities: Dict, intent_data: Dict) -> Dict[str, Any]:
        """Handle TRAIN_MODEL intent"""
        target_column = entities.get('target_column')
        model_type = entities.get('model_type')
        
        # Check if we need clarification on target column
        if not target_column or intent_data.get('needs_clarification'):
            try:
                from app.services.data_service import DataService
                data_service = DataService()
                columns = data_service.get_column_names()
                
                clarification = intent_data.get(
                    'clarification_question',
                    'Which column would you like to predict?'
                )
                
                return {
                    'success': False,
                    'needs_input': True,
                    'action': 'clarification_needed',
                    'message': f'{clarification}\n\nAvailable columns: {", ".join(columns)}',
                    'available_columns': columns,
                    'suggestions': columns[:5]  # Top 5 columns as suggestions
                }
            except Exception as e:
                return {
                    'success': False,
                    'message': f'Please specify which column to predict. Error: {str(e)}'
                }
        
        # Execute training
        try:
            result = ml_service.train_models(
                target_column=target_column,
                model_type=model_type
            )
            
            return {
                'success': True,
                'action': 'training_complete',
                'result': result,
                'message': f'Successfully trained models to predict "{target_column}". '
                          f'The best model achieved {result.get("best_score", "N/A")} accuracy.',
                'next_actions': ['Explain the model', 'Make predictions', 'View results']
            }
        except Exception as e:
            logger.error(f"Training error: {e}")
            return {
                'success': False,
                'action': 'training_failed',
                'error': str(e),
                'message': f'Sorry, I couldn\'t train the model: {str(e)}'
            }
    
    def _handle_explain_model(self, ml_service, entities: Dict) -> Dict[str, Any]:
        """Handle EXPLAIN_MODEL intent"""
        try:
            # Get the latest trained model
            latest_job = ml_service.get_latest_job()
            
            if not latest_job:
                return {
                    'success': False,
                    'needs_input': True,
                    'action': 'training_required',
                    'message': 'Please train a model first, then I can explain how it works.',
                    'suggestions': ['Train a model', 'Help']
                }
            
            # Get explanation
            explanation = ml_service.explain_model(latest_job['job_id'])
            
            return {
                'success': True,
                'action': 'explanation_provided',
                'result': explanation,
                'message': 'Here\'s how the model makes predictions. The most important features are listed below.',
                'next_actions': ['Make predictions', 'Train another model']
            }
        except Exception as e:
            logger.error(f"Explanation error: {e}")
            return {
                'success': False,
                'action': 'explanation_failed',
                'error': str(e),
                'message': f'Sorry, I couldn\'t explain the model: {str(e)}'
            }
    
    def _handle_upload_data(self, entities: Dict) -> Dict[str, Any]:
        """Handle UPLOAD_DATA intent"""
        file_name = entities.get('file_name')
        
        message = 'Please use the upload button to select your CSV file'
        if file_name:
            message = f'Please upload the file "{file_name}" using the upload button'
        
        return {
            'success': True,
            'action': 'upload_prompt',
            'message': message + ', or drag and drop it here.',
            'accepted_formats': ['.csv', '.xlsx', '.json'],
            'suggestions': ['Help', 'What can you do?']
        }
    
    def _handle_predict(self, ml_service, entities: Dict) -> Dict[str, Any]:
        """Handle PREDICT intent"""
        try:
            latest_job = ml_service.get_latest_job()
            
            if not latest_job:
                return {
                    'success': False,
                    'needs_input': True,
                    'action': 'training_required',
                    'message': 'Please train a model first before making predictions.',
                    'suggestions': ['Train a model', 'Help']
                }
            
            return {
                'success': True,
                'action': 'prediction_ready',
                'message': f'I\'m ready to make predictions using the {latest_job.get("model_name", "trained")} model. '
                          'Please provide the input data or upload a file with new data.',
                'model_info': latest_job,
                'suggestions': ['Upload prediction data', 'Explain the model']
            }
        except Exception as e:
            logger.error(f"Prediction setup error: {e}")
            return {
                'success': False,
                'error': str(e),
                'message': f'Sorry, I couldn\'t set up predictions: {str(e)}'
            }
    
    def _handle_view_results(self, ml_service) -> Dict[str, Any]:
        """Handle VIEW_RESULTS intent"""
        try:
            results = ml_service.get_all_results()
            
            if not results:
                return {
                    'success': False,
                    'action': 'no_results',
                    'message': 'No results available yet. Train a model first to see results.',
                    'suggestions': ['Train a model', 'Analyze data']
                }
            
            return {
                'success': True,
                'action': 'results_displayed',
                'result': results,
                'message': f'Here are your {len(results)} most recent results.',
                'next_actions': ['Train another model', 'Explain results']
            }
        except Exception as e:
            logger.error(f"View results error: {e}")
            return {
                'success': False,
                'error': str(e),
                'message': f'Sorry, I couldn\'t retrieve results: {str(e)}'
            }
    
    def _handle_compare_models(self, ml_service) -> Dict[str, Any]:
        """Handle COMPARE_MODELS intent"""
        try:
            comparison = ml_service.compare_models()
            
            if not comparison:
                return {
                    'success': False,
                    'action': 'insufficient_models',
                    'message': 'Not enough models to compare. Train at least two models first.',
                    'suggestions': ['Train a model', 'Help']
                }
            
            return {
                'success': True,
                'action': 'comparison_complete',
                'result': comparison,
                'message': 'Here\'s a comparison of your trained models.',
                'next_actions': ['Train another model', 'Use best model']
            }
        except Exception as e:
            logger.error(f"Model comparison error: {e}")
            return {
                'success': False,
                'error': str(e),
                'message': f'Sorry, I couldn\'t compare models: {str(e)}'
            }
    
    def _handle_unknown_intent(self, intent_data: Dict) -> Dict[str, Any]:
        """Handle UNKNOWN intent"""
        clarification = intent_data.get(
            'clarification_question',
            'I didn\'t quite understand that. Could you rephrase what you\'d like to do?'
        )
        
        return {
            'success': False,
            'action': 'unknown_intent',
            'message': clarification,
            'suggestions': [
                'Analyze my data',
                'Train a model',
                'Explain the results',
                'Get help'
            ],
            'confidence': intent_data.get('confidence', 0.0)
        }
    
    def process_voice_command(self, text: str) -> Dict[str, Any]:
        """
        Complete pipeline: parse intent and execute it
        
        Args:
            text: User's voice command (transcribed)
            
        Returns:
            Execution result
        """
        logger.info(f"Processing voice command: '{text}'")
        
        # Step 1: Parse intent
        intent_data = self.parse_intent(text)
        
        # Step 2: Execute intent
        result = self.execute_intent(intent_data)
        
        # Add intent metadata to result
        result['intent_data'] = intent_data
        result['processed_at'] = self._get_timestamp()
        
        return result
    
    @staticmethod
    def _get_timestamp() -> str:
        """Get current timestamp as ISO string"""
        from datetime import datetime
        return datetime.utcnow().isoformat()


# Example usage and testing
if __name__ == "__main__":
    # Setup logging for testing
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    
    # Test commands
    test_commands = [
        "analyze my data",
        "train a model to predict sales",
        "explain the model",
        "help me get started",
        "what are the results?",
        "compare all models"
    ]
    
    try:
        nlu = NLUService()
        
        for command in test_commands:
            print(f"\n{'='*60}")
            print(f"Command: {command}")
            print(f"{'='*60}")
            
            result = nlu.process_voice_command(command)
            print(f"Intent: {result['intent_data']['intent']}")
            print(f"Confidence: {result['intent_data']['confidence']:.2f}")
            print(f"Success: {result['success']}")
            print(f"Message: {result['message']}")
            
    except Exception as e:
        print(f"Error during testing: {e}")