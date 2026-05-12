"""SQLAlchemy model definitions for virtual (smart) folders.

A virtual folder is a saved search that displays a dynamic list of
files based on user-defined criteria. It stores a human-readable
``name`` and a ``query`` string which is interpreted by the search
service. Deleting a virtual folder does not delete any files; it
simply removes the saved search.
"""

from __future__ import annotations

from sqlalchemy import Column, DateTime, Integer, String, func
from app.db.base_class import Base


class VirtualFolder(Base):
    """Represents a saved search for grouping files virtually."""

    __tablename__ = "virtual_folders"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    query = Column(String(1024), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )