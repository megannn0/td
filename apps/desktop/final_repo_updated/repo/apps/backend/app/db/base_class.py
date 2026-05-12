"""Base class for SQLAlchemy models.

This module defines a common declarative base that all models in the
application should inherit from. Using a shared base class ensures that
metadata can be collected and tables created across the entire domain.
"""

from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    """Base class for all database models."""

    pass
