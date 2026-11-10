"""The saved configuration: what the Studio may store, checked on the server before it is written.

Layout of `.storage/ambidash`: {"version": 1, "dashboards": [{"id", "name", "options": {…}}]}. The options of a dashboard
are the same keys the dashboard strategy takes in YAML (design, palette, background …), so both ways give the same result.
"""

from __future__ import annotations

import copy
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
_ITEM = vol.Schema(
    {
        vol.Required("id"): _ITEM_ID,
        vol.Required("type"): vol.In(["tile", "heading", "summary"]),
        vol.Optional("entity"): _ENTITY,
        vol.Optional("text"): vol.All(str, vol.Length(max=80)),
        vol.Optional("name"): vol.All(str, vol.Length(max=80)),
        vol.Optional("tap"): vol.In(TILE_ACTIONS),
        vol.Optional("hold"): vol.In(TILE_ACTIONS),
    },
    extra=vol.PREVENT_EXTRA,
)


def _item(value: Any) -> dict[str, Any]:
    item = _ITEM(value)
    if item["type"] == "tile" and "entity" not in item:
        raise vol.Invalid("a tile needs an entity", path=["entity"])
    if item["type"] == "heading" and not item.get("text"):
        raise vol.Invalid("a heading needs a text", path=["text"])
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


def _pages(value: Any) -> list[dict[str, Any]]:
    pages = vol.All([_page], vol.Length(max=30))(value)
    ids = [page["id"] for page in pages]
    if len(ids) != len(set(ids)):
        raise vol.Invalid("page ids must be unique")
    return pages


OPTIONS = vol.Schema(
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
    },
    extra=vol.PREVENT_EXTRA,
)

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
