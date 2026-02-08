from groq import Groq
from app.config import settings
from typing import Optional, Dict, Any
import logging

# Setup logging to track API calls
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class GroqClient:
    """
    Centralized Groq API client
    Handles both Whisper (speech-to-text) and LLM calls
    """
    
    def __init__(self):
        """Initialize Groq client with API key from settings"""
        self.client = Groq(api_key=settings.GROQ_API_KEY)
        logger.info("Groq client initialized successfully")
    
    def transcribe_audio(self, audio_file_path: str) -> Optional[str]:
        """
        Transcribe audio file to text using Whisper
        
        Args:
            audio_file_path: Path to audio file (wav, mp3, etc.)
            
        Returns:
            Transcribed text or None if error
        """
        try:
            with open(audio_file_path, "rb") as audio_file:
                transcription = self.client.audio.transcriptions.create(
                    file=(audio_file_path, audio_file.read()),
                    model="whisper-large-v3-turbo",
                    response_format="text",
                    language="en",
                    temperature=0.0
                )
            
            logger.info(f"Transcription successful: {transcription[:50]}...")
            return transcription
            
        except AttributeError as e:
            logger.error(f"Groq client audio attribute error: {str(e)}")
            # Fallback to mock response for demo
            return "Mock transcription: audio processing not available"
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
        Send chat completion request to Groq LLM
        
        Args:
            messages: List of message dicts with 'role' and 'content'
            model: Model to use (defaults to settings.LLM_MODEL)
            temperature: Randomness (0.0 = deterministic, 1.0 = creative)
            max_tokens: Maximum response length
            
        Returns:
            LLM response text or None if error
        """
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
        Parse user intent from transcribed text
        This is a helper method for NLU functionality
        
        Args:
            user_text: User's command/question
            
        Returns:
            Dictionary with intent, action, parameters
        """
        prompt = f"""
You are an intent parser for an AutoML platform. Parse the user's command and return ONLY a JSON object.

User said: "{user_text}"

Determine:
1. intent: ANALYZE_DATA, TRAIN_MODEL, EXPLAIN_MODEL, UPLOAD_DATA, or UNKNOWN
2. target_column: which column to predict (if training model)
3. model_preference: specific model requested (xgboost, random_forest, etc.) or null
4. needs_clarification: true/false
5. clarification_question: question to ask if ambiguous

Return ONLY valid JSON, no markdown or explanation.
"""
        
        messages = [{"role": "user", "content": prompt}]
        response = self.chat_completion(messages, temperature=0.0)
        
        # Parse JSON response
        try:
            import json
            return json.loads(response)
        except:
            return {
                "intent": "UNKNOWN",
                "needs_clarification": True,
                "clarification_question": "I didn't understand that. Can you rephrase?"
            }

# Create singleton instance
groq_client = GroqClient()