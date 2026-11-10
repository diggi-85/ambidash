"""Free placeholder photos, fetched and served by Home Assistant.

The browser never talks to Wikimedia, NASA, Bing or Picsum: it asks Home Assistant for a list and then loads each
picture from `/ambidash_photos/<id>`, which fills a cache on disk (not part of backups). Only the fixed sources below
are fetched, only from their own hosts, and all of it can be switched off in the integration's settings.
"""

from __future__ import annotations

import asyncio
import hashlib
import html
import logging
import os
import random
import re
import time
from collections.abc import Awaitable, Callable
from datetime import timedelta
from pathlib import Path
from typing import Any

import aiohttp
import voluptuous as vol
from aiohttp import web

from homeassistant.components import websocket_api
from homeassistant.components.http import HomeAssistantView
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.exceptions import HomeAssistantError
from homeassistant.helpers import issue_registry as ir
from homeassistant.helpers.aiohttp_client import async_get_clientsession
from homeassistant.helpers.http import KEY_HASS
from homeassistant.util import dt as dt_util

from .const import CONF_EXTERNAL_PHOTOS, DATA_PHOTOS, DATA_PHOTOS_REGISTERED, DOMAIN, ISSUE_PHOTOS_DISABLED, URL_PHOTOS

_LOGGER = logging.getLogger(__name__)

SOURCES = ("wikimedia", "art", "nasa", "picsum", "bing")
LIST_CACHE_SECONDS = 6 * 3600
TIMEOUT = aiohttp.ClientTimeout(total=20)
MAX_BYTES = 12 * 1024 * 1024
MAX_FILES = 80
# Wikimedia asks for an application name in the User-Agent
USER_AGENT = "Ambidash (https://github.com/diggi-85/ambidash)"
# Lists and pictures come from these hosts only (and their subdomains, e.g. upload.wikimedia.org, fastly.picsum.photos)
ALLOWED_HOSTS = ("wikimedia.org", "nasa.gov", "bing.com", "picsum.photos")
EXTENSIONS = {"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp"}
_ID = re.compile(r"[0-9a-f]{20}")

# Art: public-domain paintings of the Google Art Project on Wikimedia Commons, mixed by topic
_ART_TOPICS = ("landscape", "sea", "garden", "river", "winter", "flowers", "harbour", "mountains", "sunset", "village")
# Space: NASA's image library (the Astronomy Picture of the Day interface currently returns only a logo)
_NASA_TOPICS = ("webb nebula", "webb galaxy", "hubble nebula", "hubble galaxy", "hubble cluster", "aurora iss", "earth at night iss")
# Photographs only: no graphics, diagrams or logos
_NASA_SKIP = re.compile(r"diagram|chart|graph|illustration|infographic|logo|poster|artist|concept|animation|render|map", re.I)
BING_URL = "https://www.bing.com/HPImageArchive.aspx"
_BING_MARKETS = {"de": "de-DE", "en": "en-US", "fr": "fr-FR", "nl": "nl-NL", "it": "it-IT", "es": "es-ES"}
_TAGS = re.compile(r"<[^>]+>")


class ExternalPhotosDisabled(HomeAssistantError):
    """Fetching photos from the internet is switched off in the integration's settings."""


def allowed(url: str) -> bool:
    """An https address on one of the sources' own hosts."""
    match = re.match(r"https://([^/:?#]+)(?::\d+)?(?:[/?#]|$)", url)
    host = (match.group(1) if match else "").lower()
    return any(host == h or host.endswith(f".{h}") for h in ALLOWED_HOSTS)


def photo_id(url: str) -> str:
    return hashlib.sha256(url.encode()).hexdigest()[:20]


def _text(value: str | None, limit: int = 90) -> str:
    """HTML from Wikimedia metadata as short plain text."""
    text = " ".join(html.unescape(_TAGS.sub(" ", value or "")).split())
    return text if len(text) <= limit else text[: limit - 1].rstrip() + "…"


def _art_title(value: str | None) -> str:
    # Commons often appends Wikidata snippets to titles ("… title QS:P1476,en:…")
    return re.split(r"\s*(?:title|label) QS:", _text(value, 200))[0].strip()


class PhotoSources:
    """Placeholder photo lists per source (cached for six hours) and the pictures behind them (cached on disk)."""

    def __init__(self, hass: HomeAssistant, entry: ConfigEntry) -> None:
        self.hass = hass
        self._entry = entry
        self._lists: dict[str, tuple[float, list[dict[str, str]]]] = {}
        # picture id -> address on a source's host; only these can be served, so the view never fetches arbitrary URLs
        self._known: dict[str, str] = {}
        self._locks: dict[str, asyncio.Lock] = {}
        self._dir = Path(hass.config.cache_path(DOMAIN, "photos"))

    @property
    def enabled(self) -> bool:
        """The integration's switch; on unless turned off."""
        return bool(self._entry.options.get(CONF_EXTERNAL_PHOTOS, True))

    async def _json(self, url: str, params: dict[str, Any] | None = None) -> Any:
        session = async_get_clientsession(self.hass)
        async with session.get(url, params=params, headers={"User-Agent": USER_AGENT}, timeout=TIMEOUT) as resp:
            resp.raise_for_status()
            return await resp.json(content_type=None)

    async def async_photos(self, source: str, language: str = "en") -> list[dict[str, str]]:
        """The photos of a source as {"url": address on this Home Assistant, "credit"}; on errors the last good list (or none)."""
        if not self.enabled:
            raise ExternalPhotosDisabled("Fetching photos from the internet is switched off")
        key = f"{source}:{language}"
        cached = self._lists.get(key)
        if cached and time.monotonic() - cached[0] < LIST_CACHE_SECONDS:
            return cached[1]
        fetch: dict[str, Callable[[str], Awaitable[list[dict[str, str]]]]] = {
            "wikimedia": self._wikimedia,
            "art": self._art,
            "nasa": self._nasa,
            "picsum": self._picsum,
            "bing": self._bing,
        }
        try:
            remote = await fetch[source](language)
        except (aiohttp.ClientError, TimeoutError, ValueError, KeyError, TypeError) as err:
            _LOGGER.debug("Ambidash: photos of %s not available: %s", source, err)
            return cached[1] if cached else []
        photos: list[dict[str, str]] = []
        for item in remote:
            pid = photo_id(item["url"])
            if not allowed(item["url"]) or any(p["url"].endswith(pid) for p in photos):
                continue
            self._known[pid] = item["url"]
            photos.append({"url": f"{URL_PHOTOS}/{pid}", "credit": item["credit"]})
        if photos:
            self._lists[key] = (time.monotonic(), photos)
        return photos or (cached[1] if cached else [])

    async def _wikimedia(self, language: str) -> list[dict[str, str]]:
        """Wikimedia's picture of the day of the last two weeks, landscape only."""
        lang = language if language in ("de", "en", "fr", "nl") else "en"
        today = dt_util.now().date()

        async def day(offset: int) -> dict[str, Any] | None:
            d = today - timedelta(days=offset)
            try:
                feed = await self._json(f"https://api.wikimedia.org/feed/v1/wikipedia/{lang}/featured/{d:%Y/%m/%d}")
            except (aiohttp.ClientError, TimeoutError, ValueError):
                return None
            return feed.get("image")

        photos = []
        for image in await asyncio.gather(*(day(i) for i in range(14))):
            if not image or not image.get("title"):
                continue
            size = image.get("image") or {}
            if size.get("width", 1) < size.get("height", 0):
                continue
            name = image["title"].removeprefix("File:").replace(" ", "_")
            desc = _text((image.get("description") or {}).get("text"))
            artist = _text((image.get("artist") or {}).get("text"), 40)
            photos.append(
                {
                    "url": f"https://commons.wikimedia.org/wiki/Special:FilePath/{name}?width=1920",
                    "credit": " · ".join(x for x in (desc, artist) if x),
                }
            )
        return photos

    async def _art(self, _language: str) -> list[dict[str, str]]:
        """Public-domain paintings (Google Art Project on Wikimedia Commons), landscape, 1920 px wide."""
        topic = random.choice(_ART_TOPICS)
        data = await self._json(
            "https://commons.wikimedia.org/w/api.php",
            {
                "action": "query",
                "format": "json",
                "generator": "search",
                "gsrnamespace": "6",
                "gsrsearch": f'incategory:"Google Art Project paintings" {topic} filetype:bitmap',
                "gsrlimit": "40",
                "prop": "imageinfo",
                "iiprop": "url|size|extmetadata",
                "iiurlwidth": "1920",
                "iiextmetadatafilter": "Artist|ObjectName|LicenseShortName",
            },
        )
        photos = []
        for page in (data.get("query") or {}).get("pages", {}).values():
            info = (page.get("imageinfo") or [{}])[0]
            meta = info.get("extmetadata") or {}
            if "public domain" not in (meta.get("LicenseShortName") or {}).get("value", "").lower():
                continue
            if info.get("width", 0) < info.get("height", 0) * 1.15 or not info.get("thumburl"):
                continue
            title = _art_title((meta.get("ObjectName") or {}).get("value"))
            artist = _text((meta.get("Artist") or {}).get("value"), 40)
            photos.append({"url": info["thumburl"], "credit": " · ".join(x for x in (title, artist) if x)})
        return photos

    async def _nasa(self, _language: str) -> list[dict[str, str]]:
        """Space photographs from NASA's image library (public domain)."""
        data = await self._json(
            "https://images-api.nasa.gov/search",
            {"q": random.choice(_NASA_TOPICS), "media_type": "image", "year_start": "2012", "page_size": "40"},
        )
        items = [
            i
            for i in (data.get("collection") or {}).get("items", [])
            if i.get("href") and i.get("data") and not _NASA_SKIP.search(f"{i['data'][0].get('title', '')} {' '.join(i['data'][0].get('keywords') or [])}")
        ]

        async def large(item: dict[str, Any]) -> dict[str, str] | None:
            # Not every image has a large version (~large, about 1920 px); the file list tells
            try:
                files = await self._json(item["href"])
            except (aiohttp.ClientError, TimeoutError, ValueError):
                return None
            url = next((f for f in files if isinstance(f, str) and f.endswith("~large.jpg")), None)
            if not url:
                return None
            return {"url": url.replace("http://", "https://", 1), "credit": f"{_text(item['data'][0].get('title'), 70)} · NASA"}

        return [p for p in await asyncio.gather(*(large(i) for i in items[:20])) if p]

    async def _picsum(self, _language: str) -> list[dict[str, str]]:
        """Random photos (Lorem Picsum, photographs from Unsplash), landscape."""
        data = await self._json("https://picsum.photos/v2/list", {"page": str(random.randint(1, 30)), "limit": "40"})
        return [
            {"url": f"https://picsum.photos/id/{p['id']}/1920/1080", "credit": f"{p.get('author', '')} · Unsplash"}
            for p in data
            if p.get("width", 0) > p.get("height", 0)
        ]

    async def _bing(self, language: str) -> list[dict[str, str]]:
        """Bing's pictures of the day. Unofficial interface, copyrighted pictures: for private use only."""
        market = _BING_MARKETS.get(language, "en-US")
        data = await self._json(BING_URL, {"format": "js", "idx": "0", "n": "8", "mkt": market})
        return [
            {"url": f"https://www.bing.com{image['urlbase']}_1920x1080.jpg", "credit": image.get("copyright", "").split(" (©")[0]}
            for image in data.get("images", [])
            if image.get("urlbase")
        ]

    # ── pictures on disk ──────────────────────────────────────────────────────────────────────────────────────────

    def _find(self, pid: str) -> Path | None:
        return next(iter(self._dir.glob(f"{pid}.*")), None) if self._dir.is_dir() else None

    def _store(self, pid: str, extension: str, data: bytes) -> Path:
        self._dir.mkdir(parents=True, exist_ok=True)
        path = self._dir / f"{pid}{extension}"
        temp = path.with_suffix(".part")
        temp.write_bytes(data)
        os.replace(temp, path)
        # The oldest pictures go first once there are too many
        files = sorted((p for p in self._dir.iterdir() if p.suffix in EXTENSIONS.values()), key=lambda p: p.stat().st_mtime)
        for old in files[:-MAX_FILES]:
            old.unlink(missing_ok=True)
        return path

    async def async_file(self, pid: str) -> Path | None:
        """The picture for an id this instance has listed: from disk, or fetched from its source first."""
        url = self._known.get(pid)
        if not self.enabled or url is None:
            return None
        if cached := await self.hass.async_add_executor_job(self._find, pid):
            return cached
        async with self._locks.setdefault(pid, asyncio.Lock()):
            if cached := await self.hass.async_add_executor_job(self._find, pid):
                return cached
            return await self._download(pid, url)

    async def _download(self, pid: str, url: str) -> Path | None:
        session = async_get_clientsession(self.hass)
        try:
            async with session.get(url, headers={"User-Agent": USER_AGENT}, timeout=TIMEOUT) as resp:
                resp.raise_for_status()
                extension = EXTENSIONS.get(resp.content_type)
                # A redirect must stay on a source's host, the answer must be a picture and not too big
                declared = resp.headers.get("Content-Length", "")
                if not allowed(str(resp.url)) or extension is None or (declared.isdigit() and int(declared) > MAX_BYTES):
                    return None
                data = bytearray()
                async for chunk in resp.content.iter_chunked(65536):
                    data += chunk
                    if len(data) > MAX_BYTES:
                        return None
        except (aiohttp.ClientError, TimeoutError) as err:
            _LOGGER.debug("Ambidash: picture %s not available: %s", url, err)
            return None
        return await self.hass.async_add_executor_job(self._store, pid, extension, bytes(data))


class PhotoView(HomeAssistantView):
    """Serves the cached pictures. Without login on purpose: a browser's background-image cannot send a token, and the
    pictures are public ones whose ids only exist for addresses the sources listed."""

    url = f"{URL_PHOTOS}/{{photo_id}}"
    name = "api:ambidash:photo"
    requires_auth = False

    async def get(self, request: web.Request, photo_id: str) -> web.StreamResponse:
        sources: PhotoSources | None = request.app[KEY_HASS].data.get(DATA_PHOTOS)
        path = await sources.async_file(photo_id) if sources and _ID.fullmatch(photo_id) else None
        if path is None:
            raise web.HTTPNotFound
        return web.FileResponse(path, headers={"Cache-Control": "public, max-age=86400", "X-Content-Type-Options": "nosniff"})


@websocket_api.websocket_command(
    {vol.Required("type"): "ambidash/photos/placeholder", vol.Required("source"): vol.In(SOURCES), vol.Optional("language"): vol.Any(str, None)}
)
@websocket_api.async_response
async def ws_placeholder_photos(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]) -> None:
    """The photos of a placeholder source, served by this Home Assistant."""
    sources: PhotoSources | None = hass.data.get(DATA_PHOTOS)
    if sources is None:
        connection.send_error(msg["id"], "not_loaded", "Ambidash is not set up")
        return
    language = (msg.get("language") or hass.config.language or "en").split("-")[0]
    try:
        photos = await sources.async_photos(msg["source"], language)
    except ExternalPhotosDisabled:
        # Somebody wants photos while the switch is off: say so under Settings → Repairs
        ir.async_create_issue(hass, DOMAIN, ISSUE_PHOTOS_DISABLED, is_fixable=False, severity=ir.IssueSeverity.WARNING, translation_key=ISSUE_PHOTOS_DISABLED)
        connection.send_error(msg["id"], "external_disabled", "Fetching photos from the internet is switched off in Ambidash's settings")
        return
    connection.send_result(msg["id"], photos)


def async_setup_photos(hass: HomeAssistant, entry: ConfigEntry) -> None:
    """Make the photo sources available while the entry is loaded; the view and the command stay registered until restart."""
    hass.data[DATA_PHOTOS] = PhotoSources(hass, entry)

    def remove() -> None:
        hass.data.pop(DATA_PHOTOS, None)

    entry.async_on_unload(remove)
    if not hass.data.get(DATA_PHOTOS_REGISTERED):
        hass.http.register_view(PhotoView())
        websocket_api.async_register_command(hass, ws_placeholder_photos)
        hass.data[DATA_PHOTOS_REGISTERED] = True
    _sync_issue(hass, entry)
    entry.async_on_unload(entry.add_update_listener(_options_updated))


def _sync_issue(hass: HomeAssistant, entry: ConfigEntry) -> None:
    """The repair hint only stays while the switch is off."""
    if entry.options.get(CONF_EXTERNAL_PHOTOS, True):
        ir.async_delete_issue(hass, DOMAIN, ISSUE_PHOTOS_DISABLED)


async def _options_updated(hass: HomeAssistant, entry: ConfigEntry) -> None:
    _sync_issue(hass, entry)
