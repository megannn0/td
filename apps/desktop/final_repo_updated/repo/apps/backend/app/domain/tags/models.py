"""SQLAlchemy model definitions for tags and file-tag associations."""

from __future__ import annotations

from sqlalchemy import Column, ForeignKey, Integer, String, Table
from sqlalchemy.orm import relationship

from app.db.base_class import Base


class Tag(Base):
    """Represents a user-defined tag that can be associated with files."""

    __tablename__ = "tags"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False, unique=True)

    # Files associated with this tag
    files = relationship(
        "app.domain.files.models.File",
        secondary="file_tags",
        back_populates="tags",
    )


class FileTag(Base):
    """Association table between files and tags."""

    __tablename__ = "file_tags"

    # A surrogate primary key is used for easier ORM handling. A unique
    # constraint on (file_id, tag_id) prevents duplicate associations.
    id = Column(Integer, primary_key=True, index=True)
    file_id = Column(Integer, ForeignKey("files.id", ondelete="CASCADE"), nullable=False)
    tag_id = Column(Integer, ForeignKey("tags.id", ondelete="CASCADE"), nullable=False)
