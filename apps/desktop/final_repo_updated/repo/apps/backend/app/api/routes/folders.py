"""API routes for folder operations.

These endpoints allow clients to create, retrieve, update and delete
folders, as well as list folders by parent. Folder metadata includes
icon information which may be used by the desktop application to
display custom folder icons.
"""

from __future__ import annotations

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status

from app.api.deps import get_current_active_db
from app.schemas.folder import FolderCreate, FolderResponse, FolderUpdate
from app.services import folder_service

router = APIRouter(prefix="/folders", tags=["folders"])


@router.get("/", response_model=List[FolderResponse])
def list_folders(
    *,
    db=Depends(get_current_active_db),
    parent_id: Optional[int] = None,
) -> List[FolderResponse]:
    """List folders filtered by their parent ID.

    Without a ``parent_id`` query parameter, only top‑level folders are
    returned. Providing a ``parent_id`` returns only folders whose
    parent matches the supplied ID. Recursive traversal is not
    supported; clients must request each level separately.
    """
    folders = folder_service.list_folders(db, parent_id=parent_id)
    return [FolderResponse.from_orm(f) for f in folders]


@router.get("/{folder_id}", response_model=FolderResponse)
def get_folder(*, db=Depends(get_current_active_db), folder_id: int) -> FolderResponse:
    """Retrieve a single folder by its ID."""
    folder = folder_service.get_folder(db, folder_id)
    return FolderResponse.from_orm(folder)


@router.post("/", response_model=FolderResponse, status_code=status.HTTP_201_CREATED)
def create_folder(*, db=Depends(get_current_active_db), folder: FolderCreate) -> FolderResponse:
    """Create a new folder.

    The parent folder must exist if ``parent_id`` is provided. No
    duplicate name checks are performed; clients should handle naming
    uniqueness according to their UI/UX guidelines.
    """
    if folder.parent_id is not None:
        # Ensure parent exists
        folder_service.get_folder(db, folder.parent_id)
    new_folder = folder_service.create_folder(db, folder)
    return FolderResponse.from_orm(new_folder)


@router.put("/{folder_id}", response_model=FolderResponse)
def update_folder(
    *,
    db=Depends(get_current_active_db),
    folder_id: int,
    folder: FolderUpdate,
) -> FolderResponse:
    """Update folder metadata and icon information."""
    updated = folder_service.update_folder(db, folder_id, folder)
    return FolderResponse.from_orm(updated)


@router.delete("/{folder_id}", status_code=status.HTTP_204_NO_CONTENT, response_model=None)
def delete_folder(*, db=Depends(get_current_active_db), folder_id: int) -> None:
    """Delete a folder and its children recursively."""
    folder_service.delete_folder(db, folder_id)