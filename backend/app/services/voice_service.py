import os
from groq import Groq
import logging

logger = logging.getLogger(__name__)

class VoiceService:
    def __init__(self):
        """Initialize Groq client for Whisper transcription"""
        api_key = os.getenv("GROQ_API_KEY")
        
        if not api_key:
            logger.error("GROQ_API_KEY not found in environment variables")
            raise ValueError("GROQ_API_KEY environment variable is required")
        
        try:
            self.client = Groq(api_key=api_key)
            logger.info("Groq client initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize Groq client: {e}")
            raise

    def transcribe(self, audio_file_path: str) -> str:
        """
        Transcribe audio file using Groq Whisper
        
        Args:
            audio_file_path: Path to audio file
            
        Returns:
            Transcribed text
        """
        try:
            logger.info(f"Transcribing audio file: {audio_file_path}")
            
            # Check if file exists
            if not os.path.exists(audio_file_path):
                raise FileNotFoundError(f"Audio file not found: {audio_file_path}")
            
            # Check file size
            file_size = os.path.getsize(audio_file_path)
            logger.info(f"Audio file size: {file_size} bytes")
            
            if file_size == 0:
                raise ValueError("Audio file is empty")
            
            # Open and transcribe the file
            with open(audio_file_path, "rb") as audio_file:
                transcription = self.client.audio.transcriptions.create(
                    file=(os.path.basename(audio_file_path), audio_file.read()),
                    model="whisper-large-v3",
                    response_format="text",
                    language="en",  # Set to "en" or remove for auto-detection
                    temperature=0.0
                )
            
            logger.info(f"Transcription successful: {transcription}")
            return transcription.strip()
            
        except FileNotFoundError as e:
            logger.error(f"File not found: {e}")
            raise
        except Exception as e:
            logger.error(f"Transcription error: {e}", exc_info=True)
            raise Exception(f"Transcription failed: {str(e)}")