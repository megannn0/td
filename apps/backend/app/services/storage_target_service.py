"""Service layer for managing Telegram storage targets."""

from __future__ import annotations

from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.domain.storage_targets.models import StorageTarget
from app.infrastructure.telegram.factory import get_telegram_client


async def get_active_storage_target(db: Session) -> Optional[StorageTarget]:
    """Return the currently active storage target if one exists."""
    return db.query(StorageTarget).filter(StorageTarget.is_active.is_(True)).first()


async def set_active_storage_target(
    db: Session,
    target_type: str,
    name: Optional[str] = None,
) -> StorageTarget:
    """Set the active storage target.

    This function deactivates any existing storage targets and creates or
    activates a new one based on the requested type. For ``saved_messages``
    no Telegram API call is necessary. For ``private_channel`` or
    ``private_group`` the Telegram client is used to create the target if
    necessary. The ``name`` parameter is used for naming the channel or
    group when applicable.
    """
    # Deactivate existing targets
    db.query(StorageTarget).filter(StorageTarget.is_active.is_(True)).update(
        {StorageTarget.is_active: False}
    )

    if target_type == "saved_messages":
        target = StorageTarget(
            name=name or "Saved Messages",
            type=target_type,
            chat_id=None,
            is_active=True,
        )
        db.add(target)
        db.commit()
        db.refresh(target)
        return target

    # For channel and group targets we require a Telegram client
    client = get_telegram_client()
    if client is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Telegram API credentials are not configured",
        )

    # Name fallback
    default_name = "Telegram Drive Storage"
    channel_name = name or default_name

    # Ensure the Telegram client session is started
    await client.start()

    if target_type == "private_channel":
        chat_id = await client.ensure_private_channel(channel_name)
    elif target_type == "private_group":
        chat_id = await client.ensure_private_group(channel_name)
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unknown storage target type: {target_type}",
        )

    target = StorageTarget(
        name=channel_name,
        type=target_type,
        chat_id=chat_id,
        is_active=True,
    )
    db.add(target)
    db.commit()
    db.refresh(target)
    return target
