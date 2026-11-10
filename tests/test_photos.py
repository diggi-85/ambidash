"""Placeholder photos: the sources, the switch, the cache on disk, the view, the WebSocket command and the options."""

from __future__ import annotations

import os
import re
from pathlib import Path

import aiohttp
import pytest
from homeassistant.core import HomeAssistant
from homeassistant.data_entry_flow import FlowResultType
from homeassistant.helpers import issue_registry as ir
from pytest_homeassistant_custom_component.common import MockConfigEntry
from pytest_homeassistant_custom_component.test_util.aiohttp import AiohttpClientMocker

from custom_components.ambidash.const import CONF_EXTERNAL_PHOTOS, DATA_PHOTOS, DOMAIN, ISSUE_PHOTOS_DISABLED, URL_PHOTOS
from custom_components.ambidash.photos import MAX_BYTES, MAX_FILES, ExternalPhotosDisabled, PhotoSources, allowed, photo_id

PICSUM = re.compile(r"https://picsum\.photos/v2/list.*")
PICSUM_LIST = [
    {"id": "10", "author": "Ann", "width": 4000, "height": 3000},
    {"id": "11", "author": "Bo", "width": 3000, "height": 4000},
]
PICSUM_10 = "https://picsum.photos/id/10/1920/1080"
JPEG = b"\xff\xd8\xff\xe0" + b"0" * 64


async def _setup(hass: HomeAssistant, tmp_path: Path, options: dict | None = None) -> tuple[MockConfigEntry, PhotoSources]:
    # The cache lives under the config directory; keep it out of the installed test package
    hass.config.config_dir = str(tmp_path)
    entry = MockConfigEntry(domain=DOMAIN, options=options or {})
    entry.add_to_hass(hass)
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()
    return entry, hass.data[DATA_PHOTOS]


# ── sources ───────────────────────────────────────────────────────────────────────────────────────────────────────


async def test_picsum_lists_landscape_photos_as_addresses_on_this_instance(hass: HomeAssistant, aioclient_mock: AiohttpClientMocker, tmp_path: Path) -> None:
    _, sources = await _setup(hass, tmp_path)
    aioclient_mock.get(PICSUM, json=PICSUM_LIST)
    assert await sources.async_photos("picsum") == [{"url": f"{URL_PHOTOS}/{photo_id(PICSUM_10)}", "credit": "Ann · Unsplash"}]


async def test_wikimedia_keeps_landscape_only_builds_the_credit_and_lists_each_picture_once(hass: HomeAssistant, aioclient_mock: AiohttpClientMocker, tmp_path: Path) -> None:
    _, sources = await _setup(hass, tmp_path)
    day = {"image": {"title": "File:Quer See.jpg", "image": {"width": 4000, "height": 2500}, "description": {"text": "<b>Nebel</b> am See"}, "artist": {"text": "Anna"}}}
    aioclient_mock.get(re.compile(r"https://api\.wikimedia\.org/feed/.*"), json=day)
    photos = await sources.async_photos("wikimedia", "de")
    assert photos == [{"url": f"{URL_PHOTOS}/{photo_id('https://commons.wikimedia.org/wiki/Special:FilePath/Quer_See.jpg?width=1920')}", "credit": "Nebel am See · Anna"}]

    portrait = {"image": {"title": "File:Hoch.jpg", "image": {"width": 2000, "height": 3000}}}
    aioclient_mock.clear_requests()
    aioclient_mock.get(re.compile(r"https://api\.wikimedia\.org/feed/.*"), json=portrait)
    assert await sources.async_photos("wikimedia", "en") == []


async def test_art_keeps_public_domain_landscape_paintings_only(hass: HomeAssistant, aioclient_mock: AiohttpClientMocker, tmp_path: Path) -> None:
    _, sources = await _setup(hass, tmp_path)

    def page(name: str, licence: str, width: int, height: int) -> dict:
        info = {"width": width, "height": height, "thumburl": f"https://upload.wikimedia.org/thumb/{name}.jpg", "extmetadata": {"LicenseShortName": {"value": licence}, "ObjectName": {"value": f'{name}title QS:P1476,en:"x"'}, "Artist": {"value": "Monet"}}}
        return {"imageinfo": [info]}

    pages = {"1": page("Garten", "Public domain", 3000, 2000), "2": page("Frei", "CC BY-SA 4.0", 3000, 2000), "3": page("Hoch", "Public domain", 2000, 3000)}
    aioclient_mock.get(re.compile(r"https://commons\.wikimedia\.org/w/api\.php.*"), json={"query": {"pages": pages}})
    assert await sources.async_photos("art") == [{"url": f"{URL_PHOTOS}/{photo_id('https://upload.wikimedia.org/thumb/Garten.jpg')}", "credit": "Garten · Monet"}]


async def test_nasa_drops_diagrams_and_pictures_without_a_large_version(hass: HomeAssistant, aioclient_mock: AiohttpClientMocker, tmp_path: Path) -> None:
    _, sources = await _setup(hass, tmp_path)

    def item(nid: str, title: str) -> dict:
        return {"href": f"https://images-assets.nasa.gov/image/{nid}/collection.json", "data": [{"nasa_id": nid, "title": title, "keywords": []}]}

    items = [item("a", "Lagoon Nebula"), item("b", "Orbit diagram"), item("c", "Galaxy")]
    aioclient_mock.get(re.compile(r"https://images-api\.nasa\.gov/search.*"), json={"collection": {"items": items}})
    aioclient_mock.get("https://images-assets.nasa.gov/image/a/collection.json", json=["http://images-assets.nasa.gov/image/a/a~large.jpg"])
    aioclient_mock.get("https://images-assets.nasa.gov/image/c/collection.json", json=["http://images-assets.nasa.gov/image/c/c~orig.jpg"])
    assert await sources.async_photos("nasa") == [{"url": f"{URL_PHOTOS}/{photo_id('https://images-assets.nasa.gov/image/a/a~large.jpg')}", "credit": "Lagoon Nebula · NASA"}]


async def test_bing_builds_the_address_and_credit_in_the_language_of_the_user(hass: HomeAssistant, aioclient_mock: AiohttpClientMocker, tmp_path: Path) -> None:
    _, sources = await _setup(hass, tmp_path)
    aioclient_mock.get(re.compile(r"https://www\.bing\.com/HPImageArchive\.aspx.*"), json={"images": [{"urlbase": "/th?id=OHR.Berge_DE1", "copyright": "Berge im Nebel (© Anna/Getty)"}, {}]})
    photos = await sources.async_photos("bing", "de")
    assert photos == [{"url": f"{URL_PHOTOS}/{photo_id('https://www.bing.com/th?id=OHR.Berge_DE1_1920x1080.jpg')}", "credit": "Berge im Nebel"}]
    assert "mkt=de-DE" in str(aioclient_mock.mock_calls[0][1])


async def test_lists_are_cached_and_a_failing_source_keeps_the_last_good_list(hass: HomeAssistant, aioclient_mock: AiohttpClientMocker, tmp_path: Path) -> None:
    _, sources = await _setup(hass, tmp_path)
    aioclient_mock.get(PICSUM, json=PICSUM_LIST)
    first = await sources.async_photos("picsum")
    assert await sources.async_photos("picsum") == first
    assert aioclient_mock.call_count == 1

    sources._lists["picsum:en"] = (-1e9, first)  # the list is six hours old by now
    aioclient_mock.clear_requests()
    aioclient_mock.get(PICSUM, exc=aiohttp.ClientError("down"))
    assert await sources.async_photos("picsum") == first


async def test_a_source_that_fails_before_any_success_gives_an_empty_list(hass: HomeAssistant, aioclient_mock: AiohttpClientMocker, tmp_path: Path) -> None:
    _, sources = await _setup(hass, tmp_path)
    aioclient_mock.get(PICSUM, exc=aiohttp.ClientError("down"))
    assert await sources.async_photos("picsum") == []


async def test_addresses_outside_the_sources_own_hosts_are_dropped(hass: HomeAssistant, aioclient_mock: AiohttpClientMocker, tmp_path: Path) -> None:
    _, sources = await _setup(hass, tmp_path)
    page = {"imageinfo": [{"width": 3000, "height": 2000, "thumburl": "https://evil.example/x.jpg", "extmetadata": {"LicenseShortName": {"value": "Public domain"}}}]}
    aioclient_mock.get(re.compile(r"https://commons\.wikimedia\.org/w/api\.php.*"), json={"query": {"pages": {"1": page}}})
    assert await sources.async_photos("art") == []
    assert sources._known == {}


def test_allowed_hosts_are_exact_or_subdomains_over_https() -> None:
    assert allowed("https://upload.wikimedia.org/a.jpg")
    assert allowed("https://images-assets.nasa.gov/a.jpg")
    assert allowed("https://fastly.picsum.photos/id/1/a.jpg")
    assert allowed("https://www.bing.com/th?id=x")
    assert not allowed("http://upload.wikimedia.org/a.jpg")
    assert not allowed("https://evil.example/wikimedia.org")
    assert not allowed("https://wikimedia.org.evil.example/a.jpg")
    assert not allowed("https://notwikimedia.org/a.jpg")
    assert not allowed("https://user@evil.example/")
    assert not allowed("")


# ── the switch, the command and the repair hint ───────────────────────────────────────────────────────────────────


async def test_the_websocket_command_lists_photos(hass: HomeAssistant, hass_ws_client, aioclient_mock: AiohttpClientMocker, tmp_path: Path) -> None:
    await _setup(hass, tmp_path)
    aioclient_mock.get(PICSUM, json=PICSUM_LIST)
    client = await hass_ws_client(hass)
    await client.send_json_auto_id({"type": "ambidash/photos/placeholder", "source": "picsum", "language": "de-DE"})
    msg = await client.receive_json()
    assert msg["success"]
    assert msg["result"] == [{"url": f"{URL_PHOTOS}/{photo_id(PICSUM_10)}", "credit": "Ann · Unsplash"}]

    await client.send_json_auto_id({"type": "ambidash/photos/placeholder", "source": "flickr"})
    assert not (await client.receive_json())["success"]


async def test_nothing_is_fetched_while_the_switch_is_off_and_a_repair_hint_stays_until_it_is_on(
    hass: HomeAssistant, hass_ws_client, aioclient_mock: AiohttpClientMocker, tmp_path: Path
) -> None:
    entry, sources = await _setup(hass, tmp_path, {CONF_EXTERNAL_PHOTOS: False})
    assert not sources.enabled
    with pytest.raises(ExternalPhotosDisabled):
        await sources.async_photos("picsum")

    client = await hass_ws_client(hass)
    await client.send_json_auto_id({"type": "ambidash/photos/placeholder", "source": "picsum"})
    msg = await client.receive_json()
    assert not msg["success"]
    assert msg["error"]["code"] == "external_disabled"
    assert aioclient_mock.call_count == 0
    assert ir.async_get(hass).async_get_issue(DOMAIN, ISSUE_PHOTOS_DISABLED)

    hass.config_entries.async_update_entry(entry, options={CONF_EXTERNAL_PHOTOS: True})
    await hass.async_block_till_done()
    assert sources.enabled
    assert ir.async_get(hass).async_get_issue(DOMAIN, ISSUE_PHOTOS_DISABLED) is None


async def test_the_options_flow_holds_the_switch_and_it_is_on_by_default(hass: HomeAssistant, tmp_path: Path) -> None:
    entry, _ = await _setup(hass, tmp_path)
    result = await hass.config_entries.options.async_init(entry.entry_id)
    assert result["type"] is FlowResultType.FORM
    assert result["data_schema"]({}) == {CONF_EXTERNAL_PHOTOS: True}

    result = await hass.config_entries.options.async_configure(result["flow_id"], {CONF_EXTERNAL_PHOTOS: False})
    assert result["type"] is FlowResultType.CREATE_ENTRY
    assert entry.options == {CONF_EXTERNAL_PHOTOS: False}


# ── the pictures ──────────────────────────────────────────────────────────────────────────────────────────────────


async def _listed(hass: HomeAssistant, aioclient_mock: AiohttpClientMocker, tmp_path: Path, options: dict | None = None) -> tuple[PhotoSources, str]:
    _, sources = await _setup(hass, tmp_path, options)
    aioclient_mock.get(PICSUM, json=PICSUM_LIST)
    (photo,) = await sources.async_photos("picsum")
    return sources, photo["url"]


async def test_the_view_fetches_a_listed_picture_once_and_serves_it_from_the_cache(hass: HomeAssistant, hass_client_no_auth, aioclient_mock: AiohttpClientMocker, tmp_path: Path) -> None:
    _, url = await _listed(hass, aioclient_mock, tmp_path)
    aioclient_mock.get(PICSUM_10, content=JPEG, headers={"Content-Type": "image/jpeg"})
    client = await hass_client_no_auth()

    resp = await client.get(url)
    assert resp.status == 200
    assert resp.headers["Content-Type"] == "image/jpeg"
    assert "max-age" in resp.headers["Cache-Control"]
    assert await resp.read() == JPEG
    assert (await client.get(url)).status == 200
    assert aioclient_mock.call_count == 2  # the list and the picture, once each
    assert [p.name for p in (tmp_path / ".cache" / DOMAIN / "photos").iterdir()] == [f"{url.rsplit('/', 1)[1]}.jpg"]


async def test_the_view_refuses_what_was_never_listed_or_is_no_picture_or_too_big(hass: HomeAssistant, hass_client_no_auth, aioclient_mock: AiohttpClientMocker, tmp_path: Path) -> None:
    _, url = await _listed(hass, aioclient_mock, tmp_path)
    client = await hass_client_no_auth()
    assert (await client.get(f"{URL_PHOTOS}/{'0' * 20}")).status == 404
    assert (await client.get(f"{URL_PHOTOS}/not-an-id")).status == 404
    assert (await client.get(f"{URL_PHOTOS}/..%2F..%2Fsecrets")).status in (400, 404)  # Home Assistant's own security filter answers 400

    aioclient_mock.get(PICSUM_10, content=b"<html>", headers={"Content-Type": "text/html"})
    assert (await client.get(url)).status == 404
    aioclient_mock.clear_requests()
    aioclient_mock.get(PICSUM_10, content=JPEG, headers={"Content-Type": "image/jpeg", "Content-Length": str(MAX_BYTES + 1)})
    assert (await client.get(url)).status == 404
    aioclient_mock.clear_requests()
    aioclient_mock.get(PICSUM_10, exc=aiohttp.ClientError("down"))
    assert (await client.get(url)).status == 404


async def test_the_view_serves_nothing_while_the_switch_is_off(hass: HomeAssistant, hass_client_no_auth, aioclient_mock: AiohttpClientMocker, tmp_path: Path) -> None:
    entry, url = await _listed(hass, aioclient_mock, tmp_path)
    aioclient_mock.get(PICSUM_10, content=JPEG, headers={"Content-Type": "image/jpeg"})
    client = await hass_client_no_auth()
    assert (await client.get(url)).status == 200
    hass.config_entries.async_update_entry(hass.config_entries.async_entries(DOMAIN)[0], options={CONF_EXTERNAL_PHOTOS: False})
    await hass.async_block_till_done()
    assert (await client.get(url)).status == 404


async def test_the_cache_keeps_only_the_newest_pictures(hass: HomeAssistant, tmp_path: Path) -> None:
    _, sources = await _setup(hass, tmp_path)
    folder = tmp_path / ".cache" / DOMAIN / "photos"
    for i in range(MAX_FILES + 3):
        path = await hass.async_add_executor_job(sources._store, f"{i:020x}", ".jpg", b"x")
        await hass.async_add_executor_job(os.utime, path, (1000 + i, 1000 + i))
    names = {p.name for p in await hass.async_add_executor_job(lambda: list(folder.iterdir()))}
    assert names == {f"{i:020x}.jpg" for i in range(3, MAX_FILES + 3)}
