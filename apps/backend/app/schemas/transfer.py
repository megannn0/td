"""Pydantic schemas for transfer-related operations."""

from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field, ConfigDict


class TransferResponse(BaseModel):
    """Schema representing a transfer job returned by the API."""

    id: int
    file_id: Optional[int]
    type: str
    status: str
    progress: Optional[float] = Field(None, description="Completion percentage (0.0–1.0).")
    bytes_transferred: Optional[int] = Field(
        None,
        description="Number of bytes transferred so far.",
    )
    total_bytes: Optional[int] = Field(
        None,
        description="Total number of bytes for the transfer.",
    )
    started_at: datetime
    last_progress_at: Optional[datetime] = None
    current_speed_bps: Optional[float] = None
    average_speed_bps: Optional[float] = None
    eta_seconds: Optional[int] = None
    priority: Optional[int] = None
    queue_position: Optional[int] = None
    pause_until: Optional[datetime] = Field(
        None,
        description="If set, the transfer is paused until this UTC time.",
    )
    created_at: datetime
    updated_at: datetime

    # Enable ORM mode using the new Pydantic v2 configuration API.
    model_config = ConfigDict(from_attributes=True)