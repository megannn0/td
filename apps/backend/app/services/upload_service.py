"""Service layer for file uploads.

This module coordinates file uploads by orchestrating between the domain
models, the Telegram uploader infrastructure and the database.  It
implements the smart upload strategy and adaptive chunking defined in
the specification and commits metadata only after successful uploads.
Transfers are tracked via the ``transfers`` table and updated
progressively.

Uploads are initiated directly from the upload API endpoint.  The
backend does **not** persist the local path of the file being
uploaded, so queued uploads cannot be resumed automatically by the
background worker.  Pause, resume and cancel operations update the
transfer status and are honoured when the upload loop checks the
status at the start of each chunk.  This means that pausing or
cancelling may not take effect until after the current chunk
completes.  Clients that wish to retry a failed or cancelled upload
must call the upload endpoint again with the original file.
"""

from __future__ import annotations

import mimetypes
import asyncio
import os
import shutil
import hashlib
from datetime import datetime, timezone
from typing import Optional, Tuple

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.domain.files.models import File
from app.domain.file_parts.models import FilePart
from app.domain.transfers.models import Transfer
from app.infrastructure.telegram.factory import get_telegram_client
from app.infrastructure.telegram.uploader import (
    chunk_file,
    compute_sha256,
    get_upload_limits,
    is_premium_account,
    upload_chunk,
    upload_single_file,
)
from app.services import storage_target_service, cache_service


async def start_upload(
    db: Session,
    file_path: str,
    folder_id: Optional[int] = None,
    file_name: Optional[str] = None,
) -> Tuple[File, Transfer]:
    """Start uploading a file to Telegram with smart chunking."""
    actual_name = file_name or os.path.basename(file_path)
    mime_type, _ = mimetypes.guess_type(actual_name)

    try:
        total_size = os.path.getsize(file_path)
    except OSError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Could not access file: {exc}",
        )

    client = get_telegram_client()
    if client is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Telegram API credentials are not configured",
        )
    await client.start()

    premium = await is_premium_account(client)
    upload_limit, safe_chunk_size = get_upload_limits(premium)

    storage_target = await storage_target_service.get_active_storage_target(db)
    if storage_target is None:
        storage_target = await storage_target_service.set_active_storage_target(
            db,
            target_type="saved_messages",
            name="Saved Messages",
        )
    target_chat_id = storage_target.chat_id

    single_upload = total_size <= upload_limit
    planned_chunk_count = 1 if single_upload else (total_size + safe_chunk_size - 1) // safe_chunk_size

    # Create file record first so transfer.file_id is never null. The record
    # will be deleted if the upload fails to prevent dangling metadata.
    file_record = File(
        name=actual_name,
        folder_id=folder_id,
        storage_chat_id=target_chat_id or 0,
        size=total_size,
        mime_type=mime_type,
        hash=None,
        chunk_count=planned_chunk_count,
    )
    db.add(file_record)
    db.commit()
    db.refresh(file_record)

    # Now create transfer with valid file_id
    transfer = Transfer(
        file_id=file_record.id,
        type="upload",
        status="preparing",
        progress=0.0,
        bytes_transferred=0,
        total_bytes=total_size,
        started_at=datetime.now(timezone.utc),
        last_progress_at=None,
        current_speed_bps=None,
        average_speed_bps=None,
        eta_seconds=None,
        priority=0,
        queue_position=None,
    )
    db.add(transfer)
    db.commit()
    db.refresh(transfer)

    overall_hash = hashlib.sha256()

    if single_upload:
        try:
            msg_id, msg_chat_id = await upload_single_file(
                client,
                target_chat_id,
                file_path,
                file_name=actual_name,
            )
        except Exception as exc:
            # Clean up the file record on failure so unfinished uploads do
            # not leave behind metadata. The associated transfer remains
            # with status "failed" to allow the caller to inspect the
            # failure. Deleting the record before updating transfer
            # prevents a dangling reference.
            db.delete(file_record)
            transfer.status = "failed"
            db.commit()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Upload failed: {exc}",
            )

        with open(file_path, "rb") as f:
            for chunk in iter(lambda: f.read(1024 * 1024), b""):
                overall_hash.update(chunk)

        file_hash = overall_hash.hexdigest()

        # Update existing file record instead of creating a new one
        file_record.storage_chat_id = msg_chat_id
        file_record.hash = file_hash
        file_record.chunk_count = 1
        db.commit()
        db.refresh(file_record)

        file_part = FilePart(
            file_id=file_record.id,
            part_index=1,
            telegram_message_id=msg_id,
            telegram_chat_id=msg_chat_id,
            size=total_size,
            chunk_hash=None,
        )
        db.add(file_part)

        transfer.status = "completed"
        transfer.progress = 1.0
        transfer.bytes_transferred = total_size
        transfer.last_progress_at = datetime.now(timezone.utc)
        db.commit()

        # Cache uploaded file locally for streaming/download
        from app.services.download_service import DEFAULT_DOWNLOAD_DIR
        try:
            os.makedirs(DEFAULT_DOWNLOAD_DIR, exist_ok=True)
            cached_path = os.path.join(DEFAULT_DOWNLOAD_DIR, actual_name)
            shutil.copy2(file_path, cached_path)
            cache_service.add_downloaded_file(file_record.id, cached_path)
        except OSError:
            pass

        return file_record, transfer

    # Multi-chunk upload with resume, pause, cancel and progress reporting.
    # Fetch any already uploaded parts for this file to support resuming
    existing_parts = (
        db.query(FilePart)
        .filter(FilePart.file_id == file_record.id)
        .order_by(FilePart.part_index)
        .all()
    )
    bytes_sent = sum(p.size or 0 for p in existing_parts)
    part_index = len(existing_parts) + 1
    # Initialise transfer status for multi-chunk uploads
    transfer.status = "uploading"
    transfer.total_bytes = total_size
    transfer.bytes_transferred = bytes_sent
    transfer.progress = bytes_sent / total_size if total_size > 0 else None
    transfer.last_progress_at = datetime.now(timezone.utc)
    # Persist initial state
    db.commit()

    # Helper to compute speed and ETA
    def update_speed_eta(start_time: datetime) -> None:
        now = datetime.now(timezone.utc)
        elapsed = (now - start_time).total_seconds()
        # Current chunk speed
        if elapsed > 0:
            current_speed = current_size / elapsed
            transfer.current_speed_bps = current_speed
        # Average speed
        total_elapsed = (now - transfer.started_at).total_seconds()
        if total_elapsed > 0:
            transfer.average_speed_bps = transfer.bytes_transferred / total_elapsed
        # ETA based on current speed
        if transfer.current_speed_bps and transfer.current_speed_bps > 0:
            remaining_bytes = total_size - transfer.bytes_transferred
            transfer.eta_seconds = int(remaining_bytes / transfer.current_speed_bps)
        else:
            transfer.eta_seconds = None

    # Iterate through file chunks. Skip those already uploaded.
    idx = 0
    async for chunk_data in chunk_file(file_path, safe_chunk_size):
        idx += 1
        # Skip previously uploaded parts
        if idx <= len(existing_parts):
            continue

        current_size = len(chunk_data)
        part_name = f"{actual_name}.part{part_index:03d}"

        # Before uploading, check for cancellation or pause.
        # Refresh transfer state from the database in case it was modified by the API.
        db.refresh(transfer)
        # If cancelled, clean up and abort.
        if transfer.status == "cancelled":
            # Delete the incomplete file record. The transfer persists for history.
            db.delete(file_record)
            # Set file_id to None on the transfer to avoid dangling FK
            transfer.file_id = None
            db.commit()
            raise HTTPException(status_code=499, detail="Upload cancelled")
        # If paused, wait until pause_until is reached or status changes
        if transfer.status == "paused":
            # Wait in small intervals to allow cancellation to be detected
            while transfer.pause_until and transfer.pause_until > datetime.now(timezone.utc):
                await asyncio.sleep(1)
                db.refresh(transfer)
                if transfer.status == "cancelled":
                    db.delete(file_record)
                    transfer.file_id = None
                    db.commit()
                    raise HTTPException(status_code=499, detail="Upload cancelled")
                # Break if paused flag cleared (resume called)
                if transfer.status != "paused":
                    break
            # After waiting, continue if resume has been triggered
            if transfer.status == "paused":
                # In case pause expired naturally, reset status to queued
                transfer.status = "queued"
                db.commit()
            # Refresh again before continuing
            db.refresh(transfer)

        # Upload the chunk and measure elapsed time for speed calculation
        start_time = datetime.now(timezone.utc)
        try:
            msg_id, msg_chat_id = await upload_chunk(
                client,
                target_chat_id,
                chunk_data,
                file_name=part_name,
            )
        except Exception as exc:
            # On failure of any chunk, delete the incomplete file record and
            # mark the transfer as failed. The transfer remains in the DB for
            # inspection and retry. Set file_id to None to prevent foreign key issues.
            db.delete(file_record)
            transfer.file_id = None
            transfer.status = "failed"
            db.commit()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Chunk upload failed (part {part_index}): {exc}",
            )

        # Persist file part metadata
        file_part = FilePart(
            file_id=file_record.id,
            part_index=part_index,
            telegram_message_id=msg_id,
            telegram_chat_id=msg_chat_id,
            size=current_size,
            chunk_hash=await compute_sha256(chunk_data),
        )
        db.add(file_part)

        # Update progress on the transfer
        bytes_sent += current_size
        transfer.bytes_transferred = bytes_sent
        transfer.progress = bytes_sent / total_size if total_size > 0 else None
        transfer.last_progress_at = datetime.now(timezone.utc)
        # Update speed and ETA metrics
        update_speed_eta(start_time)
        # Commit after each chunk to persist progress and allow other
        # endpoints to observe up‑to‑date status
        db.commit()

        part_index += 1

    # Compute full file hash for integrity once all parts are uploaded
    full_hash = hashlib.sha256()
    with open(file_path, "rb") as fh:
        for buf in iter(lambda: fh.read(1024 * 1024), b""):
            full_hash.update(buf)
    file_record.hash = full_hash.hexdigest()
    file_record.chunk_count = part_index - 1
    # Finalize transfer
    transfer.status = "completed"
    transfer.progress = 1.0
    transfer.bytes_transferred = total_size
    transfer.last_progress_at = datetime.now(timezone.utc)
    transfer.current_speed_bps = None
    transfer.eta_seconds = 0
    db.commit()

    # Cache uploaded file locally for streaming/download
    from app.services.download_service import DEFAULT_DOWNLOAD_DIR
    try:
        os.makedirs(DEFAULT_DOWNLOAD_DIR, exist_ok=True)
        cached_path = os.path.join(DEFAULT_DOWNLOAD_DIR, actual_name)
        shutil.copy2(file_path, cached_path)
        cache_service.add_downloaded_file(file_record.id, cached_path)
    except OSError:
        pass

    return file_record, transfer