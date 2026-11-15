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
    cards = {
        **PAGE,
        "layouts": {},
        "items": [
            {"id": "c1", "type": "card", "card": {"type": "tile", "entity": "light.x", "tap_action": {"action": "toggle"}}},
            {"id": "c2", "type": "card", "card": {"type": "custom:bubble-card", "sub_button": [{"entity": "light.y"}], "styles": "a {\n  b: c;\n}\n"}},
        ],
    }
    assert validate_config(_with_pages(cards)) == _with_pages(cards)
    widgets = {
        **PAGE,
        "layouts": {},
        "items": [
            {"id": "k1", "type": "clock"},
            {"id": "k2", "type": "clock", "format": "24", "seconds": True, "date": False},
            {"id": "w1", "type": "weather", "entity": "weather.home"},
            {"id": "w2", "type": "weather", "entity": "weather.home", "forecast": False},
        ],
    }
    assert validate_config(_with_pages(widgets)) == _with_pages(widgets)
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
        ({**PAGE, "items": [{"id": "c1", "type": "card"}]}, "pages → 0 → items → 0 → card"),
        ({**PAGE, "items": [{"id": "c1", "type": "card", "card": "tile"}]}, "pages → 0 → items → 0 → card"),
        ({**PAGE, "items": [{"id": "c1", "type": "card", "card": {"entity": "light.x"}}]}, "pages → 0 → items → 0 → card → type"),
        ({**PAGE, "items": [{"id": "c1", "type": "card", "card": {"type": "Custom:X y"}}]}, "pages → 0 → items → 0 → card → type"),
        ({**PAGE, "items": [{"id": "c1", "type": "card", "card": {"type": "markdown", "content": "x" * 20001}}]}, "pages → 0 → items → 0 → card"),
        ({**PAGE, "items": [{"id": "c1", "type": "card", "card": {"type": "markdown", "n": float("nan")}}]}, "pages → 0 → items → 0 → card"),
        ({**PAGE, "items": [{"id": "t1", "type": "tile", "entity": "light.x", "card": {"type": "tile"}}]}, "pages → 0 → items → 0 → card"),
        ({**PAGE, "items": [{"id": "w1", "type": "weather"}]}, "pages → 0 → items → 0 → entity"),
        ({**PAGE, "items": [{"id": "w1", "type": "weather", "entity": "light.x"}]}, "pages → 0 → items → 0 → entity"),
        ({**PAGE, "items": [{"id": "k1", "type": "clock", "format": "13"}]}, "pages → 0 → items → 0 → format"),
        ({**PAGE, "items": [{"id": "k1", "type": "clock", "seconds": "yes"}]}, "pages → 0 → items → 0 → seconds"),
        ({**PAGE, "items": [{"id": "k1", "type": "clock", "forecast": True}]}, "pages → 0 → items → 0 → forecast"),
        ({**PAGE, "items": [{"id": "w1", "type": "weather", "entity": "weather.home", "seconds": True}]}, "pages → 0 → items → 0 → seconds"),
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


CONDITIONS = [
    {"condition": "state", "entity": "binary_sensor.door", "state": "on"},
    {"condition": "not_state", "entity": "light.x", "state": ["off", "unavailable"], "attribute": "mode"},
    {"condition": "numeric", "entity": "sensor.temp", "above": 20, "below": 25.5},
    {"condition": "time", "after": "22:00", "before": "05:00"},
    {"condition": "time", "after": "8:00"},
    {"condition": "device", "devices": ["wall", "tablet"]},
    {"condition": "or", "conditions": [{"condition": "time", "before": "11:00"}, {"condition": "not", "conditions": [{"condition": "device", "devices": ["phone"]}]}]},
]


def _nested(levels: int) -> dict[str, Any]:
    condition: dict[str, Any] = {"condition": "time", "after": "08:00"}
    for _ in range(levels):
        condition = {"condition": "and", "conditions": [condition]}
    return condition


def test_conditions_on_items_are_accepted_as_they_are() -> None:
    items = [{"id": f"h{i}", "type": "heading", "text": "x", "show_if": [c]} for i, c in enumerate(CONDITIONS)]
    items += [{"id": "t9", "type": "tile", "entity": "light.x", "show_if": CONDITIONS[:3]}, {"id": "k9", "type": "clock", "show_if": [_nested(3)]}]
    page = {**PAGE, "layouts": {}, "items": items}
    assert validate_config(_with_pages(page)) == _with_pages(page)


@pytest.mark.parametrize(
    ("show_if", "where"),
    [
        ([], "items → 0 → show_if"),
        ("on", "items → 0 → show_if"),
        (["on"], "show_if → 0"),
        ([{"condition": "weekday"}], "show_if → 0 → condition"),
        ([{"entity": "light.x"}], "show_if → 0 → condition"),
        ([{"condition": "state", "entity": "Light.X", "state": "on"}], "show_if → 0 → entity"),
        ([{"condition": "state", "entity": "light.x"}], "show_if → 0 → state"),
        ([{"condition": "state", "entity": "light.x", "state": []}], "show_if → 0 → state"),
        ([{"condition": "state", "entity": "light.x", "state": "on", "extra": 1}], "show_if → 0"),
        ([{"condition": "numeric", "entity": "sensor.t"}], "show_if → 0 → above"),
        ([{"condition": "numeric", "entity": "sensor.t", "above": "5"}], "show_if → 0 → above"),
        ([{"condition": "numeric", "entity": "sensor.t", "above": True}], "show_if → 0 → above"),
        ([{"condition": "numeric", "entity": "sensor.t", "below": float("nan")}], "show_if → 0 → below"),
        ([{"condition": "time"}], "show_if → 0 → after"),
        ([{"condition": "time", "after": "25:00"}], "show_if → 0 → after"),
        ([{"condition": "time", "before": "8:5"}], "show_if → 0 → before"),
        ([{"condition": "device", "devices": []}], "show_if → 0 → devices"),
        ([{"condition": "device", "devices": ["tv"]}], "show_if → 0 → devices"),
        ([{"condition": "and", "conditions": []}], "show_if → 0 → conditions"),
        ([{"condition": "not", "conditions": [{"condition": "time"}]}], "show_if → 0 → conditions → 0 → after"),
        ([{"condition": "time", "after": "08:00"}] * 11, "items → 0 → show_if"),
        ([_nested(4)], "nested"),
        ([{"condition": "state", "entity": "light.x", "state": ["x" * 120] * 20}] * 2, "at most 4000"),
    ],
)
def test_broken_conditions_are_named_with_their_place(show_if: Any, where: str) -> None:
    page = {**PAGE, "layouts": {}, "items": [{"id": "h1", "type": "heading", "text": "x", "show_if": show_if}]}
    with pytest.raises(vol.Invalid) as err:
        validate_config(_with_pages(page))
    assert where in describe(err.value)


_WHEN = [{"condition": "state", "entity": "light.x", "state": "on"}]


def test_state_rules_on_tiles_are_accepted_as_they_are() -> None:
    rules = [
        {"when": [{"condition": "state", "entity": "binary_sensor.door", "state": "on"}], "color": "alert", "icon": "mdi:door-open", "status": "Open"},
        {"when": [{"condition": "numeric", "entity": "sensor.temp", "above": 25}], "color": "good"},
        {"when": [{"condition": "time", "after": "22:00"}], "status": "Night"},
        {"when": [{"condition": "device", "devices": ["wall"]}], "icon": "phu:bulb-group"},
    ]
    page = {**PAGE, "layouts": {}, "items": [{"id": "t1", "type": "tile", "entity": "light.x", "states": rules, "show_if": _WHEN}]}
    assert validate_config(_with_pages(page)) == _with_pages(page)


@pytest.mark.parametrize(
    ("item", "where"),
    [
        ({"states": []}, "items → 0 → states"),
        ({"states": "alert"}, "items → 0 → states"),
        ({"states": [{"color": "alert"}]}, "states → 0 → when"),
        ({"states": [{"when": [], "color": "alert"}]}, "states → 0 → when"),
        ({"states": [{"when": _WHEN}]}, "a rule needs a color, an icon or a status"),
        ({"states": [{"when": _WHEN, "color": "purple"}]}, "states → 0 → color"),
        ({"states": [{"when": _WHEN, "color": "cold"}]}, "states → 0 → color"),
        ({"states": [{"when": _WHEN, "icon": "door-open"}]}, "states → 0 → icon"),
        ({"states": [{"when": _WHEN, "icon": "mdi:Door"}]}, "states → 0 → icon"),
        ({"states": [{"when": _WHEN, "status": ""}]}, "states → 0 → status"),
        ({"states": [{"when": _WHEN, "status": "x" * 41}]}, "states → 0 → status"),
        ({"states": [{"when": _WHEN, "color": "alert", "blink": True}]}, "states → 0"),
        ({"states": [{"when": [{"condition": "weekday"}], "color": "good"}]}, "states → 0 → when → 0 → condition"),
        ({"states": [{"when": _WHEN, "color": "good"}] * 9}, "items → 0 → states"),
    ],
)
def test_broken_state_rules_are_named_with_their_place(item: dict[str, Any], where: str) -> None:
    page = {**PAGE, "layouts": {}, "items": [{"id": "t1", "type": "tile", "entity": "light.x", **item}]}
    with pytest.raises(vol.Invalid) as err:
        validate_config(_with_pages(page))
    assert where in describe(err.value)


def test_only_a_tile_has_state_rules() -> None:
    page = {**PAGE, "layouts": {}, "items": [{"id": "h1", "type": "heading", "text": "x", "states": [{"when": _WHEN, "color": "good"}]}]}
    with pytest.raises(vol.Invalid) as err:
        validate_config(_with_pages(page))
    assert "items → 0 → states" in describe(err.value)


_TEMPLATE = "{{ is_state('light.x', 'on') and states('sensor.t') | float(0) > 20 }}"


def _tile(item_id: str, **fields: Any) -> dict[str, Any]:
    return {"id": item_id, "type": "tile", "entity": "light.x", **fields}


def test_templates_in_conditions_names_and_status_texts_are_accepted_as_they_are() -> None:
    rules = [{"when": [{"condition": "template", "value_template": _TEMPLATE}], "color": "alert", "status": "{{ states('sensor.t') }} °C is much too warm for this window"}]
    items = [
        _tile("t1", name="{{ states('sensor.name') }}" + "x" * 150, states=rules, show_if=[{"condition": "not", "conditions": [{"condition": "template", "value_template": "{{ is_state('light.x', 'off') }}"}]}]),
        {"id": "h1", "type": "heading", "text": "x", "show_if": [{"condition": "template", "value_template": "{{ now().hour < 12 }}"}]},
    ]
    page = {**PAGE, "layouts": {}, "items": items}
    assert validate_config(_with_pages(page)) == _with_pages(page)


@pytest.mark.parametrize(
    ("item", "where"),
    [
        (_tile("t1", show_if=[{"condition": "template"}]), "show_if → 0 → value_template"),
        (_tile("t1", show_if=[{"condition": "template", "value_template": ""}]), "show_if → 0 → value_template"),
        (_tile("t1", show_if=[{"condition": "template", "value_template": "{{ 1 }}" + " " * 1000}]), "show_if → 0 → value_template"),
        (_tile("t1", show_if=[{"condition": "template", "value_template": 5}]), "show_if → 0 → value_template"),
        (_tile("t1", name="x" * 81), "items → 0 → name"),
        (_tile("t1", name="{{ 1 }}" + "x" * 300), "items → 0 → name"),
        (_tile("t1", states=[{"when": _WHEN, "status": "x" * 41}]), "states → 0 → status"),
        (_tile("t1", states=[{"when": _WHEN, "status": "{{ 1 }}" + "x" * 300}]), "states → 0 → status"),
    ],
)
def test_broken_templates_are_named_with_their_place(item: dict[str, Any], where: str) -> None:
    page = {**PAGE, "layouts": {}, "items": [item]}
    with pytest.raises(vol.Invalid) as err:
        validate_config(_with_pages(page))
    assert where in describe(err.value)


def test_a_dashboard_may_use_twenty_templates() -> None:
    template = {"condition": "template", "value_template": "{{ true }}"}
    ten = [_tile(f"a{i}", show_if=[{"condition": "or", "conditions": [template]}], name="{{ 1 }}") for i in range(10)]
    page = {**PAGE, "layouts": {}, "items": ten}
    assert validate_config(_with_pages(page)) == _with_pages(page)  # 10 conditions and 10 names
    more = {**PAGE, "layouts": {}, "items": [*ten, _tile("b1", states=[{"when": [template], "status": "x"}])]}
    with pytest.raises(vol.Invalid) as err:
        validate_config(_with_pages(more))
    assert "at most 20 templates" in describe(err.value)
    spread = [{**PAGE, "id": "p1", "layouts": {}, "items": ten[:5]}, {**PAGE, "id": "p2", "layouts": {}, "items": [{**t, "id": f"c{i}"} for i, t in enumerate(ten)]}]
    with pytest.raises(vol.Invalid):  # the pages of a dashboard count together: 10 + 20 templates
        validate_config(_with_pages(*spread))


def _with_options(options: dict[str, Any]) -> dict[str, Any]:
    return _config({"id": "a", "name": "A", "options": options})


def test_the_rest_mode_is_accepted_as_it_is_with_every_option_or_none() -> None:
    for rest in ({}, {"after": 5}, {"after": 240, "format": "24", "seconds": True, "date": False, "weather": "weather.home", "dim": 0, "devices": ["wall"]}, {"after": 1, "dim": 90, "devices": ["phone", "tablet", "wall"]}):
        assert validate_config(_with_options({"rest": rest})) == _with_options({"rest": rest})


@pytest.mark.parametrize(
    ("rest", "where"),
    [
        ("5", "options → rest"),
        ({"after": 0}, "rest → after"),
        ({"after": 241}, "rest → after"),
        ({"after": 2.5}, "rest → after"),
        ({"after": True}, "rest → after"),
        ({"format": "13"}, "rest → format"),
        ({"seconds": "yes"}, "rest → seconds"),
        ({"weather": "light.x"}, "rest → weather"),
        ({"weather": "Weather.Home"}, "rest → weather"),
        ({"dim": 91}, "rest → dim"),
        ({"dim": -1}, "rest → dim"),
        ({"dim": 40.5}, "rest → dim"),
        ({"devices": []}, "rest → devices"),
        ({"devices": ["tv"]}, "rest → devices"),
        ({"devices": ["wall", "wall"]}, "rest → devices"),
        ({"blink": True}, "rest → blink"),
    ],
)
def test_a_broken_rest_mode_is_named_with_its_place(rest: Any, where: str) -> None:
    with pytest.raises(vol.Invalid) as err:
        validate_config(_with_options({"rest": rest}))
    assert where in describe(err.value)


def test_the_rest_mode_may_have_conditions_for_when_it_starts() -> None:
    when = [{"condition": "time", "after": "22:00", "before": "05:00"}, {"condition": "not", "conditions": [{"condition": "state", "entity": "media_player.tv", "state": "playing"}]}]
    options = {"rest": {"after": 3, "when": when}}
    assert validate_config(_with_options(options)) == _with_options(options)
    template = {"rest": {"when": [{"condition": "template", "value_template": "{{ states.media_player | selectattr('state', 'eq', 'playing') | list | count == 0 }}"}]}}
    assert validate_config(_with_options(template)) == _with_options(template)


@pytest.mark.parametrize(
    ("when", "where"),
    [
        ([], "rest → when"),
        ("night", "rest → when"),
        ([{"condition": "weekday"}], "rest → when → 0 → condition"),
        ([{"condition": "time"}], "rest → when → 0 → after"),
        ([{"condition": "state", "entity": "Media_Player.Tv", "state": "playing"}], "rest → when → 0 → entity"),
        ([{"condition": "time", "after": "08:00"}] * 11, "rest → when"),
    ],
)
def test_broken_rest_conditions_are_named_with_their_place(when: Any, where: str) -> None:
    with pytest.raises(vol.Invalid) as err:
        validate_config(_with_options({"rest": {"when": when}}))
    assert where in describe(err.value)


def test_the_conditions_of_the_rest_mode_count_for_the_templates_of_a_dashboard() -> None:
    template = {"condition": "template", "value_template": "{{ true }}"}
    twenty = [_tile(f"a{i}", name="{{ 1 }}") for i in range(20)]
    page = {**PAGE, "layouts": {}, "items": twenty}
    assert validate_config(_with_options({"pages": [page]}))  # exactly twenty are fine
    with pytest.raises(vol.Invalid) as err:
        validate_config(_with_options({"pages": [page], "rest": {"when": [template]}}))
    assert "at most 20 templates" in describe(err.value)


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


async def test_templates_are_judged_live_for_an_admin(hass: HomeAssistant, hass_ws_client) -> None:
    await _setup(hass)
    hass.states.async_set("sensor.t", "21")
    client = await hass_ws_client(hass)

    await client.send_json_auto_id({"type": "ambidash/template/subscribe", "template": "{{ 1 + 2 }}"})
    assert (await client.receive_json())["success"]
    assert (await client.receive_json())["event"] == {"result": 3}

    await client.send_json_auto_id({"type": "ambidash/template/subscribe", "template": "{{ states('sensor.t') | int + 1 }}"})
    assert (await client.receive_json())["success"]
    assert (await client.receive_json())["event"] == {"result": 22}
    hass.states.async_set("sensor.t", "30")
    await hass.async_block_till_done()
    assert (await client.receive_json())["event"] == {"result": 31}


async def test_a_template_that_fails_or_is_broken_says_so_in_its_result(hass: HomeAssistant, hass_ws_client) -> None:
    await _setup(hass)
    client = await hass_ws_client(hass)
    await client.send_json_auto_id({"type": "ambidash/template/subscribe", "template": "{{ 1 / 0 }}"})
    assert (await client.receive_json())["success"]
    assert "division by zero" in (await client.receive_json())["event"]["error"]

    # Home Assistant does not refuse a template it cannot compile: the error comes as the result
    await client.send_json_auto_id({"type": "ambidash/template/subscribe", "template": "{{ 1 +"})
    assert (await client.receive_json())["success"]
    assert "TemplateSyntaxError" in (await client.receive_json())["event"]["error"]

    await client.send_json_auto_id({"type": "ambidash/template/subscribe", "template": ""})
    assert (await client.receive_json())["error"]["code"] == "invalid_format"


async def test_everybody_else_may_only_judge_templates_that_an_admin_has_saved(hass: HomeAssistant, hass_ws_client, hass_read_only_access_token: str) -> None:
    await _setup(hass)
    hass.states.async_set("sensor.t", "21")
    saved = "{{ states('sensor.t') | int + 1 }}"
    await hass.data[DATA_STORE].async_save(_with_pages({**PAGE, "layouts": {}, "items": [_tile("t1", name=saved)]}))
    client = await hass_ws_client(hass, hass_read_only_access_token)

    await client.send_json_auto_id({"type": "ambidash/template/subscribe", "template": saved})
    assert (await client.receive_json())["success"]
    assert (await client.receive_json())["event"] == {"result": 22}

    await client.send_json_auto_id({"type": "ambidash/template/subscribe", "template": "{{ states | count }}"})
    msg = await client.receive_json()
    assert not msg["success"]
    assert msg["error"]["code"] == "unauthorized"


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
