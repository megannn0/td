"""SQLAlchemy models for playlists and playlist items.

These models represent user-defined playlists of files. A playlist can
contain multiple files in a specific order. The order is stored on
the ``PlaylistItem`` model via the ``position`` column. Deleting a
playlist will cascade and remove all of its items. Playlists are
completely separate from the underlying files and deleting a playlist
does not delete any file records.
"""

from __future__ import annotations

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, func
from sqlalchemy.orm import relationship

from app.db.base_class import Base


class Playlist(Base):
    """Represents a named collection of files in a specific order."""

    __tablename__ = "playlists"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    # Relationship to items in this playlist. Items are ordered by their
    # ``position`` attribute when retrieved. Cascading delete ensures
    # items are removed when the playlist is deleted.
    items = relationship(
        "PlaylistItem",
        back_populates="playlist",
        cascade="all, delete-orphan",
        order_by="PlaylistItem.position",
    )


class PlaylistItem(Base):
    """Association between playlists and files with ordering information."""

    __tablename__ = "playlist_items"

    id = Column(Integer, primary_key=True, index=True)
    playlist_id = Column(
        Integer,
        ForeignKey("playlists.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    file_id = Column(
        Integer,
        ForeignKey("files.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    # Integer position of the file within the playlist. Lower numbers
    # come first. Position values should be unique per playlist.
    position = Column(Integer, nullable=False)

    # Relationships
    playlist = relationship("Playlist", back_populates="items")
    file = relationship("app.domain.files.models.File")