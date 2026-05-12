"""Abstract definitions for Telegram clients used as storage backends."""

from __future__ import annotations

import abc


class TelegramClientBase(abc.ABC):
    """Abstract base class defining the operations required by the Telegram storage backend."""

    @abc.abstractmethod
    async def start(self) -> None:
        """Start or connect the client session."""
        raise NotImplementedError

    @abc.abstractmethod
    async def ensure_private_channel(self, title: str) -> int:
        """Ensure a private channel with the given title exists and return its chat ID."""
        raise NotImplementedError

    @abc.abstractmethod
    async def ensure_private_group(self, title: str) -> int:
        """Ensure a private supergroup with the given title exists and return its chat ID."""
        raise NotImplementedError

    @abc.abstractmethod
    def get_saved_messages_chat_id(self) -> int | None:
        """Return the chat ID for the user’s Saved Messages area, or None if not needed."""
        raise NotImplementedError
