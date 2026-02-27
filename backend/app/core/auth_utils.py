from datetime import datetime, timedelta
from typing import Optional, Any, Union
from jose import jwt, JWTError
from passlib.context import CryptContext
from passlib.exc import MissingBackendError, UnknownHashError
import hashlib
import hmac
import secrets
import os
import logging
from dotenv import load_dotenv
from sqlmodel import Session, select
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from app.models.user import User, TokenData
from app.core.db_utils import get_session
from app.core.admin_store import get_admin_usernames

load_dotenv()
logger = logging.getLogger(__name__)

# Configuration
SECRET_KEY = os.getenv("JWT_SECRET_KEY")
if not SECRET_KEY:
    # Keep app functional in local/dev while avoiding a static hardcoded secret.
    SECRET_KEY = secrets.token_urlsafe(64)
    logger.warning("JWT_SECRET_KEY is not set; generated an ephemeral secret for this process.")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 # 24 hours

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def _parse_allowlist(env_value: Optional[str]) -> set[str]:
    if not env_value:
        return set()
    return {item.strip().lower() for item in env_value.split(",") if item.strip()}


def is_admin_username(username: str) -> bool:
    dynamic_admins = get_admin_usernames()
    env_admins = _parse_allowlist(os.getenv("ADMIN_USERNAMES"))
    all_admins = dynamic_admins.union(env_admins)
    return username.strip().lower() in all_admins


def is_admin_user(user: User) -> bool:
    admin_usernames = get_admin_usernames().union(_parse_allowlist(os.getenv("ADMIN_USERNAMES")))
    admin_emails = _parse_allowlist(os.getenv("ADMIN_EMAILS"))

    if user.username.lower() in admin_usernames:
        return True
    if user.email.lower() in admin_emails:
        return True
    return False

def verify_password(plain_password: str, hashed_password: str) -> bool:
    # Prefer passlib+bcrypt when available, fallback to pbkdf2 hash format.
    if hashed_password.startswith("pbkdf2_sha256$"):
        try:
            _, iter_str, salt, expected = hashed_password.split("$", 3)
            rounds = int(iter_str)
            digest = hashlib.pbkdf2_hmac(
                "sha256",
                plain_password.encode("utf-8"),
                salt.encode("utf-8"),
                rounds,
            ).hex()
            return hmac.compare_digest(digest, expected)
        except Exception:
            return False

    try:
        return pwd_context.verify(plain_password, hashed_password)
    except (MissingBackendError, UnknownHashError):
        return False
    except Exception:
        return False

def get_password_hash(password: str) -> str:
    try:
        return pwd_context.hash(password)
    except (MissingBackendError, UnknownHashError):
        rounds = 390000
        salt = secrets.token_hex(16)
        digest = hashlib.pbkdf2_hmac(
            "sha256",
            password.encode("utf-8"),
            salt.encode("utf-8"),
            rounds,
        ).hex()
        return f"pbkdf2_sha256${rounds}${salt}${digest}"
    except Exception:
        rounds = 390000
        salt = secrets.token_hex(16)
        digest = hashlib.pbkdf2_hmac(
            "sha256",
            password.encode("utf-8"),
            salt.encode("utf-8"),
            rounds,
        ).hex()
        return f"pbkdf2_sha256${rounds}${salt}${digest}"

# OAuth2 scheme
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login")

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(db: Session = Depends(get_session), token: str = Depends(oauth2_scheme)) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
        token_data = TokenData(username=username)
    except JWTError:
        raise credentials_exception
    user = db.exec(select(User).where(User.username == token_data.username)).first()
    if user is None:
        raise credentials_exception
    return user

async def get_current_active_user(current_user: User = Depends(get_current_user)) -> User:
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user


async def get_current_admin_user(current_user: User = Depends(get_current_active_user)) -> User:
    if not is_admin_user(current_user):
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user

def authenticate_user(db: Session, username: str, password: str) -> Union[User, bool]:
    user = db.exec(select(User).where(User.username == username)).first()
    if not user:
        return False
    if not verify_password(password, user.hashed_password):
        return False
    return user
