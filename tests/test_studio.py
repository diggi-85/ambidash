"""The Studio's backend: what may be saved, storage with a way back, the WebSocket commands and the sidebar panel."""

from __future__ import annotations

from typing import Any

import pytest
import voluptuous as vol
from homeassistant.components.frontend import DATA_PANELS
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers.dispatcher import async_dispatcher_connect
from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.ambidash.const import DATA_STORE, DOMAIN, PANEL_URL, SIGNAL_CONFIG_UPDATED, STORAGE_KEY
from custom_components.ambidash.store import AmbidashStore
from custom_components.ambidash.validation import CURRENT_VERSION, default_config, describe, migrate, validate_config

KITCHEN = {"id": "kueche", "name": "Küche", "options": {"design": "glass", "mode": "dark", "background": {"gradient": ["#1a2a6c", "#b21f1f"], "angle": 160}}}
HALL = {"id": "flur", "name": "Flur", "options": {"design": "paper"}}


def _config(*dashboards: dict[str, Any]) -> dict[str, Any]:
    return {"version": CURRENT_VERSION, "dashboards": list(dashboards)}


# ── what may be saved ─────────────────────────────────────────────────────────────────────────────────────────────


def test_a_dashboard_without_options_gets_empty_ones_and_a_trimmed_name() -> None:
    assert validate_config(_config({"id": "kueche", "name": "  Küche "})) == _config({"id": "kueche", "name": "Küche", "options": {}})


def test_a_realistic_dashboard_is_accepted_as_it_is() -> None:
    assert validate_config(_config(KITCHEN)) == _config(KITCHEN)


@pytest.mark.parametrize(
    ("raw", "where"),
    [
        (_config({"id": "Küche", "name": "x"}), "dashboards → 0 → id"),
        (_config({"id": "a", "name": ""}), "dashboards → 0 → name"),
        (_config({"id": "a", "name": "A", "options": {"desing": "glass"}}), "dashboards → 0 → options → desing"),
        (_config({"id": "a", "name": "A", "options": {"mode": "sepia"}}), "dashboards → 0 → options → mode"),
        (_config({"id": "a", "name": "A", "options": {"accent": "red;}"}}), "dashboards → 0 → options → accent"),
        (_config({"id": "a", "name": "A", "options": {"background": {"blur": 99}}}), "dashboards → 0 → options → background → blur"),
        (_config({"id": "a", "name": "A", "options": {"background": {"image": 'x"y'}}}), "dashboards → 0 → options → background → image"),
        (_config({"id": "a", "name": "A"}, {"id": "a", "name": "B"}), "dashboards"),
    ],
)
def test_what_is_wrong_is_named_with_its_place(raw: dict[str, Any], where: str) -> None:
    with pytest.raises(vol.Invalid) as err:
        validate_config(raw)
    assert where in describe(err.value)


PAGE = {
    "id": "page-1",
    "name": "Home",
    "items": [{"id": "h1", "type": "heading", "text": "Küche"}, {"id": "t1", "type": "tile", "entity": "light.lamp"}, {"id": "s1", "type": "summary"}],
    "layouts": {"tablet": {"h1": [0, 0, 8, 1], "t1": [0, 1, 2, 2]}, "phone": {"t1": [0, 1, 2, 2]}},
}


def _with_pages(*pages: dict[str, Any]) -> dict[str, Any]:
    return _config({"id": "a", "name": "A", "options": {"pages": list(pages)}})


def test_pages_with_items_and_placements_are_accepted_and_filled_in() -> None:
    assert validate_config(_with_pages(PAGE)) == _with_pages(PAGE)
    acting = {**PAGE, "layouts": {}, "items": [{"id": "t1", "type": "tile", "entity": "light.x", "tap": "popup", "hold": "more-info"}, {"id": "t2", "type": "tile", "entity": "scene.y", "tap": "none"}]}
    assert validate_config(_with_pages(acting)) == _with_pages(acting)
    bare = validate_config(_with_pages({"id": "p", "name": "P"}))
    assert bare["dashboards"][0]["options"]["pages"] == [{"id": "p", "name": "P", "items": [], "layouts": {}}]


@pytest.mark.parametrize(
    ("page", "where"),
    [
        ({**PAGE, "items": [{"id": "t1", "type": "tile"}]}, "pages → 0 → items → 0 → entity"),
        ({**PAGE, "items": [{"id": "h1", "type": "heading"}]}, "pages → 0 → items → 0 → text"),
        ({**PAGE, "items": [{"id": "t1", "type": "tile", "entity": "Light.Lamp"}]}, "pages → 0 → items → 0 → entity"),
        ({**PAGE, "items": [{"id": "t1", "type": "gauge"}]}, "pages → 0 → items → 0 → type"),
        ({**PAGE, "items": [{"id": "t1", "type": "tile", "entity": "light.x", "tap": "explode"}]}, "pages → 0 → items → 0 → tap"),
        ({**PAGE, "items": [{"id": "t1", "type": "tile", "entity": "light.x", "hold": ""}]}, "pages → 0 → items → 0 → hold"),
        ({**PAGE, "items": PAGE["items"] + [{"id": "t1", "type": "tile", "entity": "light.x"}]}, "pages → 0 → items"),
        ({**PAGE, "layouts": {"tablet": {"zz": [0, 0, 2, 2]}}}, "pages → 0 → layouts → tablet"),
        ({**PAGE, "layouts": {"tablet": {"t1": [0, 0, 2]}}}, "pages → 0 → layouts → tablet → t1"),
        ({**PAGE, "layouts": {"tablet": {"t1": [0, 0, 2, True]}}}, "pages → 0 → layouts → tablet → t1"),
        ({**PAGE, "layouts": {"tablet": {"t1": [0, 0, 2, 999]}}}, "pages → 0 → layouts → tablet → t1"),
        ({**PAGE, "layouts": {"tv": {"t1": [0, 0, 2, 2]}}}, "pages → 0 → layouts"),
        ({**PAGE, "id": "Seite 1"}, "pages → 0 → id"),
    ],
)
def test_a_broken_page_is_named_with_its_place(page: dict[str, Any], where: str) -> None:
    with pytest.raises(vol.Invalid) as err:
        validate_config(_with_pages(page))
    assert where in describe(err.value)


def test_page_ids_must_be_unique_and_there_are_not_too_many() -> None:
    with pytest.raises(vol.Invalid):
        validate_config(_with_pages(PAGE, PAGE))
    with pytest.raises(vol.Invalid):
        validate_config(_with_pages(*[{"id": f"p{i}", "name": "P"} for i in range(31)]))


@pytest.mark.parametrize("raw", ["text", [], {"version": 1, "dashboards": {}}, {"version": 1, "dashboards": [], "extra": 1}])
def test_the_wrong_shape_is_refused(raw: Any) -> None:
    with pytest.raises(vol.Invalid):
        validate_config(raw)


def test_data_without_a_version_counts_as_version_one_and_newer_data_is_refused() -> None:
    assert migrate({"dashboards": []})["version"] == 1
    for version in (0, CURRENT_VERSION + 1, "1"):
        with pytest.raises(vol.Invalid):
            validate_config({"version": version, "dashboards": []})


# ── storage with a way back ───────────────────────────────────────────────────────────────────────────────────────


async def test_the_store_starts_empty_saves_keeps_the_way_back_and_announces_changes(hass: HomeAssistant, hass_storage: dict[str, Any]) -> None:
    store = AmbidashStore(hass)
    await store.async_load()
    assert store.config == default_config()
    assert not store.has_previous

    seen: list[dict[str, Any]] = []

    @callback
    def collect(config: dict[str, Any]) -> None:
        seen.append(config)

    async_dispatcher_connect(hass, SIGNAL_CONFIG_UPDATED, collect)

    await store.async_save(_config(KITCHEN))
    await hass.async_block_till_done()
    assert hass_storage[STORAGE_KEY]["data"] == _config(KITCHEN)
    assert hass_storage[f"{STORAGE_KEY}.previous"]["data"] == default_config()
    assert store.has_previous
    assert seen == [_config(KITCHEN)]

    await store.async_save(_config(KITCHEN))  # nothing changed: nothing written, nothing announced
    await hass.async_block_till_done()
    assert seen == [_config(KITCHEN)]
    assert hass_storage[f"{STORAGE_KEY}.previous"]["data"] == default_config()


async def test_an_invalid_save_changes_nothing(hass: HomeAssistant, hass_storage: dict[str, Any]) -> None:
    store = AmbidashStore(hass)
    await store.async_load()
    await store.async_save(_config(KITCHEN))
    with pytest.raises(vol.Invalid):
        await store.async_save(_config({"id": "x", "name": "X", "options": {"mode": "sepia"}}))
    assert store.config == _config(KITCHEN)
    assert hass_storage[STORAGE_KEY]["data"] == _config(KITCHEN)


async def test_restoring_the_previous_version_can_itself_be_undone(hass: HomeAssistant, hass_storage: dict[str, Any]) -> None:
    store = AmbidashStore(hass)
    await store.async_load()
    with pytest.raises(vol.Invalid):
        await store.async_restore_previous()
    await store.async_save(_config(KITCHEN))
    await store.async_save(_config(KITCHEN, HALL))
    assert (await store.async_restore_previous()) == _config(KITCHEN)
    assert (await store.async_restore_previous()) == _config(KITCHEN, HALL)


async def test_saved_data_is_loaded_and_unreadable_data_is_kept_as_the_way_back(hass: HomeAssistant, hass_storage: dict[str, Any]) -> None:
    hass_storage[STORAGE_KEY] = {"version": 1, "key": STORAGE_KEY, "data": _config(KITCHEN)}
    store = AmbidashStore(hass)
    await store.async_load()
    assert store.config == _config(KITCHEN)

    broken = {"version": 1, "dashboards": [{"id": "Kaputt!", "name": "x"}]}
    hass_storage[STORAGE_KEY] = {"version": 1, "key": STORAGE_KEY, "data": broken}
    other = AmbidashStore(hass)
    await other.async_load()
    assert other.config == default_config()
    assert other.has_previous
    assert hass_storage[f"{STORAGE_KEY}.previous"]["data"] == broken


# ── commands and panel ────────────────────────────────────────────────────────────────────────────────────────────


async def _setup(hass: HomeAssistant) -> MockConfigEntry:
    entry = MockConfigEntry(domain=DOMAIN)
    entry.add_to_hass(hass)
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()
    return entry


async def test_the_commands_read_save_and_restore(hass: HomeAssistant, hass_ws_client, hass_storage: dict[str, Any]) -> None:
    await _setup(hass)
    client = await hass_ws_client(hass)

    await client.send_json_auto_id({"type": "ambidash/config/get"})
    assert (await client.receive_json())["result"] == {"config": default_config(), "has_previous": False}

    await client.send_json_auto_id({"type": "ambidash/config/save", "config": _config(KITCHEN)})
    msg = await client.receive_json()
    assert msg["success"]
    assert msg["result"] == {"config": _config(KITCHEN), "has_previous": True}
    assert hass.data[DATA_STORE].config == _config(KITCHEN)

    await client.send_json_auto_id({"type": "ambidash/config/save", "config": _config({"id": "a", "name": "A", "options": {"desing": "x"}})})
    msg = await client.receive_json()
    assert not msg["success"]
    assert msg["error"]["code"] == "invalid_config"
    assert "dashboards → 0 → options → desing" in msg["error"]["message"]

    await client.send_json_auto_id({"type": "ambidash/config/restore_previous"})
    assert (await client.receive_json())["result"]["config"] == default_config()


async def test_everybody_can_read_but_only_an_admin_can_change(hass: HomeAssistant, hass_ws_client, hass_read_only_access_token: str) -> None:
    await _setup(hass)
    client = await hass_ws_client(hass, hass_read_only_access_token)
    await client.send_json_auto_id({"type": "ambidash/config/get"})
    assert (await client.receive_json())["success"]
    await client.send_json_auto_id({"type": "ambidash/config/save", "config": _config(KITCHEN)})
    msg = await client.receive_json()
    assert not msg["success"]
    assert msg["error"]["code"] == "unauthorized"
    await client.send_json_auto_id({"type": "ambidash/config/restore_previous"})
    assert (await client.receive_json())["error"]["code"] == "unauthorized"
    assert hass.data[DATA_STORE].config == default_config()


async def test_a_subscriber_gets_the_current_configuration_and_every_change(hass: HomeAssistant, hass_ws_client) -> None:
    await _setup(hass)
    client = await hass_ws_client(hass)
    await client.send_json_auto_id({"type": "ambidash/config/subscribe"})
    first = await client.receive_json()
    assert first["success"]
    assert (await client.receive_json())["event"] == {"config": default_config()}

    await hass.data[DATA_STORE].async_save(_config(KITCHEN))
    assert (await client.receive_json())["event"] == {"config": _config(KITCHEN)}


async def test_the_studio_is_an_admin_only_sidebar_panel_and_goes_with_the_entry(hass: HomeAssistant) -> None:
    entry = await _setup(hass)
    panel = hass.data[DATA_PANELS][PANEL_URL]
    assert panel.require_admin
    assert panel.sidebar_title == "Ambidash"
    assert panel.config["_panel_custom"]["name"] == "ambidash-studio"
    assert "studio.js?v=" in panel.config["_panel_custom"]["module_url"]

    assert await hass.config_entries.async_unload(entry.entry_id)
    await hass.async_block_till_done()
    assert PANEL_URL not in hass.data[DATA_PANELS]
    assert DATA_STORE not in hass.data
