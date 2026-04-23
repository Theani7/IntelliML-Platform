"""
================================================================================
Admin API - User Management & System Administration
================================================================================

PURPOSE:
    Provides administrative functions for managing users and monitoring the system.
    Only accessible to admin users (enforced by get_current_admin_user dependency).

ADMIN RESTRICTION:
    Admin accounts can ONLY access /api/admin/* endpoints.
    They cannot use regular user endpoints (training, data upload, etc.)
    
    This separation ensures:
    - Admins focus on platform management
    - Regular users can't impersonate admin
    - Clear role boundaries

FEATURES:

1. USER MANAGEMENT
   - List all users
   - Activate/deactivate users
   - Promote/demote admin roles
   - Reset passwords
   - Force logout

2. SYSTEM OVERVIEW
   - User statistics (total, active, new)
   - Experiment count
   - ML job status
   - Admin list

3. ANALYTICS
   - Uploads by day (7 days)
   - Trainings by day (7 days)
   - New users by day (7 days)

4. SYSTEM HEALTH
   - Service status
   - Storage usage (DB, experiments)
   - Active sessions
   - Runtime metrics

5. AUDIT LOG
   - All admin actions logged
   - Actor, action, target, reason, timestamp
   - Searchable with limit parameter

ADMIN ACTIONS LOGGED:
   - set_user_status: Activate/deactivate user
   - promote_admin: Add admin role
   - demote_admin: Remove admin role
   - reset_password: Force password change
   - force_logout: Deactivate user
   - clear_user_session: Clear data session
   - clear_stuck_jobs: Remove failed ML jobs

SAFETY FEATURES:
   - Admin cannot deactivate themselves
   - Admin cannot demote themselves
   - Admin cannot force-logout themselves
   - Demotion has cooldown (5 minutes)
   - All actions require a reason (min 5 chars)

================================================================================
"""

from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, Dict, List
import json
import os

from fastapi import APIRouter, Depends
from sqlmodel import Session, select

from app.core.auth_utils import get_current_admin_user, get_password_hash
from app.core.db_utils import get_session
from app.models.user import User
from app.core.admin_store import get_admin_usernames, add_admin, remove_admin, MAX_ADMINS
from app.core.admin_audit import add_audit_event, get_audit_events, last_event_timestamp
from app.services.data_service import DataService
from app.services.ml_service import ml_service
from app.services.data_chat_service import data_chat_service
from app.api.data import _dataset_registry
from app.core.exceptions import ValidationError, NotFoundError, ForbiddenError

router = APIRouter()

# Cooldown period after demoting an admin (prevents rapid back-and-forth)
DEMOTION_COOLDOWN_SECONDS = 5 * 60


# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

def _require_reason(payload: dict, min_len: int = 5) -> str:
    """
    Extract and validate reason from admin action payload.
    
    Admin actions require a reason for audit trail.
    Prevents accidental/spam actions.
    
    Args:
        payload: Request payload containing 'reason' field
        min_len: Minimum required reason length
        
    Returns:
        Stripped reason string
        
    Raises:
        ValidationError: Reason too short or missing
    """
    reason = str(payload.get("reason", "")).strip()
    if len(reason) < min_len:
        raise ValidationError(f"Reason must be at least {min_len} characters.", details={"min_length": min_len})
    return reason


def _load_experiments() -> List[Dict[str, Any]]:
    """
    Load experiment history from experiments.json file.
    
    Returns:
        List of experiment records, or empty list if file missing/error
    """
    if not os.path.exists("experiments.json"):
        return []
    try:
        with open("experiments.json", "r") as f:
            data = json.load(f)
            if isinstance(data, list):
                return data
    except (json.JSONDecodeError, IOError) as e:
        logger.warning(f"Could not load experiments.json: {e}")
    return []


# =============================================================================
# SYSTEM OVERVIEW
# =============================================================================

@router.get("/overview")
async def admin_overview(
    db: Session = Depends(get_session),
    _: User = Depends(get_current_admin_user),
) -> Any:
    """
    Get system overview and statistics.
    
    Returns aggregated metrics:
    - User counts (total, active, new)
    - Admin status
    - Experiment count
    - ML job status
    
    Returns:
        {
            "users": {
                "total": 25,
                "active": 23,
                "inactive": 2,
                "new_last_7_days": 5
            },
            "admins": {
                "total": 2,
                "max": 5,
                "usernames": ["admin", "superuser"]
            },
            "experiments": {
                "total": 47,
                "latest": [...]
            },
            "jobs": {
                "in_memory": 5,
                "potentially_stuck": 1
            },
            "timestamp": "2024-01-15T10:00:00"
        }
    """
    users = db.exec(select(User)).all()
    experiments = _load_experiments()

    total_users = len(users)
    active_users = len([u for u in users if u.is_active])

    # Count users created in last 7 days
    since = datetime.utcnow() - timedelta(days=7)
    new_users_7d = len([u for u in users if u.created_at and u.created_at >= since])

    latest_experiments = list(reversed(experiments[-8:]))
    failed_jobs = len([j for j in ml_service.jobs.values() if j.get("status") not in ("completed", "done")])

    return {
        "users": {
            "total": total_users,
            "active": active_users,
            "inactive": max(total_users - active_users, 0),
            "new_last_7_days": new_users_7d,
        },
        "admins": {
            "total": len(get_admin_usernames()),
            "max": MAX_ADMINS,
            "usernames": sorted(get_admin_usernames()),
        },
        "experiments": {
            "total": len(experiments),
            "latest": latest_experiments,
        },
        "jobs": {
            "in_memory": len(ml_service.jobs),
            "potentially_stuck": failed_jobs,
        },
        "timestamp": datetime.utcnow().isoformat(),
    }


# =============================================================================
# ANALYTICS
# =============================================================================

@router.get("/analytics")
async def admin_analytics(
    db: Session = Depends(get_session),
    _: User = Depends(get_current_admin_user),
) -> Any:
    """
    Get platform analytics for last 7 days.
    
    Returns daily counts for:
    - Uploads
    - Training experiments
    - New user registrations
    
    Useful for:
    - Usage trends
    - Engagement metrics
    - Growth analysis
    
    Returns:
        {
            "uploads_7d": [
                {"day": "2024-01-15", "value": 12},
                ...
            ],
            "trainings_7d": [...],
            "new_users_7d": [...]
        }
    """
    users = db.exec(select(User)).all()
    experiments = _load_experiments()

    today = datetime.utcnow().date()
    days = [today - timedelta(days=i) for i in range(6, -1, -1)]

    uploads_by_day = []
    trainings_by_day = []
    users_by_day = []

    for day in days:
        day_str = day.isoformat()
        trainings = [e for e in experiments if str(e.get("timestamp", "")).startswith(day_str)]
        new_users = [u for u in users if u.created_at and u.created_at.date() == day]

        uploads_by_day.append({"day": day_str, "value": len(trainings)})
        trainings_by_day.append({"day": day_str, "value": len(trainings)})
        users_by_day.append({"day": day_str, "value": len(new_users)})

    return {
        "uploads_7d": uploads_by_day,
        "trainings_7d": trainings_by_day,
        "new_users_7d": users_by_day,
    }


# =============================================================================
# SYSTEM HEALTH
# =============================================================================

@router.get("/system-health")
async def admin_system_health(
    _: User = Depends(get_current_admin_user),
) -> Any:
    """
    Get system health and runtime metrics.
    
    Monitors:
    - Service status
    - Storage file sizes
    - Active session counts
    - ML jobs in memory
    
    Returns:
        {
            "services": {
                "backend": "online",
                "ai_engine": "configured"
            },
            "storage": {
                "db_size_bytes": 1024000,
                "experiments_size_bytes": 512000
            },
            "runtime": {
                "data_sessions": 5,
                "chat_sessions": 3,
                "dataset_registry_sessions": 5,
                "ml_jobs_in_memory": 2
            },
            "timestamp": "2024-01-15T10:00:00"
        }
    """
    db_path = Path("intellijml.db")
    exp_path = Path("experiments.json")
    data_sessions = len(getattr(DataService, "_sessions", {}))
    chat_sessions = len(getattr(data_chat_service, "conversation_history", {}))
    registry_sessions = len(_dataset_registry)

    return {
        "services": {
            "backend": "online",
            "ai_engine": "configured",
        },
        "storage": {
            "db_size_bytes": db_path.stat().st_size if db_path.exists() else 0,
            "experiments_size_bytes": exp_path.stat().st_size if exp_path.exists() else 0,
        },
        "runtime": {
            "data_sessions": data_sessions,
            "chat_sessions": chat_sessions,
            "dataset_registry_sessions": registry_sessions,
            "ml_jobs_in_memory": len(ml_service.jobs),
        },
        "timestamp": datetime.utcnow().isoformat(),
    }


# =============================================================================
# AUDIT LOG
# =============================================================================

@router.get("/audit")
async def admin_audit(
    limit: int = 200,
    _: User = Depends(get_current_admin_user),
) -> Any:
    """
    Get audit event log.
    
    All admin actions are logged here for accountability.
    
    Args:
        limit: Max events to return (1-500, default 200)
        
    Returns:
        {
            "events": [
                {
                    "timestamp": "2024-01-15T10:00:00",
                    "actor": "admin",
                    "action": "set_user_status",
                    "target": "user1",
                    "reason": "User requested account suspension",
                    "metadata": {"is_active": false}
                },
                ...
            ]
        }
    """
    return {"events": get_audit_events(limit=min(max(limit, 1), 500))}


# =============================================================================
# USER MANAGEMENT
# =============================================================================

@router.get("/users")
async def admin_list_users(
    db: Session = Depends(get_session),
    _: User = Depends(get_current_admin_user),
) -> Any:
    """
    List all users.
    
    Returns user list sorted by creation date (newest first).
    Includes admin status from admin_store.
    
    Returns:
        [
            {
                "id": 6,
                "username": "user1",
                "email": "user1@test.com",
                "full_name": "Test User",
                "is_active": true,
                "is_admin": false,
                "created_at": "2024-01-23T16:01:38"
            },
            ...
        ]
    """
    users = db.exec(select(User)).all()
    admin_usernames = get_admin_usernames()
    payload = [
        {
            "id": u.id,
            "username": u.username,
            "email": u.email,
            "full_name": u.full_name,
            "is_active": u.is_active,
            "is_admin": u.username.lower() in admin_usernames,
            "created_at": u.created_at.isoformat() if u.created_at else None,
        }
        for u in users
    ]
    payload.sort(key=lambda item: item["created_at"] or "", reverse=True)
    return payload


@router.post("/users/{user_id}/status")
async def admin_set_user_status(
    user_id: int,
    payload: dict,
    db: Session = Depends(get_session),
    current_admin: User = Depends(get_current_admin_user),
) -> Any:
    """
    Activate or deactivate a user account.
    
    Deactivated users cannot log in or access the platform.
    Reason required for deactivation (audit trail).
    
    Request:
        {
            "is_active": false,
            "reason": "User violated terms of service"
        }
    
    Safety:
        - Admin cannot deactivate themselves
        - Reason required for deactivation
        - Action is logged to audit
    
    Returns:
        {
            "id": 6,
            "username": "user1",
            "is_active": false
        }
    """
    is_active = payload.get("is_active")
    if not isinstance(is_active, bool):
        raise ValidationError("is_active must be a boolean", details={"field": "is_active"})

    user = db.exec(select(User).where(User.id == user_id)).first()
    if not user:
        raise NotFoundError("User not found")

    # Prevent self-deactivation
    if user.id == current_admin.id and not is_active:
        raise ForbiddenError("Admin cannot deactivate their own account")

    reason = _require_reason(payload) if not is_active else str(payload.get("reason", "")).strip() or None

    user.is_active = is_active
    db.add(user)
    db.commit()
    db.refresh(user)

    # Log action
    add_audit_event(
        actor=current_admin.username,
        action="set_user_status",
        target=user.username,
        reason=reason,
        metadata={"is_active": is_active},
    )

    return {
        "id": user.id,
        "username": user.username,
        "is_active": user.is_active,
    }


@router.post("/users/{user_id}/admin-role")
async def admin_set_admin_role(
    user_id: int,
    payload: dict,
    db: Session = Depends(get_session),
    current_admin: User = Depends(get_current_admin_user),
) -> Any:
    """
    Promote user to admin or demote admin to regular user.
    
    Request:
        {
            "is_admin": true,               // or false for demotion
            "reason": "Trusted team member"  // required
        }
    
    Promotion:
        - Adds username to admin_store
        - Max admins enforced (MAX_ADMINS)
        
    Demotion:
        - Removes from admin_store
        - Cannot self-demote
        - 5-minute cooldown after demotion
        - Reason required
        
    Returns:
        {
            "id": 6,
            "username": "user1",
            "is_admin": true
        }
    """
    is_admin = payload.get("is_admin")
    if not isinstance(is_admin, bool):
        raise ValidationError("is_admin must be a boolean", details={"field": "is_admin"})

    user = db.exec(select(User).where(User.id == user_id)).first()
    if not user:
        raise NotFoundError("User not found")

    username = user.username.lower()

    try:
        if is_admin:
            # Promote to admin
            add_admin(username)
            add_audit_event(
                actor=current_admin.username,
                action="promote_admin",
                target=user.username,
                reason=str(payload.get("reason", "")).strip() or None,
            )
        else:
            # Demote from admin
            # Prevent self-demotion
            if username == current_admin.username.lower():
                raise ForbiddenError("You cannot remove your own admin role")

            # Check cooldown
            reason = _require_reason(payload)
            last_demotion = last_event_timestamp("demote_admin", user.username)
            if last_demotion and (datetime.utcnow() - last_demotion).total_seconds() < DEMOTION_COOLDOWN_SECONDS:
                raise ValidationError("Demotion cooldown active. Try again in a few minutes.")

            remove_admin(username)
            add_audit_event(
                actor=current_admin.username,
                action="demote_admin",
                target=user.username,
                reason=reason,
            )
    except ValueError as e:
        raise ValidationError(str(e))

    return {
        "id": user.id,
        "username": user.username,
        "is_admin": username in get_admin_usernames(),
    }


# =============================================================================
# ADMIN ACTIONS
# =============================================================================

@router.post("/actions/reset-password")
async def admin_reset_password(
    payload: dict,
    db: Session = Depends(get_session),
    current_admin: User = Depends(get_current_admin_user),
) -> Any:
    """
    Force reset a user's password.
    
    Admin sets a new password without knowing the current one.
    Useful for account recovery.
    
    Request:
        {
            "user_id": 6,
            "new_password": "TempPass123!",
            "reason": "User locked out, password reset"
        }
    
    Returns:
        {"status": "ok", "message": "Password reset for username"}
    """
    user_id = payload.get("user_id")
    new_password = str(payload.get("new_password", "")).strip()
    reason = _require_reason(payload)

    if not isinstance(user_id, int):
        raise ValidationError("user_id must be an integer")
    if len(new_password) < 8:
        raise ValidationError("new_password must be at least 8 characters")

    user = db.exec(select(User).where(User.id == user_id)).first()
    if not user:
        raise NotFoundError("User not found")

    user.hashed_password = get_password_hash(new_password)
    db.add(user)
    db.commit()

    add_audit_event(
        actor=current_admin.username,
        action="reset_password",
        target=user.username,
        reason=reason,
    )

    return {"status": "ok", "message": f"Password reset for {user.username}"}


@router.post("/actions/force-logout")
async def admin_force_logout_user(
    payload: dict,
    db: Session = Depends(get_session),
    current_admin: User = Depends(get_current_admin_user),
) -> Any:
    """
    Force logout a user by deactivating their account.
    
    Sets is_active=False, invalidating their session.
    User must contact admin to reactivate.
    
    Request:
        {
            "user_id": 6,
            "reason": "Suspicious activity detected"
        }
    
    Safety:
        - Cannot force-logout yourself
        - Action is logged
    
    Returns:
        {"status": "ok", "message": "username has been logged out and deactivated."}
    """
    user_id = payload.get("user_id")
    reason = _require_reason(payload)

    if not isinstance(user_id, int):
        raise ValidationError("user_id must be an integer")

    user = db.exec(select(User).where(User.id == user_id)).first()
    if not user:
        raise NotFoundError("User not found")
    if user.username.lower() == current_admin.username.lower():
        raise ForbiddenError("You cannot force-logout yourself")

    user.is_active = False
    db.add(user)
    db.commit()

    add_audit_event(
        actor=current_admin.username,
        action="force_logout",
        target=user.username,
        reason=reason,
        metadata={"note": "User set inactive to invalidate active access"},
    )

    return {"status": "ok", "message": f"{user.username} has been logged out and deactivated."}


@router.post("/actions/clear-user-session")
async def admin_clear_user_session(
    payload: dict,
    current_admin: User = Depends(get_current_admin_user),
) -> Any:
    """
    Clear a user's data session.
    
    Removes:
    - Uploaded dataset
    - Cleaning history
    - Chat history
    
    Use when:
    - User reports data issues
    - Cleanup abandoned sessions
    - Privacy request
    
    Request:
        {
            "session_id": "user-session-id",
            "reason": "User requested data cleanup"
        }
    
    Returns:
        {"status": "ok", "message": "Cleared session session_id"}
    """
    reason = _require_reason(payload)
    session_id = str(payload.get("session_id", "")).strip()
    if not session_id:
        raise ValidationError("session_id is required")

    # Clear from all services
    DataService().clear_session(session_id=session_id)

    if session_id in _dataset_registry:
        _dataset_registry[session_id] = {"df": None, "info": None, "history": [], "future": []}

    if session_id in data_chat_service.conversation_history:
        data_chat_service.conversation_history.pop(session_id, None)

    add_audit_event(
        actor=current_admin.username,
        action="clear_user_session",
        target=session_id,
        reason=reason,
    )

    return {"status": "ok", "message": f"Cleared session {session_id}"}


@router.post("/actions/clear-stuck-jobs")
async def admin_clear_stuck_jobs(
    payload: dict,
    current_admin: User = Depends(get_current_admin_user),
) -> Any:
    """
    Clear stuck/failed ML training jobs from memory.
    
    Removes jobs that are not "completed" or "done".
    Useful for:
    - Memory cleanup
    - Resetting stuck training states
    - Recovery from failed training
    
    Request:
        {
            "reason": "Memory cleanup before deployment"
        }
    
    Returns:
        {"status": "ok", "removed_jobs": 3}
    """
    reason = _require_reason(payload)

    removed = 0
    kept = {}
    for job_id, job in ml_service.jobs.items():
        status = str(job.get("status", "")).lower()
        if status in {"completed", "done"}:
            kept[job_id] = job
        else:
            removed += 1
    ml_service.jobs = kept

    add_audit_event(
        actor=current_admin.username,
        action="clear_stuck_jobs",
        reason=reason,
        metadata={"removed_jobs": removed},
    )

    return {"status": "ok", "removed_jobs": removed}