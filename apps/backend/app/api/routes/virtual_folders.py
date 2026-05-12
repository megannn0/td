"""API routes for managing virtual folders (smart folders).

Virtual folders store saved search queries. They can be created,
renamed, updated, deleted, and used to retrieve matching files. Deleting
a virtual folder does not delete any files; it only removes the saved
search.
"""

from __future__ import annotations

from typing import List

from fastapi import APIRouter, Depends, HTTPException, status

from app.api.deps import get_current_active_db
from app.services import virtual_folder_service
from app.schemas.virtual_folder import (
    VirtualFolderCreate,
    VirtualFolderResponse,
    VirtualFolderUpdate,
)
from app.schemas.file import FileResponse

router = APIRouter(prefix="/virtual-folders", tags=["virtual-folders"])


@router.get("/", response_model=List[VirtualFolderResponse])
def list_virtual_folders(*, db=Depends(get_current_active_db)) -> List[VirtualFolderResponse]:
    """Return all virtual folders."""
    folders = virtual_folder_service.get_all_virtual_folders(db)
    return [VirtualFolderResponse.from_orm(vf) for vf in folders]


@router.post("/", response_model=VirtualFolderResponse, status_code=status.HTTP_201_CREATED)
def create_virtual_folder(*, vf_in: VirtualFolderCreate, db=Depends(get_current_active_db)) -> VirtualFolderResponse:
    """Create a new virtual folder."""
    vf = virtual_folder_service.create_virtual_folder(db, name=vf_in.name, query=vf_in.query)
    return VirtualFolderResponse.from_orm(vf)


@router.get("/{vf_id}", response_model=VirtualFolderResponse)
def get_virtual_folder(*, vf_id: int, db=Depends(get_current_active_db)) -> VirtualFolderResponse:
    vf = virtual_folder_service.get_virtual_folder(db, vf_id=vf_id)
    if not vf:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Virtual folder not found")
    return VirtualFolderResponse.from_orm(vf)


@router.put("/{vf_id}", response_model=VirtualFolderResponse)
def update_virtual_folder(
    *,
    vf_id: int,
    vf_in: VirtualFolderUpdate,
    db=Depends(get_current_active_db),
) -> VirtualFolderResponse:
    vf = virtual_folder_service.update_virtual_folder(db, vf_id=vf_id, name=vf_in.name, query=vf_in.query)
    if not vf:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Virtual folder not found")
    return VirtualFolderResponse.from_orm(vf)


@router.delete("/{vf_id}", response_model=dict)
def delete_virtual_folder(*, vf_id: int, db=Depends(get_current_active_db)) -> dict:
    success = virtual_folder_service.delete_virtual_folder(db, vf_id=vf_id)
    if not success:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Virtual folder not found")
    return {"deleted": True}


@router.get("/{vf_id}/files", response_model=List[FileResponse])
def list_files_in_virtual_folder(*, vf_id: int, db=Depends(get_current_active_db)) -> List[FileResponse]:
    """Return files that match the saved query of the virtual folder."""
    files = virtual_folder_service.search_virtual_folder_files(db, vf_id=vf_id)
    if files is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Virtual folder not found")
    responses: List[FileResponse] = []
    for f in files:
        base = FileResponse.from_orm(f)
        data = base.model_dump()
        data["tags"] = [t.name for t in getattr(f, "tags", [])]
        responses.append(FileResponse(**data))
    return responses