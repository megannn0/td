"""In-memory LRU cache manager for storing and evicting cached files.

This module defines a simple least recently used (LRU) cache that
maintains a mapping from keys (e.g., file IDs or thumbnail IDs) to
paths on disk. When the cache exceeds its configured capacity, the
least recently used item is evicted and its associated file is
removed from disk. This implementation stores only path references
and delegates actual file creation and deletion to the services that
use the cache.

In future iterations the cache may be persisted across application
restarts or split into separate caches for thumbnails, previews, and
downloads with different capacities.
"""

from __future__ import annotations

import os
from collections import OrderedDict
from typing import Optional


class LRUCache:
    """A simple LRU cache for disk-backed files.

    The cache evicts the oldest entry when the number of items exceeds
    ``capacity``. Eviction deletes the file at the stored path if it
    still exists.
    """

    def __init__(self, capacity: int = 10) -> None:
        if capacity <= 0:
            raise ValueError("Capacity must be positive")
        self.capacity = capacity
        self._cache: OrderedDict[int, str] = OrderedDict()

    def get(self, key: int) -> Optional[str]:
        """Retrieve a path from the cache and mark it as recently used.

        Parameters
        ----------
        key: int
            Identifier of the cached item (e.g., file ID).

        Returns
        -------
        Optional[str]
            The path associated with the key if present; otherwise ``None``.
        """
        path = self._cache.get(key)
        if path is not None:
            # Move key to end to mark it as recently used
            self._cache.move_to_end(key)
        return path

    def put(self, key: int, path: str) -> None:
        """Insert or update a cache entry.

        If the key already exists, the old entry is removed first. If
        the cache exceeds its capacity after insertion, the least
        recently used entry is evicted and its file is deleted from
        disk.

        Parameters
        ----------
        key: int
            Identifier of the cached item.
        path: str
            Filesystem path to associate with the key.
        """
        # Remove existing entry if present
        if key in self._cache:
            old_path = self._cache.pop(key)
            # Only delete the old file if it is different from the new path
            if old_path != path and os.path.exists(old_path):
                try:
                    os.remove(old_path)
                except OSError:
                    pass
        # Add new entry
        self._cache[key] = path
        # Evict if over capacity
        while len(self._cache) > self.capacity:
            evicted_key, evicted_path = self._cache.popitem(last=False)
            if os.path.exists(evicted_path):
                try:
                    os.remove(evicted_path)
                except OSError:
                    pass

    def remove(self, key: int) -> None:
        """Remove a key from the cache and delete its file.

        Parameters
        ----------
        key: int
            Identifier of the cached item to remove.
        """
        path = self._cache.pop(key, None)
        if path and os.path.exists(path):
            try:
                os.remove(path)
            except OSError:
                pass

    def clear(self) -> None:
        """Clear the cache and delete all cached files from disk."""
        for path in self._cache.values():
            if os.path.exists(path):
                try:
                    os.remove(path)
                except OSError:
                    pass
        self._cache.clear()