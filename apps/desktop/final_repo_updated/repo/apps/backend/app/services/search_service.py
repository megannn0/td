"""Service layer for searching files based on various criteria.

This module exposes helper functions for searching files by name,
MIME type, size range, creation date range, and associated tags. It
constructs SQLAlchemy queries dynamically based on provided
parameters and returns lists of matching file records. Searching by
notes is not implemented because the current ``File`` model does not
include a notes field.
"""

from __future__ import annotations

from datetime import datetime
from typing import List, Optional

from sqlalchemy.orm import Session

from app.domain.files.models import File
from app.domain.tags.models import Tag


def search_files(
    db: Session,
    *,
    name: Optional[str] = None,
    file_type: Optional[str] = None,
    min_size: Optional[int] = None,
    max_size: Optional[int] = None,
    min_date: Optional[datetime] = None,
    max_date: Optional[datetime] = None,
    tags: Optional[List[str]] = None,
) -> List[File]:
    """Search files by various optional criteria.

    Parameters
    ----------
    db: Session
        Database session.
    name: Optional[str]
        Substring to search for in file names (case-insensitive).
    file_type: Optional[str]
        Substring to search for in MIME types (case-insensitive).
    min_size: Optional[int]
        Minimum file size in bytes.
    max_size: Optional[int]
        Maximum file size in bytes.
    min_date: Optional[datetime]
        Minimum creation date.
    max_date: Optional[datetime]
        Maximum creation date.
    tags: Optional[List[str]]
        List of tag names; only files associated with at least one of
        these tags will be returned.

    Returns
    -------
    List[File]
        A list of files matching the search criteria.
    """
    query = db.query(File)
    if name:
        query = query.filter(File.name.ilike(f"%{name}%"))
    if file_type:
        query = query.filter(File.mime_type.ilike(f"%{file_type}%"))
    if min_size is not None:
        query = query.filter(File.size >= min_size)
    if max_size is not None:
        query = query.filter(File.size <= max_size)
    if min_date is not None:
        query = query.filter(File.created_at >= min_date)
    if max_date is not None:
        query = query.filter(File.created_at <= max_date)
    if tags:
        # Join tags table and filter by names
        query = query.join(File.tags).filter(Tag.name.in_(tags)).distinct()
    return query.all()