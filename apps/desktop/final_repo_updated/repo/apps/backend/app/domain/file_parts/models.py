"""SQLAlchemy model definitions for file parts (chunks)."""

from __future__ import annotations

from sqlalchemy import BigInteger, Column, DateTime, ForeignKey, Integer, String, func
from sqlalchemy.orm import relationship

from app.db.base_class import Base


class FilePart(Base):
    """Represents a part of a file when a file is uploaded in chunks."""

    __tablename__ = "file_parts"

    id = Column(Integer, primary_key=True, index=True)
    file_id = Column(Integer, ForeignKey("files.id", ondelete="CASCADE"), nullable=False)
    part_index = Column(Integer, nullable=False)
    telegram_message_id = Column(BigInteger, nullable=False)
    telegram_chat_id = Column(BigInteger, nullable=False)
    size = Column(BigInteger, nullable=False)
    chunk_hash = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    file = relationship("app.domain.files.models.File", back_populates="parts", passive_deletes=True)
