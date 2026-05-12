"""Service functions for icon metadata.

The icon service exposes a simple registry of built‑in icon packs and
their associated icon names. These values are used by the desktop
application to populate icon selection menus. In a future version,
additional packs could be loaded dynamically or imported by the user.
"""

from __future__ import annotations

from typing import Dict, List


# Define a basic registry of icon packs. Keys are pack names and values
# are lists of icon identifiers. The frontend is responsible for
# rendering these icons using an appropriate library (e.g., react‑icons).
# Only a small subset of icons is provided here for demonstration.
ICON_REGISTRY: Dict[str, List[str]] = {
    "default": [
        "folder",
        "documents",
        "download",
        "music",
        "picture",
        "video",
        "archive",
        "code",
        "star",
        "heart",
    ],
    "shapes": [
        "circle",
        "square",
        "triangle",
        "pentagon",
        "hexagon",
    ],
}


def get_icon_packs() -> List[str]:
    """Return a list of available icon pack names."""
    return list(ICON_REGISTRY.keys())


def get_icons_for_pack(pack: str) -> List[str]:
    """Return the list of icon names for a given pack.

    If the pack does not exist, an empty list is returned. The caller
    should handle unknown packs appropriately.
    """
    return ICON_REGISTRY.get(pack, [])