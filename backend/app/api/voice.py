"""
Voice API Router
Handles voice command processing: transcription, intent parsing, and execution
"""

from fastapi import APIRouter, File, UploadFile, HTTPException, Request
from fastapi.responses import JSONResponse
from app.services.voice_service import VoiceService
from app.services.nlu_service import NLUService
from app.services.tts_service import TTSService
import logging
import os
import tempfile
from pathlib import Path
from typing import Optional, Dict, Any
import time

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Create router
router = APIRouter(
    prefix="/api/voice",
    tags=["voice"],
    responses={
        404: {"description": "Not found"},
        500: {"description": "Internal server error"}
    }
)

# Initialize services with error handling
voice_service = None
nlu_service = None

try:
    voice_service = VoiceService()
    logger.info("✓ VoiceService initialized successfully")
except Exception as e:
    logger.error(f"✗ Failed to initialize VoiceService: {e}", exc_info=True)

try:
    nlu_service = NLUService()
    logger.info("✓ NLUService initialized successfully")
except Exception as e:
    logger.error(f"✗ Failed to initialize NLUService: {e}", exc_info=True)


# Helper functions
def validate_services():
    """Validate that required services are initialized"""
    if voice_service is None:
        raise HTTPException(
            status_code=503,
            detail="Voice service not available. Please check GROQ_API_KEY configuration."
        )
    if nlu_service is None:
        raise HTTPException(
            status_code=503,
            detail="NLU service not available. Please check configuration."
        )


def validate_audio_file(audio: UploadFile) -> None:
    """Validate uploaded audio file"""
    if not audio or not audio.filename:
        raise HTTPException(
            status_code=400,
            detail="No audio file provided"
        )
    
    # Check file extension
    allowed_extensions = ['.webm', '.wav', '.mp3', '.m4a', '.ogg', '.flac']
    suffix = Path(audio.filename).suffix.lower()
    
    if suffix and suffix not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported audio format: {suffix}. Allowed: {', '.join(allowed_extensions)}"
        )


async def save_upload_file(audio: UploadFile) -> tuple[str, bytes]:
    """
    Save uploaded file to temporary location
    
    Returns:
        Tuple of (temp_file_path, content_bytes)
    """
    suffix = Path(audio.filename).suffix or ".webm"
    content = await audio.read()
    
    if not content or len(content) == 0:
        raise HTTPException(
            status_code=400,
            detail="Empty audio file received"
        )
    
    logger.info(f"Received audio: {audio.filename}, size: {len(content)} bytes")
    
    # Create temporary file
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as temp_file:
        temp_file.write(content)
        temp_file_path = temp_file.name
    
    return temp_file_path, content


def cleanup_temp_file(file_path: str) -> None:
    """Safely delete temporary file"""
    if file_path and os.path.exists(file_path):
        try:
            os.unlink(file_path)
            logger.debug(f"Deleted temporary file: {file_path}")
        except Exception as e:
            logger.warning(f"Failed to delete temp file {file_path}: {e}")


# API Endpoints

@router.get("/health")
async def health_check():
    """
    Check if voice services are healthy and available
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
    Transcribe audio file to text using Groq Whisper
    
    Args:
        audio: Audio file (webm, wav, mp3, m4a, ogg, flac)
    
    Returns:
        {
            "text": "transcribed text",
            "success": true,
            "duration_ms": 1234
        }
    """
    start_time = time.time()
    temp_file_path = None

    try:
        # Validate
        if voice_service is None:
            raise HTTPException(
                status_code=503,
                detail="Voice service not available. Check GROQ_API_KEY configuration."
            )
        
        validate_audio_file(audio)
        
        # Save audio file
        temp_file_path, content = await save_upload_file(audio)
        
        # Transcribe
        logger.info(f"Starting transcription for: {temp_file_path}")
        transcription = voice_service.transcribe(temp_file_path)

        if not transcription or transcription.strip() == "":
            raise HTTPException(
                status_code=400,
                detail="Transcription returned empty result. Please try speaking more clearly."
            )

        duration_ms = int((time.time() - start_time) * 1000)
        logger.info(f"✓ Transcription successful ({duration_ms}ms): {transcription}")
        
        return {
            "text": transcription,
            "success": True,
            "duration_ms": duration_ms,
            "audio_size_bytes": len(content)
        }

    except HTTPException:
        raise
    except ValueError as e:
        logger.error(f"Validation error: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Transcription error: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Transcription failed: {str(e)}"
        )
    finally:
        cleanup_temp_file(temp_file_path)


@router.post("/parse-intent")
async def parse_intent(audio: UploadFile = File(...)):
    """
    Transcribe audio and parse user intent
    
    Args:
        audio: Audio file
    
    Returns:
        {
            "transcription": "user's speech",
            "intent": {
                "intent": "TRAIN_MODEL",
                "entities": {...},
                "confidence": 0.85
            },
            "success": true
        }
    """
    start_time = time.time()
    temp_file_path = None

    try:
        # Validate services
        validate_services()
        validate_audio_file(audio)
        
        # Save audio
        temp_file_path, content = await save_upload_file(audio)
        
        # Step 1: Transcribe
        logger.info("Step 1: Transcribing audio...")
        transcription = voice_service.transcribe(temp_file_path)

        if not transcription or transcription.strip() == "":
            raise HTTPException(
                status_code=400,
                detail="Could not transcribe audio. Please try again."
            )

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

    except HTTPException:
        raise
    except ValueError as e:
        logger.error(f"Validation error: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Intent parsing error: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Intent parsing failed: {str(e)}"
        )
    finally:
        cleanup_temp_file(temp_file_path)


@router.post("/process")
async def process_voice_command(audio: UploadFile = File(...)):
    """
    Process voice command with text-to-speech response
    Transcribes audio, parses intent, executes action, and generates voice response
    
    Args:
        audio: Audio file with voice command
    
    Returns:
        {
            "transcription": "user's speech",
            "intent": {...},
            "execution": {...},
            "response_audio": "base64_encoded_audio_or_null",
            "response_text": "text response for accessibility",
            "success": true
        }
    """
    start_time = time.time()
    temp_file_path = None
    tts_service = None
    response_audio_path = None

    try:
        # Initialize TTS service
        tts_service = TTSService()
        
        # Validate services
        validate_services()
        validate_audio_file(audio)
        
        # Save audio
        temp_file_path, content = await save_upload_file(audio)
        
        logger.info(f"Starting voice command processing, audio size: {len(content)} bytes")
        
        # Step 1: Transcribe
        logger.info("Step 1/4: Transcribing audio...")
        transcription = voice_service.transcribe(temp_file_path)
        
        if not transcription or transcription.strip() == "":
            raise HTTPException(
                status_code=400,
                detail="Could not transcribe audio. Please try again."
            )
        
        logger.info(f"✓ Transcribed: '{transcription}'")
        
        # Step 2: Parse intent
        logger.info("Step 2/4: Parsing intent...")
        intent_data = nlu_service.parse_intent(transcription)
        logger.info(f"✓ Intent: {intent_data['intent']} "
                   f"(confidence: {intent_data['confidence']:.2f})")
        
        # Step 3: Execute intent
        logger.info("Step 3/4: Executing action...")
        execution_result = nlu_service.execute_intent(intent_data)
        logger.info(f"✓ Execution: {execution_result.get('action', 'unknown')}")
        
        # Step 4: Generate voice response
        logger.info("Step 4/4: Generating voice response...")
        response_text = execution_result.get('message', 'Operation completed.')
        
        # Convert response to speech
        response_audio_path = tts_service.text_to_speech(response_text)
        
        # Read audio file and encode as base64 if successful
        response_audio_base64 = None
        if response_audio_path and os.path.exists(response_audio_path):
            try:
                with open(response_audio_path, 'rb') as f:
                    audio_bytes = f.read()
                    import base64
                    response_audio_base64 = base64.b64encode(audio_bytes).decode('utf-8')
            except Exception as e:
                logger.warning(f"Failed to encode response audio: {e}")
        
        duration_ms = int((time.time() - start_time) * 1000)
        
        result = {
            "transcription": transcription,
            "intent": intent_data,
            "execution": execution_result,
            "response_text": response_text,
            "response_audio": response_audio_base64,
            "success": True,
            "duration_ms": duration_ms,
            "pipeline": {
                "transcription_complete": True,
                "intent_parsed": True,
                "action_executed": execution_result.get('success', False),
                "voice_response_generated": response_audio_path is not None
            }
        }
        
        logger.info(f"✓ Voice command processing complete ({duration_ms}ms)")
        return result
        
    except HTTPException:
        raise
    except ValueError as e:
        logger.error(f"Validation error: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Voice command processing error: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Voice command processing failed: {str(e)}"
        )
    finally:
        # Cleanup temporary files
        cleanup_temp_file(temp_file_path)
        if response_audio_path and tts_service:
            tts_service.cleanup_audio_file(response_audio_path)


@router.post("/execute")
async def execute_voice_command(audio: UploadFile = File(...)):
    """
    Complete voice workflow: transcribe + parse intent + execute action
    
    This is the full voice-to-action pipeline that:
    1. Transcribes the audio to text
    2. Parses the intent and entities
    3. Executes the appropriate action
    
    Args:
        audio: Audio file with voice command
    
    Returns:
        {
            "transcription": "user's speech",
            "intent": {...},
            "execution": {
                "success": true,
                "action": "training_complete",
                "message": "Model trained successfully",
                "result": {...}
            },
            "success": true
        }
    """
    start_time = time.time()
    temp_file_path = None

    try:
        # Validate services
        validate_services()
        validate_audio_file(audio)
        
        # Save audio
        temp_file_path, content = await save_upload_file(audio)
        
        logger.info(f"Starting voice command execution, audio size: {len(content)} bytes")
        
        # Step 1: Transcribe
        logger.info("Step 1/3: Transcribing audio...")
        transcription = voice_service.transcribe(temp_file_path)
        
        if not transcription or transcription.strip() == "":
            raise HTTPException(
                status_code=400,
                detail="Could not transcribe audio. Please try again."
            )
        
        logger.info(f"✓ Transcribed: '{transcription}'")
        
        # Step 2: Parse intent
        logger.info("Step 2/3: Parsing intent...")
        intent_data = nlu_service.parse_intent(transcription)
        logger.info(f"✓ Intent: {intent_data['intent']} "
                   f"(confidence: {intent_data['confidence']:.2f})")
        
        # Step 3: Execute intent
        logger.info("Step 3/3: Executing action...")
        execution_result = nlu_service.execute_intent(intent_data)
        logger.info(f"✓ Execution: {execution_result.get('action', 'unknown')}")
        
        duration_ms = int((time.time() - start_time) * 1000)
        
        return {
            "transcription": transcription,
            "intent": intent_data,
            "execution": execution_result,
            "success": True,
            "duration_ms": duration_ms,
            "pipeline": {
                "transcription_complete": True,
                "intent_parsed": True,
                "action_executed": execution_result.get('success', False)
            }
        }
        
    except HTTPException:
        raise
    except ValueError as e:
        logger.error(f"Validation error: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Voice execution error: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Voice command execution failed: {str(e)}"
        )
    finally:
        cleanup_temp_file(temp_file_path)


@router.post("/process-text")
async def process_text_command(request: Request):
    """
    Process a text command (no audio transcription needed)
    Useful for testing or text-based interfaces
    
    Args:
        request body: {"text": "user command"}
    
    Returns:
        {
            "text": "user command",
            "intent": {...},
            "execution": {...},
            "success": true
        }
    """
    try:
        # Validate NLU service
        if nlu_service is None:
            raise HTTPException(
                status_code=503,
                detail="NLU service not available."
            )
        
        # Parse request body
        body = await request.json()
        text = body.get("text", "").strip()
        
        if not text:
            raise HTTPException(
                status_code=400,
                detail="No text provided in request body"
            )
        
        logger.info(f"Processing text command: '{text}'")
        
        # Parse intent
        intent_data = nlu_service.parse_intent(text)
        logger.info(f"✓ Intent: {intent_data['intent']} "
                   f"(confidence: {intent_data['confidence']:.2f})")
        
        # Execute intent
        execution_result = nlu_service.execute_intent(intent_data)
        logger.info(f"✓ Execution: {execution_result.get('action', 'unknown')}")
        
        return {
            "text": text,
            "intent": intent_data,
            "execution": execution_result,
            "success": True
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Text processing error: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Text command processing failed: {str(e)}"
        )


@router.post("/quick-command")
async def quick_command(audio: UploadFile = File(...)):
    """
    Quick voice command processing with optimized response
    Returns only essential information for faster UI updates
    
    Args:
        audio: Audio file
    
    Returns:
        {
            "text": "transcribed text",
            "action": "training_complete",
            "message": "Success message",
            "success": true
        }
    """
    temp_file_path = None

    try:
        validate_services()
        validate_audio_file(audio)
        
        # Save and transcribe
        temp_file_path, _ = await save_upload_file(audio)
        transcription = voice_service.transcribe(temp_file_path)
        
        if not transcription:
            raise HTTPException(status_code=400, detail="Transcription failed")
        
        # Process with NLU pipeline
        result = nlu_service.process_voice_command(transcription)
        
        # Return simplified response
        return {
            "text": transcription,
            "action": result.get('action', 'unknown'),
            "message": result.get('message', ''),
            "success": result.get('success', False),
            "needs_input": result.get('needs_input', False),
            "suggestions": result.get('suggestions', [])
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Quick command error: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cleanup_temp_file(temp_file_path)


@router.get("/supported-intents")
async def get_supported_intents():
    """
    Get list of supported voice intents and example commands
    
    Returns:
        {
            "intents": [...],
            "examples": {...}
        }
    """
    return {
        "intents": [
            {
                "name": "ANALYZE_DATA",
                "description": "Explore and analyze uploaded data",
                "examples": [
                    "analyze my data",
                    "show me statistics",
                    "explore the dataset"
                ]
            },
            {
                "name": "TRAIN_MODEL",
                "description": "Train a machine learning model",
                "examples": [
                    "train a model to predict sales",
                    "build a model for price prediction",
                    "create a random forest model"
                ]
            },
            {
                "name": "EXPLAIN_MODEL",
                "description": "Explain model predictions and features",
                "examples": [
                    "explain the model",
                    "why did it predict that",
                    "show feature importance"
                ]
            },
            {
                "name": "PREDICT",
                "description": "Make predictions with trained model",
                "examples": [
                    "make a prediction",
                    "predict the outcome",
                    "what will happen"
                ]
            },
            {
                "name": "VIEW_RESULTS",
                "description": "View previous results and models",
                "examples": [
                    "show results",
                    "what are the results",
                    "display outcomes"
                ]
            },
            {
                "name": "COMPARE_MODELS",
                "description": "Compare different models",
                "examples": [
                    "compare models",
                    "which model is best",
                    "show model comparison"
                ]
            },
            {
                "name": "UPLOAD_DATA",
                "description": "Upload or load dataset",
                "examples": [
                    "upload data",
                    "load dataset",
                    "import file"
                ]
            },
            {
                "name": "HELP",
                "description": "Get help and guidance",
                "examples": [
                    "help",
                    "what can you do",
                    "how do I use this"
                ]
            }
        ],
        "supported_formats": [".webm", ".wav", ".mp3", ".m4a", ".ogg", ".flac"],
        "max_audio_size_mb": 25
    }


# Note: Exception handlers are defined in main.py on the FastAPI app instance
# They cannot be added to APIRouter - that causes AttributeError

# Log initialization on module load
logger.info("=" * 60)
logger.info("Voice API Router Loaded")
logger.info(f"Voice Service: {'✓ Available' if voice_service else '✗ Not Available'}")
logger.info(f"NLU Service: {'✓ Available' if nlu_service else '✗ Not Available'}")
logger.info("=" * 60)


if __name__ == "__main__":
    # For testing the router directly
    import uvicorn
    from fastapi import FastAPI
    
    app = FastAPI(title="Voice API Test")
    app.include_router(router)
    
    uvicorn.run(app, host="0.0.0.0", port=8000)