"""Ambidash spike: serves the frontend bundle and loads it on every HA page (strategy + card must be defined early)."""

from __future__ import annotations

from pathlib import Path

from homeassistant.components import frontend
from homeassistant.components.http import StaticPathConfig
from homeassistant.core import HomeAssistant
from homeassistant.helpers import config_validation as cv
from homeassistant.helpers.typing import ConfigType

DOMAIN = "ambidash"
URL_BASE = "/ambidash_static"

CONFIG_SCHEMA = cv.empty_config_schema(DOMAIN)


async def async_setup(hass: HomeAssistant, config: ConfigType) -> bool:
    await hass.http.async_register_static_paths(
        [StaticPathConfig(URL_BASE, str(Path(__file__).parent / "frontend"), cache_headers=False)]
    )
    frontend.add_extra_js_url(hass, f"{URL_BASE}/ambidash.js")
    return True
