"""SQLAlchemy model definitions for storage targets."""

from __future__ import annotations

from sqlalchemy import BigInteger, Boolean, Column, DateTime, Integer, String, func

from app.db.base_class import Base


class StorageTarget(Base):
    """Represents a configured Telegram storage target.

    A storage target defines where uploads will be stored. Supported types
    include:

    - ``saved_messages``: the user’s own saved messages area.
    - ``private_channel``: a private channel created specifically for storage.
    - ``private_group``: a private supergroup used for storage.

    Only one storage target should be marked as active at any time.
    """

    __tablename__ = "storage_targets"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    type = Column(String(50), nullable=False)
    chat_id = Column(BigInteger, nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
