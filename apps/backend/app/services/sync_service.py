"""Service for scanning existing Telegram storage and importing files.

This service connects to the configured Telegram storage target and
iterates through all messages in that chat. For each message that
contains a document (file), it determines whether the file is part of
an existing upload (chunked) or a standalone file. Files are grouped
by their base name (e.g., ``movie.mkv``) and chunk index parsed from
the filename (e.g., ``movie.mkv.part002``).

Files already imported (based on the Telegram ``message_id``) are
ignored. The resulting logical file records are created in the
database along with associated ``FilePart`` records. Timestamps are
assigned based on the priority defined in the specification:

1. Original file modified date (not available via Telegram API → not used)
2. Original file created date (not available via Telegram API → not used)
3. Telegram message timestamp
4. Import timestamp (fallback)

Because original file timestamps are not exposed via the Telegram API,
message timestamps are used for ``created_at``, ``updated_at`` and
``upload_date`` fields. When scanning chunked files, the earliest
message timestamp is used.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from datetime import datetime
from typing import Dict, List, Tuple

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.domain.file_parts.models import FilePart
from app.domain.files.models import File
from app.services import storage_target_service
from app.infrastructure.telegram.factory import get_telegram_client


@dataclass
class ScanSummary:
    """Summary of the sync operation returned to the caller."""

    files_imported: int
    parts_imported: int
    skipped_existing: int


async def sync_existing_files(db: Session) -> ScanSummary:
    """Scan the active Telegram storage target and import existing files.

    The function returns a summary of how many files and parts were
    imported and how many messages were skipped because they already
    exist in the database. If no Telegram client is available or
    storage target is not configured, an HTTPException is raised.
    """
    # Resolve the active storage target to determine which chat to scan
    target = await storage_target_service.get_active_storage_target(db)
    if not target:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No active storage target configured")

    client = get_telegram_client()
    if not client:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Telegram client is not available")

    # Start the client session
    await client.start()
    # Determine the chat_id to scan; for Saved Messages the chat is self (None)
    if target.type == "saved_messages":
        chat_id = client.get_saved_messages_chat_id()  # May return None or 0
    else:
        chat_id = target.chat_id

    # In-memory grouping: base filename → list of (part_index, message, document)
    groups: Dict[str, List[Tuple[int, object, object]]] = {}
    # Regular expression to detect chunk index suffix (e.g., .part001)
    chunk_re = re.compile(r"^(?P<base>.+)\.part(?P<index>\d{3})$")
    skipped_existing = 0

    # Iterate over all messages in the chat. We avoid specifying any limit to
    # ensure full scan. The Telethon client returns messages in reverse
    # chronological order by default; order does not matter for grouping.
    async for message in client.iter_messages(chat_id, reverse=False):
        # Skip messages without a document/file
        if not getattr(message, "file", None):
            continue
        # Determine if this message has already been imported based on its ID
        existing_part = db.query(FilePart).filter(FilePart.telegram_message_id == message.id).first()
        if existing_part:
            skipped_existing += 1
            continue
        # Extract filename from message media attributes
        file_name = None
        doc = message.file  # Telethon provides .file for media shortcuts
        if doc and hasattr(doc, "attributes"):
            for attr in doc.attributes:
                # DocumentAttributeFilename exposes the filename
                if getattr(attr, "file_name", None):
                    file_name = attr.file_name
                    break
        if not file_name:
            # Fallback to Telegram message ID if filename is not available
            file_name = f"file_{message.id}"
        match = chunk_re.match(file_name)
        if match:
            base_name = match.group("base")
            part_index = int(match.group("index"))
        else:
            base_name = file_name
            part_index = 1
        # Add to group
        groups.setdefault(base_name, []).append((part_index, message, doc))

    files_imported = 0
    parts_imported = 0
    # Process each group to create File and FilePart records
    for base_name, items in groups.items():
        # Sort by part index to ensure proper ordering
        items.sort(key=lambda x: x[0])
        chunk_count = len(items)
        total_size = 0
        part_details = []
        # Determine the earliest message timestamp as the file's timestamp
        earliest_date: datetime = None
        for part_index, message, doc in items:
            size = getattr(doc, "size", 0) or 0
            total_size += size
            ts = message.date or datetime.utcnow()
            if earliest_date is None or ts < earliest_date:
                earliest_date = ts
            part_details.append((part_index, message, size))
        # Create the File record
        file_record = File(
            name=base_name,
            folder_id=None,
            storage_chat_id=chat_id if chat_id is not None else 0,
            size=total_size,
            mime_type=getattr(items[0][2], "mime_type", None),
            hash=None,
            created_at=earliest_date,
            updated_at=earliest_date,
            upload_date=earliest_date,
            chunk_count=chunk_count,
        )
        db.add(file_record)
        db.commit()
        db.refresh(file_record)
        files_imported += 1
        # Create FilePart records
        for part_index, message, size in part_details:
            part_record = FilePart(
                file_id=file_record.id,
                part_index=part_index,
                telegram_message_id=message.id,
                telegram_chat_id=chat_id if chat_id is not None else 0,
                size=size,
                chunk_hash=None,
            )
            db.add(part_record)
            parts_imported += 1
        db.commit()
    return ScanSummary(files_imported=files_imported, parts_imported=parts_imported, skipped_existing=skipped_existing)