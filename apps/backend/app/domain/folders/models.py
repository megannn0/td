"""SQLAlchemy model definitions for folders."""

from __future__ import annotations

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import relationship

from app.db.base_class import Base


class Folder(Base):
    """Represents a logical folder in the Telegram Drive file hierarchy."""

    __tablename__ = "folders"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    parent_id = Column(Integer, ForeignKey("folders.id", ondelete="SET NULL"), nullable=True)
    icon_pack = Column(String(255), nullable=True)
    icon_name = Column(String(255), nullable=True)
    icon_color = Column(String(50), nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    parent = relationship(
        "Folder",
        remote_side=[id],
        backref="children",
        passive_deletes=True,
    )
