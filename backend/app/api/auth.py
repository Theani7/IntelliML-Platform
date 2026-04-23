"""
================================================================================
Authentication API
================================================================================

PURPOSE:
    Handles user registration, login, and profile management.
    Provides JWT-based authentication for all protected endpoints.

AUTHENTICATION FLOW:
    
    1. REGISTER (one-time)
       User creates account with username, email, password
       
    2. LOGIN (per session)
       User provides credentials → receives JWT token
       
    3. AUTHENTICATED REQUESTS
       Client includes token in Authorization header
       Format: Authorization: Bearer <token>

SECURITY:
    - Passwords hashed with bcrypt (with PBKDF2 fallback)
    - JWT tokens expire after 24 hours
    - Tokens signed with secret key
    - Failed login attempts are not distinguishable
      (same message for wrong username vs wrong password)

ENDPOINTS:

1. POST /register
   Create new user account

2. POST /login
   Authenticate and get JWT token

3. GET /me
   Get current user info

4. PUT /me
   Update user profile

5. POST /change-password
   Change password

================================================================================
"""

from fastapi import APIRouter, Depends
from fastapi.security import OAuth2PasswordRequestForm
from sqlmodel import Session, select
from typing import Any
from datetime import timedelta

from app.models.user import User, UserCreate, UserPublic, UserUpdate, PasswordChange, Token
from app.core.auth_utils import (
    authenticate_user,
    create_access_token,
    get_password_hash,
    get_current_active_user,
    is_admin_user,
    verify_password,
)
from app.core.exceptions import ValidationError, UnauthorizedError, ForbiddenError
from app.core.db_utils import get_session

router = APIRouter()


@router.post("/register", response_model=UserPublic)
def register_user(user_in: UserCreate, db: Session = Depends(get_session)) -> Any:
    """
    Register a new user account.
    
    Creates a new user with hashed password.
    Users start as active (is_active=True) and non-admin.
    
    Request Body (UserCreate):
        {
            "username": "newuser",
            "email": "user@example.com",
            "password": "securepassword",
            "full_name": "New User"  // optional
        }
    
    Returns (UserPublic):
        {
            "id": 1,
            "username": "newuser",
            "email": "user@example.com",
            "full_name": "New User",
            "is_active": true,
            "created_at": "2024-01-15T10:00:00",
            "is_admin": false
        }
    
    Raises:
        ValidationError: Username or email already exists
    
    Note:
        Password is automatically hashed before storage.
        Admin role is assigned via ADMIN_USERNAMES/ADMIN_EMAILS env vars.
    """
    # Check if username already taken
    user = db.exec(select(User).where(User.username == user_in.username)).first()
    if user:
        raise ValidationError(
            "The user with this username already exists in the system.",
            details={"field": "username"}
        )
    
    # Check if email already registered
    user = db.exec(select(User).where(User.email == user_in.email)).first()
    if user:
        raise ValidationError(
            "The user with this email already exists in the system.",
            details={"field": "email"}
        )
    
    # Create new user with hashed password
    db_obj = User(
        username=user_in.username,
        email=user_in.email,
        hashed_password=get_password_hash(user_in.password),
        full_name=user_in.full_name,
    )
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj


@router.post("/login", response_model=Token)
def login_for_access_token(
    db: Session = Depends(get_session), 
    form_data: OAuth2PasswordRequestForm = Depends()
) -> Any:
    """
    Authenticate user and return JWT token.
    
    Uses OAuth2 Password Flow (compatible with most clients).
    Token must be included in subsequent requests:
        Authorization: Bearer <token>
    
    Args:
        form_data: OAuth2 form with username and password fields
        
    Returns (Token):
        {
            "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
            "token_type": "bearer"
        }
    
    Token Payload:
        {
            "sub": "username",
            "exp": 1234567890
        }
    
    Raises:
        UnauthorizedError: Invalid credentials
    
    Note:
        - Token expires after 24 hours
        - Uses same error message for wrong username/password
          (prevents username enumeration)
    """
    # Authenticate user (returns User or False)
    user = authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise UnauthorizedError("Incorrect username or password")
    
    # Create token with 24-hour expiration
    access_token_expires = timedelta(minutes=60 * 24)
    access_token = create_access_token(
        data={"sub": user.username},
        expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}


@router.get("/me", response_model=UserPublic)
async def read_users_me(current_user: User = Depends(get_current_active_user)):
    """
    Get current authenticated user's profile.
    
    Requires valid JWT token in Authorization header.
    Automatically extracts user from token.
    
    Returns (UserPublic):
        {
            "id": 6,
            "username": "user1",
            "email": "user1@test.com",
            "full_name": "Test User",
            "is_active": true,
            "created_at": "2024-01-23T16:01:38",
            "is_admin": false
        }
    
    Raises:
        UnauthorizedError: Invalid/expired token
    """
    return {
        "id": current_user.id,
        "username": current_user.username,
        "email": current_user.email,
        "full_name": current_user.full_name,
        "is_active": current_user.is_active,
        "created_at": current_user.created_at,
        "is_admin": is_admin_user(current_user),
    }


@router.put("/me", response_model=UserPublic)
async def update_me(
    payload: UserUpdate,
    db: Session = Depends(get_session),
    current_user: User = Depends(get_current_active_user),
):
    """
    Update current user's profile.
    
    Allows updating:
    - email (must be unique)
    - full_name
    
    Request Body (UserUpdate):
        {
            "email": "newemail@example.com",  // optional
            "full_name": "Updated Name"         // optional
        }
    
    Returns (UserPublic):
        Updated user profile
        
    Raises:
        ValidationError: Email already taken
    """
    # Update email if provided and changed
    if payload.email and payload.email != current_user.email:
        existing = db.exec(select(User).where(User.email == payload.email)).first()
        if existing:
            raise ValidationError("Email is already taken.", details={"field": "email"})
        current_user.email = payload.email

    # Update full name if provided
    if payload.full_name is not None:
        current_user.full_name = payload.full_name

    db.add(current_user)
    db.commit()
    db.refresh(current_user)
    return current_user


@router.post("/change-password")
async def change_password(
    payload: PasswordChange,
    db: Session = Depends(get_session),
    current_user: User = Depends(get_current_active_user),
):
    """
    Change current user's password.
    
    Requires:
    - Current password (for verification)
    - New password (minimum 8 characters)
    
    Request Body (PasswordChange):
        {
            "current_password": "oldpassword",
            "new_password": "newpassword123"
        }
    
    Returns:
        {"message": "Password changed successfully"}
    
    Raises:
        ValidationError: Wrong current password or weak new password
    """
    # Validate new password length
    if len(payload.new_password) < 8:
        raise ValidationError("New password must be at least 8 characters.")

    # Verify current password
    if not verify_password(payload.current_password, current_user.hashed_password):
        raise ValidationError("Current password is incorrect.")
    
    # Hash and store new password
    current_user.hashed_password = get_password_hash(payload.new_password)
    db.add(current_user)
    db.commit()
    
    return {"message": "Password changed successfully"}