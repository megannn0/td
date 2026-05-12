"""API route for streaming files.

This module defines the endpoint for streaming files using byte-range
requests. The endpoint exposes GET /stream/{file_id}, which utilizes
the stream service to prepare a streaming iterator and returns a
``StreamingResponse`` with appropriate headers. Clients can request
partial content using the ``Range`` header to enable seeking and
efficient playback of large media files. The route hides the internal
storage details and reconstructs logical files from Telegram storage if
necessary.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, Header, Request
from fastapi.responses import StreamingResponse

from app.api.deps import get_current_active_db
from app.services import stream_service


router = APIRouter(prefix="/stream", tags=["stream"])


@router.get("/{file_id}")
async def stream_file(
    request: Request,
    file_id: int,
    range: str | None = Header(None, convert_underscores=False),
    download: bool = False,
    db=Depends(get_current_active_db),
):
    """Stream a file with HTTP Range support.

    This endpoint streams the logical file identified by ``file_id``. If the
    file has not yet been downloaded locally, it will be downloaded on
    demand. The endpoint supports byte-range requests via the
    ``Range`` header and returns partial content responses when
    appropriate. The response content-type is based on the file's
    stored MIME type.

    Parameters
    ----------
    request: Request
        The incoming HTTP request object.
    file_id: int
        Identifier of the file to stream.
    range: Optional[str]
        Value of the ``Range`` header if provided by the client. The
        parameter name is ``range`` rather than ``Range`` due to
        FastAPI's header handling; ``convert_underscores=False``
        ensures the header name is not converted.
    db: Session
        Database session provided via dependency injection.

    Returns
    -------
    StreamingResponse
        A streaming response containing the requested byte range of
        the file. The response includes appropriate headers for
        range support and media type.
    """
    iterator, status_code, headers, media_type = await stream_service.prepare_stream(
        db=db,
        file_id=file_id,
        range_header=range,
        as_download=download,
    )
    response = StreamingResponse(iterator, status_code=status_code, media_type=media_type)
    for k, v in headers.items():
        response.headers[k] = v
    return response