"""Pydantic models for storage target API responses and requests.

These schemas define the shape of data returned to and accepted from the
frontend when interacting with storage target settings. Using explicit
schemas decouples the internal SQLAlchemy models from the external API
representation and allows for validation of incoming data.
"""

from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field, ConfigDict
from typing import Literal


class StorageTargetType(str):
    """Enumeration of supported storage target types.

    Defining explicit literal types provides type safety and assists with
    auto-completion in the frontend. Only these values are accepted by
    the backend; attempts to submit other strings will result in a
    validation error.
    """

    SAVED_MESSAGES: Literal["saved_messages"] = "saved_messages"
    PRIVATE_CHANNEL: Literal["private_channel"] = "private_channel"
    PRIVATE_GROUP: Literal["private_group"] = "private_group"


class StorageTargetBase(BaseModel):
    """Base schema shared by request and response models."""

    name: Optional[str] = Field(
        None,
        title="Storage Target Name",
        description=(
            "A human-friendly name for the storage target. For Saved Messages "
            "this may be omitted; for channels and groups it will be used as the "
            "channel or group title."
        ),
    )

    type: Literal[
        StorageTargetType.SAVED_MESSAGES,
        StorageTargetType.PRIVATE_CHANNEL,
        StorageTargetType.PRIVATE_GROUP,
    ] = Field(
        StorageTargetType.SAVED_MESSAGES,
        title="Storage Target Type",
        description="The type of Telegram storage target to use.",
    )


class StorageTargetCreate(StorageTargetBase):
    """Schema for creating or updating the active storage target."""

    pass


class StorageTargetResponse(StorageTargetBase):
    """Schema representing a storage target returned by the API."""

    id: int = Field(..., description="Primary key of the storage target in the database.")
    chat_id: Optional[int] = Field(
        None,
        description=(
            "Telegram chat identifier associated with the storage target. This is "
            "None for the Saved Messages target."
        ),
    )
    is_active: bool = Field(..., description="Indicates whether this target is currently active.")
    created_at: datetime = Field(..., description="Timestamp when the target was created.")
    updated_at: datetime = Field(..., description="Timestamp when the target was last updated.")

    # Enable ORM mode for Pydantic v2
    model_config = ConfigDict(from_attributes=True)