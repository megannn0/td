"""API routes for file operations.

This module defines endpoints for uploading files to Telegram Drive and
listing existing files. Uploads adhere to the smart upload strategy and
adaptive chunking rules. File listings return metadata but do not
expose Telegram internals.
"""

from __future__ import annotations

import os
import tempfile
from typing import List, Optional
import time

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
import logging

from app.api.deps import get_current_active_db
from app.domain.files.models import File as FileModel
from app.schemas.file import FileResponse, FileUploadResponse
from app.schemas.transfer import TransferResponse
from app.services import upload_service, download_service

router = APIRouter(prefix="/files", tags=["files"])

# Configure a module-level logger. This logger will write messages to the
# standard logging system instead of printing directly to stdout. It is
# important for production readiness that debug statements use the
# configured logging infrastructure rather than bare prints, which
# otherwise clutter the output and cannot be easily filtered.
logger = logging.getLogger(__name__)


@router.post("/upload", response_model=FileUploadResponse, status_code=status.HTTP_201_CREATED)
async def upload_file(
    *,
    db=Depends(get_current_active_db),
    folder_id: Optional[int] = Form(None),
    file: UploadFile = File(...),
) -> FileUploadResponse:
    """Upload a file to Telegram Drive.

    Accepts a multipart/form-data request containing the file and an optional
    ``folder_id`` to place the file within a specific folder. The file is
    temporarily saved to disk before being passed to the upload service.

    Parameters
    ----------
    db: Session
        Database session provided by dependency injection.
    folder_id: Optional[int]
        ID of the target folder for the file. None indicates the root.
    file: UploadFile
        The file to upload.

    Returns
    -------
    FileUploadResponse
        Metadata for the uploaded file and its transfer job.

    Raises
    ------
    HTTPException
        If saving the temporary file fails.
    """

    start_time = time.time()
    logger.info("UPLOAD: browser-to-backend started")

    # Save the uploaded file to a temporary location. Reading the upload
    # stream in chunks avoids loading the entire file into memory.
    try:
        with tempfile.NamedTemporaryFile(delete=False) as tmp:
            while True:
                chunk = await file.read(1024 * 1024)  # 1 MB
                if not chunk:
                    break
                tmp.write(chunk)
        tmp_path = tmp.name
        logger.info(
            "UPLOAD: browser-to-backend finished in %.2f seconds",
            time.time() - start_time,
        )
    except Exception as exc:
        # On any exception when writing the temporary file, surface the
        # error to the client. Using HTTP 500 informs the caller that the
        # server-side handling of the upload failed.
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save uploaded file: {exc}",
        )

    # Delegate upload to the service layer
    try:
        telegram_start = time.time()
        logger.info("UPLOAD: backend-to-telegram started")
        file_record, transfer_record = await upload_service.start_upload(
            db,
            file_path=tmp_path,
            folder_id=folder_id,
            file_name=file.filename,
        )
        logger.info(
            "UPLOAD: backend-to-telegram finished in %.2f seconds",
            time.time() - telegram_start,
        )
    finally:
        # Remove temporary file even if upload fails. Failure to delete
        # the temporary file is silently ignored.
        try:
            os.remove(tmp_path)
        except OSError:
            pass

    # Prepare file response and inject empty tag list, since a new upload has no tags yet.
    base_file_resp = FileResponse.from_orm(file_record)
    file_data = base_file_resp.model_dump()
    file_data["tags"] = [t.name for t in getattr(file_record, "tags", [])]
    file_resp = FileResponse(**file_data)
    return FileUploadResponse(
        file=file_resp,
        transfer=TransferResponse.from_orm(transfer_record),
    )


@router.get("/", response_model=List[FileResponse])
async def list_files(
    *,
    db=Depends(get_current_active_db),
    folder_id: Optional[int] = None,
) -> List[FileResponse]:
    """List files stored in the database, optionally filtering by folder.

    Without a ``folder_id`` query parameter, all files are returned. If
    ``folder_id`` is provided, only files within that folder are
    returned. Note that this endpoint does not currently support
    recursive listing across subfolders.
    """
    query = db.query(FileModel)
    if folder_id is not None:
        query = query.filter(FileModel.folder_id == folder_id)
    files = query.all()
    # Convert ORM objects to response models while exposing tag names.
    response: List[FileResponse] = []
    for f in files:
        # Use from_orm to populate standard fields then override tags.
        base = FileResponse.from_orm(f)
        data = base.model_dump()
        # Replace tag objects with names to avoid leaking internal IDs.
        data["tags"] = [t.name for t in getattr(f, "tags", [])]
        response.append(FileResponse(**data))
    return response


@router.post("/{file_id}/download", response_model=TransferResponse, status_code=status.HTTP_201_CREATED)
async def download_file(
    *,
    file_id: int,
    db=Depends(get_current_active_db),
) -> TransferResponse:
    """Download a file from Telegram Drive and reconstruct it locally.

    This endpoint initiates a download job for the specified file. The
    server reconstructs the original file by retrieving each part
    stored on Telegram, writing them in order to a local destination,
    and verifying the resulting file's integrity. The response
    includes the transfer job with progress and status information.

    Parameters
    ----------
    file_id: int
        Identifier of the file to download.
    db: Session
        Database session provided by dependency injection.

    Returns
    -------
    TransferResponse
        Metadata about the initiated download transfer.

    Raises
    ------
    HTTPException
        If the file does not exist or the download fails.
    """
    transfer = await download_service.start_download(db, file_id)
    return TransferResponse.from_orm(transfer)