"""API package for the Telegram Drive backend.

This package contains all route definitions and dependency utilities for the
FastAPI backend. Routes are organized by domain and should import any
required service layer functions rather than implementing business logic
directly. See individual modules for more details.
"""

from fastapi import APIRouter


def create_api_router() -> APIRouter:
    """Create and return the top-level API router.

    This function aggregates all route modules into a single router that can
    be included in the main FastAPI application. As the project grows,
    additional routers should be imported and included here.
    """
    router = APIRouter()

    # Import and include sub-routers here. Future iterations may add more
    # routes for files, folders, transfers, etc.
    from .routes import (  # noqa: WPS433 (import inside function)
        settings as settings_routes,
        files as files_routes,
        transfers as transfers_routes,
        stream as stream_routes,
        search as search_routes,
        folders as folders_routes,
        icons as icons_routes,
        sync as sync_routes,
        tags as tags_routes,
        playlists as playlists_routes,
        virtual_folders as virtual_folders_routes,
        thumbnails as thumbnails_routes,
    )

    router.include_router(settings_routes.router)
    router.include_router(files_routes.router)
    router.include_router(transfers_routes.router)
    router.include_router(stream_routes.router)
    router.include_router(search_routes.router)
    # New routers for folders and icons
    router.include_router(folders_routes.router)
    router.include_router(icons_routes.router)
    router.include_router(sync_routes.router)
    # Additional routers introduced in Phase 3
    router.include_router(tags_routes.router)
    router.include_router(playlists_routes.router)
    router.include_router(virtual_folders_routes.router)
    router.include_router(thumbnails_routes.router)
    return router