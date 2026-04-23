"""
Voice API Router Package
Handles voice command processing: transcription, intent parsing, and execution.
Split into sub-modules for easier debugging and maintenance.
"""

from fastapi import APIRouter, UploadFile
import logging
import os
import tempfile
from pathlib import Path
from typing import Optional, Dict, Any
import time

from app.services.voice_service import VoiceService
from app.services.nlu_service import NLUService
from app.core.exceptions import ValidationError, ServiceUnavailableError

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

router = APIRouter(
    tags=["voice"],
    responses={
        404: {"description": "Not found"},
        500: {"description": "Internal server error"}
    }
)

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


def validate_services():
    """Validate that required services are initialized"""
    if voice_service is None:
        raise ServiceUnavailableError(
            "Voice service not available. Please check GROQ_API_KEY configuration."
        )
    if nlu_service is None:
        raise ServiceUnavailableError(
            "NLU service not available. Please check configuration."
        )


def validate_audio_file(audio: UploadFile) -> None:
    """Validate uploaded audio file"""
    if not audio or not audio.filename:
        raise ValidationError("No audio file provided")

    allowed_extensions = ['.webm', '.wav', '.mp3', '.m4a', '.ogg', '.flac']
    suffix = Path(audio.filename).suffix.lower()

    if suffix and suffix not in allowed_extensions:
        raise ValidationError(
            f"Unsupported audio format: {suffix}",
            details={"allowed_formats": allowed_extensions}
        )


async def save_upload_file(audio: UploadFile) -> tuple[str, bytes]:
    """Save uploaded file to temporary location"""
    suffix = Path(audio.filename).suffix or ".webm"
    content = await audio.read()

    if not content or len(content) == 0:
        raise ValidationError("Empty audio file received")

    logger.info(f"Received audio: {audio.filename}, size: {len(content)} bytes")

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


from app.api.voice import transcription  # noqa: E402, F401
from app.api.voice import commands       # noqa: E402, F401
from app.api.voice import intents        # noqa: E402, F401

logger.info("=" * 60)
logger.info("Voice API Router Loaded (package)")
logger.info(f"Voice Service: {'✓ Available' if voice_service else '✗ Not Available'}")
logger.info(f"NLU Service: {'✓ Available' if nlu_service else '✗ Not Available'}")
logger.info("=" * 60)


if __name__ == "__main__":
    import uvicorn
    from fastapi import FastAPI

    app = FastAPI(title="Voice API Test")
    app.include_router(router)

    uvicorn.run(app, host="0.0.0.0", port=8000)