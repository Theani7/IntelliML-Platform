"""
================================================================================
Groq API Client - LLM Integration
================================================================================

PURPOSE:
    Centralized client for Groq API (LLM and Whisper).
    Provides chat completions and audio transcription.

WHY GROQ?
    - Fast inference
    - Cost-effective
    - Supports Llama, Mixtral, Gemma models
    - Whisper for audio transcription

MODELS USED:
    - LLM: llama-3.3-70b-versatile (default)
    - Whisper: whisper-large-v3-turbo

FEATURES:
    1. Chat Completions
       - Natural language conversations
       - Code generation
       - Data analysis

    2. Audio Transcription
       - Whisper-powered
       - Multiple languages
       - High accuracy

GRACEFUL DEGRADATION:
    - Returns friendly messages when not configured
    - No crashes if GROQ_API_KEY missing
    - Logs warnings instead of errors

================================================================================
"""

import logging
from typing import Optional, Dict, Any
import warnings

# Suppress tabulate warnings from groq library internals
warnings.filterwarnings('ignore')

logger = logging.getLogger(__name__)

groq_client = None

try:
    from groq import Groq
    from app.config import settings

    class GroqClient:
        """
        Centralized Groq API client.
        
        Features:
        - Chat completions (LLM)
        - Audio transcription (Whisper)
        - Intent parsing (NLU)
        
        Singleton: Uses global groq_client instance
        
        Example:
            response = groq_client.chat_completion([
                {"role": "user", "content": "Hello!"}
            ])
        """

        def __init__(self):
            """
            Initialize Groq client.
            
            Requires GROQ_API_KEY in environment/config.
            If not set, client is initialized but won't make API calls.
            """
            if not settings.GROQ_API_KEY:
                logger.warning("GROQ_API_KEY not configured, AI features will be unavailable")
                self.client = None
                return
            self.client = Groq(api_key=settings.GROQ_API_KEY)
            logger.info("Groq client initialized successfully")

        def transcribe_audio(self, audio_file_path: str) -> Optional[str]:
            """
            Transcribe audio file to text using Whisper.
            
            Args:
                audio_file_path: Path to audio file (wav, mp3, etc.)
                
            Returns:
                Transcribed text or None if error
            """
            if self.client is None:
                return None
            try:
                with open(audio_file_path, "rb") as audio_file:
                    transcription = self.client.audio.transcriptions.create(
                        file=(audio_file_path, audio_file.read()),
                        model="whisper-large-v3-turbo",
                        response_format="text",
                        language="en",
                        temperature=0.0
                    )
                return transcription
            except Exception as e:
                logger.error(f"Transcription failed: {str(e)}")
                return None

        def chat_completion(
            self,
            messages: list[Dict[str, str]],
            model: Optional[str] = None,
            temperature: float = 0.7,
            max_tokens: int = 1024
        ) -> Optional[str]:
            """
            Send chat completion request to Groq LLM.
            
            Args:
                messages: List of message dicts with 'role' and 'content'
                    Example:
                    [
                        {"role": "system", "content": "You are helpful."},
                        {"role": "user", "content": "Hello!"}
                    ]
                model: Model to use (defaults to settings.LLM_MODEL)
                    Options: llama-3.3-70b-versatile, mixtral-8x7b, gemma-7b
                temperature: Randomness (0.0 = deterministic, 1.0 = creative)
                    - 0.0-0.3: Focused, precise
                    - 0.4-0.7: Balanced
                    - 0.8-1.0: Creative, varied
                max_tokens: Maximum tokens in response
                    - 100-500: Short responses
                    - 500-1000: Medium responses
                    - 1000+: Long responses
                    
            Returns:
                LLM response text, or None if error
            """
            if self.client is None:
                logger.warning("Groq client not initialized, returning fallback response")
                return "AI assistant is currently unavailable. Please configure GROQ_API_KEY to enable AI features."

            try:
                response = self.client.chat.completions.create(
                    model=model or settings.LLM_MODEL,
                    messages=messages,
                    temperature=temperature,
                    max_tokens=max_tokens,
                    top_p=1,
                    stream=False
                )
                content = response.choices[0].message.content
                logger.info(f"LLM response: {content[:100]}...")
                return content
            except Exception as e:
                logger.error(f"LLM request failed: {str(e)}")
                return None

        def parse_intent(self, user_text: str) -> Dict[str, Any]:
            """
            Parse user intent from transcribed text.
            
            Used for voice commands to understand what action to take.
            
            Args:
                user_text: User's spoken/typed command
                
            Returns:
                Dict with:
                - intent: ANALYZE_DATA, TRAIN_MODEL, UPLOAD_DATA, UNKNOWN
                - target_column: Column to predict (if training)
                - model_preference: Specific model requested
                - needs_clarification: True/false
                - clarification_question: Question if ambiguous
            """
            import json
            prompt = f"""
You are an intent parser for an AutoML platform. Parse the user's command and return ONLY a JSON object.

User said: "{user_text}"

Determine:
1. intent: ANALYZE_DATA, TRAIN_MODEL, EXPLAIN_MODEL, UPLOAD_DATA, or UNKNOWN
2. target_column: which column to predict (if training model)
3. model_preference: specific model requested or null
4. needs_clarification: true/false
5. clarification_question: question to ask if ambiguous

Return ONLY valid JSON, no markdown or explanation.
"""
            response = self.chat_completion([{"role": "user", "content": prompt}], temperature=0.0)
            try:
                return json.loads(response) if response else {"intent": "UNKNOWN", "needs_clarification": True}
            except json.JSONDecodeError:
                return {"intent": "UNKNOWN", "needs_clarification": True, "clarification_question": "I didn't understand that. Can you rephrase?"}

    # Create singleton instance (None if GROQ_API_KEY not configured)
    if settings.GROQ_API_KEY:
        try:
            groq_client = GroqClient()
            logger.info("Groq client initialized successfully")
        except Exception as e:
            logger.warning(f"Failed to initialize Groq client: {e}")
            groq_client = None
    else:
        logger.warning("GROQ_API_KEY not set - AI features will be unavailable")

except ImportError as e:
    logger.warning(f"Groq library not installed: {e}. AI features will be unavailable.")
    groq_client = None