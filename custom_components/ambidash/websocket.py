"""WebSocket commands of the Studio: read, save, restore and follow the saved configuration.

Reading and following are open to every user (a dashboard on a wall tablet needs them); changing needs an admin.
"""

from __future__ import annotations

from typing import Any

import voluptuous as vol

from homeassistant.components import websocket_api
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers.dispatcher import async_dispatcher_connect

from .const import DATA_STORE, DATA_STUDIO_REGISTERED, SIGNAL_CONFIG_UPDATED
from .store import AmbidashStore
from .validation import describe


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


@callback
def async_register_commands(hass: HomeAssistant) -> None:
    """Commands cannot be unregistered, so they are registered once per run."""
    if hass.data.get(DATA_STUDIO_REGISTERED):
        return
    for command in (ws_get, ws_save, ws_restore_previous, ws_subscribe):
        websocket_api.async_register_command(hass, command)
    hass.data[DATA_STUDIO_REGISTERED] = True
