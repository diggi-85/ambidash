"""First-run setup of the local dev instance: test user, floors and areas, demo devices into areas,
the Ambidash integration and two Ambidash dashboards. Talks to localhost:8123 only."""

import asyncio
import json
import secrets
import sys
import urllib.parse
import urllib.request
from pathlib import Path

import aiohttp

BASE = "http://localhost:8123"
CLIENT = f"{BASE}/"
DEV = Path(sys.argv[1])

# floor → area → entities; areas HA created during onboarding (Wohnzimmer, Küche, Schlafzimmer) are reused
LAYOUT = {
    "Erdgeschoss": {
        "Wohnzimmer": ["light.living_room_rgbww_lights", "light.ceiling_lights", "cover.living_room_window", "media_player.living_room", "switch.decorative_lights", "climate.heatpump"],
        "Küche": ["light.kitchen_lights", "cover.kitchen_window", "climate.hvac", "media_player.lounge_room"],
        "Garage": ["cover.garage_door"],
    },
    "Obergeschoss": {
        "Schlafzimmer": ["light.bed_light", "media_player.bedroom", "climate.ecobee", "cover.hall_window"],
        "Büro": ["light.office_rgbw_lights", "switch.ac"],
    },
}


def post(path, body, token=None, form=False):
    data = urllib.parse.urlencode(body).encode() if form else json.dumps(body).encode()
    headers = {"Content-Type": "application/x-www-form-urlencoded" if form else "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    with urllib.request.urlopen(urllib.request.Request(BASE + path, data, headers)) as r:
        return json.load(r)


password = secrets.token_urlsafe(12)
code = post("/api/onboarding/users", {"client_id": CLIENT, "name": "Dev", "username": "dev", "password": password, "language": "de"})["auth_code"]
tokens = post("/auth/token", {"grant_type": "authorization_code", "code": code, "client_id": CLIENT}, form=True)
access = tokens["access_token"]
post("/api/onboarding/core_config", {}, access)
post("/api/onboarding/analytics", {}, access)
post("/api/onboarding/integration", {"client_id": CLIENT, "redirect_uri": f"{BASE}/?auth_callback=1"}, access)
(DEV / "tokens.json").write_text(json.dumps({"password": password, **tokens}))

# The Ambidash integration through its config flow, like a user would
flow = post("/api/config/config_entries/flow", {"handler": "ambidash"}, access)
post(f"/api/config/config_entries/flow/{flow['flow_id']}", {}, access)


async def main():
    async with aiohttp.ClientSession() as s, s.ws_connect("ws://localhost:8123/api/websocket") as ws:
        await ws.receive_json()
        await ws.send_json({"type": "auth", "access_token": access})
        await ws.receive_json()
        n = 0

        async def call(msg):
            nonlocal n
            n += 1
            await ws.send_json({"id": n, **msg})
            reply = await ws.receive_json()
            if not reply["success"]:
                print("failed:", msg["type"], reply.get("error"))
            return reply.get("result")

        # The demo devices register a little after Home Assistant answers
        for _ in range(60):
            registry = {e["entity_id"]: e for e in await call({"type": "config/entity_registry/list"})}
            if {"light.bed_light", "climate.ecobee", "scene.movie_night"} <= registry.keys():
                break
            await asyncio.sleep(2)

        areas = {a["name"]: a for a in await call({"type": "config/area_registry/list"})}
        for level, (floor_name, rooms) in enumerate(LAYOUT.items()):
            floor = await call({"type": "config/floor_registry/create", "name": floor_name, "level": level})
            for room, entity_ids in rooms.items():
                area = areas.get(room) or await call({"type": "config/area_registry/create", "name": room})
                await call({"type": "config/area_registry/update", "area_id": area["area_id"], "floor_id": floor["floor_id"]})
                for entity_id in entity_ids:
                    if entity_id not in registry:  # some demo entities have no unique id, so HA cannot give them an area
                        print("skipped (not in the entity registry):", entity_id)
                        continue
                    # HA 2026.11: an entity without a name of its own takes the area of its device
                    if device_id := registry[entity_id].get("device_id"):
                        await call({"type": "config/device_registry/update", "device_id": device_id, "area_id": area["area_id"]})
                    else:
                        await call({"type": "config/entity_registry/update", "entity_id": entity_id, "area_id": area["area_id"]})

        for path, config in (
            ("ambidash-home", {"type": "custom:ambidash", "design": "home"}),
            ("ambidash-kiosk", {"type": "custom:ambidash", "design": "calm", "mode": "dark", "fullscreen": True, "title": "Zuhause"}),
        ):
            await call({"type": "lovelace/dashboards/create", "url_path": path, "title": path, "icon": "mdi:view-dashboard", "show_in_sidebar": True, "require_admin": False, "mode": "storage"})
            await call({"type": "lovelace/config/save", "url_path": path, "config": {"strategy": config}})


asyncio.run(main())
print("Dev instance ready: http://localhost:8123/ambidash-home and /ambidash-kiosk")
