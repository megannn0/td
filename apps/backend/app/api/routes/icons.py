"""API routes for icon metadata.

These endpoints expose the available icon packs and their icons. This
allows the frontend to build a user interface for selecting folder
icons without having to hardcode the available options. In later
iterations, icon packs could be dynamically loaded or imported.
"""

from __future__ import annotations

from typing import List

from fastapi import APIRouter

from app.services import icon_service

router = APIRouter(prefix="/icons", tags=["icons"])


@router.get("/packs", response_model=List[str])
def list_icon_packs() -> List[str]:
    """Return the list of available icon pack names."""
    return icon_service.get_icon_packs()


@router.get("/packs/{pack}/icons", response_model=List[str])
def list_icons(pack: str) -> List[str]:
    """Return the list of icons for the specified pack."""
    return icon_service.get_icons_for_pack(pack)