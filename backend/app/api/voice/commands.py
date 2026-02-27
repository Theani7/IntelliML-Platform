"""
Voice Command Processing Endpoints
Handles full voice pipeline: process, execute, text-command, quick-command.
"""

from fastapi import File, UploadFile, HTTPException, Request
import os
import time

from app.api.voice import (
    router, voice_service, nlu_service, logger,
    validate_services, validate_audio_file, save_upload_file, cleanup_temp_file
)
from app.services.tts_service import TTSService


@router.post("/process")
async def process_voice_command(audio: UploadFile = File(...)):
    """
    Process voice command with text-to-speech response
    Transcribes audio, parses intent, executes action, and generates voice response
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

        response_audio_path = tts_service.text_to_speech(response_text)

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
        cleanup_temp_file(temp_file_path)
        if response_audio_path and tts_service:
            tts_service.cleanup_audio_file(response_audio_path)


@router.post("/execute")
async def execute_voice_command(audio: UploadFile = File(...)):
    """
    Complete voice workflow: transcribe + parse intent + execute action
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
    """
    try:
        if nlu_service is None:
            raise HTTPException(
                status_code=503,
                detail="NLU service not available."
            )

        body = await request.json()
        text = body.get("text", "").strip()

        if not text:
            raise HTTPException(
                status_code=400,
                detail="No text provided in request body"
            )

        logger.info(f"Processing text command: '{text}'")

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
    """
    temp_file_path = None

    try:
        validate_services()
        validate_audio_file(audio)

        temp_file_path, _ = await save_upload_file(audio)
        transcription = voice_service.transcribe(temp_file_path)

        if not transcription:
            raise HTTPException(status_code=400, detail="Transcription failed")

        result = nlu_service.process_voice_command(transcription)

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
