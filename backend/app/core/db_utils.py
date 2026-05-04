from sqlmodel import Session, create_engine, SQLModel
from typing import Generator

sqlite_url = "sqlite:///./intellijml.db"
engine = create_engine(sqlite_url, connect_args={"check_same_thread": False})

def create_db_and_tables():
    SQLModel.metadata.create_all(engine)
    _ensure_default_admin()

def get_session() -> Generator[Session, None, None]:
    with Session(engine) as session:
        yield session


def _ensure_default_admin() -> None:
    """
    Ensure a default admin user exists for local/dev usage.
    Username: admin
    Password: admin123
    """
    from sqlmodel import select
    from app.models.user import User
    from app.core.auth_utils import get_password_hash

    default_username = "admin"
    default_password = "admin123"
    default_email = "admin@intelliml.local"

    with Session(engine) as session:
        user = session.exec(select(User).where(User.username == default_username)).first()
        password_hash = get_password_hash(default_password)

        if user is None:
            user = User(
                username=default_username,
                email=default_email,
                full_name="Administrator",
                is_active=True,
                hashed_password=password_hash,
            )
            session.add(user)
            session.commit()
            return

        user.hashed_password = password_hash
        user.is_active = True
        if not user.email:
            user.email = default_email
        session.add(user)
        session.commit()
