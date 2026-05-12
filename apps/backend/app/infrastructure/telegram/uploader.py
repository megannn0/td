"""Telegram file uploader utilities.

This module encapsulates the logic for uploading files and file chunks to
Telegram. It delegates the low-level Telegram API calls to the configured
Telegram client while enforcing the smart upload and adaptive chunking
rules defined in the specification. The functions defined here are used
by the upload service to perform actual uploads and return the resulting
Telegram message identifiers. Where possible, the functions detect
whether the client is connected to a premium account to choose the
appropriate limits.

Note: In environments where Telethon is unavailable or cannot be
executed, these functions may raise ``NotImplementedError``. The rest of
the system should handle such exceptions gracefully.
"""

from __future__ import annotations

import asyncio
import hashlib
import os
from typing import AsyncGenerator, Awaitable, Callable, Optional, Tuple

from app.infrastructure.telegram.factory import get_telegram_client


# Telegram upload limits in bytes
STANDARD_UPLOAD_LIMIT = 2 * 1024 * 1024 * 1024  # 2GB
PREMIUM_UPLOAD_LIMIT = 4 * 1024 * 1024 * 1024  # 4GB

# Safe chunk sizes (slightly below the hard limit)
STANDARD_SAFE_CHUNK_SIZE = int(1.9 * 1024 * 1024 * 1024)  # 1.9GB
PREMIUM_SAFE_CHUNK_SIZE = int(3.9 * 1024 * 1024 * 1024)  # 3.9GB


async def is_premium_account(client) -> bool:
    """Detect whether the currently authenticated account is Telegram Premium.

    Parameters
    ----------
    client:
        An instance of the Telegram client (TDLib or Telethon).

    Returns
    -------
    bool
        True if the account is premium, False otherwise.

    Raises
    ------
    NotImplementedError
        If the client does not support retrieving account details or
        premium status cannot be determined.
    """
    try:
        me = await client.get_me()
        # Telethon exposes a ``premium`` attribute on the user object
        return bool(getattr(me, "premium", False))
    except Exception as exc:  # noqa: WPS410 catch all to fallback gracefully
        # If detection fails, assume standard account to err on the safe side
        return False


def get_upload_limits(premium: bool) -> Tuple[int, int]:
    """Return the upload limit and safe chunk size based on account type.

    Parameters
    ----------
    premium: bool
        Whether the account is premium.

    Returns
    -------
    tuple[int, int]
        A tuple of (upload_limit, safe_chunk_size), in bytes.
    """
    if premium:
        return PREMIUM_UPLOAD_LIMIT, PREMIUM_SAFE_CHUNK_SIZE
    return STANDARD_UPLOAD_LIMIT, STANDARD_SAFE_CHUNK_SIZE


async def upload_single_file(
    client,
    chat_id: Optional[int],
    file_path: str,
    file_name: Optional[str] = None,
    progress_callback: Optional[Callable[[int, int], Awaitable[None]]] = None,
) -> Tuple[int, int]:
    """Upload a single file to Telegram and return message and chat identifiers.

    This function uses the client's ``send_file`` method to send the entire
    file without performing any chunking. It is suitable for files whose
    size is within the account's upload limit.

    Parameters
    ----------
    client:
        Configured Telegram client instance.
    chat_id: Optional[int]
        Target chat ID where the file should be uploaded. If ``None``,
        indicates Saved Messages (the user's own cloud).
    file_path: str
        Path to the file on disk.
    file_name: Optional[str]
        Optional custom file name to use when uploading. If not provided,
        the original filename on disk is used.
    progress_callback: Optional[Callable[[int, int], Awaitable[None]]]
        Optional asynchronous callback invoked with the number of bytes
        uploaded so far and the total bytes. Telethon supports a
        ``progress_callback`` parameter for tracking upload progress.

    Returns
    -------
    Tuple[int, int]
        A tuple of (telegram_message_id, telegram_chat_id).

    Raises
    ------
    NotImplementedError
        If the underlying client does not provide a ``send_file`` method.
    """
    if not hasattr(client, "send_file"):
        raise NotImplementedError("The Telegram client does not support file upload")

    destination = chat_id or "me"
    # Choose file name if provided; otherwise rely on Telethon to infer
    extra_kwargs = {}
    if file_name:
        extra_kwargs["file_name"] = file_name
    if progress_callback:
        extra_kwargs["progress_callback"] = progress_callback

    message = await client.send_file(destination, file_path, **extra_kwargs)
    # Telethon returns the sent Message; message.id and message.chat_id are accessible
    # In case the library returns a list (e.g., for albums), pick the first
    if isinstance(message, list):
        message = message[0]
    return int(getattr(message, "id")), int(getattr(message, "chat_id"))


async def upload_chunk(
    client,
    chat_id: Optional[int],
    chunk_bytes: bytes,
    file_name: str,
    progress_callback: Optional[Callable[[int, int], Awaitable[None]]] = None,
) -> Tuple[int, int]:
    """Upload a chunk of data to Telegram as a file and return identifiers.

    This function sends an in-memory chunk as a file. Telethon accepts
    ``bytes`` or a file-like object directly. For deterministic naming,
    ``file_name`` must include the part index suffix (e.g., ``part001``).

    Parameters
    ----------
    client:
        Configured Telegram client.
    chat_id: Optional[int]
        Target chat ID. ``None`` indicates Saved Messages.
    chunk_bytes: bytes
        Raw binary data of the chunk.
    file_name: str
        Name to assign to the chunk file when uploading.
    progress_callback: Optional[Callable[[int, int], Awaitable[None]]]
        Callback for progress reporting. For chunk uploads this may be
        invoked with partial progress across the entire file.

    Returns
    -------
    Tuple[int, int]
        (telegram_message_id, telegram_chat_id)

    Raises
    ------
    NotImplementedError
        If the underlying client does not support uploading bytes.
    """
    if not hasattr(client, "send_file"):
        raise NotImplementedError("The Telegram client does not support chunk upload")

    destination = chat_id or "me"
    extra_kwargs = {"file_name": file_name}
    if progress_callback:
        extra_kwargs["progress_callback"] = progress_callback
    message = await client.send_file(destination, chunk_bytes, **extra_kwargs)
    if isinstance(message, list):
        message = message[0]
    return int(getattr(message, "id")), int(getattr(message, "chat_id"))


async def compute_sha256(data: bytes) -> str:
    """Compute a SHA256 hash of the given binary data."""
    return hashlib.sha256(data).hexdigest()


def chunk_file(path: str, chunk_size: int) -> AsyncGenerator[bytes, None]:
    """Asynchronously yield chunks from a file on disk.

    Parameters
    ----------
    path: str
        Path to the file to be chunked.
    chunk_size: int
        Number of bytes per chunk.

    Yields
    ------
    bytes
        Next chunk of the file. Stops when the file is exhausted.
    """
    async def generator() -> AsyncGenerator[bytes, None]:
        loop = asyncio.get_running_loop()
        with open(path, "rb") as f:
            while True:
                # Read chunk in blocking thread to avoid blocking event loop
                data = await loop.run_in_executor(None, f.read, chunk_size)
                if not data:
                    break
                yield data
    return generator()