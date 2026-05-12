"""API routes for tag management.

These endpoints allow clients to list, create, update, and delete tags,
as well as assign or remove tags from files. Tags are identified by
their numeric IDs when updating or deleting, and by name when
creating. Adding tags to a file accepts a list of tag names; new
tags will be created automatically.
"""

from __future__ import annotations

from typing import List

from fastapi import APIRouter, Depends, HTTPException, status

from app.api.deps import get_current_active_db
from app.services import tag_service
from app.schemas.tag import TagCreate, TagResponse, TagUpdate
from app.schemas.file import FileResponse

router = APIRouter(prefix="/tags", tags=["tags"])


@router.get("/", response_model=List[TagResponse])
def list_tags(*, db=Depends(get_current_active_db)) -> List[TagResponse]:
    """Return all tags defined in the database."""
    tags = tag_service.get_all_tags(db)
    return [TagResponse.from_orm(t) for t in tags]


@router.post("/", response_model=TagResponse, status_code=status.HTTP_201_CREATED)
def create_tag(*, tag_in: TagCreate, db=Depends(get_current_active_db)) -> TagResponse:
    """Create a new tag. If a tag with the same name exists, it is returned."""
    tag = tag_service.create_tag(db, name=tag_in.name)
    return TagResponse.from_orm(tag)


@router.put("/{tag_id}", response_model=TagResponse)
def rename_tag(*, tag_id: int, tag_in: TagUpdate, db=Depends(get_current_active_db)) -> TagResponse:
    """Rename an existing tag."""
    tag = tag_service.update_tag(db, tag_id=tag_id, name=tag_in.name)
    if not tag:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tag not found")
    return TagResponse.from_orm(tag)


@router.delete("/{tag_id}", response_model=dict)
def delete_tag(*, tag_id: int, db=Depends(get_current_active_db)) -> dict:
    """Delete a tag. Associations with files will be removed."""
    success = tag_service.delete_tag(db, tag_id=tag_id)
    if not success:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tag not found")
    return {"deleted": True}


@router.post("/files/{file_id}", response_model=FileResponse)
def add_tags_to_file(*, file_id: int, tags: List[str], db=Depends(get_current_active_db)) -> FileResponse:
    """Associate a list of tag names with a file. Tags are created on demand."""
    file = tag_service.add_tags_to_file(db, file_id=file_id, tag_names=tags)
    if not file:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")
    # Convert to response and include tag names
    base = FileResponse.from_orm(file)
    data = base.model_dump()
    data["tags"] = [t.name for t in getattr(file, "tags", [])]
    return FileResponse(**data)


@router.delete("/files/{file_id}/{tag_id}", response_model=FileResponse)
def remove_tag_from_file(*, file_id: int, tag_id: int, db=Depends(get_current_active_db)) -> FileResponse:
    """Remove a tag association from a file."""
    file = tag_service.remove_tag_from_file(db, file_id=file_id, tag_id=tag_id)
    if not file:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File or tag not found")
    base = FileResponse.from_orm(file)
    data = base.model_dump()
    data["tags"] = [t.name for t in getattr(file, "tags", [])]
    return FileResponse(**data)