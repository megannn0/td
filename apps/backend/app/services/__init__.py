"""Service layer package initialization.

This package contains business logic for the Telegram Drive backend. Modules
within this package encapsulate operations that coordinate between the
domain and infrastructure layers. Service functions should be used by
API routes and other high-level components rather than mixing domain
models and infrastructure code directly in routes.
"""

from . import storage_target_service  # noqa: F401
from . import upload_service  # noqa: F401
from . import download_service  # noqa: F401
from . import stream_service  # noqa: F401
from . import cache_service  # noqa: F401
from . import search_service  # noqa: F401
from . import folder_service  # noqa: F401
from . import icon_service  # noqa: F401
from . import sync_service  # noqa: F401

# Phase 3 services for tags, playlists, virtual folders, and thumbnails
from . import tag_service  # noqa: F401
from . import playlist_service  # noqa: F401
from . import virtual_folder_service  # noqa: F401
from . import thumbnail_service  # noqa: F401