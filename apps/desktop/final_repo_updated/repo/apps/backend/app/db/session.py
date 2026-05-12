"""Database session and engine configuration.

This module is responsible for configuring the SQLAlchemy engine and session
factory. It defaults to using an SQLite database stored in the project
directory but can be overridden through configuration settings in future
iterations.
"""

from __future__ import annotations

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.config import settings


def get_database_url() -> str:
    """Return the database connection URL from the application settings."""
    return settings.SQLALCHEMY_DATABASE_URI


# Create SQLAlchemy engine. Using check_same_thread=False allows the same
# connection to be used across different threads, which is acceptable for
# FastAPI with the default Uvicorn worker model when using SQLite.
engine = create_engine(
    get_database_url(),
    connect_args={"check_same_thread": False} if get_database_url().startswith("sqlite") else {},
)


# SessionLocal is the factory for creating new Session objects. Each request
# should acquire its own Session and close it after completion.
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    """Dependency that provides a transactional scope around a series of operations."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
