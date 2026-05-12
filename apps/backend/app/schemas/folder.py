"""Pydantic schemas for folder-related operations.

This module defines request and response models for folder endpoints. The
`FolderResponse` model mirrors the SQLAlchemy `Folder` entity but omits
recursive relationships to avoid circular references. `FolderCreate` and
`FolderUpdate` models define the payloads accepted when creating or
updating folders. Icon metadata fields (`icon_pack`, `icon_name`,
`icon_color`) are optional and can be used to customise folder icons.
"""

from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field, ConfigDict


class FolderBase(BaseModel):
    """Base fields shared by folder request and response models."""

    name: str = Field(..., description="Human‑readable name of the folder.")
    parent_id: Optional[int] = Field(
        None,
        description="Identifier of the parent folder. Null indicates the root."
    )
    icon_pack: Optional[str] = Field(
        None,
        description="Name of the icon pack assigned to this folder."
    )
    icon_name: Optional[str] = Field(
        None,
        description="Name of the icon within the chosen pack."
    )
    icon_color: Optional[str] = Field(
        None,
        description="Custom colour for the folder icon in CSS hex format (e.g., '#FF0000')."
    )
    notes: Optional[str] = Field(
        None,
        description="Arbitrary notes associated with the folder."
    )

    # Use Pydantic v2 model configuration for ORM mode.
    model_config = ConfigDict(from_attributes=True)


class FolderCreate(FolderBase):
    """Payload required when creating a new folder."""

    name: str = Field(..., description="Human‑readable name of the folder.")


class FolderUpdate(BaseModel):
    """Payload used to update an existing folder.

    All fields are optional to allow partial updates. The `name` field may be
    omitted to leave it unchanged. Similarly, icon metadata and notes can
    either be updated or left as is. When clearing an icon or notes, set
    the corresponding field explicitly to `null` in the request.
    """

    name: Optional[str] = Field(None, description="Updated name for the folder.")
    parent_id: Optional[int] = Field(
        None,
        description="Updated parent folder ID. Use null to move to the root."
    )
    icon_pack: Optional[str] = Field(
        None,
        description="Updated icon pack name. Use null to remove the icon."
    )
    icon_name: Optional[str] = Field(
        None,
        description="Updated icon name within the selected pack."
    )
    icon_color: Optional[str] = Field(
        None,
        description="Updated colour value for the folder icon."
    )
    notes: Optional[str] = Field(
        None,
        description="Updated notes for the folder. Use null to clear notes."
    )


class FolderResponse(FolderBase):
    """Response model representing a folder and its metadata."""

    id: int = Field(..., description="Unique identifier of the folder.")
    created_at: datetime = Field(..., description="Timestamp when the folder was created.")
    updated_at: datetime = Field(..., description="Timestamp when the folder was last updated.")
