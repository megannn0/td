"""Pydantic schemas for playlist operations.

These schemas define how playlists and playlist items are serialized
and deserialized. ``PlaylistResponse`` includes the playlist's
metadata and a list of items, each with its own metadata. Creation
and update schemas are kept simple.
"""

from __future__ import annotations

from typing import List, Optional
from pydantic import BaseModel, ConfigDict

from app.schemas.file import FileResponse


class PlaylistItemResponse(BaseModel):
    """Represents a single item in a playlist."""

    id: int
    file_id: int
    position: int
    file: Optional[FileResponse] = None

    # Pydantic v2 model configuration for ORM mode
    model_config = ConfigDict(from_attributes=True)


class PlaylistResponse(BaseModel):
    """Represents a playlist along with its items."""

    id: int
    name: str
    items: List[PlaylistItemResponse] = []

    # Pydantic v2 model configuration for ORM mode
    model_config = ConfigDict(from_attributes=True)


class PlaylistCreate(BaseModel):
    """Request body for creating a playlist."""

    name: str


class PlaylistUpdate(BaseModel):
    """Request body for renaming a playlist."""

    name: str


class PlaylistAddItems(BaseModel):
    """Request body for adding one or more files to a playlist."""

    file_ids: List[int]


class PlaylistReorderItems(BaseModel):
    """Request body for specifying a new order of playlist items."""

    item_ids: List[int]