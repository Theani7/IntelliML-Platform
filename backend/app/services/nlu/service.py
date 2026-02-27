"""
NLU Service — Main Class
Combines parser and handler mixins into the full NLUService.
"""

from app.core.groq_client import groq_client
from app.services.nlu.parser import NLUParserMixin
from app.services.nlu.handlers import NLUHandlersMixin
import logging
from typing import Dict, Any

logger = logging.getLogger(__name__)


class NLUService(NLUParserMixin, NLUHandlersMixin):
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
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )

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
