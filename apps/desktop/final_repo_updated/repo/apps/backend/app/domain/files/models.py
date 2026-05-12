"""SQLAlchemy model definitions for files."""

from __future__ import annotations

from sqlalchemy import BigInteger, Column, DateTime, ForeignKey, Integer, String, func
from sqlalchemy.orm import relationship

from app.db.base_class import Base


class File(Base):
    """Represents a logical file stored in Telegram Drive."""

    __tablename__ = "files"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    folder_id = Column(Integer, ForeignKey("folders.id", ondelete="CASCADE"), nullable=True)
    storage_chat_id = Column(BigInteger, nullable=False)
    size = Column(BigInteger, nullable=False)
    mime_type = Column(String(255), nullable=True)
    hash = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    upload_date = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    chunk_count = Column(Integer, nullable=False, default=1)

    # Relationships
    folder = relationship("app.domain.folders.models.Folder", backref="files", passive_deletes=True)
    parts = relationship("app.domain.file_parts.models.FilePart", back_populates="file", cascade="all, delete-orphan", passive_deletes=True)
    # Do not cascade deletes to transfers so that transfer history is
    # preserved even when the associated file is removed (e.g. after a
    # failed upload). Transfers reference the file via a nullable foreign
    # key and will remain with file_id set to NULL.
    transfers = relationship(
        "app.domain.transfers.models.Transfer",
        back_populates="file",
        passive_deletes=True,
        cascade="save-update, merge",
    )
    tags = relationship("app.domain.tags.models.Tag", secondary="file_tags", back_populates="files")
