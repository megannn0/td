"""SQLAlchemy model definitions for transfer jobs."""

from __future__ import annotations

from sqlalchemy import BigInteger, Column, DateTime, Float, ForeignKey, Integer, Numeric, String, func
from sqlalchemy.orm import relationship

from app.db.base_class import Base


class Transfer(Base):
    """Represents an upload or download transfer operation."""

    __tablename__ = "transfers"

    id = Column(Integer, primary_key=True, index=True)
    # Allow file_id to be null so transfer history is preserved even if the
    # associated file record is removed due to a failed upload. When a file
    # is deleted, the database sets this column to NULL instead of
    # cascading the delete. This ensures that transfers remain in the
    # database for auditing and retry operations.
    file_id = Column(Integer, ForeignKey("files.id", ondelete="SET NULL"), nullable=True)
    type = Column(String(50), nullable=False)
    status = Column(String(50), nullable=False)
    progress = Column(Float, nullable=True)
    bytes_transferred = Column(BigInteger, nullable=True)
    total_bytes = Column(BigInteger, nullable=True)
    started_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    last_progress_at = Column(DateTime(timezone=True), nullable=True)
    current_speed_bps = Column(Float, nullable=True)
    average_speed_bps = Column(Float, nullable=True)
    eta_seconds = Column(Integer, nullable=True)
    priority = Column(Integer, nullable=True, default=0)
    queue_position = Column(Integer, nullable=True)
    # When a transfer is paused due to user action or flood wait, this field
    # stores the datetime until which the transfer should remain paused. A
    # value of None indicates the transfer is not currently paused.
    pause_until = Column(DateTime(timezone=True), nullable=True)
    # Number of retry attempts that have been performed for this transfer. Used
    # by the transfer manager to apply exponential backoff. Optional; if not
    # present defaults to zero.
    attempts = Column(Integer, nullable=True, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    file = relationship("app.domain.files.models.File", back_populates="transfers", passive_deletes=True)
