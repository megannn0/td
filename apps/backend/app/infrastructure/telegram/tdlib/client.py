"""TDLib implementation for Telegram Drive.

This module replaces the earlier Telethon prototype with a TDLib-backed
client.  It uses TDLib's JSON interface (``tdjson``) directly through
``ctypes`` so the rest of the backend can keep the same simple service API:

    start()
    send_file(...)
    iter_messages(...)
    get_me()
    get_messages(...)
    download_media(...)

Runtime requirements:
    * libtdjson must be installed and discoverable by the dynamic loader, or
      its path must be provided in the ``TDJSON_LIBRARY_PATH`` environment
      variable.
    * TELEGRAM_API_ID, TELEGRAM_API_HASH, and TELEGRAM_PHONE_NUMBER must be set.
    * For first login, set TELEGRAM_LOGIN_CODE after Telegram sends the code.
      If 2FA is enabled, also set TELEGRAM_PASSWORD.

The wrapper intentionally returns small Telethon-like compatibility objects
for messages and uploaded files so the existing upload, download, and sync
services do not need to change.
"""

from __future__ import annotations

import asyncio
import ctypes
import json
import os
import pathlib
import shutil
import tempfile
import time
from dataclasses import dataclass
from datetime import datetime, timezone
from types import SimpleNamespace
from typing import Any, AsyncGenerator, Callable, Union, Optional

import logging

from app.core.config import settings
from app.infrastructure.telegram.base import TelegramClientBase


class TDLibError(RuntimeError):
    """Raised when TDLib returns an error response."""


@dataclass
class TDLibMessageFile:
    """Telethon-compatible file metadata used by the sync importer."""

    size: int
    mime_type: Optional[str]
    attributes: list[Any]
    file_id: Optional[int] = None
    local_path: Optional[str] = None


@dataclass
class TDLibMessage:
    """Telethon-compatible message wrapper used by existing services."""

    id: int
    chat_id: int
    date: datetime
    raw: dict[str, Any]
    file: Optional[TDLibMessageFile] = None


class _TDJson:
    """Minimal ctypes wrapper around TDLib's tdjson API."""

    def __init__(self) -> None:
        library_path = os.getenv("TDJSON_LIBRARY_PATH")

        if not library_path:
            current_dir = os.path.dirname(os.path.abspath(__file__))
            base_dir = os.path.abspath(os.path.join(current_dir, "..", "..", ".."))
            library_path = os.path.join(base_dir, "tdjson.dll")

            if not os.path.exists(library_path):
                library_path = os.path.join(os.getcwd(), "tdjson.dll")

        if not os.path.exists(library_path):
            raise RuntimeError(f"TDLib shared library not found at: {library_path}")

        try:
            self._tdjson = ctypes.CDLL(library_path)
            # Log the successful library load. Using the root logger here is
            # acceptable because this occurs at import time and helps
            # diagnose environment issues. We do not expose sensitive
            # information.
            logging.getLogger(__name__).info("TDLib loaded successfully from: %s", library_path)
        except Exception as e:
            raise RuntimeError(f"Failed to load TDLib from {library_path}\nError: {e}") from e

        self._tdjson.td_create_client_id.restype = ctypes.c_int
        self._tdjson.td_send.argtypes = [ctypes.c_int, ctypes.c_char_p]
        self._tdjson.td_receive.argtypes = [ctypes.c_double]
        self._tdjson.td_receive.restype = ctypes.c_char_p
        self._tdjson.td_execute.argtypes = [ctypes.c_char_p]
        self._tdjson.td_execute.restype = ctypes.c_char_p

        self.client_id = self._tdjson.td_create_client_id()

    def send(self, payload: dict[str, Any]) -> None:
        """Send a request to TDLib."""
        self._tdjson.td_send(self.client_id, json.dumps(payload).encode("utf-8"))

    def receive(self, timeout: float = 1.0) -> Optional[dict[str, Any]]:
        """Receive an event from TDLib."""
        raw = self._tdjson.td_receive(ctypes.c_double(timeout))
        if not raw:
            return None
        try:
            return json.loads(raw.decode("utf-8"))
        except Exception:
            return None

    def execute(self, payload: dict[str, Any]) -> Optional[dict[str, Any]]:
        """Execute a synchronous request."""
        raw = self._tdjson.td_execute(json.dumps(payload).encode("utf-8"))
        if not raw:
            return None
        try:
            return json.loads(raw.decode("utf-8"))
        except Exception:
            return None


class TDLibClient(TelegramClientBase):
    """Telegram client implementation using TDLib."""

    def __init__(self) -> None:
        if not settings.TELEGRAM_API_ID or not settings.TELEGRAM_API_HASH:
            raise RuntimeError("TELEGRAM_API_ID and TELEGRAM_API_HASH are required for TDLib")
        if not settings.TELEGRAM_PHONE_NUMBER:
            raise RuntimeError("TELEGRAM_PHONE_NUMBER is required for TDLib login")

        self.session_dir = pathlib.Path(os.getenv("TELEGRAM_SESSION_DIR", ".tdlib"))
        self.database_dir = self.session_dir / "database"
        self.files_dir = self.session_dir / "files"
        self.database_dir.mkdir(parents=True, exist_ok=True)
        self.files_dir.mkdir(parents=True, exist_ok=True)

        self._td = _TDJson()
        self._request_id = 0
        # 🔇 SILENCE TDLib LOGS (0 = fatal, 1 = errors, 2 = warnings, 3+ = debug)
        self._td.execute({
            "@type": "setLogVerbosityLevel",
            "new_verbosity_level": 1
        })
        self._pending: dict[str, asyncio.Future[dict[str, Any]]] = {}
        self._updates: asyncio.Queue[dict[str, Any]] = asyncio.Queue()
        self._receiver_task: Optional[asyncio.Task[None]] = None
        self._started = False
        self._me: Optional[dict[str, Any]] = None

        # Initialize a logger for this instance. Each client will use
        # the module name to route logs through the application's logging
        # configuration. Avoid using print statements throughout this
        # class to prevent leaking sensitive information like phone numbers
        # or authentication codes.
        self.logger = logging.getLogger(__name__)

    # ------------------------------------------------------------------
    # Startup & auth
    # ------------------------------------------------------------------

    async def start(self) -> None:
        if self._started:
            return

        self._receiver_task = asyncio.create_task(self._receiver_loop())
        self.logger.info("Receiver loop task created")

        self._td.send({"@type": "getOption", "name": "version"})
        await asyncio.sleep(0.5)

        await self._handle_authorization()

        self._me = await self._call({"@type": "getMe"})
        self.logger.info("Logged in as: %s", self._me.get('first_name', 'Unknown'))

        self._started = True


    async def _wait_for_send_result(
        self,
        chat_id: int,
        temp_message_id: int,
        file_id: Optional[int] = None,
        progress_callback: Optional[Callable[[int, int], Any]] = None,
        timeout: float = 3600.0,
    ) -> dict[str, Any]:
        """Block until TDLib confirms the message was sent or failed."""
        deadline = time.monotonic() + timeout
        buffered: list[dict[str, Any]] = []

        try:
            while time.monotonic() < deadline:
                remaining = max(0.5, deadline - time.monotonic())
                try:
                    update = await asyncio.wait_for(self._updates.get(), timeout=remaining)
                    utype = update.get("@type")

                    if utype == "updateMessageSendSucceeded":
                        old_id = int(update.get("old_message_id", 0))
                        msg_chat = int(update.get("message", {}).get("chat_id", 0))
                        if old_id == temp_message_id and (msg_chat == 0 or msg_chat == chat_id):
                            # Log confirmation of the uploaded message. Do not
                            # expose full message contents in the log.
                            self.logger.info(
                                "Upload confirmed, real message id: %s",
                                update.get("message", {}).get("id"),
                            )
                            return update.get("message", update)
                        buffered.append(update)

                    elif utype == "updateMessageSendFailed":
                        old_id = int(update.get("old_message_id", 0))
                        msg_chat = int(update.get("message", {}).get("chat_id", 0))
                        if old_id == temp_message_id and (msg_chat == 0 or msg_chat == chat_id):
                            err = update.get("error", {})
                            raise TDLibError(
                                f"Upload failed: {err.get('code')} {err.get('message')}"
                            )
                        buffered.append(update)

                    # --- Catch file upload progress updates here ---
                    elif utype == "updateFile" and file_id is not None and progress_callback:
                        file_data = update.get("file", {})
                        if file_data.get("id") == file_id:
                            remote = file_data.get("remote", {})
                            if remote.get("is_uploading_active"):
                                uploaded = remote.get("uploaded_size", 0)
                                expected = file_data.get("expected_size") or file_data.get("size", 0)
                                if expected > 0:
                                    maybe = progress_callback(uploaded, expected)
                                    if asyncio.iscoroutine(maybe):
                                        await maybe
                        buffered.append(update)

                    else:
                        buffered.append(update)

                except asyncio.TimeoutError:
                    break
        finally:
            for u in buffered:
                await self._updates.put(u)

        raise TimeoutError(f"Upload timed out after {timeout}s waiting for send confirmation")


    async def _receiver_loop(self) -> None:
        """Background task to receive TDLib events."""
        self.logger.info("TDLib receiver loop started")
        consecutive_empty = 0

        while True:
            try:
                event = await asyncio.to_thread(self._td.receive, 1.0)
                if event:
                    consecutive_empty = 0
                    extra = event.get("@extra")
                    if extra and extra in self._pending:
                        fut = self._pending.pop(extra)
                        if not fut.done():
                            fut.set_result(event)
                    else:
                        await self._updates.put(event)

                    if event.get("@type") == "updateAuthorizationState":
                        state = event.get("authorization_state", {}).get("@type", "unknown")
                        # Log authorization state transitions for debugging.
                        self.logger.debug("Received authorization state: %s", state)
                else:
                    consecutive_empty += 1
                    if consecutive_empty > 20:
                        await asyncio.sleep(0.2)
                        consecutive_empty = 0
            except Exception as e:
                # Log unexpected errors in the receiver loop. Do not
                # expose sensitive details; include only the exception message.
                self.logger.warning("Error in TDLib receiver loop: %s", e)
                await asyncio.sleep(0.5)

    async def _call(self, payload: dict[str, Any], timeout: float = 60.0) -> dict[str, Any]:
        self._request_id += 1
        extra = str(self._request_id)
        payload = dict(payload)
        payload["@extra"] = extra
        loop = asyncio.get_running_loop()
        fut: asyncio.Future[dict[str, Any]] = loop.create_future()
        self._pending[extra] = fut
        self._td.send(payload)
        result = await asyncio.wait_for(fut, timeout=timeout)
        if result.get("@type") == "error":
            raise TDLibError(f"TDLib error {result.get('code')}: {result.get('message')}")
        return result

    async def _wait_update(self, update_type: str, timeout: float = 30.0) -> dict[str, Any]:
        deadline = time.monotonic() + timeout
        buffered: list[dict[str, Any]] = []

        try:
            while time.monotonic() < deadline:
                remaining = max(0.1, deadline - time.monotonic())
                try:
                    update = await asyncio.wait_for(self._updates.get(), timeout=remaining)
                    if update.get("@type") == update_type:
                        return update
                    buffered.append(update)
                except asyncio.TimeoutError:
                    break
        finally:
            for u in buffered:
                await self._updates.put(u)

        raise TimeoutError(f"Timed out waiting for {update_type} after {timeout}s")

    async def _handle_authorization(self) -> None:
        self.logger.info("Starting TDLib authorization")

        for i in range(60):
            try:
                update = await self._wait_update("updateAuthorizationState", timeout=10.0)
                state_type = update.get("authorization_state", {}).get("@type")
                # Trace authorization state transitions at a debug level.
                self.logger.debug("Authorization state: %s", state_type)

                if state_type == "authorizationStateReady":
                    self.logger.info("TDLib is ready")
                    await self._preload_chats()
                    return

                elif state_type == "authorizationStateWaitTdlibParameters":
                    self.logger.debug("Sending TDLib parameters")
                    await self._call({
                        "@type": "setTdlibParameters",
                        "use_test_dc": False,
                        "database_directory": str(self.database_dir),
                        "files_directory": str(self.files_dir),
                        "use_file_database": True,
                        "use_chat_info_database": True,
                        "use_message_database": True,
                        "use_secret_chats": False,
                        "api_id": int(settings.TELEGRAM_API_ID),
                        "api_hash": settings.TELEGRAM_API_HASH,
                        "system_language_code": "en",
                        "device_model": "Desktop",
                        "application_version": "1.0",
                    })

                elif state_type == "authorizationStateWaitPhoneNumber":
                    # Mask the phone number in logs to avoid exposing sensitive data
                    masked_phone = settings.TELEGRAM_PHONE_NUMBER[:2] + "******"
                    self.logger.info("Sending phone number: %s", masked_phone)
                    await self._call({
                        "@type": "setAuthenticationPhoneNumber",
                        "phone_number": settings.TELEGRAM_PHONE_NUMBER,
                        "settings": {"@type": "phoneNumberAuthenticationSettings"},
                    })

                elif state_type == "authorizationStateWaitCode":
                    code = (settings.TELEGRAM_LOGIN_CODE or "").strip()
                    if not code:
                        raise RuntimeError("TELEGRAM_LOGIN_CODE not set — add it to .env and restart")
                    # Do not log the actual authentication code
                    self.logger.info("Submitting verification code")
                    await self._call({"@type": "checkAuthenticationCode", "code": code})

                elif state_type == "authorizationStateWaitPassword":
                    password = (settings.TELEGRAM_PASSWORD or "").strip()
                    if not password:
                        raise RuntimeError("2FA enabled but TELEGRAM_PASSWORD not set in .env")
                    await self._call({"@type": "checkAuthenticationPassword", "password": password})

                elif state_type == "authorizationStateLoggingOut":
                    raise RuntimeError("TDLib is logging out — check credentials")

                elif state_type == "authorizationStateClosed":
                    raise RuntimeError("TDLib session closed unexpectedly")

            except TimeoutError:
                self.logger.debug("Waiting for auth state... attempt %s/60", i + 1)
                continue
            except TDLibError as e:
                self.logger.warning("TDLib error during auth: %s", e)
                continue

        raise RuntimeError("Authorization timed out after 10 minutes.")

    async def _preload_chats(self) -> None:
        """Load the chat list into TDLib's in-memory index after login.

        TDLib requires loadChats to be called on every startup before any
        chat ID can be used — even if the chat exists in the local database.
        Repeat until a 404 is returned, which means all chats are loaded.
        """
        self.logger.info("Preloading chat list")
        for _ in range(10):
            try:
                await self._call({
                    "@type": "loadChats",
                    "chat_list": {"@type": "chatListMain"},
                    "limit": 100,
                })
            except TDLibError as e:
                # 404 = "there are no more chats to load"
                if "404" in str(e):
                    break
                self.logger.warning("loadChats warning: %s", e)
                break
        self.logger.info("Chat list preloaded")

    async def _ensure_chat(self, chat_id: int) -> None:
        """Force TDLib to load a specific chat into memory before use.

        Calling getChat on a chat that exists in the database but is not yet
        in TDLib's in-memory index triggers a load without raising an error.
        """
        try:
            await self._call({"@type": "getChat", "chat_id": chat_id})
        except TDLibError as e:
            # Log the warning without exposing the full exception details
            self.logger.warning("_ensure_chat(%s) warning: %s", chat_id, e)

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    async def get_me(self) -> Any:
        await self.start()
        user = self._me or {}
        return SimpleNamespace(
            id=user.get("id"),
            first_name=user.get("first_name"),
            last_name=user.get("last_name"),
            username=(user.get("usernames") or {}).get("active_usernames", [None])[0],
            premium=bool(user.get("is_premium", False)),
        )

    def get_saved_messages_chat_id(self) -> int | None:
        if self._me:
            return int(self._me["id"])
        return None

    async def ensure_private_channel(self, title: str) -> int:
        await self.start()
        chat = await self._call({
            "@type": "createNewSupergroupChat",
            "title": title,
            "is_channel": True,
            "description": "Telegram Drive storage channel",
        })
        return int(chat["id"])

    async def ensure_private_group(self, title: str) -> int:
        await self.start()
        chat = await self._call({
            "@type": "createNewSupergroupChat",
            "title": title,
            "is_channel": False,
            "description": "Telegram Drive storage group",
        })
        return int(chat["id"])


    async def send_file(
        self,
        chat_id: int | str | None,
        file: Union[bytes, str],
        file_name: Optional[str] = None,
        caption: Optional[str] = None,
        progress_callback: Optional[Callable[[int, int], Any]] = None,
    ) -> TDLibMessage:
        await self.start()

        resolved_chat_id = await self._resolve_destination(chat_id)
        await self._ensure_chat(resolved_chat_id)

        cleanup_dir: Optional[str] = None
        local_path: str

        try:
            if isinstance(file, bytes):
                if not file_name:
                    raise ValueError("file_name is required when file is bytes")
                cleanup_dir = tempfile.mkdtemp(prefix="tdl_upload_")
                local_path = os.path.join(cleanup_dir, file_name)
                with open(local_path, "wb") as f:
                    f.write(file)
            else:
                original_path = str(file)
                if not file_name:
                    file_name = os.path.basename(original_path)
                
                # TDLib strictly uses the filename on disk. If the target name 
                # doesn't match the physical file name, we must create a linked alias.
                if os.path.basename(original_path) != file_name:
                    cleanup_dir = tempfile.mkdtemp(prefix="tdl_upload_")
                    local_path = os.path.join(cleanup_dir, file_name)
                    try:
                        # Attempt a fast hardlink (zero disk space, instant)
                        os.link(original_path, local_path)
                    except OSError:
                        # Fallback to copy if cross-drive or filesystem doesn't support links
                        import shutil
                        shutil.copy2(original_path, local_path)
                else:
                    local_path = original_path

            # --- Rest of your upload logic remains the same ---
            temp_result = await self._call({
                "@type": "sendMessage",
                "chat_id": resolved_chat_id,
                "input_message_content": {
                    "@type": "inputMessageDocument",
                    "document": {"@type": "inputFileLocal", "path": local_path},
                    "caption": {
                        "@type": "formattedText",
                        "text": caption or "",
                        "entities": [],
                    },
                },
            })

            temp_message_id = int(temp_result.get("id", 0))
            file_id = self._extract_file_id(temp_result)

            final_message = await self._wait_for_send_result(
                resolved_chat_id, 
                temp_message_id,
                file_id=file_id,
                progress_callback=progress_callback
            )

            if progress_callback:
                file_size = os.path.getsize(local_path) if os.path.exists(local_path) else 0
                maybe = progress_callback(file_size, file_size)
                if asyncio.iscoroutine(maybe):
                    await maybe

            return self._adapt_message(final_message)

        finally:
            # This safely cleans up the temporary link/directory when the upload finishes
            if cleanup_dir and os.path.exists(cleanup_dir):
                import shutil
                shutil.rmtree(cleanup_dir, ignore_errors=True)
    
    async def _resolve_destination(self, destination: int | str | None) -> int:
        if destination in (None, "me"):
            me = await self.get_me()
            return int(me.id)
        return int(destination)

    async def get_messages(self, chat_id: int | None, ids: int | list[int]) -> Any:
        await self.start()
        resolved_chat_id = await self._resolve_destination(chat_id)
        await self._ensure_chat(resolved_chat_id)

        if isinstance(ids, list):
            result = await self._call({
                "@type": "getMessages",
                "chat_id": resolved_chat_id,
                "message_ids": ids,
            })
            return [self._adapt_message(m) for m in result.get("messages", []) if m]
        else:
            # Single ID — use getMessage
            result = await self._call({
                "@type": "getMessage",
                "chat_id": resolved_chat_id,
                "message_id": ids,
            })
            return self._adapt_message(result)

    async def iter_messages(
        self,
        chat_id: int | None,
        reverse: bool = False,
        limit: int = 100,
    ) -> AsyncGenerator[Any, None]:
        await self.start()
        resolved_chat_id = await self._resolve_destination(chat_id)
        await self._ensure_chat(resolved_chat_id)
        from_message_id = 0
        collected: list[Any] = []
        while True:
            history = await self._call({
                "@type": "getChatHistory",
                "chat_id": resolved_chat_id,
                "from_message_id": from_message_id,
                "offset": 0,
                "limit": limit,
                "only_local": False,
            })
            messages = [m for m in history.get("messages", []) if m]
            if not messages:
                break
            adapted = [self._adapt_message(m) for m in messages]
            if reverse:
                collected.extend(adapted)
            else:
                for msg in adapted:
                    yield msg
            from_message_id = int(messages[-1]["id"])
        if reverse:
            for msg in reversed(collected):
                yield msg

    async def download_media(
        self,
        message: Any,
        file: str | type[bytes] | None = None,
        progress_callback: Optional[Callable[[int, int], Any]] = None,
    ) -> str | bytes:
        """Download message media either to memory or to a destination path."""
        await self.start()
        raw = message.raw if isinstance(message, TDLibMessage) else message
        file_id = self._extract_file_id(raw)
        if not file_id:
            return b"" if file is bytes else (file or "")

        downloaded = await self._call({
            "@type": "downloadFile",
            "file_id": int(file_id),
            "priority": 32,
            "offset": 0,
            "limit": 0,
            "synchronous": True,
        }, timeout=3600.0)
        local = downloaded.get("local") or {}
        local_path = local.get("path")
        if not local_path or not os.path.exists(local_path):
            return b"" if file is bytes else (file or "")

        size = os.path.getsize(local_path)
        if progress_callback:
            maybe = progress_callback(size, size)
            if asyncio.iscoroutine(maybe):
                await maybe

        if file is bytes:
            with open(local_path, "rb") as f:
                return f.read()
        if isinstance(file, str):
            pathlib.Path(file).parent.mkdir(parents=True, exist_ok=True)
            os.replace(local_path, file)
            return file
        return local_path

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _extract_file_id(self, raw: dict[str, Any]) -> Optional[int]:
        content = raw.get("content") or {}
        ctype = content.get("@type")
        if ctype == "messageDocument":
            return (((content.get("document") or {}).get("document") or {}).get("id"))
        if ctype == "messageVideo":
            return (((content.get("video") or {}).get("video") or {}).get("id"))
        if ctype == "messageAudio":
            return (((content.get("audio") or {}).get("audio") or {}).get("id"))
        if ctype == "messagePhoto":
            sizes = ((content.get("photo") or {}).get("sizes") or [])
            if sizes:
                return ((sizes[-1].get("photo") or {}).get("id"))
        return None

    def _adapt_message(self, raw: dict[str, Any]) -> TDLibMessage:
        msg_id = int(raw.get("id", 0))
        chat_id = int(raw.get("chat_id", 0))
        timestamp = raw.get("date") or 0
        date = datetime.fromtimestamp(timestamp, tz=timezone.utc)
        file_meta = self._extract_file_meta(raw)
        return TDLibMessage(id=msg_id, chat_id=chat_id, date=date, raw=raw, file=file_meta)

    def _extract_file_meta(self, raw: dict[str, Any]) -> Optional[TDLibMessageFile]:
        content = raw.get("content") or {}
        ctype = content.get("@type")
        if ctype == "messageDocument":
            doc = content.get("document") or {}
            tdfile = doc.get("document") or {}
            filename = doc.get("file_name") or (content.get("caption") or {}).get("text") or None
            return TDLibMessageFile(
                size=int(tdfile.get("size") or tdfile.get("expected_size") or 0),
                mime_type=doc.get("mime_type"),
                attributes=[SimpleNamespace(file_name=filename)],
                file_id=tdfile.get("id"),
                local_path=(tdfile.get("local") or {}).get("path"),
            )
        if ctype == "messageVideo":
            video = content.get("video") or {}
            tdfile = video.get("video") or {}
            filename = video.get("file_name") or (content.get("caption") or {}).get("text") or None
            return TDLibMessageFile(
                size=int(tdfile.get("size") or tdfile.get("expected_size") or 0),
                mime_type=video.get("mime_type"),
                attributes=[SimpleNamespace(file_name=filename)],
                file_id=tdfile.get("id"),
                local_path=(tdfile.get("local") or {}).get("path"),
            )
        if ctype == "messageAudio":
            audio = content.get("audio") or {}
            tdfile = audio.get("audio") or {}
            filename = audio.get("file_name") or (content.get("caption") or {}).get("text") or None
            return TDLibMessageFile(
                size=int(tdfile.get("size") or tdfile.get("expected_size") or 0),
                mime_type=audio.get("mime_type"),
                attributes=[SimpleNamespace(file_name=filename)],
                file_id=tdfile.get("id"),
                local_path=(tdfile.get("local") or {}).get("path"),
            )
        if ctype == "messagePhoto":
            sizes = ((content.get("photo") or {}).get("sizes") or [])
            size_obj = sizes[-1] if sizes else {}
            tdfile = size_obj.get("photo") or {}
            return TDLibMessageFile(
                size=int(tdfile.get("size") or tdfile.get("expected_size") or 0),
                mime_type="image/jpeg",
                attributes=[],
                file_id=tdfile.get("id"),
                local_path=(tdfile.get("local") or {}).get("path"),
            )
        return None


# ---------------------------------------------------------------------------
# Module-level singleton — outside the TDLibClient class
# ---------------------------------------------------------------------------
_client_instance: Optional[TDLibClient] = None


def get_tdlib_client() -> TDLibClient:
    """Return the shared TDLibClient singleton.

    Creates the instance on first call. All subsequent calls return the
    same object so only one receiver loop ever runs.
    """
    global _client_instance
    if _client_instance is None:
        _client_instance = TDLibClient()
    return _client_instance