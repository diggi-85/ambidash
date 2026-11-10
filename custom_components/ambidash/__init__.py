"""Ambidash: a dashboard strategy for Home Assistant (floors, areas, tiles, designs).

The integration only ships the frontend bundle and loads it on every page; the strategy and the
cards must be defined before a dashboard asks for them.
"""

from __future__ import annotations

from pathlib import Path

from homeassistant.components import frontend
from homeassistant.components.http import StaticPathConfig
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers import config_validation as cv
from homeassistant.helpers.typing import ConfigType

from .const import DATA_STATIC_REGISTERED, DATA_STORE, DOMAIN, FRONTEND_MODULE, URL_BASE
from .panel import async_register_panel, async_remove_panel
from .photos import async_setup_photos
from .store import AmbidashStore
from .websocket import async_register_commands

CONFIG_SCHEMA = cv.config_entry_only_config_schema(DOMAIN)

FRONTEND_DIR = Path(__file__).parent / "frontend"


def _bundle_version() -> str:
    """Bundle modification time as cache key, so an update reaches every client at once."""
    try:
        return str(int((FRONTEND_DIR / FRONTEND_MODULE).stat().st_mtime))
    except OSError:
        return "0"


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Serve the bundle and load it on every frontend page."""
    if not hass.data.get(DATA_STATIC_REGISTERED):
        await hass.http.async_register_static_paths([StaticPathConfig(URL_BASE, str(FRONTEND_DIR), cache_headers=False)])
        hass.data[DATA_STATIC_REGISTERED] = True
    url = f"{URL_BASE}/{FRONTEND_MODULE}?v={await hass.async_add_executor_job(_bundle_version)}"
    frontend.add_extra_js_url(hass, url)
    entry.async_on_unload(lambda: frontend.remove_extra_js_url(hass, url))
    async_setup_photos(hass, entry)

    store = AmbidashStore(hass)
    await store.async_load()
    hass.data[DATA_STORE] = store
    async_register_commands(hass)
    await async_register_panel(hass)

    def remove_studio() -> None:
        hass.data.pop(DATA_STORE, None)
        async_remove_panel(hass)

    entry.async_on_unload(remove_studio)
    return True


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Nothing to tear down: the JS URL is removed by the unload callback, static paths stay until restart."""
    return True
