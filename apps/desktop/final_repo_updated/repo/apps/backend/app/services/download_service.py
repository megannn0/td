"""Service layer for file downloads and reconstruction.

This module orchestrates the downloading of files from Telegram.  It
coordinates between the domain models, the Telegram downloader
infrastructure and the database to reconstruct logical files from
their stored parts.  The download manager adheres to the rules defined
in the specification, including ordering by ``part_index`` and
verifying file integrity upon completion.  To satisfy the file
integrity verification requirements, each downloaded chunk is hashed
and compared against the recorded ``chunk_hash`` in the database.  If a
chunk fails verification, it is re‑downloaded with exponential
backoff (5 s, 15 s, 45 s) up to three attempts.  Only verified chunks
are written to disk, and the overall file hash is computed
incrementally to ensure the reconstructed file matches the stored
``hash``.  Transfers are tracked via the ``transfers`` table and
updated progressively.

Download transfers can be initiated either directly via the
``/api/files/{file_id}/download`` endpoint or automatically by the
background ``TransferWorker`` when a queued or retrying download
transfer is encountered.  For queued downloads, the worker sets the
transfer status to ``downloading`` and increments the attempt count
before delegating to this service.  Failed downloads are retried
according to the exponential backoff schedule until the maximum
attempt count is reached, after which the transfer remains in the
``failed`` state.

Pausing or cancelling a download only takes effect when the service
checks the transfer status before downloading the next chunk.  There
may therefore be a short delay between requesting a pause/cancel and
the download loop stopping.
"""

from __future__ import annotations

import hashlib
import asyncio
import os
from datetime import datetime, timezone
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.domain.file_parts.models import FilePart
from app.domain.files.models import File
from app.domain.transfers.models import Transfer
from app.infrastructure.telegram.downloader import (
    download_media_to_memory,
)
from app.infrastructure.telegram.factory import get_telegram_client
from app.services import cache_service


DEFAULT_DOWNLOAD_DIR = os.path.join(os.getcwd(), "downloads")


async def start_download(
    db: Session,
    file_id: int,
    destination_dir: Optional[str] = None,
    *,
    transfer: Optional[Transfer] = None,
) -> Transfer:
    """Start downloading a file from Telegram and reconstruct it on disk.

    This function retrieves the requested file's metadata and its
    associated parts from the database, downloads each part in order
    using the Telegram client, writes the parts sequentially into a
    single file on disk, and verifies the resulting file hash against
    the stored hash. A new transfer record is created to track the
    progress and status of the download operation.

    Parameters
    ----------
    db: Session
        Database session used to query and persist data.
    file_id: int
        Identifier of the file to download.
    destination_dir: Optional[str]
        Optional directory where the reconstructed file should be
        saved. If not provided, a default ``downloads`` directory in
        the current working directory is used.

    Parameters
    ----------
    db: Session
        Database session used to query and persist data.
    file_id: int
        Identifier of the file to download.
    destination_dir: Optional[str]
        Optional directory where the reconstructed file should be
        saved. If not provided, a default ``downloads`` directory in
        the current working directory is used.
    transfer: Optional[Transfer], keyword-only
        Existing transfer record to update.  When ``None``, a new
        transfer is created.  When provided, the existing record is
        reset for a fresh download attempt and updated with progress
        during the download.  This allows the background worker to
        process queued transfers without creating duplicate entries.

    Returns
    -------
    Transfer
        The transfer record representing the download job.  This may be
        the newly created record or the provided record.

    Raises
    ------
    HTTPException
        If the file does not exist, Telegram is not configured, or
        downloading fails.
    """
    # Retrieve the file metadata
    file_record: Optional[File] = db.query(File).filter(File.id == file_id).first()
    if not file_record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")

    # Acquire Telegram client
    client = get_telegram_client()
    if client is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Telegram API credentials are not configured",
        )
    await client.start()

    # Resolve destination directory and path
    dest_dir = destination_dir or DEFAULT_DOWNLOAD_DIR
    try:
        os.makedirs(dest_dir, exist_ok=True)
    except OSError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create download directory: {exc}",
        )
    dest_path = os.path.join(dest_dir, file_record.name)

    # If no existing transfer is provided, create a new one.  A provided
    # transfer should already have been persisted and points at the
    # correct file_id.
    new_transfer_created = False
    if transfer is None:
        transfer = Transfer(
            file_id=file_record.id,
            type="download",
            status="preparing",
            progress=0.0,
            bytes_transferred=0,
            total_bytes=file_record.size,
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
        new_transfer_created = True
    else:
        # Existing transfer: reset its state for a fresh download attempt
        transfer.status = "preparing"
        transfer.progress = 0.0
        transfer.bytes_transferred = 0
        transfer.total_bytes = file_record.size
        transfer.started_at = datetime.now(timezone.utc)
        transfer.last_progress_at = None
        transfer.current_speed_bps = None
        transfer.average_speed_bps = None
        transfer.eta_seconds = None
        # Do not alter priority or queue_position
        db.commit()

    # Order parts by part_index
    parts = (
        db.query(FilePart)
        .filter(FilePart.file_id == file_record.id)
        .order_by(FilePart.part_index)
        .all()
    )
    if not parts:
        # If there are no recorded parts, we cannot download
        transfer.status = "failed"
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="No file parts found for the requested file",
        )

    # Begin download
    transfer.status = "downloading"
    transfer.last_progress_at = datetime.now(timezone.utc)
    db.commit()

    bytes_downloaded = 0
    sha256 = hashlib.sha256()

    # Ensure destination file is empty before writing
    try:
        with open(dest_path, "wb") as f:
            pass
    except OSError as exc:
        transfer.status = "failed"
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create destination file: {exc}",
        )

    for part in parts:
        # Download each part with retry and per-chunk integrity verification
        # Measure when the part download begins to calculate speed
        chunk_started_at = datetime.now(timezone.utc)
        max_retries = 3
        backoff = [5, 15, 45]
        attempt = 0
        chunk_bytes: bytes = b""

        # Check for pause or cancellation before downloading this part
        db.refresh(transfer)
        if transfer.status == "cancelled":
            # Remove partially downloaded file and preserve transfer record
            try:
                if os.path.exists(dest_path):
                    os.remove(dest_path)
            except OSError:
                pass
            # Clear file_id to avoid dangling foreign key
            transfer.file_id = None
            db.commit()
            raise HTTPException(status_code=499, detail="Download cancelled")
        if transfer.status == "paused":
            # Wait until pause_until has passed or status changes
            while transfer.pause_until and transfer.pause_until > datetime.now(timezone.utc):
                await asyncio.sleep(1)
                db.refresh(transfer)
                if transfer.status == "cancelled":
                    try:
                        if os.path.exists(dest_path):
                            os.remove(dest_path)
                    except OSError:
                        pass
                    transfer.file_id = None
                    db.commit()
                    raise HTTPException(status_code=499, detail="Download cancelled")
                if transfer.status != "paused":
                    break
        while True:
            try:
                chunk_bytes = await download_media_to_memory(
                    client,
                    chat_id=part.telegram_chat_id,
                    message_id=part.telegram_message_id,
                )
            except Exception as exc:  # noqa: WPS410
                # On error, mark transfer as failed and exit
                transfer.status = "failed"
                db.commit()
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Download failed for part {part.part_index}: {exc}",
                )
            # If a chunk hash is recorded for this part, verify its integrity
            if part.chunk_hash:
                computed_chunk_hash = hashlib.sha256(chunk_bytes).hexdigest()
                if computed_chunk_hash != part.chunk_hash:
                    attempt += 1
                    if attempt <= max_retries:
                        # Exponential backoff before retrying
                        await asyncio.sleep(backoff[attempt - 1])
                        continue
                    # Exceeded retries; fail the transfer
                    transfer.status = "failed"
                    db.commit()
                    raise HTTPException(
                        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                        detail=(
                            f"Chunk {part.part_index} failed integrity verification "
                            f"after {max_retries} attempts"
                        ),
                    )
            # Verified successfully or no chunk hash available
            break
        # After verifying the chunk, compute transfer metrics based on the
        # time taken to download this part. This approximates the
        # instantaneous speed for the chunk.
        chunk_elapsed = (datetime.now(timezone.utc) - chunk_started_at).total_seconds()
        # Append the verified chunk to the destination file
        try:
            with open(dest_path, "ab") as f:
                f.write(chunk_bytes)
        except OSError as exc:
            transfer.status = "failed"
            db.commit()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to write chunk {part.part_index} to disk: {exc}",
            )
        # Compute per-chunk hash and persist if not previously stored
        computed_chunk_hash = hashlib.sha256(chunk_bytes).hexdigest()
        if not part.chunk_hash:
            # Persist the chunk hash for future integrity verification
            part.chunk_hash = computed_chunk_hash
            db.commit()
        # Update overall hash and progress
        sha256.update(chunk_bytes)
        bytes_downloaded += len(chunk_bytes)
        transfer.bytes_transferred = bytes_downloaded
        transfer.progress = bytes_downloaded / file_record.size if file_record.size > 0 else None
        # Calculate instantaneous speed for this chunk
        if chunk_elapsed > 0:
            transfer.current_speed_bps = len(chunk_bytes) / chunk_elapsed
        # Compute average speed across the entire download
        total_elapsed = (datetime.now(timezone.utc) - transfer.started_at).total_seconds()
        if total_elapsed > 0:
            transfer.average_speed_bps = bytes_downloaded / total_elapsed
        # Estimate ETA using current speed
        if transfer.current_speed_bps and transfer.current_speed_bps > 0:
            remaining = file_record.size - bytes_downloaded
            transfer.eta_seconds = int(remaining / transfer.current_speed_bps)
        else:
            transfer.eta_seconds = None
        transfer.last_progress_at = datetime.now(timezone.utc)
        db.commit()

    # Final file hash verification and storage
    computed_hash = sha256.hexdigest()
    if file_record.hash:
        # If a hash is recorded, compare and fail if mismatch
        if computed_hash != file_record.hash:
            transfer.status = "failed"
            db.commit()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Downloaded file failed integrity check",
            )
    else:
        # If no hash is stored (e.g., imported file), record it now
        file_record.hash = computed_hash
        db.commit()

    # Finalize transfer
    transfer.status = "completed"
    transfer.progress = 1.0
    transfer.bytes_transferred = file_record.size
    transfer.last_progress_at = datetime.now(timezone.utc)
    db.commit()

    # Add the downloaded file to the local cache. This will also evict
    # older downloaded files when the cache exceeds its configured
    # capacity.
    cache_service.add_downloaded_file(file_record.id, dest_path)

    return transfer