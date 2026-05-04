"""
================================================================================
Authentication & Authorization Utilities
================================================================================

PURPOSE:
    Handles all authentication and authorization logic for the IntelliML platform.
    This includes password hashing, JWT token creation/validation, and user
    permission checks.

SECURITY ARCHITECTURE:
    
    1. PASSWORD HASHING
       - Primary: bcrypt (via passlib)
       - Fallback: PBKDF2-SHA256 (for compatibility)
       - Why: bcrypt is slow by design, resistant to rainbow table attacks
       
    2. TOKEN-BASED AUTHENTICATION
       - Format: JWT (JSON Web Token)
       - Algorithm: HS256 (HMAC with SHA-256)
       - Expiration: 24 hours (configurable via ACCESS_TOKEN_EXPIRE_MINUTES)
       
    3. AUTHORIZATION
       - Admin accounts: Can only access /api/admin/* endpoints
       - Regular users: Can access all other endpoints
       - Admin check: By username or email (from environment variables)

JWT TOKEN STRUCTURE:
    {
        "sub": "username",           # Subject (user identifier)
        "exp": 1234567890,          # Expiration time (UTC)
        "type": "access"            # Token type (future use)
    }

PASSWORD HASHING DETAILS:
    bcrypt format: $2b$12$...
    PBKDF2 format: pbkdf2_sha256$rounds$salt$hash
    
    Why multiple formats?
    - bcrypt is the default for new passwords
    - PBKDF2 provides fallback if bcrypt library has issues
    - Both are slow hashes (intentional for security)

ADMIN DETECTION:
    A user is considered admin if:
    - username matches 'admin' (case-insensitive)
    - username in ADMIN_USERNAMES env variable (comma-separated)
    - email in ADMIN_EMAILS env variable (comma-separated)
    
================================================================================
"""

from datetime import datetime, timedelta
from typing import Optional, Union
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
from fastapi import Depends
from fastapi.security import OAuth2PasswordBearer
from app.models.user import User, TokenData
from app.core.db_utils import get_session
from app.core.admin_store import get_admin_usernames
from app.core.exceptions import UnauthorizedError, ForbiddenError

load_dotenv()
logger = logging.getLogger(__name__)

# ================================================================================
# JWT CONFIGURATION
# ================================================================================
# JWT (JSON Web Token) settings for creating and validating auth tokens
#
# SECRET_KEY: The secret used to sign tokens
#   - If JWT_SECRET_KEY env var is set, use that
#   - Otherwise, generate a random 64-byte URL-safe string
#   - WARNING: Tokens signed with auto-generated key are INVALID after server restart!
#
# ALGORITHM: The cryptographic algorithm used to sign tokens
#   - HS256 = HMAC with SHA-256
#   - Symmetric algorithm: same key signs and verifies
#
# ACCESS_TOKEN_EXPIRE_MINUTES: How long tokens remain valid
#   - Default: 24 hours (60 * 24 = 1440 minutes)
#   - After expiration, user must login again

SECRET_KEY = os.getenv("JWT_SECRET_KEY")
if not SECRET_KEY:
    # Generate a secure random key for this session
    # Note: This means tokens won't survive server restarts!
    SECRET_KEY = secrets.token_urlsafe(64)
    logger.warning("JWT_SECRET_KEY is not set; generated an ephemeral secret for this process.")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 # 24 hours

# ================================================================================
# PASSWORD HASHING CONTEXT
# ================================================================================
# passlib provides a unified interface for password hashing
# - "bcrypt" is the primary algorithm (recommended)
# - "deprecated: auto" allows gradual migration from old formats

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


# ================================================================================
# HELPER FUNCTIONS
# =============================================================================

def _parse_allowlist(env_value: Optional[str]) -> set[str]:
    """
    Parse comma-separated environment variable into a set of lowercase strings.
    
    Used for parsing admin username/email allowlists from environment variables.
    
    Example:
        ADMIN_USERNAMES="admin,superuser,manager"
        Returns: {"admin", "superuser", "manager"}
    
    Args:
        env_value: Comma-separated string from environment variable
        
    Returns:
        Set of lowercase, stripped values
    """
    if not env_value:
        return set()
    return {item.strip().lower() for item in env_value.split(",") if item.strip()}


def is_admin_username(username: str) -> bool:
    """
    Check if a username should be treated as an admin.
    
    A username is considered admin if it matches:
    1. Any dynamically configured admin (from admin_store.json)
    2. Any username in ADMIN_USERNAMES environment variable
    
    This is used by SecurityMiddleware to enforce admin route restrictions.
    
    Args:
        username: The username to check (will be lowercased and stripped)
        
    Returns:
        True if user should have admin privileges
        
    Example:
        is_admin_username("Admin")     # True (matches 'admin')
        is_admin_username("superuser") # True if in ADMIN_USERNAMES
        is_admin_username("user1")      # False
    """
    dynamic_admins = get_admin_usernames()
    env_admins = _parse_allowlist(os.getenv("ADMIN_USERNAMES"))
    all_admins = dynamic_admins.union(env_admins)
    return username.strip().lower() in all_admins


def is_admin_user(user: User) -> bool:
    """
    Check if a User object should be treated as an admin.
    
    Checks multiple criteria:
    1. Username in admin allowlist
    2. Email in admin allowlist
    
    Used for FastAPI dependency injection (get_current_admin_user).
    
    Args:
        user: SQLAlchemy User object
        
    Returns:
        True if user has admin privileges
        
    Note:
        This checks both username AND email for flexibility.
        A user can be admin by email even if username isn't 'admin'.
    """
    admin_usernames = get_admin_usernames().union(_parse_allowlist(os.getenv("ADMIN_USERNAMES")))
    admin_emails = _parse_allowlist(os.getenv("ADMIN_EMAILS"))

    if user.username.lower() in admin_usernames:
        return True
    if user.email.lower() in admin_emails:
        return True
    return False


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verify a plain password against a stored hash.
    
    Handles two hash formats:
    
    1. PBKDF2-SHA256 format: "pbkdf2_sha256$rounds$salt$hash"
       - Legacy format for backward compatibility
       - 390,000 rounds (computationally intensive)
       - Uses hmac.compare_digest for timing-safe comparison
    
    2. bcrypt format: "$2b$12$..." or "$2y$..."
       - Modern default format
       - Handled by passlib CryptContext
    
    Args:
        plain_password: The password user entered
        hashed_password: The stored hash from database
        
    Returns:
        True if password matches, False otherwise
        
    Security Notes:
    - Uses constant-time comparison (hmac.compare_digest) to prevent timing attacks
    - Returns False for ANY error (don't reveal what failed)
    """
    # ==========================================================================
    # FORMAT 1: PBKDF2-SHA256 (Legacy)
    # ==========================================================================
    # Format: pbkdf2_sha256$rounds$salt$hash
    # Example: pbkdf2_sha256$390000$abc123$def456...
    if hashed_password.startswith("pbkdf2_sha256$"):
        try:
            # Parse the hash format
            # "$" splits: ["pbkdf2_sha256", "rounds", "salt", "hash"]
            _, iter_str, salt, expected = hashed_password.split("$", 3)
            rounds = int(iter_str)
            
            # Compute hash of provided password with same salt and rounds
            digest = hashlib.pbkdf2_hmac(
                "sha256",
                plain_password.encode("utf-8"),
                salt.encode("utf-8"),
                rounds,
            ).hex()
            
            # Constant-time comparison (prevents timing attacks)
            return hmac.compare_digest(digest, expected)
        except Exception:
            # Fail silently - don't reveal what went wrong
            return False

    # ==========================================================================
    # FORMAT 2: bcrypt (Modern)
    # ==========================================================================
    # Most passwords will be in this format
    try:
        return pwd_context.verify(plain_password, hashed_password)
    except (MissingBackendError, UnknownHashError):
        # bcrypt library issue - password couldn't be verified
        return False
    except Exception:
        # Any other error - fail securely
        return False


def get_password_hash(password: str) -> str:
    """
    Hash a password using bcrypt (with PBKDF2 fallback).
    
    This should be called when:
    1. A new user registers
    2. A user changes their password
    
    The hashed password is safe to store in the database.
    
    Args:
        password: The plain text password to hash
        
    Returns:
        The hashed password string, prefixed with algorithm identifier
        
    Hash Format:
        bcrypt: $2b$12$... (default, recommended)
        pbkdf2: pbkdf2_sha256$390000$salt$hash (fallback)
    
    Security Notes:
    - bcrypt is intentionally slow (12 rounds by default)
    - Salt is automatically generated (unique per password)
    - Can't reverse-engineer password from hash
    """
    try:
        # Try bcrypt first (preferred)
        return pwd_context.hash(password)
    except (MissingBackendError, UnknownHashError):
        # bcrypt library issue - fallback to PBKDF2
        rounds = 390000
        salt = secrets.token_hex(16)  # 32 bytes of randomness
        digest = hashlib.pbkdf2_hmac(
            "sha256",
            password.encode("utf-8"),
            salt.encode("utf-8"),
            rounds,
        ).hex()
        return f"pbkdf2_sha256${rounds}${salt}${digest}"
    except Exception:
        # Any other error - still return valid PBKDF2 hash
        rounds = 390000
        salt = secrets.token_hex(16)
        digest = hashlib.pbkdf2_hmac(
            "sha256",
            password.encode("utf-8"),
            salt.encode("utf-8"),
            rounds,
        ).hex()
        return f"pbkdf2_sha256${rounds}${salt}${digest}"


# ================================================================================
# OAUTH2 / JWT HANDLING
# ================================================================================
"""
OAuth2 scheme for FastAPI dependency injection.

This defines how FastAPI extracts the JWT token from requests.
The token should be in the Authorization header as: "Bearer <token>"

Used by: get_current_user dependency
"""

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login")


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """
    Create a JWT (JSON Web Token) for authentication.
    
    This is called after successful login to generate a token that the client
    will include in subsequent requests.
    
    JWT Structure (after decoding):
        {
            "sub": "username",      # Subject (who this token represents)
            "exp": 1234567890,      # Expiration time
            ...any other data passed in 'data' dict...
        }
    
    Args:
        data: Dictionary to encode in the token
              Must contain "sub" (username) at minimum
        expires_delta: Custom expiration time (overrides default)
                      If None, uses ACCESS_TOKEN_EXPIRE_MINUTES (24 hours)
        
    Returns:
        Encoded JWT string that can be passed to clients
        
    Example:
        token = create_access_token({"sub": "user1"})
        # Client stores token and sends in Authorization header:
        # Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
    """
    to_encode = data.copy()
    
    # Set expiration time
    if expires_delta:
        # Custom expiration (for "remember me" functionality, etc.)
        expire = datetime.utcnow() + expires_delta
    else:
        # Default expiration (24 hours)
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    # Add expiration to token data
    to_encode.update({"exp": expire})
    
    # Create and return the JWT
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


async def get_current_user(
    db: Session = Depends(get_session), 
    token: str = Depends(oauth2_scheme)
) -> User:
    """
    FastAPI dependency to get the current authenticated user.
    
    This is used as a dependency in route handlers:
        @app.get("/protected")
        async def protected_route(user: User = Depends(get_current_user)):
            ...
    
    Flow:
    1. Extract token from Authorization header (via oauth2_scheme)
    2. Decode and validate the JWT
    3. Look up user in database
    4. Return User object
        
    Args:
        db: Database session (injected by FastAPI)
        token: JWT token (extracted from header by oauth2_scheme)
        
    Returns:
        User object from database
        
    Raises:
        UnauthorizedError: If token is invalid, expired, or user not found
    """
    try:
        # Decode the JWT - verifies signature and checks expiration
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        
        if username is None:
            raise UnauthorizedError("Could not validate credentials")
        
        token_data = TokenData(username=username)
    except JWTError:
        # Token is invalid, expired, or tampered with
        raise UnauthorizedError("Could not validate credentials")
    
    # Look up user in database
    user = db.exec(select(User).where(User.username == token_data.username)).first()
    if user is None:
        # User was deleted after token was issued
        raise UnauthorizedError("Could not validate credentials")
    
    return user


async def get_current_active_user(
    current_user: User = Depends(get_current_user)
) -> User:
    """
    FastAPI dependency to verify user is active (not deactivated).
    
    Use this when you need to ensure:
    - User account exists
    - User is not banned/suspended
    - User can access the system
    
    Args:
        current_user: User from get_current_user (injected by FastAPI)
        
    Returns:
        User object if active
        
    Raises:
        UnauthorizedError: If user account is deactivated
    """
    if not current_user.is_active:
        raise UnauthorizedError("Inactive user")
    return current_user


async def get_current_admin_user(
    current_user: User = Depends(get_current_active_user)
) -> User:
    """
    FastAPI dependency to verify admin privileges.
    
    Use this for admin-only routes:
        @app.get("/admin/sensitive")
        async def admin_route(user: User = Depends(get_current_admin_user)):
            ...
    
    Checks:
    1. User is authenticated (get_current_active_user)
    2. User has admin privileges (is_admin_user)
    
    Args:
        current_user: User from get_current_active_user (injected)
        
    Returns:
        User object if admin
        
    Raises:
        ForbiddenError: If user is not an admin
    """
    if not is_admin_user(current_user):
        raise ForbiddenError("Admin access required")
    return current_user


def authenticate_user(db: Session, username: str, password: str) -> Union[User, bool]:
    """
    Authenticate a user by username and password.
    
    This is the core login verification logic:
    1. Look up user by username
    2. Verify password against stored hash
    
    Args:
        db: Database session
        username: The username from login form
        password: The plain password from login form
        
    Returns:
        User object if authentication successful
        False if username not found or password incorrect
        
    Note:
        Returns False for BOTH "user not found" and "wrong password"
        This prevents username enumeration attacks
        
    Example:
        user = authenticate_user(db, "user1", "password123")
        if user:
            token = create_access_token({"sub": user.username})
    """
    # Step 1: Find user by username
    user = db.exec(select(User).where(User.username == username)).first()
    if not user:
        return False  # User doesn't exist
    
    # Step 2: Verify password
    if not verify_password(password, user.hashed_password):
        return False  # Wrong password
    
    # Success!
    return user