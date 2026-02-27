"""
NLU Intent Handlers
Individual handler methods for each supported intent.
"""

import logging
from typing import Dict, Any

logger = logging.getLogger(__name__)


class NLUHandlersMixin:
    """Mixin providing intent handler methods for NLUService."""

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
                    'suggestions': columns[:5]
                }
            except Exception as e:
                return {
                    'success': False,
                    'message': f'Please specify which column to predict. Error: {str(e)}'
                }

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
            latest_job = ml_service.get_latest_job()

            if not latest_job:
                return {
                    'success': False,
                    'needs_input': True,
                    'action': 'training_required',
                    'message': 'Please train a model first, then I can explain how it works.',
                    'suggestions': ['Train a model', 'Help']
                }

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
