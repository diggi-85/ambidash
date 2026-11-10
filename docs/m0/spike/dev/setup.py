"""Onboard the local spike HA and create two Ambidash strategy dashboards (localhost test instance only)."""

import asyncio
import json
import secrets
import urllib.parse
import urllib.request

import aiohttp

BASE = "http://localhost:8123"
CLIENT = f"{BASE}/"


def post(path, body, token=None, form=False):
    data = urllib.parse.urlencode(body).encode() if form else json.dumps(body).encode()
    headers = {"Content-Type": "application/x-www-form-urlencoded" if form else "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    with urllib.request.urlopen(urllib.request.Request(BASE + path, data, headers)) as r:
        return json.load(r)


password = secrets.token_urlsafe(12)
code = post("/api/onboarding/users", {"client_id": CLIENT, "name": "Spike", "username": "spike", "password": password, "language": "de"})["auth_code"]
tokens = post("/auth/token", {"grant_type": "authorization_code", "code": code, "client_id": CLIENT}, form=True)
access = tokens["access_token"]
post("/api/onboarding/core_config", {}, access)
post("/api/onboarding/analytics", {}, access)
post("/api/onboarding/integration", {"client_id": CLIENT, "redirect_uri": f"{BASE}/?auth_callback=1"}, access)
json.dump({"password": password, **tokens}, open("tokens.json", "w"))
print("onboarded")


async def main():
    async with aiohttp.ClientSession() as s, s.ws_connect(f"ws://localhost:8123/api/websocket") as ws:
        await ws.receive_json()
        await ws.send_json({"type": "auth", "access_token": access})
        print((await ws.receive_json())["type"])
        n = 0

        async def call(msg):
            nonlocal n
            n += 1
            await ws.send_json({"id": n, **msg})
            return await ws.receive_json()

        for path, fit, entity in (("ambidash-overlay", "overlay", "input_boolean.spike_light"), ("ambidash-inline", "inline", "sun.sun")):
            print(await call({"type": "lovelace/dashboards/create", "url_path": path, "title": f"Ambidash {fit}", "icon": "mdi:view-dashboard", "show_in_sidebar": True, "require_admin": False, "mode": "storage"}))
            print(await call({"type": "lovelace/config/save", "url_path": path, "config": {"strategy": {"type": "custom:ambidash", "entity": entity, "fit": fit}}}))


asyncio.run(main())
