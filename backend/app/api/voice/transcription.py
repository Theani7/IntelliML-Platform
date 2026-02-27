"""
Transcription Endpoints
Handles audio transcription and intent parsing from audio input.
"""

from fastapi import File, UploadFile, HTTPException
import time

from app.api.voice import (
    router, voice_service, nlu_service, logger,
    validate_services, validate_audio_file, save_upload_file, cleanup_temp_file
)


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
        if voice_service is None:
            raise HTTPException(
                status_code=503,
                detail="Voice service not available. Check GROQ_API_KEY configuration."
            )

        validate_audio_file(audio)

        temp_file_path, content = await save_upload_file(audio)

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
        validate_services()
        validate_audio_file(audio)

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
