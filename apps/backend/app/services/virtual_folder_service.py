"""Service layer for virtual (smart) folders.

Virtual folders are saved searches that group files by criteria such as
tags, MIME type, size, or arbitrary keywords. Each virtual folder
stores a name and a query string. This service provides helper
functions to create, update, delete, and fetch virtual folders, as
well as evaluate their queries using the search service.
"""

from __future__ import annotations

import re
from typing import Dict, List, Optional, Tuple

from sqlalchemy.orm import Session

from app.domain.virtual_folders.models import VirtualFolder
from app.services import search_service


def get_all_virtual_folders(db: Session) -> List[VirtualFolder]:
    """Return all virtual folders sorted by creation time ascending."""
    return db.query(VirtualFolder).order_by(VirtualFolder.created_at.asc()).all()


def create_virtual_folder(db: Session, name: str, query: str) -> VirtualFolder:
    """Create a new virtual folder."""
    vf = VirtualFolder(name=name, query=query)
    db.add(vf)
    db.commit()
    db.refresh(vf)
    return vf


def get_virtual_folder(db: Session, vf_id: int) -> Optional[VirtualFolder]:
    """Return a virtual folder by ID."""
    return db.query(VirtualFolder).filter(VirtualFolder.id == vf_id).first()


def update_virtual_folder(db: Session, vf_id: int, name: Optional[str], query: Optional[str]) -> Optional[VirtualFolder]:
    """Update the name and/or query of a virtual folder."""
    vf = db.query(VirtualFolder).filter(VirtualFolder.id == vf_id).first()
    if not vf:
        return None
    if name is not None:
        vf.name = name
    if query is not None:
        vf.query = query
    db.commit()
    db.refresh(vf)
    return vf


def delete_virtual_folder(db: Session, vf_id: int) -> bool:
    """Delete a virtual folder. Does not delete any files."""
    vf = db.query(VirtualFolder).filter(VirtualFolder.id == vf_id).first()
    if not vf:
        return False
    db.delete(vf)
    db.commit()
    return True


def _parse_query_string(query: str) -> Dict[str, object]:
    """Parse a simple query string into search parameters.

    The query syntax supports tokens separated by whitespace. Supported
    operators:

    - ``tag:NAME`` to filter by a tag name (multiple allowed)
    - ``type:SUBSTRING`` to match MIME type substring
    - ``size>VALUE`` or ``size<VALUE`` where VALUE may be suffixed
      with ``KB``, ``MB``, or ``GB`` (case-insensitive)
    - Any other token is treated as a substring match on the file name.

    Returns a dictionary compatible with ``search_service.search_files``.
    Unknown tokens are ignored.
    """
    params: Dict[str, object] = {}
    tags: List[str] = []
    name_fragments: List[str] = []
    for token in query.split():
        if token.startswith("tag:"):
            tags.append(token[len("tag:") :])
        elif token.startswith("type:"):
            params["file_type"] = token[len("type:") :]
        elif token.lower().startswith("size>") or token.lower().startswith("size<"):
            comp = token[4]
            value_str = token[5:]
            mult = 1
            m = re.match(r"(\d+(?:\.\d+)?)([kmg]?b)?", value_str, re.IGNORECASE)
            if m:
                num_str, unit = m.groups()
                val = float(num_str)
                if unit:
                    unit = unit.lower()
                    if unit == "kb":
                        mult = 1024
                    elif unit == "mb":
                        mult = 1024 * 1024
                    elif unit == "gb":
                        mult = 1024 * 1024 * 1024
                bytes_val = int(val * mult)
                if comp == ">":
                    params["min_size"] = bytes_val
                elif comp == "<":
                    params["max_size"] = bytes_val
        else:
            name_fragments.append(token)
    if tags:
        params["tags"] = tags
    if name_fragments:
        # Combine name fragments into a single substring search (space separated)
        params["name"] = " ".join(name_fragments)
    return params


def search_virtual_folder_files(db: Session, vf_id: int):
    """Return files matching the virtual folder's query.

    This uses the search service to perform the actual search. If
    the virtual folder does not exist, returns ``None``.
    """
    vf = db.query(VirtualFolder).filter(VirtualFolder.id == vf_id).first()
    if not vf:
        return None
    params = _parse_query_string(vf.query)
    return search_service.search_files(db, **params)