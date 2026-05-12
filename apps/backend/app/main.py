"""FastAPI application entry point."""
from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.api import create_api_router
from app.db.base import Base  # noqa: F401 - ensures models are registered
from app.db.session import engine
from app.infrastructure.telegram.tdlib.client import get_tdlib_client
from app.services.transfer_worker import TransferWorker
import logging


def create_database() -> None:
    """Create database tables if they do not already exist."""
    Base.metadata.create_all(bind=engine)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown logic for the application."""
    # 1. Initialize database schema
    create_database()

    # 2. Start the TDLib singleton — authenticates once, runs receiver loop
    client = get_tdlib_client()
    await client.start()
    # Log startup instead of printing
    logging.getLogger(__name__).info("TDLib client ready")

    # Start the background transfer worker.  It will process queued
    # download transfers in the background.  Uploads remain client‑driven.
    worker = TransferWorker()
    worker.start()

    yield  # Application is now running and serving requests

    # Shutdown logic (if needed) goes here

    # Stop the transfer worker gracefully on shutdown.
    await worker.stop()


app = FastAPI(title="Telegram Drive Backend", lifespan=lifespan)

# Include API routes under /api prefix
api_router = create_api_router()
app.include_router(api_router, prefix="/api")


@app.get("/health")
async def health() -> dict[str, str]:
    """Health check endpoint."""
    return {"status": "ok"}