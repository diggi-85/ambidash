"""Constants for Ambidash."""

from __future__ import annotations

from typing import Final

DOMAIN: Final = "ambidash"
URL_BASE: Final = "/ambidash_static"
FRONTEND_MODULE: Final = "ambidash.js"
DATA_STATIC_REGISTERED: Final = f"{DOMAIN}_static_registered"

# Placeholder photos: fetched and served by Home Assistant itself, switchable in the integration's options
URL_PHOTOS: Final = "/ambidash_photos"
CONF_EXTERNAL_PHOTOS: Final = "external_photos"
DATA_PHOTOS: Final = f"{DOMAIN}_photos"
DATA_PHOTOS_REGISTERED: Final = f"{DOMAIN}_photos_registered"
ISSUE_PHOTOS_DISABLED: Final = "photos_disabled"

# Studio: sidebar panel for admins, the saved dashboards and their live updates
PANEL_URL: Final = "ambidash"
ELEMENT_STUDIO: Final = "ambidash-studio"
STUDIO_MODULE: Final = "studio.js"
STORAGE_KEY: Final = DOMAIN
STORAGE_VERSION: Final = 1
SIGNAL_CONFIG_UPDATED: Final = f"{DOMAIN}_config_updated"
DATA_STORE: Final = f"{DOMAIN}_store"
DATA_STUDIO_REGISTERED: Final = f"{DOMAIN}_studio_registered"
