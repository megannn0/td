"""Cache management service for thumbnails, previews, and downloaded files.

This service exposes simple helper functions to store and retrieve
cached files. Under the hood it uses ``LRUCache`` instances from
``app.infrastructure.cache.manager`` to ensure that cache sizes
remain bounded. Evicting entries also removes the associated files
from disk.

Future iterations may introduce separate caches with different
capacities for thumbnails and previews, as well as persistence
mechanisms for offline use.
"""

from __future__ import annotations

from typing import Optional

from app.infrastructure.cache.manager import LRUCache

# Default capacities for the caches. These values may be tuned based on
# anticipated usage patterns and disk space constraints.
_DOWNLOAD_CACHE_CAPACITY = 10  # number of downloaded files to retain
_THUMBNAIL_CACHE_CAPACITY = 50  # number of thumbnails to retain
_PREVIEW_CACHE_CAPACITY = 20  # number of previews to retain

# Instantiate caches
_download_cache = LRUCache(capacity=_DOWNLOAD_CACHE_CAPACITY)
_thumbnail_cache = LRUCache(capacity=_THUMBNAIL_CACHE_CAPACITY)
_preview_cache = LRUCache(capacity=_PREVIEW_CACHE_CAPACITY)


# Downloaded files cache API
def get_downloaded_file(file_id: int) -> Optional[str]:
    """Retrieve the cached path of a downloaded file by its ID.

    Parameters
    ----------
    file_id: int
        Identifier of the file.

    Returns
    -------
    Optional[str]
        The filesystem path of the downloaded file if present in the
        cache; otherwise ``None``.
    """
    return _download_cache.get(file_id)


def add_downloaded_file(file_id: int, path: str) -> None:
    """Add or update a downloaded file in the cache.

    This function records the file's path in the LRU cache. If adding
    the entry causes the cache to exceed its capacity, the least
    recently used file will be evicted and deleted from disk.

    Parameters
    ----------
    file_id: int
        Identifier of the file.
    path: str
        Filesystem path where the file is stored.
    """
    _download_cache.put(file_id, path)


# Thumbnail cache API
def get_thumbnail(key: int) -> Optional[str]:
    """Retrieve a cached thumbnail path by key. Keys could be file IDs or
    other identifiers depending on how thumbnails are generated."""
    return _thumbnail_cache.get(key)


def add_thumbnail(key: int, path: str) -> None:
    """Store a thumbnail in the cache with LRU eviction."""
    _thumbnail_cache.put(key, path)


# Preview cache API
def get_preview(key: int) -> Optional[str]:
    """Retrieve a cached preview path by key."""
    return _preview_cache.get(key)


def add_preview(key: int, path: str) -> None:
    """Store a preview in the cache with LRU eviction."""
    _preview_cache.put(key, path)


def clear_all_caches() -> None:
    """Clear all caches and delete cached files from disk."""
    _download_cache.clear()
    _thumbnail_cache.clear()
    _preview_cache.clear()