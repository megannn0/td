"""API route for triggering synchronization of existing Telegram files.

This route exposes an endpoint that initiates a scan of the active
Telegram storage target to import any existing files into the local
metadata database. It returns a summary of the operation, including
counts of files and parts imported and messages skipped due to
existing records.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, status

from app.api.deps import get_current_active_db
from app.services import sync_service

router = APIRouter(prefix="/sync", tags=["sync"])


@router.post("/existing", status_code=status.HTTP_202_ACCEPTED)
async def sync_existing_files(*, db=Depends(get_current_active_db)) -> dict:
    """Scan and import existing Telegram files from the active storage target.

    Returns a JSON object summarizing how many logical files and file
    parts were imported, and how many messages were skipped because
    they were already present in the database. The operation runs
    synchronously for the purposes of this iteration but may be offloaded
    to a background worker in future versions.
    """
    summary = await sync_service.sync_existing_files(db)
    return {
        "files_imported": summary.files_imported,
        "parts_imported": summary.parts_imported,
        "skipped_existing": summary.skipped_existing,
    }