import os
import logging
import httpx
from app.core.exceptions import ValidationError, ExternalAPIError, NotFoundError, ServiceUnavailableError

logger = logging.getLogger(__name__)

class VoiceService:
    def __init__(self):
        """Initialize for Groq Whisper transcription via HTTP API"""
        self.api_key = os.getenv("GROQ_API_KEY")
        
        if not self.api_key:
            logger.error("GROQ_API_KEY not found in environment variables")
            raise ValidationError("GROQ_API_KEY environment variable is required")
        
        self.api_url = "https://api.groq.com/openai/v1/audio/transcriptions"
        logger.info("Voice service initialized with Groq Whisper API")

    def transcribe(self, audio_file_path: str) -> str:
        """
        Transcribe audio file using Groq Whisper API (HTTP)
        
        Args:
            audio_file_path: Path to audio file
            
        Returns:
            Transcribed text
        """
        try:
            logger.info(f"Transcribing audio file: {audio_file_path}")
            
            # Check if file exists
            if not os.path.exists(audio_file_path):
                raise NotFoundError(f"Audio file not found: {audio_file_path}")
            
            # Check file size
            file_size = os.path.getsize(audio_file_path)
            logger.info(f"Audio file size: {file_size} bytes")
            
            if file_size == 0:
                raise ValidationError("Audio file is empty")
            
            # Read audio file
            with open(audio_file_path, "rb") as audio_file:
                audio_data = audio_file.read()
            
            # Determine file extension for proper MIME type
            ext = os.path.splitext(audio_file_path)[1].lower()
            mime_types = {
                '.webm': 'audio/webm',
                '.wav': 'audio/wav',
                '.mp3': 'audio/mpeg',
                '.m4a': 'audio/m4a',
                '.ogg': 'audio/ogg',
                '.flac': 'audio/flac'
            }
            mime_type = mime_types.get(ext, 'audio/webm')
            
            # Prepare the file for upload
            filename = os.path.basename(audio_file_path)
            if not ext:
                filename = filename + '.webm'
            
            # Make HTTP request to Groq API
            files = {
                'file': (filename, audio_data, mime_type),
            }
            data = {
                'model': 'whisper-large-v3',
                'response_format': 'text',
                'language': 'en',
                'temperature': '0.0'
            }
            headers = {
                'Authorization': f'Bearer {self.api_key}'
            }
            
            logger.info(f"Sending to Groq Whisper API...")
            
            with httpx.Client(timeout=60.0) as client:
                response = client.post(
                    self.api_url,
                    files=files,
                    data=data,
                    headers=headers
                )
            
            if response.status_code != 200:
                error_text = response.text
                logger.error(f"Groq API error ({response.status_code}): {error_text}")
                raise ExternalAPIError(f"Groq API error: {error_text}")
            
            transcription = response.text.strip()
            logger.info(f"Transcription successful: {transcription}")
            return transcription
            
        except NotFoundError as e:
            logger.error(f"File not found: {e}")
            raise
        except httpx.TimeoutException:
            logger.error("Transcription request timed out")
            raise ServiceUnavailableError("Transcription request timed out. Please try again.")
        except Exception as e:
            logger.error(f"Transcription error: {e}", exc_info=True)
            raise ExternalAPIError(f"Transcription failed: {str(e)}")