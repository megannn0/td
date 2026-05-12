"""Service layer for managing tags and file-tag associations.

This module encapsulates all business logic related to tags. Tags can
be created, renamed, and deleted. Files can be associated with
multiple tags, and tags can be associated with multiple files.

The service functions here operate on SQLAlchemy sessions and return
model instances or None. They do not perform any Pydantic validation.
"""

from __future__ import annotations

from typing import List, Optional

from sqlalchemy.orm import Session

from app.domain.files.models import File
from app.domain.tags.models import Tag


def get_all_tags(db: Session) -> List[Tag]:
    """Return a list of all tags in the database, ordered by name."""
    return db.query(Tag).order_by(Tag.name.asc()).all()


def create_tag(db: Session, name: str) -> Tag:
    """Create a new tag with the given name.

    If a tag with the same name already exists, the existing tag is
    returned. This allows idempotent tag creation when adding tags to
    files.
    """
    existing = db.query(Tag).filter(Tag.name == name).first()
    if existing:
        return existing
    tag = Tag(name=name)
    db.add(tag)
    db.commit()
    db.refresh(tag)
    return tag


def update_tag(db: Session, tag_id: int, name: str) -> Optional[Tag]:
    """Rename a tag.

    If the tag does not exist, returns ``None``.
    """
    tag = db.query(Tag).filter(Tag.id == tag_id).first()
    if not tag:
        return None
    tag.name = name
    db.commit()
    db.refresh(tag)
    return tag


def delete_tag(db: Session, tag_id: int) -> bool:
    """Delete a tag and remove all associations.

    Returns ``True`` if the tag was deleted, ``False`` otherwise.
    """
    tag = db.query(Tag).filter(Tag.id == tag_id).first()
    if not tag:
        return False
    db.delete(tag)
    db.commit()
    return True


def add_tags_to_file(db: Session, file_id: int, tag_names: List[str]) -> Optional[File]:
    """Associate one or more tags with a file.

    Any tag names that do not already exist will be created. If the
    file does not exist, ``None`` is returned.
    """
    file = db.query(File).filter(File.id == file_id).first()
    if not file:
        return None
    for name in tag_names:
        tag = db.query(Tag).filter(Tag.name == name).first()
        if not tag:
            tag = Tag(name=name)
            db.add(tag)
            db.flush()
        if tag not in file.tags:
            file.tags.append(tag)
    db.commit()
    db.refresh(file)
    return file


def remove_tag_from_file(db: Session, file_id: int, tag_id: int) -> Optional[File]:
    """Remove a tag association from a file.

    If the file or tag does not exist, ``None`` is returned.
    """
    file = db.query(File).filter(File.id == file_id).first()
    tag = db.query(Tag).filter(Tag.id == tag_id).first()
    if not file or not tag:
        return None
    if tag in file.tags:
        file.tags.remove(tag)
        db.commit()
        db.refresh(file)
    return file