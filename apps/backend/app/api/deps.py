"""Dependency utilities for API routes.

This module defines reusable dependency functions that can be injected
into FastAPI route handlers via ``Depends``. Dependencies should be kept
lightweight and should not contain business logic; instead, they should
prepare and provide resources such as database sessions, configuration
objects, or authenticated users.
"""

from __future__ import annotations

from collections.abc import AsyncGenerator
from typing import AsyncIterator

from fastapi import Depends

from app.db.session import SessionLocal


async def get_db() -> AsyncGenerator:
    """Provide a transactional scope around a series of operations.

    This dependency yields a SQLAlchemy session. Each request receives
    its own session which is closed once the request is complete. Note
    that SQLAlchemy's Session is not inherently async-aware; however,
    FastAPI allows dependencies to be declared ``async`` even when
    underlying objects are synchronous. Yielding the session in an
    async generator ensures proper cleanup.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_current_active_db(db: SessionLocal = Depends(get_db)) -> SessionLocal:
    """Wrapper to inject the database session into routes.

    Some services may require direct access to the database session. This
    dependency simply forwards the session from ``get_db``. It exists
    primarily to demonstrate how additional dependencies could be composed
    (for example, obtaining an authenticated user along with a DB session).
    """
    return db