"""Application configuration."""
from __future__ import annotations

from typing import Optional

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Settings for the backend application."""

    # Database
    SQLALCHEMY_DATABASE_URI: str = "sqlite:///./telegram_drive.db"

    # Telegram API credentials
    TELEGRAM_API_ID: Optional[int] = None
    TELEGRAM_API_HASH: Optional[str] = None
    TELEGRAM_PHONE_NUMBER: Optional[str] = None
    TELEGRAM_DATABASE_ENCRYPTION_KEY: Optional[str] = None

    # One-time login fields (remove from .env after first login)
    TELEGRAM_LOGIN_CODE: Optional[str] = None
    TELEGRAM_PASSWORD: Optional[str] = None

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()