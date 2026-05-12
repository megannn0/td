"""Service layer for generating and caching thumbnails for files.

This module provides a helper to generate thumbnail images for files.
Thumbnails are cached using the existing ``cache_service`` and have a
bounded capacity controlled by the ``_THUMBNAIL_CACHE_CAPACITY`` set
in ``cache_service``. Only image files currently receive true
thumbnails; for all other file types, a generic placeholder is
returned.
"""

from __future__ import annotations

import os
from typing import Optional

from PIL import Image

from app.domain.files.models import File
from app.services import cache_service, download_service
from sqlalchemy.orm import Session

# Directory in which thumbnails are stored. This path is relative to
# the current working directory; ensure it exists on startup.
THUMBNAIL_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "..", "..", "..", "cached_thumbnails")

PLACEHOLDER_PATH = os.path.join(os.path.dirname(__file__), "..", "..", "..", "..", "..", "..", "placeholder_light_gray_block.png")


def _ensure_dir() -> None:
    os.makedirs(THUMBNAIL_DIR, exist_ok=True)


async def get_thumbnail(db: Session, file_id: int) -> str:
    """Return the filesystem path to a thumbnail for the given file.

    Thumbnails are generated on demand and cached. If the file is not an
    image or an error occurs during thumbnail creation, a placeholder
    image is returned.

    Parameters
    ----------
    db: Session
        Database session for retrieving file metadata and triggering
        downloads.
    file_id: int
        Identifier of the file to generate a thumbnail for.

    Returns
    -------
    str
        Path to the thumbnail image on disk.
    """
    _ensure_dir()
    # Check cache first
    cached = cache_service.get_thumbnail(file_id)
    if cached and os.path.exists(cached):
        return cached
    # Retrieve file metadata to determine type
    file_record: Optional[File] = db.query(File).filter(File.id == file_id).first()
    if not file_record:
        return PLACEHOLDER_PATH
    mime = file_record.mime_type or ""
    if not mime.startswith("image/"):
        # Non-image types use the generic placeholder
        return PLACEHOLDER_PATH
    # Ensure the original file is downloaded
    from app.services import cache_service as cs  # avoid circular import
    # Try to get downloaded file path from cache; otherwise trigger download
    path = cs.get_downloaded_file(file_id)
    if not path or not os.path.exists(path):
        await download_service.start_download(db, file_id)
        path = cs.get_downloaded_file(file_id)
    if not path or not os.path.exists(path):
        return PLACEHOLDER_PATH
    # Generate thumbnail using Pillow
    try:
        with Image.open(path) as img:
            img.thumbnail((256, 256))
            thumb_path = os.path.join(THUMBNAIL_DIR, f"{file_id}.jpg")
            img.convert("RGB").save(thumb_path, format="JPEG")
        # Add to cache
        cache_service.add_thumbnail(file_id, thumb_path)
        return thumb_path
    except Exception:
        return PLACEHOLDER_PATH