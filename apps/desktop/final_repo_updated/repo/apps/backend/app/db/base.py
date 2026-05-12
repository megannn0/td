"""Import all SQLAlchemy models for metadata registration.

SQLAlchemy's `Base.metadata.create_all()` requires all models to be imported
somewhere in the application so that the corresponding tables are known to
the metadata. This module imports every model class defined in the domain
layer. It must be imported before creating or upgrading the database schema.
"""

from .base_class import Base  # noqa: F401

# Import domain models so that they are registered on the metadata
from app.domain.folders.models import Folder  # noqa: F401
from app.domain.files.models import File  # noqa: F401
from app.domain.file_parts.models import FilePart  # noqa: F401
from app.domain.transfers.models import Transfer  # noqa: F401
from app.domain.tags.models import Tag, FileTag  # noqa: F401
from app.domain.storage_targets.models import StorageTarget  # noqa: F401

# Import new models for playlists and virtual folders so they are registered
from app.domain.playlists.models import Playlist, PlaylistItem  # noqa: F401
from app.domain.virtual_folders.models import VirtualFolder  # noqa: F401
