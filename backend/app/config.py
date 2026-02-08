from pydantic_settings import BaseSettings
from typing import List
import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env file explicitly BEFORE creating Settings
load_dotenv()

class Settings(BaseSettings):
    """
    Application settings loaded from .env file
    This centralizes all configuration in one place
    """
    
    # Application Info
    APP_NAME: str = "IntelliML Platform"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True
    ENVIRONMENT: str = "development"
    
    # Server Configuration
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    RELOAD: bool = True
    
    # Groq API - Make it optional with default to avoid startup errors
    GROQ_API_KEY: str = ""
    WHISPER_MODEL: str = "whisper-large-v3"
    LLM_MODEL: str = "llama-3.3-70b-versatile"
    
    # CORS - Allow Next.js frontend to make requests
    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000"
    ]
    
    # File Upload Settings
    MAX_FILE_SIZE: int = 50000000  # 50MB
    ALLOWED_FILE_TYPES: List[str] = ["csv", "xlsx", "xls", "json", "png", "jpg", "jpeg"]
    
    # Directories
    BASE_DIR: Path = Path(__file__).resolve().parent.parent
    DATA_CACHE_DIR: Path = BASE_DIR / "data_cache"
    MODEL_CACHE_DIR: Path = BASE_DIR / "model_cache"
    
    # ML Settings
    MAX_TRAINING_TIME: int = 300  # 5 minutes
    
    # Voice Settings
    VOICE_TIMEOUT: int = 30  # seconds
    TTS_ENGINE: str = "gtts"
    
    class Config:
        env_file = ".env"
        env_file_encoding = 'utf-8'
        case_sensitive = True
        extra = "ignore"  # Ignore extra fields in .env

# Create single instance to use throughout the app
settings = Settings()

# Create cache directories if they don't exist
settings.DATA_CACHE_DIR.mkdir(exist_ok=True, parents=True)
settings.MODEL_CACHE_DIR.mkdir(exist_ok=True, parents=True)

# Validation and warnings
import logging
logger = logging.getLogger(__name__)

if not settings.GROQ_API_KEY:
    logger.warning("=" * 60)
    logger.warning("⚠️  GROQ_API_KEY is NOT configured!")
    logger.warning("⚠️  Voice features will NOT work!")
    logger.warning("⚠️  Please add GROQ_API_KEY to your .env file")
    logger.warning("=" * 60)
else:
    logger.info(f"✓ GROQ_API_KEY configured (starts with: {settings.GROQ_API_KEY[:10]}...)")
