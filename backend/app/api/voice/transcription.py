"""
================================================================================
Voice API - Transcription & Intent Parsing
================================================================================

PURPOSE:
    Handles audio input processing for voice commands.
    Transcribes speech to text and parses user intent.

TECHNOLOGY:
    - Groq Whisper API for transcription
    - Groq LLM for intent parsing
    - Supports multiple audio formats

AUDIO FLOW:

    ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
    │   Browser   │────▶│  FastAPI    │────▶│ Groq Whisper│
    │   (webm)    │     │  Endpoint   │     │   API       │
    └─────────────┘     └─────────────┘     └─────────────┘
                              │
                              │ transcription
                              ▼
                        ┌─────────────┐
                        │  Intent     │
                        │  Parser     │
                        │  (LLM)      │
                        └─────────────┘
                              │
                              ▼
                        ┌─────────────┐
                        │  Response   │
                        │  (JSON)     │
                        └─────────────┘

SUPPORTED FORMATS:
    - webm: Chrome/Edge default
    - wav: Uncompressed audio
    - mp3: Compressed audio
    - m4a: Apple format
    - ogg: Firefox format
    - flac: Lossless audio

ERROR HANDLING:
    - ServiceUnavailableError: GROQ_API_KEY not configured
    - ValidationError: Invalid audio format or empty transcription
    - Cleanup: Temporary files always deleted in finally block

================================================================================
"""

from fastapi import File, UploadFile
import time

from app.api.voice import (
    router, voice_service, nlu_service, logger,
    validate_services, validate_audio_file, save_upload_file, cleanup_temp_file
)
from app.core.exceptions import ValidationError, ServiceUnavailableError


@router.get("/health")
async def health_check():
    """
    Check voice service availability.
    
    Returns status of:
    - Voice service (Groq Whisper)
    - NLU service (intent parsing)
    
    Returns:
        {
            "status": "healthy",
            "services": {
                "voice_service": true,   // False if GROQ_API_KEY missing
                "nlu_service": true
            },
            "timestamp": 1705320000.123
        }
    """
    return {
        "status": "healthy",
        "services": {
            "voice_service": voice_service is not None,
            "nlu_service": nlu_service is not None
        },
        "timestamp": time.time()
    }


@router.post("/transcribe")
async def transcribe_audio(audio: UploadFile = File(...)):
    """
    Transcribe audio file to text using Groq Whisper.
    
    Takes an audio file and converts speech to text.
    Used for voice input to the AI assistant.
    
    Request:
        Multipart form with 'audio' file field
        
    Returns:
        {
            "text": "analyze my dataset",
            "success": true,
            "duration_ms": 1500,
            "audio_size_bytes": 45000
        }
        
    Raises:
        ServiceUnavailableError: GROQ_API_KEY not configured
        ValidationError: Empty transcription
    """
    start_time = time.time()
    temp_file_path = None

    try:
        # Check if voice service is available
        if voice_service is None:
            raise ServiceUnavailableError(
                "Voice service not available. Check GROQ_API_KEY configuration."
            )

        # Validate audio file format
        validate_audio_file(audio)

        # Save upload to temp file
        temp_file_path, content = await save_upload_file(audio)

        logger.info(f"Starting transcription for: {temp_file_path}")
        
        # Transcribe using Groq Whisper
        transcription = voice_service.transcribe(temp_file_path)

        # Validate result
        if not transcription or transcription.strip() == "":
            raise ValidationError(
                "Transcription returned empty result. Please try speaking more clearly."
            )

        # Calculate processing time
        duration_ms = int((time.time() - start_time) * 1000)
        logger.info(f"✓ Transcription successful ({duration_ms}ms): {transcription}")

        return {
            "text": transcription,
            "success": True,
            "duration_ms": duration_ms,
            "audio_size_bytes": len(content)
        }

    except (ValidationError, ServiceUnavailableError):
        raise
    except Exception as e:
        logger.error(f"Transcription error: {str(e)}", exc_info=True)
        raise ServiceUnavailableError(f"Transcription failed: {str(e)}")
    finally:
        # Always cleanup temp file
        cleanup_temp_file(temp_file_path)


@router.post("/parse-intent")
async def parse_intent(audio: UploadFile = File(...)):
    """
    Transcribe audio and parse user intent in one step.
    
    Combines:
    1. Speech-to-text (Whisper)
    2. Intent detection (LLM)
    
    Returns both transcription and parsed intent.
    
    Two-Step Process:
        Step 1: "Transcribe audio" → "analyze my data"
        Step 2: Parse intent → {"intent": "ANALYZE_DATA", "target": "data"}
    
    Request:
        Multipart form with 'audio' file field
        
    Returns:
        {
            "transcription": "analyze my dataset",
            "intent": {
                "intent": "ANALYZE_DATA",
                "action": "analyze",
                "confidence": 0.95,
                "entities": {"target": "full_dataset"}
            },
            "success": true,
            "duration_ms": 2500
        }
        
    Raises:
        ServiceUnavailableError: Services not available
        ValidationError: Transcription failed
    """
    start_time = time.time()
    temp_file_path = None

    try:
        # Validate both services available
        validate_services()
        validate_audio_file(audio)

        # Save upload
        temp_file_path, content = await save_upload_file(audio)

        # Step 1: Transcribe
        logger.info("Step 1: Transcribing audio...")
        transcription = voice_service.transcribe(temp_file_path)

        if not transcription or transcription.strip() == "":
            raise ValidationError("Could not transcribe audio. Please try again.")

        logger.info(f"✓ Transcribed: '{transcription}'")

        # Step 2: Parse intent
        logger.info("Step 2: Parsing intent...")
        intent_data = nlu_service.parse_intent(transcription)

        logger.info(f"✓ Intent parsed: {intent_data['intent']} "
                   f"(confidence: {intent_data['confidence']:.2f})")

        duration_ms = int((time.time() - start_time) * 1000)

        return {
            "transcription": transcription,
            "intent": intent_data,
            "success": True,
            "duration_ms": duration_ms
        }

    except (ValidationError, ServiceUnavailableError):
        raise
    except Exception as e:
        logger.error(f"Intent parsing error: {str(e)}", exc_info=True)
        raise ServiceUnavailableError(f"Intent parsing failed: {str(e)}")
    finally:
        cleanup_temp_file(temp_file_path)