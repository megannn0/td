"""Background worker for processing queued download transfers.

The Telegram Drive backend originally executed uploads and downloads
directly within the request handlers.  This meant that pausing,
resuming and retrying only affected the database state and did not
automatically restart a failed download.  To provide a minimal form
of queue processing for download transfers, this module defines a
``TransferWorker`` class that monitors the database for queued or
retrying download jobs and processes them one at a time.

Important limitations
---------------------

* Only download transfers are handled by the worker.  Uploads require
  access to the local file path, which is not stored in the database.
  Clients must therefore initiate uploads themselves via the
  ``/api/files/upload`` endpoint.  Pausing, cancelling or retrying
  uploads still update the transfer state in the database; the
  underlying upload loop periodically checks these flags and acts
  accordingly.

* The worker currently marks the original transfer as ``downloading``
  and increments its ``attempts`` count when processing begins.  The
  download is executed by delegating to
  ``download_service.start_download``, which creates a separate
  transfer record for the actual download process.  Upon completion,
  the worker refreshes the original transfer and leaves its final
  status as written by the download service (``completed`` or
  ``failed``).  No attempt is made to merge the two records.  This
  behaviour may result in duplicate transfer entries representing
  distinct runs of the same logical download.  Clients should
  interpret the most recent transfer as authoritative.

* Exponential backoff is implemented by populating the ``pause_until``
  field on the transfer after a failure.  The worker honours this
  timestamp by skipping over transfers whose pause deadline lies in
  the future.  The backoff schedule follows the V7.0 specification
  (5 s, 15 s, 45 s).  After the third failure the transfer remains in
  the ``failed`` state and will not be retried automatically.
"""

from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timedelta, timezone
from typing import Optional

from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.domain.transfers.models import Transfer
from app.services import download_service


class TransferWorker:
    """Background worker for queued download transfers.

    Instantiate this class and call :meth:`start` during application
    startup to begin processing queued downloads.  The worker runs
    indefinitely until cancelled.
    """

    def __init__(self, concurrency: int = 1) -> None:
        self.concurrency = concurrency
        self.logger = logging.getLogger(__name__)
        self._tasks: list[asyncio.Task[None]] = []
        self._shutdown = asyncio.Event()

    def start(self) -> None:
        """Launch one or more concurrent worker tasks.

        This method should be called from the application startup
        coroutine.  The tasks are stored internally and will continue
        running until :meth:`stop` is invoked.
        """
        for idx in range(self.concurrency):
            task = asyncio.create_task(self._worker_loop(idx), name=f"transfer-worker-{idx}")
            self._tasks.append(task)
        self.logger.info("Started %s transfer worker(s)", self.concurrency)

    async def stop(self) -> None:
        """Signal the worker to shut down and cancel running tasks."""
        self._shutdown.set()
        for task in self._tasks:
            task.cancel()
        await asyncio.gather(*self._tasks, return_exceptions=True)
        self.logger.info("Transfer worker stopped")

    async def _worker_loop(self, idx: int) -> None:
        """Continuously poll for queued download transfers and process them."""
        # Each worker maintains its own database session to avoid cross‑thread
        # conflicts.  Sessions are scoped to the loop iteration and closed
        # after each run to free resources.
        while not self._shutdown.is_set():
            # Use a short sleep to avoid busy‑waiting when there is no work.
            await asyncio.sleep(1)
            session: Optional[Session] = None
            try:
                session = SessionLocal()
                # Find the next queued or retrying download transfer that is
                # eligible for processing.  Skip transfers that are paused
                # until a future time.  Order by priority (descending) and
                # queue_position (ascending), treating None as last.
                now = datetime.now(timezone.utc)
                # Acquire the next eligible transfer using a row‑level lock.  Using
                # ``with_for_update`` ensures that concurrent workers do not pick the
                # same transfer.  Other sessions will block until the current
                # transaction commits, at which point the transfer's status will have
                # been updated to ``downloading``.  This prevents duplicate
                # processing of the same job.  Some backends (e.g. SQLite) do not
                # implement fine‑grained row locking; in those cases the lock acts
                # at the table level but still serialises access to the queue.
                query = (
                    session.query(Transfer)
                    .filter(
                        Transfer.type == "download",
                        Transfer.status.in_(["queued", "retrying"]),
                        (Transfer.pause_until.is_(None) | (Transfer.pause_until <= now)),
                    )
                    .order_by(
                        Transfer.priority.desc(),
                        Transfer.queue_position.is_(None),
                        Transfer.queue_position.asc(),
                    )
                )
                try:
                    transfer = query.with_for_update().first()
                except Exception:
                    # Fallback in case the database dialect does not support row
                    # locking.  Without the lock there is a small window during
                    # which two workers might select the same transfer; however,
                    # subsequent status changes will prevent duplicate processing.
                    transfer = query.first()
                if not transfer:
                    continue
                # Mark as downloading and increment attempts
                transfer.status = "downloading"
                attempts = (transfer.attempts or 0) + 1
                transfer.attempts = attempts
                session.commit()
                session.refresh(transfer)
                # Attempt the download.  Any exceptions are caught to
                # implement backoff and status updates.
                self.logger.info(
                    "Worker %s: starting download transfer %s (attempt %s)", idx, transfer.id, attempts
                )
                try:
                    # Delegate to the download service.  This will create a
                    # separate transfer record and perform the download.
                    await download_service.start_download(
                        session,
                        transfer.file_id,
                        destination_dir=None,
                        transfer=transfer,
                    )
                    # On success, the download service will update the
                    # provided transfer record.  Refresh to ensure the
                    # latest state is loaded.
                    session.refresh(transfer)
                    self.logger.info(
                        "Worker %s: completed download transfer %s", idx, transfer.id
                    )
                except Exception as exc:  # pragma: no cover - broad catch for robustness
                    # On error, determine whether to retry or fail
                    self.logger.error(
                        "Worker %s: download transfer %s failed: %s", idx, transfer.id, exc
                    )
                    # Refresh to avoid stale state
                    session.refresh(transfer)
                    # If the transfer was cancelled by the user, leave its
                    # status untouched.  Otherwise mark as failed or queued
                    # for retry based on attempt count.
                    if transfer.status != "cancelled":
                        if attempts >= 3:
                            transfer.status = "failed"
                            session.commit()
                        else:
                            # Calculate backoff delay based on attempt number
                            delay_map = {1: 5, 2: 15, 3: 45}
                            delay = delay_map.get(attempts, 45)
                            transfer.status = "queued"
                            transfer.pause_until = datetime.now(timezone.utc) + timedelta(seconds=delay)
                            session.commit()
                            self.logger.info(
                                "Worker %s: will retry download transfer %s after %ss",
                                idx,
                                transfer.id,
                                delay,
                            )
            except Exception as exc:  # pragma: no cover - log unexpected errors
                self.logger.error("Worker %s encountered error: %s", idx, exc)
            finally:
                if session is not None:
                    session.close()