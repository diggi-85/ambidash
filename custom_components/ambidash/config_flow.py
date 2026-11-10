"""Config flow: one click, one entry; the options hold the switch for photos from the internet."""

from __future__ import annotations

from typing import Any

import voluptuous as vol

from homeassistant.config_entries import ConfigEntry, ConfigFlow, ConfigFlowResult, OptionsFlow
from homeassistant.core import callback

from .const import CONF_EXTERNAL_PHOTOS, DOMAIN


class AmbidashConfigFlow(ConfigFlow, domain=DOMAIN):
    """Nothing to configure at setup; `single_config_entry` in the manifest rejects a second entry."""

    VERSION = 1

    @staticmethod
    @callback
    def async_get_options_flow(config_entry: ConfigEntry) -> OptionsFlow:
        return AmbidashOptionsFlow()

    async def async_step_user(self, user_input: dict[str, Any] | None = None) -> ConfigFlowResult:
        if user_input is not None:
            return self.async_create_entry(title="Ambidash", data={})
        return self.async_show_form(step_id="user")


class AmbidashOptionsFlow(OptionsFlow):
    """One switch: may Home Assistant fetch placeholder photos from the internet for dashboards that ask for them?"""

    async def async_step_init(self, user_input: dict[str, Any] | None = None) -> ConfigFlowResult:
        if user_input is not None:
            return self.async_create_entry(data=user_input)
        current = self.config_entry.options.get(CONF_EXTERNAL_PHOTOS, True)
        return self.async_show_form(step_id="init", data_schema=vol.Schema({vol.Required(CONF_EXTERNAL_PHOTOS, default=current): bool}))
