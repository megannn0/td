"""Pydantic schemas for tag operations.

These schemas define the shape of tag data exchanged with clients. A
``TagResponse`` represents a tag returned from the API, while
``TagCreate`` and ``TagUpdate`` define the request bodies for
creating and updating tags respectively.
"""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict


class TagResponse(BaseModel):
    """Schema representing a tag returned by the API."""

    id: int
    name: str

    # Use Pydantic v2 configuration to enable attribute population
    model_config = ConfigDict(from_attributes=True)


class TagCreate(BaseModel):
    """Request body for creating a new tag."""

    name: str


class TagUpdate(BaseModel):
    """Request body for updating an existing tag."""

    name: str