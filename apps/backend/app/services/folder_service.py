"""Service functions for folder management.

This module provides CRUD operations for folders, encapsulating the logic
around SQLAlchemy session handling and error checking. Updating a
folder allows changing its name, parent, notes and icon metadata.
"""

from __future__ import annotations

from typing import Iterable, Optional

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.domain.folders.models import Folder
from app.schemas.folder import FolderCreate, FolderUpdate


def get_folder(db: Session, folder_id: int) -> Folder:
    """Retrieve a folder by its ID or raise a 404 error if not found."""
    folder = db.query(Folder).filter(Folder.id == folder_id).first()
    if not folder:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Folder with ID {folder_id} does not exist",
        )
    return folder


def list_folders(db: Session, parent_id: Optional[int] = None) -> Iterable[Folder]:
    """Return all folders optionally filtered by parent ID.

    A `None` value for `parent_id` returns root‑level folders (where
    `parent_id` is null). Passing a specific ID returns only the
    children of that folder.
    """
    if parent_id is None:
        return db.query(Folder).filter(Folder.parent_id.is_(None)).all()
    return db.query(Folder).filter(Folder.parent_id == parent_id).all()


def create_folder(db: Session, folder_in: FolderCreate) -> Folder:
    """Create a new folder in the database.

    The caller should validate that the specified parent exists if
    `parent_id` is not None. This function does not currently enforce
    uniqueness of folder names within a parent.
    """
    new_folder = Folder(
        name=folder_in.name,
        parent_id=folder_in.parent_id,
        icon_pack=folder_in.icon_pack,
        icon_name=folder_in.icon_name,
        icon_color=folder_in.icon_color,
        notes=folder_in.notes,
    )
    db.add(new_folder)
    db.commit()
    db.refresh(new_folder)
    return new_folder


def update_folder(db: Session, folder_id: int, folder_in: FolderUpdate) -> Folder:
    """Update an existing folder with the supplied values.

    Only fields provided in `folder_in` will be updated; others remain
    unchanged. Attempting to assign a non‑existent parent will raise
    a 404 error.
    """
    folder = get_folder(db, folder_id)
    # Validate parent if changing
    if folder_in.parent_id is not None and folder_in.parent_id != folder.parent_id:
        if folder_in.parent_id is not None:
            # Ensure new parent exists
            _ = get_folder(db, folder_in.parent_id)
        folder.parent_id = folder_in.parent_id
    # Update simple fields if provided
    if folder_in.name is not None:
        folder.name = folder_in.name
    if folder_in.icon_pack is not None:
        folder.icon_pack = folder_in.icon_pack
    if folder_in.icon_name is not None:
        folder.icon_name = folder_in.icon_name
    if folder_in.icon_color is not None:
        folder.icon_color = folder_in.icon_color
    if folder_in.notes is not None:
        folder.notes = folder_in.notes
    db.commit()
    db.refresh(folder)
    return folder


def delete_folder(db: Session, folder_id: int) -> None:
    """Delete a folder and its children from the database.

    Deletion is recursive due to the cascade defined on the folder model.
    """
    folder = get_folder(db, folder_id)
    db.delete(folder)
    db.commit()