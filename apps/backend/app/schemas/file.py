"""Pydantic schemas for file-related operations."""

from __future__ import annotations

from datetime import datetime
from typing import Any, List, Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator

from .transfer import TransferResponse  # noqa: F401 circular import resolution


class FileResponse(BaseModel):
    """Public schema representing a logical file returned by the API.

    Telegram storage details are kept on the ORM model but are excluded
    from serialized API responses.
    """

    id: int
    name: str
    folder_id: Optional[int] = None
    size: int
    mime_type: Optional[str] = None
    hash: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    upload_date: datetime

    # Internal fields: available during ORM validation, hidden from API output.
    storage_chat_id: Optional[int] = Field(default=None, exclude=True)
    chunk_count: Optional[int] = Field(default=None, exclude=True)

    # User-facing tag names only.
    tags: List[str] = Field(default_factory=list)

    @field_validator("tags", mode="before")
    @classmethod
    def convert_tags_to_names(cls, value: Any) -> List[str]:
        """Convert ORM Tag objects into public tag-name strings."""
        if value is None:
            return []

        if isinstance(value, list):
            return [getattr(tag, "name", str(tag)) for tag in value]

        return []

    model_config = ConfigDict(
        from_attributes=True,
        extra="ignore",
    )


class FileUploadResponse(BaseModel):
    """Response model returned after uploading a file."""

    file: FileResponse = Field(..., description="Metadata of the uploaded file.")
    transfer: "TransferResponse" = Field(
        ..., description="Transfer status information for the upload."
    )

    model_config = ConfigDict(from_attributes=True)