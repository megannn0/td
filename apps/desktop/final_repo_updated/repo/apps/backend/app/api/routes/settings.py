"""API routes for application settings.

This module defines endpoints related to application configuration,
particularly the storage target used for Telegram-based file storage.
Clients can query the current active storage target or update it to a
different target. Business logic resides in the service layer; routes
should remain thin wrappers that perform validation and call services.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status

from app.api.deps import get_current_active_db
from app.domain.storage_targets.models import StorageTarget
from app.schemas.storage_target import (
    StorageTargetCreate,
    StorageTargetResponse,
    StorageTargetType,
)
from app.services import storage_target_service

router = APIRouter(prefix="/settings", tags=["settings"])


@router.get("/storage-target", response_model=StorageTargetResponse)
async def get_storage_target(db=Depends(get_current_active_db)) -> StorageTargetResponse:
    """Retrieve the currently active storage target.

    If no active target exists in the database, a default Saved Messages
    target is created automatically. This ensures that the application
    always returns a valid storage configuration on first run.
    """
    # Query for existing active target
    target: StorageTarget | None = await storage_target_service.get_active_storage_target(db)
    if target is None:
        # Create default Saved Messages target
        target = await storage_target_service.set_active_storage_target(
            db,
            target_type=StorageTargetType.SAVED_MESSAGES,
            name="Saved Messages",
        )
    return StorageTargetResponse.from_orm(target)


@router.put("/storage-target", response_model=StorageTargetResponse, status_code=status.HTTP_200_OK)
async def set_storage_target(
    payload: StorageTargetCreate,
    db=Depends(get_current_active_db),
) -> StorageTargetResponse:
    """Update the active storage target.

    The request body must specify a ``type`` of ``saved_messages``,
    ``private_channel`` or ``private_group``. An optional ``name`` can
    also be provided to specify the channel or group name when
    applicable. Changing the storage target deactivates all previous
    targets and persists the new target in the database. Only future
    uploads will use the new target.
    """
    target = await storage_target_service.set_active_storage_target(
        db,
        target_type=payload.type,
        name=payload.name,
    )
    return StorageTargetResponse.from_orm(target)