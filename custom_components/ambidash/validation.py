"""The saved configuration: what the Studio may store, checked on the server before it is written.

Layout of `.storage/ambidash`: {"version": 1, "dashboards": [{"id", "name", "options": {…}}]}. The options of a dashboard
are the same keys the dashboard strategy takes in YAML (design, palette, background …), so both ways give the same result.
"""

from __future__ import annotations

import copy
import json
import math
import re
from typing import Any

import voluptuous as vol

CURRENT_VERSION = 1

_ID = vol.All(str, vol.Match(r"^[a-z0-9][a-z0-9_-]{0,38}$"))
# Values end up in style attributes: no quotes, semicolons, braces or angle brackets
_COLOR = vol.All(str, vol.Match(r"^[#\w(),.%\s-]{1,60}$"))
_ADDRESS = vol.All(str, vol.Match(r"^[^\s\"\\;{}<>]{1,500}$"))
_NAME = vol.All(str, vol.Strip, vol.Length(min=1, max=60))
_STRINGS = [vol.All(str, vol.Length(min=1, max=120))]

BACKGROUND = vol.Schema(
    {
        vol.Optional("image"): _ADDRESS,
        vol.Optional("color"): _COLOR,
        vol.Optional("gradient"): vol.All([_COLOR], vol.Length(max=8)),
        vol.Optional("angle"): vol.All(vol.Coerce(float), vol.Range(min=0, max=360)),
        vol.Optional("shade"): vol.In(["none", "light", "strong"]),
        vol.Optional("blur"): vol.All(vol.Coerce(float), vol.Range(min=0, max=40)),
        vol.Optional("folder"): _ADDRESS,
        vol.Optional("placeholder"): vol.In(["wikimedia", "art", "nasa", "picsum", "bing"]),
        vol.Optional("mix"): bool,
        vol.Optional("interval"): vol.All(vol.Coerce(float), vol.Range(min=1, max=1440)),
        vol.Optional("credit"): bool,
    },
    extra=vol.PREVENT_EXTRA,
)

_ITEM_ID = vol.All(str, vol.Match(r"^[a-z0-9][a-z0-9_-]{0,30}$"))
_ENTITY = vol.All(str, vol.Match(r"^[a-z0-9_]+\.[a-z0-9_]+$"))
DEVICES = ("phone", "tablet", "wall")
# The Ambidash pop-up, Home Assistant's own dialog, or nothing
TILE_ACTIONS = ("popup", "more-info", "none")


def _cell(value: Any) -> int:
    if isinstance(value, bool) or not isinstance(value, int) or not 0 <= value <= 400:
        raise vol.Invalid("a position or size must be a whole number from 0 to 400")
    return value


_BOX = vol.All([_cell], vol.Length(min=4, max=4))

# A Home Assistant card embedded in a page: its configuration as the card's own YAML would give it
_CARD_TYPE = re.compile(r"^(custom:)?[a-z0-9][a-z0-9_-]{0,79}$")
MAX_CARD_CHARS = 20000


def _card(value: Any) -> dict[str, Any]:
    if not isinstance(value, dict):
        raise vol.Invalid("a card is an object with a type, like {type: tile}")
    kind = value.get("type")
    if not isinstance(kind, str) or not _CARD_TYPE.match(kind):
        raise vol.Invalid("a card needs a type like tile or custom:my-card", path=["type"])
    try:
        size = len(json.dumps(value, allow_nan=False, ensure_ascii=False))
    except (TypeError, ValueError, RecursionError) as err:
        raise vol.Invalid("a card has to be plain data: text, numbers, lists and objects") from err
    if size > MAX_CARD_CHARS:
        raise vol.Invalid(f"a card may be at most {MAX_CARD_CHARS} characters long")
    return value


# When an item is shown: the conditions the frontend judges (frontend/src/conditions.ts)
MAX_CONDITIONS = 10  # in one list
MAX_DEPTH = 4  # lists inside groups inside lists
MAX_SHOW_IF_CHARS = 4000
_GROUPS = ("and", "or", "not")
# Jinja templates (conditions, names, status texts) are judged by Home Assistant itself: ambidash/template/subscribe in websocket.py
MAX_TEMPLATE_CHARS = 1000  # a condition's template
MAX_TEMPLATE_TEXT = 300  # a name or status text that is a template (plain ones are shorter)
MAX_TEMPLATES = 20  # in one dashboard: each one is a subscription in Home Assistant
_STATE_TEXT = vol.All(str, vol.Length(min=1, max=120))


def _is_template(value: Any) -> bool:
    return isinstance(value, str) and ("{{" in value or "{%" in value)


def _text(plain: int, minimum: int = 0) -> Any:
    """Text of at most `plain` characters, or of at most MAX_TEMPLATE_TEXT when it is a template."""

    def check(value: Any) -> str:
        if not isinstance(value, str):
            raise vol.Invalid("must be text")
        limit = MAX_TEMPLATE_TEXT if _is_template(value) else plain
        if not minimum <= len(value) <= limit:
            raise vol.Invalid(f"must be {minimum} to {limit} characters long")
        return value

    return check
_ATTRIBUTE = vol.All(str, vol.Match(r"^[A-Za-z0-9_]{1,60}$"))
_HHMM = vol.All(str, vol.Match(r"^([01]?\d|2[0-3]):[0-5]\d$"))


def _number(value: Any) -> int | float:
    if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value):
        raise vol.Invalid("must be a number")
    return value


_STATE_CONDITION = vol.Schema(
    {
        vol.Required("condition"): str,
        vol.Required("entity"): _ENTITY,
        vol.Required("state"): vol.Any(_STATE_TEXT, vol.All([_STATE_TEXT], vol.Length(min=1, max=20))),
        vol.Optional("attribute"): _ATTRIBUTE,
    },
    extra=vol.PREVENT_EXTRA,
)
_CONDITIONS = {
    "state": _STATE_CONDITION,
    "not_state": _STATE_CONDITION,
    "numeric": vol.Schema(
        {vol.Required("condition"): str, vol.Required("entity"): _ENTITY, vol.Optional("attribute"): _ATTRIBUTE, vol.Optional("above"): _number, vol.Optional("below"): _number},
        extra=vol.PREVENT_EXTRA,
    ),
    "template": vol.Schema({vol.Required("condition"): str, vol.Required("value_template"): vol.All(str, vol.Length(min=1, max=MAX_TEMPLATE_CHARS))}, extra=vol.PREVENT_EXTRA),
    "time": vol.Schema({vol.Required("condition"): str, vol.Optional("after"): _HHMM, vol.Optional("before"): _HHMM}, extra=vol.PREVENT_EXTRA),
    "device": vol.Schema({vol.Required("condition"): str, vol.Required("devices"): vol.All([vol.In(DEVICES)], vol.Length(min=1, max=len(DEVICES)))}, extra=vol.PREVENT_EXTRA),
    **{group: vol.Schema({vol.Required("condition"): str, vol.Required("conditions"): list}, extra=vol.PREVENT_EXTRA) for group in _GROUPS},
}


def _condition(value: Any, depth: int) -> dict[str, Any]:
    if not isinstance(value, dict):
        raise vol.Invalid("a condition is an object like {condition: state, entity: light.x, state: 'on'}")
    kind = value.get("condition")
    schema = _CONDITIONS.get(kind) if isinstance(kind, str) else None
    if schema is None:
        raise vol.Invalid("unknown condition; use state, not_state, numeric, template, time, device, and, or or not", path=["condition"])
    condition = schema(value)
    if kind == "numeric" and "above" not in condition and "below" not in condition:
        raise vol.Invalid("a numeric condition needs above or below", path=["above"])
    if kind == "time" and "after" not in condition and "before" not in condition:
        raise vol.Invalid("a time condition needs after or before", path=["after"])
    if kind in _GROUPS:
        try:
            condition["conditions"] = _condition_list(condition["conditions"], depth + 1)
        except vol.Invalid as err:
            raise vol.Invalid(err.msg, path=["conditions", *err.path]) from err
    return condition


def _condition_list(value: Any, depth: int = 0) -> list[dict[str, Any]]:
    if depth >= MAX_DEPTH:
        raise vol.Invalid(f"conditions may be nested at most {MAX_DEPTH} levels deep")
    if not isinstance(value, list) or not 1 <= len(value) <= MAX_CONDITIONS:
        raise vol.Invalid(f"needs 1 to {MAX_CONDITIONS} conditions")
    checked = []
    for index, condition in enumerate(value):
        try:
            checked.append(_condition(condition, depth))
        except vol.Invalid as err:
            raise vol.Invalid(err.msg, path=[index, *err.path]) from err
    return checked


def _show_if(value: Any) -> list[dict[str, Any]]:
    conditions = _condition_list(value)
    if len(json.dumps(conditions, ensure_ascii=False)) > MAX_SHOW_IF_CHARS:
        raise vol.Invalid(f"the conditions may be at most {MAX_SHOW_IF_CHARS} characters long")
    return conditions


# How a tile looks while its conditions hold (frontend/src/statestyle.ts): a design colour, an icon, a status text; the first rule that holds wins
MAX_STATE_RULES = 8
STATE_COLORS = ("accent", "good", "alert")
_ICON = vol.All(str, vol.Match(r"^[a-z0-9_]+:[a-z0-9_-]{1,80}$"))
_STATE_RULE = vol.Schema(
    {
        vol.Required("when"): _show_if,
        vol.Optional("color"): vol.In(STATE_COLORS),
        vol.Optional("icon"): _ICON,
        vol.Optional("status"): _text(40, 1),
    },
    extra=vol.PREVENT_EXTRA,
)


def _state_rule(value: Any) -> dict[str, Any]:
    rule = _STATE_RULE(value)
    if not {"color", "icon", "status"} & set(rule):
        raise vol.Invalid("a rule needs a color, an icon or a status")
    return rule


_ITEM = vol.Schema(
    {
        vol.Required("id"): _ITEM_ID,
        vol.Required("type"): vol.In(["tile", "heading", "summary", "card", "clock", "weather"]),
        vol.Optional("show_if"): _show_if,
        vol.Optional("states"): vol.All([_state_rule], vol.Length(min=1, max=MAX_STATE_RULES)),
        vol.Optional("card"): _card,
        vol.Optional("format"): vol.In(["auto", "12", "24"]),
        vol.Optional("seconds"): bool,
        vol.Optional("date"): bool,
        vol.Optional("forecast"): bool,
        vol.Optional("entity"): _ENTITY,
        vol.Optional("text"): vol.All(str, vol.Length(max=80)),
        vol.Optional("name"): _text(80),
        vol.Optional("tap"): vol.In(TILE_ACTIONS),
        vol.Optional("hold"): vol.In(TILE_ACTIONS),
    },
    extra=vol.PREVENT_EXTRA,
)


def _item(value: Any) -> dict[str, Any]:
    item = _ITEM(value)
    if item["type"] == "tile" and "entity" not in item:
        raise vol.Invalid("a tile needs an entity", path=["entity"])
    if "states" in item and item["type"] != "tile":
        raise vol.Invalid("only a tile has state rules", path=["states"])
    if item["type"] == "card" and "card" not in item:
        raise vol.Invalid("a card needs its configuration", path=["card"])
    if item["type"] != "card" and "card" in item:
        raise vol.Invalid("only a card has a card configuration", path=["card"])
    if item["type"] == "heading" and not item.get("text"):
        raise vol.Invalid("a heading needs a text", path=["text"])
    if item["type"] == "weather" and not str(item.get("entity", "")).startswith("weather."):
        raise vol.Invalid("a weather item needs a weather entity", path=["entity"])
    for option, owner in (("format", "clock"), ("seconds", "clock"), ("date", "clock"), ("forecast", "weather")):
        if option in item and item["type"] != owner:
            raise vol.Invalid(f"only a {owner} has the option {option}", path=[option])
    return item


_PAGE = vol.Schema(
    {
        vol.Required("id"): _ID,
        vol.Required("name"): _NAME,
        vol.Optional("items", default=list): vol.All([_item], vol.Length(max=800)),
        vol.Optional("layouts", default=dict): vol.Schema({vol.Optional(vol.In(DEVICES)): vol.Schema({_ITEM_ID: _BOX})}, extra=vol.PREVENT_EXTRA),
    },
    extra=vol.PREVENT_EXTRA,
)


def _page(value: Any) -> dict[str, Any]:
    page = _PAGE(value)
    ids = [item["id"] for item in page["items"]]
    if len(ids) != len(set(ids)):
        raise vol.Invalid("item ids must be unique", path=["items"])
    for device, layout in page["layouts"].items():
        if unknown := set(layout) - set(ids):
            raise vol.Invalid(f"places items that do not exist: {', '.join(sorted(unknown))}", path=["layouts", device])
    return page


def _condition_templates(conditions: list[dict[str, Any]]) -> int:
    return sum(1 if c["condition"] == "template" else _condition_templates(c["conditions"]) if c["condition"] in _GROUPS else 0 for c in conditions)


def _item_templates(item: dict[str, Any]) -> int:
    count = _condition_templates(item.get("show_if", [])) + _is_template(item.get("name"))
    for rule in item.get("states", []):
        count += _condition_templates(rule["when"]) + _is_template(rule.get("status"))
    return count


def _pages(value: Any) -> list[dict[str, Any]]:
    pages = vol.All([_page], vol.Length(max=30))(value)
    ids = [page["id"] for page in pages]
    if len(ids) != len(set(ids)):
        raise vol.Invalid("page ids must be unique")
    return pages


def _templates_in_budget(options: dict[str, Any]) -> dict[str, Any]:
    """A dashboard may use only so many templates: each one is a subscription in Home Assistant."""
    count = sum(_item_templates(item) for page in options.get("pages", []) for item in page["items"])
    count += _condition_templates(options.get("rest", {}).get("when", []))
    if count > MAX_TEMPLATES:
        raise vol.Invalid(f"a dashboard may use at most {MAX_TEMPLATES} templates (in conditions, names and status texts)")
    return options


def _whole(minimum: int, maximum: int) -> Any:
    def check(value: Any) -> int:
        if isinstance(value, bool) or not isinstance(value, int) or not minimum <= value <= maximum:
            raise vol.Invalid(f"must be a whole number from {minimum} to {maximum}")
        return value

    return check


# The Ruhemodus (frontend/src/rest.ts): a calm clock instead of the page after some minutes without a touch
REST = vol.Schema(
    {
        vol.Optional("after"): _whole(1, 240),
        vol.Optional("format"): vol.In(["auto", "12", "24"]),
        vol.Optional("seconds"): bool,
        vol.Optional("date"): bool,
        vol.Optional("weather"): vol.All(_ENTITY, vol.Match(r"^weather\.")),
        vol.Optional("dim"): _whole(0, 90),
        vol.Optional("devices"): vol.All([vol.In(DEVICES)], vol.Length(min=1, max=len(DEVICES)), vol.Unique()),
        vol.Optional("when"): _show_if,
    },
    extra=vol.PREVENT_EXTRA,
)

_OPTIONS = vol.Schema(
    {
        vol.Optional("design"): vol.All(str, vol.Match(r"^[a-z0-9_-]{1,40}$")),
        vol.Optional("mode"): vol.In(["auto", "light", "dark"]),
        vol.Optional("fullscreen"): bool,
        vol.Optional("language"): vol.In(["auto", "en", "de", "nl", "fr"]),
        vol.Optional("title"): vol.All(str, vol.Length(max=80)),
        vol.Optional("hide_domains"): _STRINGS,
        vol.Optional("hide_areas"): _STRINGS,
        vol.Optional("hide_entities"): _STRINGS,
        vol.Optional("hide_unassigned"): bool,
        vol.Optional("exit_path"): vol.Any(False, vol.All(str, vol.Length(max=200))),
        vol.Optional("palette"): vol.All(str, vol.Match(r"^[a-z0-9_-]{1,40}$")),
        vol.Optional("accent"): _COLOR,
        vol.Optional("card_style"): vol.In(["solid", "glass", "outline", "none"]),
        vol.Optional("background"): BACKGROUND,
        vol.Optional("pages"): _pages,
        vol.Optional("rest"): REST,
    },
    extra=vol.PREVENT_EXTRA,
)
OPTIONS = vol.All(_OPTIONS, _templates_in_budget)

DASHBOARD = vol.Schema(
    {vol.Required("id"): _ID, vol.Required("name"): _NAME, vol.Optional("options", default=dict): OPTIONS},
    extra=vol.PREVENT_EXTRA,
)


def default_config() -> dict[str, Any]:
    return {"version": CURRENT_VERSION, "dashboards": []}


def migrate(data: dict[str, Any]) -> dict[str, Any]:
    """Bring saved data of an older version up to date, one version at a time. Data of a newer Ambidash is refused."""
    data = copy.deepcopy(data)
    version = data.get("version", 1)
    if not isinstance(version, int) or version < 1 or version > CURRENT_VERSION:
        raise vol.Invalid(f"The saved configuration has version {version!r}, this Ambidash understands up to {CURRENT_VERSION}")
    # Add `if version == 1: … version = 2` steps here when the layout changes; every step gets a test
    data["version"] = version
    return data


def validate_config(raw: Any) -> dict[str, Any]:
    """The configuration as stored, or `vol.Invalid` saying what is wrong and where."""
    if not isinstance(raw, dict):
        raise vol.Invalid("The configuration must be an object")
    data = migrate(raw)
    unknown = set(data) - {"version", "dashboards"}
    if unknown:
        raise vol.Invalid(f"Unknown keys: {', '.join(sorted(map(str, unknown)))}")
    dashboards = data.get("dashboards", [])
    if not isinstance(dashboards, list):
        raise vol.Invalid("dashboards must be a list", path=["dashboards"])
    checked = []
    for index, dashboard in enumerate(dashboards):
        try:
            checked.append(DASHBOARD(dashboard))
        except vol.Invalid as err:
            raise vol.Invalid(err.msg, path=["dashboards", index, *err.path]) from err
    ids = [d["id"] for d in checked]
    if len(ids) != len(set(ids)):
        raise vol.Invalid("Dashboard ids must be unique", path=["dashboards"])
    return {"version": CURRENT_VERSION, "dashboards": checked}


def describe(err: vol.Invalid) -> str:
    """One readable line: where and what."""
    where = " → ".join(str(p) for p in err.path)
    return f"{where}: {err.msg}" if where else err.msg
