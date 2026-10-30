from typing import Generator
from backend.app.core.database import SessionLocal


def get_db() -> Generator:
    """FastAPI dependency yielding a SQLAlchemy session per request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

