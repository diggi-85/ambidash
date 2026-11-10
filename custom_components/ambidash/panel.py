"""The Studio's entry in the sidebar: an admin-only panel whose script loads only when it is opened."""

from __future__ import annotations

from pathlib import Path

from homeassistant.components import frontend, panel_custom
from homeassistant.core import HomeAssistant, callback

from .const import ELEMENT_STUDIO, PANEL_URL, STUDIO_MODULE, URL_BASE

_STUDIO_FILE = Path(__file__).parent / "frontend" / STUDIO_MODULE


def _version() -> str:
    """The script's modification time as cache key, so an update reaches the browser at once."""
    try:
        return str(int(_STUDIO_FILE.stat().st_mtime))
    except OSError:
        return "0"


async def async_register_panel(hass: HomeAssistant) -> None:
    version = await hass.async_add_executor_job(_version)
    await panel_custom.async_register_panel(
        hass,
        frontend_url_path=PANEL_URL,
        webcomponent_name=ELEMENT_STUDIO,
        sidebar_title="Ambidash",
        sidebar_icon="mdi:view-dashboard-edit",
        module_url=f"{URL_BASE}/{STUDIO_MODULE}?v={version}",
        require_admin=True,
    )


@callback
def async_remove_panel(hass: HomeAssistant) -> None:
    frontend.async_remove_panel(hass, PANEL_URL, warn_if_unknown=False)
