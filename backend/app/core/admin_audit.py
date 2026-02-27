import json
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional


_AUDIT_FILE = Path(__file__).resolve().parents[2] / "admin_audit.json"


def _read_events() -> List[Dict[str, Any]]:
    if not _AUDIT_FILE.exists():
        return []
    try:
        return json.loads(_AUDIT_FILE.read_text())
    except Exception:
        return []


def _write_events(events: List[Dict[str, Any]]) -> None:
    _AUDIT_FILE.write_text(json.dumps(events, indent=2))


def add_audit_event(
    actor: str,
    action: str,
    target: Optional[str] = None,
    reason: Optional[str] = None,
    metadata: Optional[Dict[str, Any]] = None,
) -> None:
    events = _read_events()
    events.append({
        "timestamp": datetime.utcnow().isoformat(),
        "actor": actor,
        "action": action,
        "target": target,
        "reason": reason,
        "metadata": metadata or {},
    })
    # Keep file bounded
    if len(events) > 2000:
        events = events[-2000:]
    _write_events(events)


def get_audit_events(limit: int = 200) -> List[Dict[str, Any]]:
    events = _read_events()
    return list(reversed(events[-limit:]))


def last_event_timestamp(action: str, target: str) -> Optional[datetime]:
    events = _read_events()
    for event in reversed(events):
        if event.get("action") == action and event.get("target") == target:
            ts = event.get("timestamp")
            try:
                return datetime.fromisoformat(ts)
            except Exception:
                return None
    return None
