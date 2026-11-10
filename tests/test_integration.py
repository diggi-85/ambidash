"""Config flow, bundle loading and unloading."""

from __future__ import annotations

from homeassistant.components.frontend import DATA_EXTRA_MODULE_URL
from homeassistant.config_entries import ConfigEntryState
from homeassistant.core import HomeAssistant
from homeassistant.data_entry_flow import FlowResultType
from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.ambidash.const import DOMAIN, FRONTEND_MODULE, URL_BASE


def _bundle_urls(hass: HomeAssistant) -> list[str]:
    return [u for u in hass.data[DATA_EXTRA_MODULE_URL].urls if u.startswith(f"{URL_BASE}/{FRONTEND_MODULE}")]


async def test_config_flow_creates_one_entry_and_rejects_a_second(hass: HomeAssistant) -> None:
    result = await hass.config_entries.flow.async_init(DOMAIN, context={"source": "user"})
    assert result["type"] is FlowResultType.FORM

    result = await hass.config_entries.flow.async_configure(result["flow_id"], {})
    assert result["type"] is FlowResultType.CREATE_ENTRY

    second = await hass.config_entries.flow.async_init(DOMAIN, context={"source": "user"})
    assert second["type"] is FlowResultType.ABORT
    assert second["reason"] == "single_instance_allowed"


async def test_setup_loads_the_bundle_and_unload_removes_it(hass: HomeAssistant) -> None:
    entry = MockConfigEntry(domain=DOMAIN)
    entry.add_to_hass(hass)

    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()
    assert entry.state is ConfigEntryState.LOADED
    assert len(_bundle_urls(hass)) == 1

    assert await hass.config_entries.async_unload(entry.entry_id)
    await hass.async_block_till_done()
    assert entry.state is ConfigEntryState.NOT_LOADED
    assert _bundle_urls(hass) == []


async def test_reload_does_not_register_the_static_path_twice(hass: HomeAssistant) -> None:
    entry = MockConfigEntry(domain=DOMAIN)
    entry.add_to_hass(hass)
    assert await hass.config_entries.async_setup(entry.entry_id)

    assert await hass.config_entries.async_reload(entry.entry_id)
    await hass.async_block_till_done()
    assert entry.state is ConfigEntryState.LOADED
    assert len(_bundle_urls(hass)) == 1
