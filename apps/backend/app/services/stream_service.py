"""Service layer for streaming files over HTTP.

This module provides functionality for preparing file streams that
support HTTP ``Range`` requests.  When a file is available on local
storage, streaming simply reads the requested byte range from disk.
Otherwise the file is reconstructed on demand from Telegram.  The
service hides underlying storage details from the API layer and
enforces that file metadata from the database drives streaming
behaviour.

**Limitations**
---------------

The Telegram API requires downloading whole parts (messages) at a time.
When serving a small byte range from a large part, the
``telegram_range_generator`` must still download that entire part into
memory before slicing out the requested segment.  Large single‑part
files therefore incur a one‑part memory usage for each range request.
The generator yields the subrange in 64 kB slices to control how much
data is returned to the client at once, but it cannot fetch only a
subset of a Telegram part.

This means that streaming is **not truly progressive**: even when
playing a small clip from a large video, the backend downloads the
full underlying part.  Clients should be aware that memory usage will
spike up to the size of a Telegram part during each request.  Future
iterations may introduce optimisations when Telegram exposes partial
message fetches.
"""

from __future__ import annotations

import os
from typing import Dict, Generator, Optional, Tuple, AsyncGenerator

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.domain.files.models import File
from app.services import download_service, cache_service
from app.services.download_service import sanitize_filename
from app.domain.file_parts.models import FilePart
from app.infrastructure.telegram.factory import get_telegram_client
from app.infrastructure.telegram.downloader import download_media_to_memory
import asyncio


def _parse_range_header(range_header: str, file_size: int) -> Tuple[int, int]:
    """Parse the ``Range`` HTTP header and return start and end byte positions.

    Parameters
    ----------
    range_header: str
        The value of the ``Range`` header (e.g., ``bytes=0-1023`` or
        ``bytes=1024-``).
    file_size: int
        Total size of the file in bytes.

    Returns
    -------
    Tuple[int, int]
        A tuple of (start, end) byte positions inclusive.

    Notes
    -----
    If the header is malformed or requests an invalid range, this
    function will raise an HTTP 416 (Range Not Satisfiable) error.
    """
    # Example Range header: "bytes=0-1023" or "bytes=1024-"
    try:
        units, ranges = range_header.split("=")
        if units.strip() != "bytes":
            raise ValueError
        start_str, end_str = ranges.split("-")
        start = int(start_str) if start_str else 0
        end = int(end_str) if end_str else file_size - 1
    except Exception:
        # Malformed header
        raise HTTPException(
            status_code=status.HTTP_416_REQUESTED_RANGE_NOT_SATISFIABLE,
            detail="Invalid Range header",
        )
    if start < 0 or end < start or end >= file_size:
        raise HTTPException(
            status_code=status.HTTP_416_REQUESTED_RANGE_NOT_SATISFIABLE,
            detail="Requested range not satisfiable",
        )
    return start, end


def _file_range_generator(path: str, start: int, end: int, chunk_size: int = 1024 * 64) -> Generator[bytes, None, None]:
    """Yield file content between start and end inclusive in chunks.

    Parameters
    ----------
    path: str
        Path to the file on disk.
    start: int
        Starting byte position.
    end: int
        Ending byte position.
    chunk_size: int, optional
        Maximum number of bytes to read per iteration.

    Yields
    ------
    bytes
        Next chunk of file data.
    """
    with open(path, "rb") as f:
        f.seek(start)
        bytes_remaining = end - start + 1
        while bytes_remaining > 0:
            read_size = min(bytes_remaining, chunk_size)
            data = f.read(read_size)
            if not data:
                break
            bytes_remaining -= len(data)
            yield data


async def prepare_stream(
    db: Session,
    file_id: int,
    range_header: Optional[str] = None,
    as_download: bool = False,
) -> Tuple[Generator[bytes, None, None], int, Dict[str, str], str]:
    """Prepare a streaming iterator and HTTP response parameters for a file.

    This service ensures the file exists on disk (downloading from
    Telegram if necessary), parses the Range header if present, and
    returns a generator along with the appropriate status code and
    headers for FastAPI's ``StreamingResponse``. It does not send
    the response itself, leaving that to the API layer.

    Parameters
    ----------
    db: Session
        Database session for retrieving file metadata and triggering
        downloads.
    file_id: int
        Identifier of the file to stream.
    range_header: Optional[str]
        Value of the ``Range`` header from the incoming request.

    Returns
    -------
    tuple
        A tuple of (iterator, status_code, headers, media_type), where
        ``iterator`` is a generator yielding bytes, ``status_code`` is
        either 206 or 200, ``headers`` contains the appropriate
        response headers, and ``media_type`` is the file's MIME type.

    Raises
    ------
    HTTPException
        If the file does not exist in the database or cannot be
        downloaded.
    """
    # Lookup file metadata
    file_record: Optional[File] = db.query(File).filter(File.id == file_id).first()
    if not file_record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")

    # Determine MIME type; fallback to octet-stream
    media_type = file_record.mime_type or "application/octet-stream"
    file_name = file_record.name
    # Check for cached local file. If the file is cached and exists on disk, stream from disk.
    cached_path = cache_service.get_downloaded_file(file_id)
    dest_path: Optional[str] = None
    if cached_path and os.path.exists(cached_path):
        dest_path = cached_path
    else:
        # Construct a path in the default download directory and cache it if it exists on disk
        dest_dir = download_service.DEFAULT_DOWNLOAD_DIR
        candidate = os.path.join(dest_dir, file_record.name)
        if os.path.exists(candidate):
            dest_path = candidate
            cache_service.add_downloaded_file(file_id, dest_path)
        else:
            # Also try the sanitized filename (used by download_service)
            safe_name = sanitize_filename(file_record.name)
            if safe_name != file_record.name:
                candidate = os.path.join(dest_dir, safe_name)
                if os.path.exists(candidate):
                    dest_path = candidate
                    cache_service.add_downloaded_file(file_id, dest_path)
            if dest_path is None:
                dest_path = None
    file_size = file_record.size
    # Parse the Range header to determine the requested segment. If not provided,
    # stream the entire file.
    if range_header:
        start, end = _parse_range_header(range_header, file_size)
        status_code = status.HTTP_206_PARTIAL_CONTENT
    else:
        start, end = 0, file_size - 1
        status_code = status.HTTP_200_OK
    # If we have a valid local file on disk, stream directly from disk.
    if dest_path and os.path.exists(dest_path):
        # Ensure we do not seek past the actual file size on disk
        disk_size = os.path.getsize(dest_path)
        end = min(end, disk_size - 1)
        iterator: Generator[bytes, None, None] = _file_range_generator(dest_path, start, end)
        content_length = end - start + 1
        headers: Dict[str, str] = {
            "Content-Length": str(content_length),
            "Accept-Ranges": "bytes",
        }
        if as_download:
            from urllib.parse import quote
            headers["Content-Disposition"] = f'attachment; filename="{quote(file_name)}"'
        else:
            headers["Content-Disposition"] = "inline"
        if status_code == status.HTTP_206_PARTIAL_CONTENT:
            headers["Content-Range"] = f"bytes {start}-{end}/{disk_size}"
        return iterator, status_code, headers, media_type
    # Otherwise, stream on demand from Telegram parts without pre-downloading the entire file
    client = get_telegram_client()
    if client is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Telegram API credentials are not configured",
        )
    await client.start()
    # Fetch parts metadata from the database
    parts = (
        db.query(FilePart)
        .filter(FilePart.file_id == file_id)
        .order_by(FilePart.part_index)
        .all()
    )
    if not parts:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="No file parts found for the requested file",
        )
    async def telegram_range_generator() -> AsyncGenerator[bytes, None]:
        """
        Yield the requested byte range directly from Telegram, part by part.

        The generator iterates over the file's parts and, for each part
        intersecting the requested range, downloads the entire part from
        Telegram, slices the requested subrange in memory, and yields it
        in smaller chunks.  This approach respects HTTP ``Range``
        semantics but cannot avoid downloading the full part: the
        Telegram API does not currently support retrieving a partial
        segment of a message.  As a result, serving a small range from
        a very large file part still requires downloading that entire
        part into memory.
        """
        offset = 0  # total bytes consumed from previous parts
        for part in parts:
            part_size = part.size or 0
            part_end_offset = offset + part_size - 1
            # Skip parts entirely before the requested start offset
            if start > part_end_offset:
                offset += part_size
                continue
            # Stop if we've passed the requested end offset
            if offset > end:
                break
            # Determine slice boundaries within this part
            slice_start = 0
            if start > offset:
                slice_start = start - offset
            slice_end = part_size - 1
            if end < part_end_offset:
                slice_end = end - offset
            # Download the entire part into memory
            try:
                data = await download_media_to_memory(
                    client,
                    chat_id=part.telegram_chat_id,
                    message_id=part.telegram_message_id,
                )
            except Exception as exc:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Failed to download part {part.part_index}: {exc}",
                )
            # Extract the requested subrange of this part
            subrange = data[slice_start : slice_end + 1]
            # Yield in smaller chunks to control memory usage
            chunk_size = 1024 * 64
            for i in range(0, len(subrange), chunk_size):
                yield subrange[i : i + chunk_size]
            offset += part_size
            if offset > end:
                break
    content_length = end - start + 1
    headers: Dict[str, str] = {
        "Content-Length": str(content_length),
        "Accept-Ranges": "bytes",
    }
    if as_download:
        from urllib.parse import quote
        headers["Content-Disposition"] = f'attachment; filename="{quote(file_name)}"'
    else:
        headers["Content-Disposition"] = "inline"
    if status_code == status.HTTP_206_PARTIAL_CONTENT:
        headers["Content-Range"] = f"bytes {start}-{end}/{file_size}"
    return telegram_range_generator(), status_code, headers, media_type