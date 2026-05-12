"""API routes for playlist management.

These endpoints allow clients to create, retrieve, update, delete and
manipulate playlists. A playlist groups files in a defined order and
is independent of folders. Deleting a playlist does not affect the
underlying files.
"""

from __future__ import annotations

from typing import List

from fastapi import APIRouter, Depends, HTTPException, status

from app.api.deps import get_current_active_db
from app.services import playlist_service
from app.schemas.playlist import (
    PlaylistAddItems,
    PlaylistCreate,
    PlaylistReorderItems,
    PlaylistResponse,
    PlaylistUpdate,
)

router = APIRouter(prefix="/playlists", tags=["playlists"])


@router.get("/", response_model=List[PlaylistResponse])
def list_playlists(*, db=Depends(get_current_active_db)) -> List[PlaylistResponse]:
    """Return all playlists with their items."""
    playlists = playlist_service.get_all_playlists(db)
    return [PlaylistResponse.from_orm(p) for p in playlists]


@router.post("/", response_model=PlaylistResponse, status_code=status.HTTP_201_CREATED)
def create_playlist(*, playlist_in: PlaylistCreate, db=Depends(get_current_active_db)) -> PlaylistResponse:
    """Create a new playlist."""
    playlist = playlist_service.create_playlist(db, name=playlist_in.name)
    return PlaylistResponse.from_orm(playlist)


@router.get("/{playlist_id}", response_model=PlaylistResponse)
def get_playlist(*, playlist_id: int, db=Depends(get_current_active_db)) -> PlaylistResponse:
    """Get a single playlist by ID."""
    playlist = playlist_service.get_playlist(db, playlist_id=playlist_id)
    if not playlist:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Playlist not found")
    return PlaylistResponse.from_orm(playlist)


@router.put("/{playlist_id}", response_model=PlaylistResponse)
def rename_playlist(*, playlist_id: int, playlist_in: PlaylistUpdate, db=Depends(get_current_active_db)) -> PlaylistResponse:
    """Rename an existing playlist."""
    playlist = playlist_service.update_playlist(db, playlist_id=playlist_id, name=playlist_in.name)
    if not playlist:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Playlist not found")
    return PlaylistResponse.from_orm(playlist)


@router.delete("/{playlist_id}", response_model=dict)
def delete_playlist(*, playlist_id: int, db=Depends(get_current_active_db)) -> dict:
    """Delete a playlist and all its items."""
    success = playlist_service.delete_playlist(db, playlist_id=playlist_id)
    if not success:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Playlist not found")
    return {"deleted": True}


@router.post("/{playlist_id}/items", response_model=PlaylistResponse)
def add_items(
    *,
    playlist_id: int,
    items_in: PlaylistAddItems,
    db=Depends(get_current_active_db),
) -> PlaylistResponse:
    """Append one or more files to a playlist."""
    playlist = playlist_service.add_items_to_playlist(db, playlist_id=playlist_id, file_ids=items_in.file_ids)
    if not playlist:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Playlist not found")
    return PlaylistResponse.from_orm(playlist)


@router.delete("/{playlist_id}/items/{item_id}", response_model=PlaylistResponse)
def remove_item(
    *,
    playlist_id: int,
    item_id: int,
    db=Depends(get_current_active_db),
) -> PlaylistResponse:
    """Remove a single item from a playlist."""
    playlist = playlist_service.remove_item_from_playlist(db, playlist_id=playlist_id, item_id=item_id)
    if not playlist:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Playlist or item not found")
    return PlaylistResponse.from_orm(playlist)


@router.post("/{playlist_id}/reorder", response_model=PlaylistResponse)
def reorder_items(
    *,
    playlist_id: int,
    order_in: PlaylistReorderItems,
    db=Depends(get_current_active_db),
) -> PlaylistResponse:
    """Reorder items in a playlist according to the provided list of IDs."""
    playlist = playlist_service.reorder_playlist_items(db, playlist_id=playlist_id, item_ids=order_in.item_ids)
    if not playlist:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid playlist or item list")
    return PlaylistResponse.from_orm(playlist)