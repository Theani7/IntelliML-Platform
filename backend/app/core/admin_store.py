import json
from pathlib import Path
from typing import Set


MAX_ADMINS = 2
PRIMARY_ADMIN_USERNAME = "admin"
_ADMIN_FILE = Path(__file__).resolve().parents[2] / "admins.json"


def _normalize(values) -> Set[str]:
    return {str(v).strip().lower() for v in values if str(v).strip()}


def get_admin_usernames() -> Set[str]:
    usernames = {PRIMARY_ADMIN_USERNAME}
    if not _ADMIN_FILE.exists():
        return usernames

    try:
        data = json.loads(_ADMIN_FILE.read_text())
        file_admins = data.get("admin_usernames", [])
        usernames.update(_normalize(file_admins))
    except Exception:
        pass
    return usernames


def save_admin_usernames(usernames: Set[str]) -> None:
    normalized = _normalize(usernames)
    normalized.add(PRIMARY_ADMIN_USERNAME)
    if len(normalized) > MAX_ADMINS:
        raise ValueError(f"Maximum {MAX_ADMINS} admins allowed")

    payload = {"admin_usernames": sorted(normalized)}
    _ADMIN_FILE.write_text(json.dumps(payload, indent=2))


def add_admin(username: str) -> None:
    username = username.strip().lower()
    admins = get_admin_usernames()
    if username in admins:
        return
    if len(admins) >= MAX_ADMINS:
        raise ValueError(f"Maximum {MAX_ADMINS} admins allowed")
    admins.add(username)
    save_admin_usernames(admins)


def remove_admin(username: str) -> None:
    username = username.strip().lower()
    if username == PRIMARY_ADMIN_USERNAME:
        raise ValueError("Primary admin cannot be removed")
    admins = get_admin_usernames()
    admins.discard(username)
    save_admin_usernames(admins)
