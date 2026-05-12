"""API routes for transfer operations.

This module exposes endpoints to list transfer jobs and retrieve individual
transfer details. Transfers represent upload or download operations and
their current status. For iteration 3 we focus on uploads only.
"""

from __future__ import annotations

from typing import List
from datetime import datetime, timezone, timedelta
import logging

from fastapi import APIRouter, Depends, HTTPException, status

from app.api.deps import get_current_active_db
from app.domain.transfers.models import Transfer as TransferModel
from app.schemas.transfer import TransferResponse

router = APIRouter(prefix="/transfers", tags=["transfers"])

# Logger for transfer operations. This module-level logger routes
# operational messages through the standard logging infrastructure
# instead of using bare prints. It can be configured by the
# application to persist logs or adjust verbosity.
logger = logging.getLogger(__name__)


@router.get("/", response_model=List[TransferResponse])
async def list_transfers(db=Depends(get_current_active_db)) -> List[TransferResponse]:
    """List all transfer jobs."""
    transfers = db.query(TransferModel).all()
    return [TransferResponse.from_orm(t) for t in transfers]


@router.get("/{transfer_id}", response_model=TransferResponse)
async def get_transfer(transfer_id: int, db=Depends(get_current_active_db)) -> TransferResponse:
    """Retrieve details of a specific transfer job."""
    transfer = db.query(TransferModel).filter(TransferModel.id == transfer_id).first()
    if not transfer:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Transfer not found")
    return TransferResponse.from_orm(transfer)


def _get_orderable_transfers(db) -> List[TransferModel]:
    """Return a list of transfers that participate in queue ordering.

    Transfers with a status of completed, failed or cancelled are
    excluded from ordering operations. The list is sorted by priority
    descending and then by queue_position ascending. Transfers with
    a null queue_position are placed at the end of the list.
    """
    # We exclude finished jobs from queue manipulation
    active_statuses = [
        "queued",
        "preparing",
        "uploading",
        "downloading",
        "paused",
        "retrying",
    ]
    transfers = (
        db.query(TransferModel)
        .filter(TransferModel.status.in_(active_statuses))
        .order_by(TransferModel.priority.desc(), TransferModel.queue_position.is_(None), TransferModel.queue_position.asc())
        .all()
    )
    return transfers


def _reindex_queue(transfers: List[TransferModel]) -> None:
    """Assign sequential queue_position values to the provided list.

    This helper normalizes queue positions so that they form a contiguous
    sequence starting from 0. It does not commit the session; callers
    must commit after calling this function.
    """
    for idx, transfer in enumerate(transfers):
        transfer.queue_position = idx


@router.post("/{transfer_id}/pause", response_model=TransferResponse)
async def pause_transfer(
    transfer_id: int,
    db=Depends(get_current_active_db),
) -> TransferResponse:
    """
    Pause an in‑progress or queued transfer.

    When paused, a transfer will not continue until the pause is lifted.  The
    current implementation sets ``pause_until`` far in the future to
    effectively suspend the transfer.  Transfers marked as completed,
    failed or cancelled cannot be paused.

    **Important:** pausing a transfer does not immediately abort an
    in‑flight upload or download.  Both the upload and download
    services check the transfer's status only at the start of each
    chunk.  As a result, there may be a short delay — up to a
    chunk's duration — before the pause takes effect.  The system
    therefore offers near‑real‑time control but does not guarantee
    instantaneous pausing.
    """
    transfer = db.query(TransferModel).filter(TransferModel.id == transfer_id).first()
    if not transfer:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Transfer not found")
    if transfer.status in ("completed", "failed", "cancelled"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot pause a finished transfer",
        )
    # Pause until a far future date (10 years). In a real application this
    # would be derived from user input or the FLOOD_WAIT duration.
    transfer.status = "paused"
    transfer.pause_until = datetime.now(timezone.utc) + timedelta(days=365 * 10)
    db.commit()
    db.refresh(transfer)
    logger.info("Paused transfer %s", transfer_id)
    return TransferResponse.from_orm(transfer)


@router.post("/{transfer_id}/resume", response_model=TransferResponse)
async def resume_transfer(
    transfer_id: int,
    db=Depends(get_current_active_db),
) -> TransferResponse:
    """
    Resume a previously paused transfer.

    Resuming sets the transfer status back to ``queued`` and clears any
    pause deadline. Transfers that are already completed, failed or
    cancelled cannot be resumed.

    Like pausing, resuming a transfer does not directly manipulate an
    in‑flight upload or download.  The services poll the database at
    chunk boundaries and honour state changes at that point.  This
    means there may be a short delay before the resumed job proceeds.
    """
    transfer = db.query(TransferModel).filter(TransferModel.id == transfer_id).first()
    if not transfer:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Transfer not found")
    if transfer.status in ("completed", "failed", "cancelled"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot resume a finished transfer",
        )
    transfer.status = "queued"
    transfer.pause_until = None
    db.commit()
    db.refresh(transfer)
    logger.info("Resumed transfer %s", transfer_id)
    return TransferResponse.from_orm(transfer)


@router.post("/{transfer_id}/cancel", response_model=TransferResponse)
async def cancel_transfer(
    transfer_id: int,
    db=Depends(get_current_active_db),
) -> TransferResponse:
    """
    Cancel a transfer.

    Cancelling marks the transfer as ``cancelled``.  The upload and
    download services periodically check the transfer status and will
    abort future chunk processing when they detect the cancelled state.
    Immediate termination of an in‑flight operation is not guaranteed;
    there may be a brief delay while the current chunk completes.  No
    further chunks will be uploaded or downloaded once the cancellation
    propagates.
    """
    transfer = db.query(TransferModel).filter(TransferModel.id == transfer_id).first()
    if not transfer:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Transfer not found")
    if transfer.status in ("completed", "failed", "cancelled"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Transfer is already finished",
        )
    transfer.status = "cancelled"
    db.commit()
    db.refresh(transfer)
    logger.info("Cancelled transfer %s", transfer_id)
    return TransferResponse.from_orm(transfer)


@router.post("/{transfer_id}/retry", response_model=TransferResponse)
async def retry_transfer(
    transfer_id: int,
    db=Depends(get_current_active_db),
) -> TransferResponse:
    """
    Retry a failed or cancelled transfer.

    This endpoint resets the transfer's progress and attempts count and
    places it back into the processing queue.  Only transfers whose
    status is ``failed`` or ``cancelled`` may be retried.  When a
    download is retried, the **existing transfer record** is reused
    rather than creating a new one.  The background ``TransferWorker``
    picks up queued downloads and performs the actual download; it
    applies exponential backoff after failures.

    **Important:** retrying *upload* transfers is not supported.  The
    backend does not store the local file path that was uploaded, so it
    cannot re‑initiate the upload automatically.  Clients must re‑submit
    the file via the upload endpoint.  If a client attempts to retry
    an upload transfer, this endpoint will respond with HTTP 400.
    """
    transfer = db.query(TransferModel).filter(TransferModel.id == transfer_id).first()
    if not transfer:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Transfer not found")
    if transfer.status not in ("failed", "cancelled"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only failed or cancelled transfers can be retried",
        )
    # Reject retries for upload transfers because the backend does not
    # persist the local file path required to re‑upload.  Clients must
    # re‑submit the upload manually.
    if transfer.type == "upload":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Retrying uploads is not supported. Please re‑upload the file.",
        )
    # Reset fields for a new download attempt
    transfer.status = "queued"
    transfer.progress = 0.0
    transfer.bytes_transferred = 0
    transfer.attempts = 0
    transfer.pause_until = None
    # Place the transfer at the end of the queue by setting position to
    # the current maximum + 1. Determine max queue position among active
    # transfers.
    transfers = _get_orderable_transfers(db)
    max_pos = max((t.queue_position or 0) for t in transfers) if transfers else -1
    transfer.queue_position = max_pos + 1
    db.commit()
    db.refresh(transfer)
    logger.info("Retried transfer %s", transfer_id)
    return TransferResponse.from_orm(transfer)


@router.post("/{transfer_id}/move-up", response_model=TransferResponse)
async def move_transfer_up(
    transfer_id: int,
    db=Depends(get_current_active_db),
) -> TransferResponse:
    """Move a transfer one position up in the queue."""
    transfers = _get_orderable_transfers(db)
    # find index
    idx = next((i for i, t in enumerate(transfers) if t.id == transfer_id), None)
    if idx is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Transfer not found or not orderable")
    if idx == 0:
        # Already at top
        return TransferResponse.from_orm(transfers[idx])
    # swap with previous
    transfers[idx - 1], transfers[idx] = transfers[idx], transfers[idx - 1]
    _reindex_queue(transfers)
    db.commit()
    # Refresh moved transfer from db
    updated = db.query(TransferModel).filter(TransferModel.id == transfer_id).first()
    logger.info("Moved transfer %s up", transfer_id)
    return TransferResponse.from_orm(updated)


@router.post("/{transfer_id}/move-down", response_model=TransferResponse)
async def move_transfer_down(
    transfer_id: int,
    db=Depends(get_current_active_db),
) -> TransferResponse:
    """Move a transfer one position down in the queue."""
    transfers = _get_orderable_transfers(db)
    idx = next((i for i, t in enumerate(transfers) if t.id == transfer_id), None)
    if idx is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Transfer not found or not orderable")
    if idx == len(transfers) - 1:
        # Already at bottom
        return TransferResponse.from_orm(transfers[idx])
    transfers[idx], transfers[idx + 1] = transfers[idx + 1], transfers[idx]
    _reindex_queue(transfers)
    db.commit()
    updated = db.query(TransferModel).filter(TransferModel.id == transfer_id).first()
    logger.info("Moved transfer %s down", transfer_id)
    return TransferResponse.from_orm(updated)


@router.post("/{transfer_id}/move-top", response_model=TransferResponse)
async def move_transfer_top(
    transfer_id: int,
    db=Depends(get_current_active_db),
) -> TransferResponse:
    """Move a transfer to the top of the queue."""
    transfers = _get_orderable_transfers(db)
    idx = next((i for i, t in enumerate(transfers) if t.id == transfer_id), None)
    if idx is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Transfer not found or not orderable")
    transfer = transfers.pop(idx)
    transfers.insert(0, transfer)
    _reindex_queue(transfers)
    db.commit()
    updated = db.query(TransferModel).filter(TransferModel.id == transfer_id).first()
    logger.info("Moved transfer %s to top", transfer_id)
    return TransferResponse.from_orm(updated)


@router.post("/{transfer_id}/move-bottom", response_model=TransferResponse)
async def move_transfer_bottom(
    transfer_id: int,
    db=Depends(get_current_active_db),
) -> TransferResponse:
    """Move a transfer to the bottom of the queue."""
    transfers = _get_orderable_transfers(db)
    idx = next((i for i, t in enumerate(transfers) if t.id == transfer_id), None)
    if idx is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Transfer not found or not orderable")
    transfer = transfers.pop(idx)
    transfers.append(transfer)
    _reindex_queue(transfers)
    db.commit()
    updated = db.query(TransferModel).filter(TransferModel.id == transfer_id).first()
    logger.info("Moved transfer %s to bottom", transfer_id)
    return TransferResponse.from_orm(updated)


@router.post("/{transfer_id}/prioritize", response_model=TransferResponse)
async def prioritize_transfer(
    transfer_id: int,
    db=Depends(get_current_active_db),
) -> TransferResponse:
    """Increase the priority of a transfer, placing it ahead of others."""
    transfer = db.query(TransferModel).filter(TransferModel.id == transfer_id).first()
    if not transfer:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Transfer not found")
    # Determine current maximum priority
    max_priority = db.query(TransferModel.priority).order_by(TransferModel.priority.desc()).first()
    current_max = max_priority[0] if max_priority else 0
    transfer.priority = current_max + 1
    # Put it at the top of the queue for its new priority
    transfers = _get_orderable_transfers(db)
    # Re-sort after priority change
    transfers.sort(key=lambda t: (-t.priority, t.queue_position or 0))
    _reindex_queue(transfers)
    db.commit()
    db.refresh(transfer)
    logger.info("Prioritized transfer %s", transfer_id)
    return TransferResponse.from_orm(transfer)