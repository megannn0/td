"""API routes for file search operations.

This module exposes endpoints to perform flexible searches over the
files stored in the database. Searches support filtering by name,
MIME type, size range, creation date range, and tags. Results are
returned as lists of ``FileResponse`` objects. Tag searches match
files associated with any of the provided tag names.
"""

from __future__ import annotations

from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.api.deps import get_current_active_db
from app.schemas.file import FileResponse
from app.services import search_service

router = APIRouter(prefix="/search", tags=["search"])


@router.get("/files", response_model=List[FileResponse])
async def search_files_endpoint(
    *,
    db=Depends(get_current_active_db),
    name: Optional[str] = Query(None, description="Substring to match file names"),
    type: Optional[str] = Query(None, alias="file_type", description="Substring to match MIME types"),
    min_size: Optional[int] = Query(None, ge=0, description="Minimum file size in bytes"),
    max_size: Optional[int] = Query(None, ge=0, description="Maximum file size in bytes"),
    min_date: Optional[str] = Query(None, description="Minimum creation date (ISO format)"),
    max_date: Optional[str] = Query(None, description="Maximum creation date (ISO format)"),
    tags: Optional[List[str]] = Query(None, description="List of tag names to filter by"),
) -> List[FileResponse]:
    """Search files based on the provided criteria.

    Accepts multiple optional query parameters. Only criteria that are
    provided will be applied. Date strings must be in ISO 8601
    format (e.g., ``2026-03-30T00:00:00``). If parsing dates
    fails, a 400 error is returned.
    """
    # Parse ISO date strings if provided
    parsed_min_date: Optional[datetime] = None
    parsed_max_date: Optional[datetime] = None
    try:
        if min_date:
            parsed_min_date = datetime.fromisoformat(min_date)
        if max_date:
            parsed_max_date = datetime.fromisoformat(max_date)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid date format. Use ISO 8601 format.",
        )
    files = search_service.search_files(
        db,
        name=name,
        file_type=type,
        min_size=min_size,
        max_size=max_size,
        min_date=parsed_min_date,
        max_date=parsed_max_date,
        tags=tags,
    )
    return [FileResponse.from_orm(file) for file in files]