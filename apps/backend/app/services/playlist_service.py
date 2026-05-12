"""Service layer for managing playlists and their items.

This module provides helper functions to create, retrieve, update,
delete, and manipulate playlists. Each playlist has an ordered list
of ``PlaylistItem`` rows that reference files. The order of items
is determined by the ``position`` field on each item. Positions are
assigned sequentially starting from 1.
"""

from __future__ import annotations

from typing import List, Optional

from sqlalchemy.orm import Session

from app.domain.playlists.models import Playlist, PlaylistItem
from app.domain.files.models import File


def get_all_playlists(db: Session) -> List[Playlist]:
    """Return all playlists sorted by creation time ascending."""
    return db.query(Playlist).order_by(Playlist.created_at.asc()).all()


def create_playlist(db: Session, name: str) -> Playlist:
    """Create a new playlist with the given name."""
    playlist = Playlist(name=name)
    db.add(playlist)
    db.commit()
    db.refresh(playlist)
    return playlist


def get_playlist(db: Session, playlist_id: int) -> Optional[Playlist]:
    """Return a playlist by ID, or ``None`` if it does not exist."""
    return db.query(Playlist).filter(Playlist.id == playlist_id).first()


def update_playlist(db: Session, playlist_id: int, name: str) -> Optional[Playlist]:
    """Rename a playlist."""
    playlist = db.query(Playlist).filter(Playlist.id == playlist_id).first()
    if not playlist:
        return None
    playlist.name = name
    db.commit()
    db.refresh(playlist)
    return playlist


def delete_playlist(db: Session, playlist_id: int) -> bool:
    """Delete a playlist and all of its items.

    Returns ``True`` if the playlist was deleted, ``False`` otherwise.
    """
    playlist = db.query(Playlist).filter(Playlist.id == playlist_id).first()
    if not playlist:
        return False
    db.delete(playlist)
    db.commit()
    return True


def _get_next_position(db: Session, playlist_id: int) -> int:
    """Helper to compute the next position value in a playlist."""
    max_pos = (
        db.query(PlaylistItem.position)
        .filter(PlaylistItem.playlist_id == playlist_id)
        .order_by(PlaylistItem.position.desc())
        .first()
    )
    return (max_pos[0] if max_pos else 0) + 1


def add_items_to_playlist(db: Session, playlist_id: int, file_ids: List[int]) -> Optional[Playlist]:
    """Append one or more files to the end of a playlist.

    If the playlist does not exist, ``None`` is returned. Files that
    do not exist in the database are ignored. Duplicate file IDs are
    allowed and will be appended multiple times.
    """
    playlist = db.query(Playlist).filter(Playlist.id == playlist_id).first()
    if not playlist:
        return None
    for file_id in file_ids:
        # Only insert if the file exists
        exists = db.query(File).filter(File.id == file_id).first() is not None
        if not exists:
            continue
        pos = _get_next_position(db, playlist_id)
        item = PlaylistItem(playlist_id=playlist_id, file_id=file_id, position=pos)
        db.add(item)
    db.commit()
    db.refresh(playlist)
    return playlist


def remove_item_from_playlist(db: Session, playlist_id: int, item_id: int) -> Optional[Playlist]:
    """Remove a specific item from a playlist and renumber remaining items.

    If the playlist or item does not exist, returns ``None``.
    """
    playlist = db.query(Playlist).filter(Playlist.id == playlist_id).first()
    if not playlist:
        return None
    item = db.query(PlaylistItem).filter(PlaylistItem.id == item_id, PlaylistItem.playlist_id == playlist_id).first()
    if not item:
        return None
    db.delete(item)
    db.flush()
    # Renumber remaining items sequentially starting at 1
    items = db.query(PlaylistItem).filter(PlaylistItem.playlist_id == playlist_id).order_by(PlaylistItem.position.asc()).all()
    for idx, itm in enumerate(items, start=1):
        itm.position = idx
    db.commit()
    db.refresh(playlist)
    return playlist


def reorder_playlist_items(db: Session, playlist_id: int, item_ids: List[int]) -> Optional[Playlist]:
    """Reorder items in a playlist according to the provided list of item IDs.

    The list must contain the same set of IDs currently in the playlist.
    If the playlist does not exist or the list is invalid, returns ``None``.
    """
    playlist = db.query(Playlist).filter(Playlist.id == playlist_id).first()
    if not playlist:
        return None
    existing_items = db.query(PlaylistItem).filter(PlaylistItem.playlist_id == playlist_id).order_by(PlaylistItem.position.asc()).all()
    existing_ids = [item.id for item in existing_items]
    if set(existing_ids) != set(item_ids):
        # Provided IDs do not match current playlist items
        return None
    # Assign new positions based on order in item_ids
    id_to_item = {item.id: item for item in existing_items}
    for pos, item_id in enumerate(item_ids, start=1):
        id_to_item[item_id].position = pos
    db.commit()
    db.refresh(playlist)
    return playlist