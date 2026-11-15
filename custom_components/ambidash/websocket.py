"""WebSocket commands of the Studio: read, save, restore and follow the saved configuration, and judge Jinja templates.

Reading and following are open to every user (a dashboard on a wall tablet needs them); changing needs an admin.
"""

from __future__ import annotations

from typing import Any

import voluptuous as vol

from homeassistant.components import websocket_api
from homeassistant.core import HomeAssistant, callback
from homeassistant.exceptions import TemplateError
from homeassistant.helpers.dispatcher import async_dispatcher_connect
from homeassistant.helpers.event import TrackTemplate, TrackTemplateResult, async_track_template_result
from homeassistant.helpers.template import Template

from .const import DATA_STORE, DATA_STUDIO_REGISTERED, SIGNAL_CONFIG_UPDATED
from .store import AmbidashStore
from .validation import MAX_TEMPLATE_CHARS, describe


def _store(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]) -> AmbidashStore | None:
    store: AmbidashStore | None = hass.data.get(DATA_STORE)
    if store is None:
        connection.send_error(msg["id"], "not_loaded", "Ambidash is not set up")
    return store


def _reply(store: AmbidashStore) -> dict[str, Any]:
    return {"config": store.config, "has_previous": store.has_previous}


@websocket_api.websocket_command({vol.Required("type"): "ambidash/config/get"})
@callback
def ws_get(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]) -> None:
    if store := _store(hass, connection, msg):
        connection.send_result(msg["id"], _reply(store))


@websocket_api.require_admin
@websocket_api.websocket_command({vol.Required("type"): "ambidash/config/save", vol.Required("config"): dict})
@websocket_api.async_response
async def ws_save(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]) -> None:
    if not (store := _store(hass, connection, msg)):
        return
    try:
        await store.async_save(msg["config"])
    except vol.Invalid as err:
        connection.send_error(msg["id"], "invalid_config", describe(err))
        return
    connection.send_result(msg["id"], _reply(store))


@websocket_api.require_admin
@websocket_api.websocket_command({vol.Required("type"): "ambidash/config/restore_previous"})
@websocket_api.async_response
async def ws_restore_previous(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]) -> None:
    if not (store := _store(hass, connection, msg)):
        return
    try:
        await store.async_restore_previous()
    except vol.Invalid as err:
        connection.send_error(msg["id"], "invalid_config", describe(err))
        return
    connection.send_result(msg["id"], _reply(store))


@websocket_api.websocket_command({vol.Required("type"): "ambidash/config/subscribe"})
@callback
def ws_subscribe(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]) -> None:
    """The current configuration now and again after every change, so a dashboard on a tablet follows a save at once."""
    if not (store := _store(hass, connection, msg)):
        return

    @callback
    def forward(config: dict[str, Any]) -> None:
        connection.send_message(websocket_api.event_message(msg["id"], {"config": config}))

    connection.subscriptions[msg["id"]] = async_dispatcher_connect(hass, SIGNAL_CONFIG_UPDATED, forward)
    connection.send_result(msg["id"])
    forward(store.config)


def _saved_templates(obj: Any, found: set[str]) -> set[str]:
    """Every Jinja template in the saved configuration: the texts with {{ … }} or {% … %}."""
    if isinstance(obj, str):
        if "{{" in obj or "{%" in obj:
            found.add(obj)
    elif isinstance(obj, dict):
        for value in obj.values():
            _saved_templates(value, found)
    elif isinstance(obj, list):
        for value in obj:
            _saved_templates(value, found)
    return found


@websocket_api.websocket_command({vol.Required("type"): "ambidash/template/subscribe", vol.Required("template"): vol.All(str, vol.Length(min=1, max=MAX_TEMPLATE_CHARS))})
@callback
def ws_template_subscribe(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]) -> None:
    """A Jinja template now and again whenever its result changes.

    Home Assistant's own render_template is for admins only, but a dashboard on a wall tablet runs as a normal user.
    So an admin may judge any template (the Studio tries them out), everybody else only the ones an admin has saved.
    """
    if (store := _store(hass, connection, msg)) is None:
        return
    source: str = msg["template"]
    if not connection.user.is_admin and source not in _saved_templates(store.config, set()):
        connection.send_error(msg["id"], "unauthorized", "Only saved templates can be judged")
        return

    @callback
    def listener(event: Any, updates: list[TrackTemplateResult]) -> None:
        result = updates.pop().result
        if isinstance(result, TemplateError):
            connection.send_message(websocket_api.event_message(msg["id"], {"error": str(result)}))
        else:
            connection.send_message(websocket_api.event_message(msg["id"], {"result": result}))

    try:
        info = async_track_template_result(hass, [TrackTemplate(Template(source, hass), None)], listener)
    except TemplateError as err:
        connection.send_error(msg["id"], "template_error", str(err))
        return
    connection.subscriptions[msg["id"]] = info.async_remove
    connection.send_result(msg["id"])
    info.async_refresh()


@callback
def async_register_commands(hass: HomeAssistant) -> None:
    """Commands cannot be unregistered, so they are registered once per run."""
    if hass.data.get(DATA_STUDIO_REGISTERED):
        return
    for command in (ws_get, ws_save, ws_restore_previous, ws_subscribe, ws_template_subscribe):
        websocket_api.async_register_command(hass, command)
    hass.data[DATA_STUDIO_REGISTERED] = True
