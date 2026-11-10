"""Saves the Studio's dashboards in `.storage/ambidash` and keeps the version before the last save as a way back."""

from __future__ import annotations

import copy
import logging
from typing import Any

import voluptuous as vol

from homeassistant.core import HomeAssistant
from homeassistant.helpers.dispatcher import async_dispatcher_send
from homeassistant.helpers.storage import Store

from .const import SIGNAL_CONFIG_UPDATED, STORAGE_KEY, STORAGE_VERSION
from .validation import default_config, describe, validate_config

_LOGGER = logging.getLogger(__name__)


class AmbidashStore:
    """The saved configuration in memory; every change is checked, written and announced to open dashboards."""

    def __init__(self, hass: HomeAssistant) -> None:
        self.hass = hass
        self._store: Store[dict[str, Any]] = Store(hass, STORAGE_VERSION, STORAGE_KEY)
        # The version before the last save: a way back when a change turns out wrong (also part of every HA backup)
        self._previous: Store[dict[str, Any]] = Store(hass, STORAGE_VERSION, f"{STORAGE_KEY}.previous")
        self.config: dict[str, Any] = default_config()
        self.has_previous = False

    async def async_load(self) -> None:
        data = await self._store.async_load()
        self.has_previous = await self._previous.async_load() is not None
        if data is None:
            return
        try:
            self.config = validate_config(data)
        except vol.Invalid as err:
            # Starting empty is better than not starting; the unreadable data becomes the way back instead of being overwritten
            _LOGGER.error("Ambidash: the saved configuration is invalid (%s); starting empty, the old data is kept as .storage/%s.previous", describe(err), STORAGE_KEY)
            await self._previous.async_save(data)
            self.has_previous = True

    async def _async_replace(self, config: dict[str, Any]) -> None:
        await self._previous.async_save(copy.deepcopy(self.config))
        self.has_previous = True
        self.config = config
        await self._store.async_save(config)
        async_dispatcher_send(self.hass, SIGNAL_CONFIG_UPDATED, config)

    async def async_save(self, raw: Any) -> dict[str, Any]:
        """Check, save and announce a new configuration; raises `vol.Invalid` and changes nothing when it is not valid."""
        config = validate_config(raw)
        if config != self.config:
            await self._async_replace(config)
        return self.config

    async def async_restore_previous(self) -> dict[str, Any]:
        """Swap in the version before the last save (the current one becomes the way back, so this can be undone)."""
        previous = await self._previous.async_load()
        if previous is None:
            raise vol.Invalid("There is no earlier version")
        await self._async_replace(validate_config(previous))
        return self.config
