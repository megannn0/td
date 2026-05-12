"""Factory for obtaining the Telegram client implementation.

Iteration 12 replaces the Telethon prototype with TDLib.  The factory now
returns TDLib only.  This keeps the service API unchanged while ensuring all
uploads, downloads, sync scans, and saved-message operations go through TDLib.
"""

from __future__ import annotations

from typing import Optional


def get_telegram_client() -> Optional["TelegramClientBase"]:
    """Return a TDLib-backed Telegram client instance."""
    from app.infrastructure.telegram.tdlib.client import get_tdlib_client

    return get_tdlib_client()
