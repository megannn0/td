"""API routes for serving file thumbnails.

This endpoint returns a small preview image for a file. Thumbnails are
generated on demand and cached via ``thumbnail_service``. If a
thumbnail cannot be generated (e.g., for unsupported file types), a
generic placeholder image is returned instead. The response is
served using FastAPI's ``FileResponse`` so that the image can be
displayed directly in browsers.
"""

from __future__ import annotations

import os
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse as FR

from app.api.deps import get_current_active_db
from app.services import thumbnail_service

router = APIRouter(prefix="/thumbnails", tags=["thumbnails"])


@router.get("/{file_id}")
async def get_thumbnail(*, file_id: int, db=Depends(get_current_active_db)):
    """Return a thumbnail image for the specified file.

    If the file does not exist, a 404 is returned. Otherwise, a JPEG
    thumbnail or a placeholder image is served.
    """
    try:
        path = await thumbnail_service.get_thumbnail(db, file_id=file_id)
    except Exception:
        # In case of unexpected errors, return 500
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to generate thumbnail")
    if not os.path.exists(path):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Thumbnail not found")
    # Determine content type based on extension
    ext = os.path.splitext(path)[1].lower()
    media_type = "image/png" if ext == ".png" else "image/jpeg"
    return FR(path, media_type=media_type)