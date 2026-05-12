"""Pydantic schemas for virtual (smart) folders.

These schemas support creating, listing, updating, and retrieving
virtual folders. A virtual folder stores a search query string and
does not directly reference files. Search results are computed on
demand using the search service.
"""

from __future__ import annotations

from typing import Optional
from pydantic import BaseModel, ConfigDict


class VirtualFolderResponse(BaseModel):
    """Schema representing a virtual folder returned from the API."""

    id: int
    name: str
    query: str

    model_config = ConfigDict(from_attributes=True)


class VirtualFolderCreate(BaseModel):
    """Request body for creating a virtual folder."""

    name: str
    query: str


class VirtualFolderUpdate(BaseModel):
    """Request body for updating a virtual folder."""

    name: Optional[str] = None
    query: Optional[str] = None