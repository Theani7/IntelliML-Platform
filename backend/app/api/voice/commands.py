"""
================================================================================
Voice Command Processing Endpoints
================================================================================

PURPOSE:
    Complete voice command pipeline with multiple processing modes.
    Transforms voice (or text) into actionable system commands.

PIPELINE MODES:

1. FULL PIPELINE (/process)
   Audio → Transcription → Intent → Execution → TTS Response
   
2. EXECUTE (/execute)
   Audio → Transcription → Intent → Execution
   
3. TEXT COMMAND (/process-text)
   Text → Intent → Execution
   
4. QUICK COMMAND (/quick-command)
   Audio → Transcription → Simplified Processing

INTENT TYPES:
    - ANALYZE_DATA: Run EDA analysis
    - TRAIN_MODEL: Start ML training
    - UPLOAD_DATA: Upload dataset
    - EXPLAIN_MODEL: Get model explanations
    - HELP: Get assistance
    - UNKNOWN: Cannot parse

TTS (TEXT-TO-SPEECH):
    - Uses gTTS (Google Text-to-Speech)
    - Returns audio as base64 encoded MP3
    - Enables voice feedback to user

================================================================================
"""

from fastapi import File, UploadFile, Request
import os
import time

from app.api.voice import (
    router, voice_service, nlu_service, logger,
    validate_services, validate_audio_file, save_upload_file, cleanup_temp_file
)
from app.services.tts_service import TTSService
from app.core.exceptions import ValidationError, ServiceUnavailableError


@router.post("/process")
async def process_voice_command(audio: UploadFile = File(...)):
    """
    Complete voice command with voice response.
    
    Full 4-step pipeline:
    1. Transcribe audio to text
    2. Parse user intent
    3. Execute the action
    4. Generate voice response (TTS)
    
    Request:
        Multipart form with 'audio' file
        
    Returns:
        {
            "transcription": "analyze my data",
            "intent": {
                "intent": "ANALYZE_DATA",
                "confidence": 0.95,
                ...
            },
            "execution": {
                "action": "analyze",
                "success": true,
                "message": "Analysis complete"
            },
            "response_text": "Your data analysis is ready",
            "response_audio": "base64_encoded_mp3...",
            "success": true,
            "duration_ms": 3500,
            "pipeline": {
                "transcription_complete": true,
                "intent_parsed": true,
                "action_executed": true,
                "voice_response_generated": true
            }
        }
    """
    start_time = time.time()
    temp_file_path = None
    tts_service = None
    response_audio_path = None

    try:
        tts_service = TTSService()

        validate_services()
        validate_audio_file(audio)

        temp_file_path, content = await save_upload_file(audio)

        logger.info(f"Starting voice command processing, audio size: {len(content)} bytes")

        # Step 1: Transcribe
        logger.info("Step 1/4: Transcribing audio...")
        transcription = voice_service.transcribe(temp_file_path)

        if not transcription or transcription.strip() == "":
            raise ValidationError("Could not transcribe audio. Please try again.")

        logger.info(f"✓ Transcribed: '{transcription}'")

        # Step 2: Parse intent
        logger.info("Step 2/4: Parsing intent...")
        intent_data = nlu_service.parse_intent(transcription)
        logger.info(f"✓ Intent: {intent_data['intent']} "
                   f"(confidence: {intent_data['confidence']:.2f})")

        # Step 3: Execute action
        logger.info("Step 3/4: Executing action...")
        execution_result = nlu_service.execute_intent(intent_data)
        logger.info(f"✓ Execution: {execution_result.get('action', 'unknown')}")

        # Step 4: Generate voice response
        logger.info("Step 4/4: Generating voice response...")
        response_text = execution_result.get('message', 'Operation completed.')

        response_audio_path = tts_service.text_to_speech(response_text)

        # Encode audio as base64 for transmission
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

    except (ValidationError, ServiceUnavailableError):
        raise
    except Exception as e:
        logger.error(f"Voice command processing error: {str(e)}", exc_info=True)
        raise ServiceUnavailableError(f"Voice command processing failed: {str(e)}")
    finally:
        cleanup_temp_file(temp_file_path)
        if response_audio_path and tts_service:
            tts_service.cleanup_audio_file(response_audio_path)


@router.post("/execute")
async def execute_voice_command(audio: UploadFile = File(...)):
    """
    Execute voice command (no voice response).
    
    3-step pipeline:
    1. Transcribe audio
    2. Parse intent
    3. Execute action
    
    Use this for text-based result (no TTS).
    
    Request:
        Multipart form with 'audio' file
        
    Returns:
        {
            "transcription": "train a model",
            "intent": {...},
            "execution": {...},
            "success": true,
            "duration_ms": 2000,
            "pipeline": {...}
        }
    """
    start_time = time.time()
    temp_file_path = None

    try:
        validate_services()
        validate_audio_file(audio)

        temp_file_path, content = await save_upload_file(audio)

        logger.info(f"Starting voice command execution, audio size: {len(content)} bytes")

        # Step 1: Transcribe
        logger.info("Step 1/3: Transcribing audio...")
        transcription = voice_service.transcribe(temp_file_path)

        if not transcription or transcription.strip() == "":
            raise ValidationError("Could not transcribe audio. Please try again.")

        logger.info(f"✓ Transcribed: '{transcription}'")

        # Step 2: Parse intent
        logger.info("Step 2/3: Parsing intent...")
        intent_data = nlu_service.parse_intent(transcription)
        logger.info(f"✓ Intent: {intent_data['intent']} "
                   f"(confidence: {intent_data['confidence']:.2f})")

        # Step 3: Execute
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

    except (ValidationError, ServiceUnavailableError):
        raise
    except Exception as e:
        logger.error(f"Voice execution error: {str(e)}", exc_info=True)
        raise ServiceUnavailableError(f"Voice command execution failed: {str(e)}")
    finally:
        cleanup_temp_file(temp_file_path)


@router.post("/process-text")
async def process_text_command(request: Request):
    """
    Process text command (no audio).
    
    Similar to voice command but accepts text directly.
    Useful for:
    - Chat interface
    - Text-based CLI
    - Testing intents
    
    Request Body:
        {"text": "analyze my data"}
        
    Returns:
        {
            "text": "analyze my data",
            "intent": {...},
            "execution": {...},
            "success": true
        }
    """
    if nlu_service is None:
        raise ServiceUnavailableError("NLU service not available.")

    body = await request.json()
    text = body.get("text", "").strip()

    if not text:
        raise ValidationError("No text provided in request body")

    logger.info(f"Processing text command: '{text}'")

    # Parse and execute
    intent_data = nlu_service.parse_intent(text)
    logger.info(f"✓ Intent: {intent_data['intent']} "
               f"(confidence: {intent_data['confidence']:.2f})")

    execution_result = nlu_service.execute_intent(intent_data)
    logger.info(f"✓ Execution: {execution_result.get('action', 'unknown')}")

    return {
        "text": text,
        "intent": intent_data,
        "execution": execution_result,
        "success": True
    }


@router.post("/quick-command")
async def quick_command(audio: UploadFile = File(...)):
    """
    Optimized voice command processing.
    
    Simplified processing:
    - Transcription
    - Quick command processing
    - Fast response
    
    Use for:
    - Simple commands
    - Low-latency requirements
    - Status queries
    
    Request:
        Multipart form with 'audio' file
        
    Returns:
        {
            "text": "show me my data",
            "action": "view_data",
            "message": "Here is your data",
            "success": true,
            "needs_input": false,
            "suggestions": []
        }
    """
    temp_file_path = None

    try:
        validate_services()
        validate_audio_file(audio)

        temp_file_path, _ = await save_upload_file(audio)
        
        # Transcribe
        transcription = voice_service.transcribe(temp_file_path)

        if not transcription:
            raise ValidationError("Transcription failed")

        # Quick processing
        result = nlu_service.process_voice_command(transcription)

        return {
            "text": transcription,
            "action": result.get('action', 'unknown'),
            "message": result.get('message', ''),
            "success": result.get('success', False),
            "needs_input": result.get('needs_input', False),
            "suggestions": result.get('suggestions', [])
        }

    except (ValidationError, ServiceUnavailableError):
        raise
    except Exception as e:
        logger.error(f"Quick command error: {str(e)}", exc_info=True)
        raise ServiceUnavailableError(f"Quick command failed: {str(e)}")
    finally:
        cleanup_temp_file(temp_file_path)