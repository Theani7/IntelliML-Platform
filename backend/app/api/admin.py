from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, Dict, List
import json
import os

from fastapi import APIRouter, Depends, HTTPException
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

router = APIRouter()

DEMOTION_COOLDOWN_SECONDS = 5 * 60


def _require_reason(payload: dict, min_len: int = 5) -> str:
    reason = str(payload.get("reason", "")).strip()
    if len(reason) < min_len:
        raise HTTPException(status_code=400, detail=f"Reason must be at least {min_len} characters.")
    return reason


def _load_experiments() -> List[Dict[str, Any]]:
    if not os.path.exists("experiments.json"):
        return []
    try:
        with open("experiments.json", "r") as f:
            data = json.load(f)
            if isinstance(data, list):
                return data
    except Exception:
        pass
    return []


@router.get("/overview")
async def admin_overview(
    db: Session = Depends(get_session),
    _: User = Depends(get_current_admin_user),
) -> Any:
    users = db.exec(select(User)).all()
    experiments = _load_experiments()

    total_users = len(users)
    active_users = len([u for u in users if u.is_active])

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


@router.get("/analytics")
async def admin_analytics(
    db: Session = Depends(get_session),
    _: User = Depends(get_current_admin_user),
) -> Any:
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

        # No dedicated upload history store exists yet; use training volume as activity proxy.
        uploads_by_day.append({"day": day_str, "value": len(trainings)})
        trainings_by_day.append({"day": day_str, "value": len(trainings)})
        users_by_day.append({"day": day_str, "value": len(new_users)})

    return {
        "uploads_7d": uploads_by_day,
        "trainings_7d": trainings_by_day,
        "new_users_7d": users_by_day,
    }


@router.get("/system-health")
async def admin_system_health(
    _: User = Depends(get_current_admin_user),
) -> Any:
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


@router.get("/audit")
async def admin_audit(
    limit: int = 200,
    _: User = Depends(get_current_admin_user),
) -> Any:
    return {"events": get_audit_events(limit=min(max(limit, 1), 500))}


@router.get("/users")
async def admin_list_users(
    db: Session = Depends(get_session),
    _: User = Depends(get_current_admin_user),
) -> Any:
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
    is_active = payload.get("is_active")
    if not isinstance(is_active, bool):
        raise HTTPException(status_code=400, detail="is_active must be a boolean")

    user = db.exec(select(User).where(User.id == user_id)).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.id == current_admin.id and not is_active:
        raise HTTPException(status_code=400, detail="Admin cannot deactivate their own account")

    reason = _require_reason(payload) if not is_active else str(payload.get("reason", "")).strip() or None

    user.is_active = is_active
    db.add(user)
    db.commit()
    db.refresh(user)

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
    is_admin = payload.get("is_admin")
    if not isinstance(is_admin, bool):
        raise HTTPException(status_code=400, detail="is_admin must be a boolean")

    user = db.exec(select(User).where(User.id == user_id)).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    username = user.username.lower()

    try:
        if is_admin:
            add_admin(username)
            add_audit_event(
                actor=current_admin.username,
                action="promote_admin",
                target=user.username,
                reason=str(payload.get("reason", "")).strip() or None,
            )
        else:
            if username == current_admin.username.lower():
                raise HTTPException(status_code=400, detail="You cannot remove your own admin role")

            reason = _require_reason(payload)
            last_demotion = last_event_timestamp("demote_admin", user.username)
            if last_demotion and (datetime.utcnow() - last_demotion).total_seconds() < DEMOTION_COOLDOWN_SECONDS:
                raise HTTPException(status_code=400, detail="Demotion cooldown active. Try again in a few minutes.")

            remove_admin(username)
            add_audit_event(
                actor=current_admin.username,
                action="demote_admin",
                target=user.username,
                reason=reason,
            )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    return {
        "id": user.id,
        "username": user.username,
        "is_admin": username in get_admin_usernames(),
    }


@router.post("/actions/reset-password")
async def admin_reset_password(
    payload: dict,
    db: Session = Depends(get_session),
    current_admin: User = Depends(get_current_admin_user),
) -> Any:
    user_id = payload.get("user_id")
    new_password = str(payload.get("new_password", "")).strip()
    reason = _require_reason(payload)

    if not isinstance(user_id, int):
        raise HTTPException(status_code=400, detail="user_id must be an integer")
    if len(new_password) < 8:
        raise HTTPException(status_code=400, detail="new_password must be at least 8 characters")

    user = db.exec(select(User).where(User.id == user_id)).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

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
    user_id = payload.get("user_id")
    reason = _require_reason(payload)

    if not isinstance(user_id, int):
        raise HTTPException(status_code=400, detail="user_id must be an integer")

    user = db.exec(select(User).where(User.id == user_id)).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.username.lower() == current_admin.username.lower():
        raise HTTPException(status_code=400, detail="You cannot force-logout yourself")

    # Stateless JWT cannot be revoked per-user without token versioning.
    # Deactivate account to force auth failure immediately.
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
    reason = _require_reason(payload)
    session_id = str(payload.get("session_id", "")).strip()
    if not session_id:
        raise HTTPException(status_code=400, detail="session_id is required")

    # Clear dataset service session
    DataService().clear_session(session_id=session_id)

    # Clear dataset registry
    if session_id in _dataset_registry:
        _dataset_registry[session_id] = {"df": None, "info": None, "history": [], "future": []}

    # Clear chat history session
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
