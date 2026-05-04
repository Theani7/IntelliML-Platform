"""
NLU Intent Parser
Handles parsing user intent from text using LLM and fallback keyword matching.
"""

from app.core.exceptions import DataProcessingError
import logging
import json
import re
from typing import Dict, Any

logger = logging.getLogger(__name__)


class NLUParserMixin:
    """Mixin providing intent parsing capabilities for NLUService."""

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

            if not text or len(text.strip()) < 2:
                return {
                    "intent": "UNKNOWN",
                    "entities": {},
                    "confidence": 0.0,
                    "needs_clarification": True,
                    "message": "Input too short to understand. Could you say that again?",
                    "original_text": text
                }

            prompt = self._build_intent_prompt(text)
            messages = [{"role": "user", "content": prompt}]

            response = self.client.chat_completion(
                messages=messages,
                temperature=0.1,
                max_tokens=500
            )

            logger.info(f"LLM raw response: {response}")

            intent_data = self._parse_llm_response(response)
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

        if response.startswith("```"):
            lines = response.split("\n")
            response = "\n".join(lines[1:-1])
            if response.startswith("json"):
                response = response[4:].strip()

        try:
            intent_data = json.loads(response)
            return intent_data
        except json.JSONDecodeError as e:
            logger.error(f"JSON parse error: {e}")
            logger.error(f"Response was: {response}")

            json_match = re.search(r'\{.*\}', response, re.DOTALL)
            if json_match:
                try:
                    return json.loads(json_match.group())
                except json.JSONDecodeError:
                    pass

            raise DataProcessingError("Could not parse LLM response as JSON")

    def _validate_intent_data(self, intent_data: Dict[str, Any], original_text: str) -> Dict[str, Any]:
        """Validate and enrich the parsed intent data"""
        intent = intent_data.get("intent", "UNKNOWN")
        if intent not in self.SUPPORTED_INTENTS:
            logger.warning(f"Unknown intent '{intent}', defaulting to UNKNOWN")
            intent = "UNKNOWN"

        result = {
            "intent": intent,
            "entities": intent_data.get("entities", {}),
            "confidence": float(intent_data.get("confidence", 0.5)),
            "needs_clarification": intent_data.get("needs_clarification", False),
            "original_text": original_text,
            "timestamp": self._get_timestamp()
        }

        if result["needs_clarification"]:
            result["clarification_question"] = intent_data.get(
                "clarification_question",
                "Could you please clarify what you'd like to do?"
            )

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

        best_intent = "UNKNOWN"
        best_confidence = 0.0

        for intent, keywords in self.INTENT_KEYWORDS.items():
            matches = sum(1 for keyword in keywords if keyword in text_lower)
            if matches > 0:
                confidence = min(0.7, 0.4 + (matches * 0.1))
                if confidence > best_confidence:
                    best_confidence = confidence
                    best_intent = intent

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

        column_match = re.search(r'["\']([^"\']+)["\']', text)
        if column_match:
            entities["target_column"] = column_match.group(1)

        model_types = ["xgboost", "random forest", "linear regression",
                      "logistic regression", "neural network", "svm"]
        for model in model_types:
            if model in text.lower():
                entities["model_type"] = model
                break

        return entities
