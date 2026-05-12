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
from fastapi.responses import StreamingResponse
from urllib.parse import quote
import logging

from app.api.deps import get_current_active_db
from app.domain.files.models import File as FileModel
from app.schemas.file import FileResponse, FileUploadResponse
from app.schemas.transfer import TransferResponse
from app.services import upload_service, download_service, stream_service
from app.services import cache_service

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
    all: bool = False,
) -> List[FileResponse]:
    """List files stored in the database, optionally filtering by folder.

    Without a ``folder_id`` query parameter, only root-level files (no parent
    folder) are returned. If ``folder_id`` is provided, only files within that
    folder are returned. Set ``all=true`` to return all files regardless of
    folder (useful for building file maps in transfer panels). Note that this
    endpoint does not currently support recursive listing across subfolders.
    """
    query = db.query(FileModel)
    if all:
        # Return all files regardless of folder (for transfer panel file maps)
        pass
    elif folder_id is not None:
        query = query.filter(FileModel.folder_id == folder_id)
    else:
        # When listing root folder, only return files with no parent folder
        query = query.filter(FileModel.folder_id.is_(None))
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


@router.put("/{file_id}", response_model=FileResponse)
async def update_file(
    *,
    file_id: int,
    payload: dict,
    db=Depends(get_current_active_db),
) -> FileResponse:
    """Update a file's metadata (e.g. move to a different folder).

    Supported fields: ``folder_id``, ``name``.
    """
    file_record = db.query(FileModel).filter(FileModel.id == file_id).first()
    if not file_record:
        raise HTTPException(status_code=404, detail="File not found")
    if "folder_id" in payload:
        file_record.folder_id = payload["folder_id"]
    if "name" in payload:
        file_record.name = payload["name"]
    db.commit()
    db.refresh(file_record)
    base = FileResponse.from_orm(file_record)
    data = base.model_dump()
    data["tags"] = [t.name for t in getattr(file_record, "tags", [])]
    return FileResponse(**data)


@router.delete("/{file_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_file(
    *,
    file_id: int,
    db=Depends(get_current_active_db),
):
    """Delete a file and all its associated parts."""
    file_record = db.query(FileModel).filter(FileModel.id == file_id).first()
    if not file_record:
        raise HTTPException(status_code=404, detail="File not found")
    db.delete(file_record)
    db.commit()
    return None


@router.post("/{file_id}/copy", response_model=FileResponse)
async def copy_file(
    *,
    file_id: int,
    target_folder_id: Optional[int] = None,
    db=Depends(get_current_active_db),
):
    """Duplicate a file by copying its metadata. The new file references
    the same Telegram parts (no actual data is copied)."""
    source = db.query(FileModel).filter(FileModel.id == file_id).first()
    if not source:
        raise HTTPException(status_code=404, detail="File not found")
    from app.domain.file_parts.models import FilePart
    new_file = FileModel(
        name=source.name,
        folder_id=target_folder_id if target_folder_id is not None else source.folder_id,
        storage_chat_id=source.storage_chat_id,
        size=source.size,
        mime_type=source.mime_type,
        hash=source.hash,
        chunk_count=source.chunk_count,
    )
    db.add(new_file)
    db.commit()
    db.refresh(new_file)
    # Copy file parts
    parts = db.query(FilePart).filter(FilePart.file_id == file_id).all()
    for p in parts:
        new_part = FilePart(
            file_id=new_file.id,
            part_index=p.part_index,
            telegram_message_id=p.telegram_message_id,
            telegram_chat_id=p.telegram_chat_id,
            size=p.size,
            chunk_hash=p.chunk_hash,
        )
        db.add(new_part)
    db.commit()
    base = FileResponse.from_orm(new_file)
    data = base.model_dump()
    data["tags"] = [t.name for t in getattr(new_file, "tags", [])]
    return FileResponse(**data)


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


@router.get("/{file_id}/download-to-browser")
async def download_file_direct(
    *,
    file_id: int,
    db=Depends(get_current_active_db),
):
    """Download a file directly to the browser.
    
    First checks the local cache. If not found, downloads from Telegram
    on demand and streams the file with correct Content-Disposition header.
    """
    from fastapi.responses import FileResponse
    
    file_record = db.query(FileModel).filter(FileModel.id == file_id).first()
    if not file_record:
        raise HTTPException(status_code=404, detail="File not found")
    
    # Check cache
    from app.services.download_service import DEFAULT_DOWNLOAD_DIR, sanitize_filename
    cached_path = cache_service.get_downloaded_file(file_id)
    
    if not cached_path or not os.path.exists(cached_path):
        # Check sanitized filename in download directory
        safe_name = sanitize_filename(file_record.name)
        candidate = os.path.join(DEFAULT_DOWNLOAD_DIR, safe_name)
        if os.path.exists(candidate):
            cached_path = candidate
        else:
            # Check original name too
            candidate2 = os.path.join(DEFAULT_DOWNLOAD_DIR, file_record.name)
            if os.path.exists(candidate2):
                cached_path = candidate2
    
    if cached_path and os.path.exists(cached_path):
        cache_service.add_downloaded_file(file_record.id, cached_path)
        return FileResponse(
            path=cached_path,
            media_type=file_record.mime_type or "application/octet-stream",
            filename=file_record.name,
        )
    
    # Not cached - stream on demand from Telegram parts
    # This avoids writing to disk entirely
    try:
        iterator, status_code, headers, media_type = await stream_service.prepare_stream(
            db=db,
            file_id=file_id,
            range_header=None,
            as_download=True,
        )
        response = StreamingResponse(iterator, status_code=status_code, media_type=media_type)
        for k, v in headers.items():
            response.headers[k] = v
        return response
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Download failed: {exc}",
        )
