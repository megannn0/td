"""Telegram file downloader utilities.

This module encapsulates the logic for downloading files and chunks
from Telegram. It mirrors the uploader functionality by offering
convenience functions for retrieving media from messages via the
configured Telegram client. These functions are used by the download
service to fetch file parts and reconstruct logical files without
exposing Telegram internals to higher layers of the application.

Note: In environments where Telethon is unavailable or cannot be
executed, these functions may raise ``NotImplementedError``. The rest
of the system should handle such exceptions gracefully.
"""

from __future__ import annotations

import asyncio
from typing import Awaitable, Callable, Optional, Tuple

from app.infrastructure.telegram.factory import get_telegram_client

try:  # pragma: no cover - optional import for static type checking
    from telethon import errors  # type: ignore
except Exception:  # noqa: WPS429
    errors = None  # type: ignore


async def download_media_to_memory(
    client,
    chat_id: int,
    message_id: int,
    progress_callback: Optional[Callable[[int, int], Awaitable[None]]] = None,
) -> bytes:
    """Download a media file from Telegram into memory.

    This helper retrieves a specific message by its identifiers and
    downloads its media content into memory as bytes. It is suitable
    for downloading smaller chunks when reconstructing a file from
    multiple parts. For larger files it may be preferable to download
    directly to disk to avoid high memory consumption.

    Parameters
    ----------
    client:
        Configured Telegram client instance.
    chat_id: int
        Identifier of the chat (channel or Saved Messages) that
        contains the media message.
    message_id: int
        Identifier of the message containing the media.
    progress_callback: Optional[Callable[[int, int], Awaitable[None]]]
        Optional asynchronous callback invoked with the number of
        bytes downloaded so far and the total bytes.

    Returns
    -------
    bytes
        The raw binary content of the downloaded media. If the
        message has no media or the download fails, an empty bytes
        object may be returned.

    Raises
    ------
    NotImplementedError
        If the client does not support downloading media.
    Exception
        Propagates any exceptions raised by Telethon when retrieving
        messages or downloading media.
    """
    # Ensure the client provides necessary methods
    if not hasattr(client, "get_messages"):
        raise NotImplementedError("The Telegram client does not support downloading media")
    # Fetch the message
    message = await client.get_messages(chat_id, ids=message_id)
    if isinstance(message, list):  # Telethon may return a list
        message = message[0] if message else None
    if not message or not hasattr(message, "download_media"):
        # No media to download
        return b""
    # Download to memory
    # Passing bytes as the file argument makes Telethon return the bytes directly
    if progress_callback:
        data = await client.download_media(message, file=bytes, progress_callback=progress_callback)
    else:
        data = await client.download_media(message, file=bytes)
    return data or b""


async def download_media_to_file(
    client,
    chat_id: int,
    message_id: int,
    dest_path: str,
    progress_callback: Optional[Callable[[int, int], Awaitable[None]]] = None,
) -> str:
    """Download a media file from Telegram directly to disk.

    This helper retrieves a specific message by its identifiers and
    downloads its media content to the specified file path. If the
    download succeeds, the resulting file path is returned. Any
    existing file at the destination will be overwritten.

    Parameters
    ----------
    client:
        Configured Telegram client instance.
    chat_id: int
        Identifier of the chat (channel or Saved Messages) that
        contains the media message.
    message_id: int
        Identifier of the message containing the media.
    dest_path: str
        Path on disk where the downloaded media should be saved.
    progress_callback: Optional[Callable[[int, int], Awaitable[None]]]
        Optional asynchronous callback invoked with the number of
        bytes downloaded so far and the total bytes.

    Returns
    -------
    str
        The path to the downloaded file. Telethon may adjust the
        filename depending on content type; the returned value
        reflects the actual path used.

    Raises
    ------
    NotImplementedError
        If the client does not support downloading media.
    Exception
        Propagates any exceptions raised by Telethon when retrieving
        messages or downloading media.
    """
    if not hasattr(client, "get_messages"):
        raise NotImplementedError("The Telegram client does not support downloading media")
    # Fetch the message
    message = await client.get_messages(chat_id, ids=message_id)
    if isinstance(message, list):
        message = message[0] if message else None
    if not message or not hasattr(message, "download_media"):
        return dest_path
    if progress_callback:
        path = await client.download_media(message, file=dest_path, progress_callback=progress_callback)
    else:
        path = await client.download_media(message, file=dest_path)
    return path or dest_path