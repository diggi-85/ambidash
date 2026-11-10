// @vitest-environment happy-dom
// @vitest-environment-options {"url": "http://localhost:8123/ambidash"}
// Tile and root card in a (simulated) browser, plus the strategy
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { setLang } from "../src/i18n";
import { imageLoader } from "../src/photos";
import "../src/root";
import { AmbidashStrategy } from "../src/strategy";
import "../src/tile";
import type { AmbidashRoot } from "../src/root";
import type { AmbidashTile } from "../src/tile";
import type { AmbidashConfig, Hass, HassEntity, Page, StoredConfig } from "../src/types";

const ent = (entity_id: string, state: string, attributes: Record<string, unknown> = {}): HassEntity => ({
  entity_id,
  state,
  attributes,
  last_changed: "2026-11-07T10:00:00Z",
});

const makeHass = (over: Partial<Hass> = {}): Hass => ({
  states: {},
  entities: {},
  devices: {},
  areas: {},
  floors: {},
  language: "en",
  callService: vi.fn(async () => undefined),
  ...over,
});

const mount = async (state: HassEntity, hass: Hass): Promise<AmbidashTile> => {
  const el = document.createElement("ambidash-tile") as AmbidashTile;
  el.hass = hass;
  el.name = "Lamp";
  el.stateObj = state;
  document.body.append(el);
  await el.updateComplete;
  return el;
};

const box = (el: AmbidashTile): HTMLElement => el.shadowRoot!.querySelector(".tile")!;
const status = (el: AmbidashTile): string | null | undefined => el.shadowRoot!.querySelector(".status")?.textContent;
const press = (el: AmbidashTile, button = 0): void => {
  box(el).dispatchEvent(new MouseEvent("pointerdown", { button, bubbles: true }));
};
const release = (el: AmbidashTile, button = 0): void => {
  box(el).dispatchEvent(new MouseEvent("pointerup", { button, bubbles: true }));
};

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  document.body.innerHTML = "";
  setLang("en");
});

describe("tile", () => {
  it("switches a light on tap and shows the expected state at once", async () => {
    const hass = makeHass();
    const el = await mount(ent("light.a", "on", { brightness: 255 }), hass);
    press(el);
    release(el);
    await el.updateComplete;
    expect(hass.callService).toHaveBeenCalledWith("light", "toggle", {}, { entity_id: "light.a" });
    expect(status(el)).toBe("Off");
    expect(box(el).classList.contains("on")).toBe(false);
  });

  it("believes Home Assistant again when the state arrives, or after the timeout", async () => {
    const el = await mount(ent("light.a", "on", { brightness: 255 }), makeHass());
    press(el);
    release(el);
    await el.updateComplete;
    el.stateObj = ent("light.a", "off");
    await el.updateComplete;
    expect(status(el)).toBe("Off");

    // HA contradicts: nothing changes, so the tile returns to the real state
    const stuck = await mount(ent("light.b", "on", { brightness: 255 }), makeHass());
    press(stuck);
    release(stuck);
    await stuck.updateComplete;
    expect(status(stuck)).toBe("Off");
    await vi.advanceTimersByTimeAsync(4000);
    await stuck.updateComplete;
    expect(status(stuck)).toBe("On · 100%");
  });

  it("returns to the real state when the service call fails", async () => {
    const hass = makeHass({ callService: vi.fn(async () => { throw new Error("no"); }) });
    const el = await mount(ent("light.a", "on", { brightness: 255 }), hass);
    press(el);
    release(el);
    await vi.advanceTimersByTimeAsync(0);
    await el.updateComplete;
    expect(status(el)).toBe("On · 100%");
  });

  it("opens the detail dialog on a long press and does not switch", async () => {
    const hass = makeHass();
    const el = await mount(ent("light.a", "on"), hass);
    const seen: string[] = [];
    document.addEventListener("hass-more-info", (e) => seen.push((e as CustomEvent).detail.entityId));
    press(el);
    await vi.advanceTimersByTimeAsync(500);
    release(el);
    expect(seen).toEqual(["light.a"]);
    expect(hass.callService).not.toHaveBeenCalled();
  });

  it("works from the keyboard: Enter switches, Shift+Enter opens details", async () => {
    const hass = makeHass();
    const el = await mount(ent("light.a", "off"), hass);
    const seen: string[] = [];
    document.addEventListener("hass-more-info", (e) => seen.push((e as CustomEvent).detail.entityId));
    box(el).dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    expect(hass.callService).toHaveBeenCalledTimes(1);
    box(el).dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", shiftKey: true, bubbles: true }));
    expect(seen).toEqual(["light.a"]);
  });

  it("ignores other mouse buttons", async () => {
    const hass = makeHass();
    const el = await mount(ent("light.a", "off"), hass);
    press(el, 2);
    release(el, 2);
    expect(hass.callService).not.toHaveBeenCalled();
  });

  it("activates scenes and opens details for unavailable entities", async () => {
    const hass = makeHass();
    const scene = await mount(ent("scene.a", "unknown"), hass);
    press(scene);
    release(scene);
    expect(hass.callService).toHaveBeenCalledWith("scene", "turn_on", {}, { entity_id: "scene.a" });

    const seen: string[] = [];
    document.addEventListener("hass-more-info", (e) => seen.push((e as CustomEvent).detail.entityId));
    const gone = await mount(ent("light.gone", "unavailable"), hass);
    press(gone);
    release(gone);
    expect(seen).toEqual(["light.gone"]);
  });

  describe("tap and hold actions", () => {
    const listen = () => {
      const popups: string[] = [];
      const infos: string[] = [];
      document.addEventListener("ambidash-popup", (e) => popups.push((e as CustomEvent).detail.entityId));
      document.addEventListener("hass-more-info", (e) => infos.push((e as CustomEvent).detail.entityId));
      return { popups, infos };
    };
    const tap = (el: AmbidashTile) => (press(el), release(el));
    const hold = async (el: AmbidashTile) => (press(el), await vi.advanceTimersByTimeAsync(500), release(el));

    it("asks for the Ambidash pop-up, and only falls back to Home Assistant's dialog when nobody answers", async () => {
      const { popups, infos } = listen();
      const el = await mount(ent("light.a", "on"), makeHass());
      await hold(el);
      expect(popups).toEqual(["light.a"]);
      expect(infos).toEqual(["light.a"]); // nobody called preventDefault
      await vi.advanceTimersByTimeAsync(900);
      const claim = (e: Event) => e.preventDefault();
      document.addEventListener("ambidash-popup", claim);
      await hold(el);
      document.removeEventListener("ambidash-popup", claim);
      expect(popups).toEqual(["light.a", "light.a"]);
      expect(infos).toEqual(["light.a"]);
    });

    it("lets a tap open the pop-up or Home Assistant's dialog instead of switching, or do nothing", async () => {
      const hass = makeHass();
      const { popups, infos } = listen();
      const el = await mount(ent("light.a", "off"), hass);
      el.tap = "popup";
      tap(el);
      expect(popups).toEqual(["light.a"]);
      await vi.advanceTimersByTimeAsync(900);
      el.tap = "more-info";
      tap(el);
      expect(infos.at(-1)).toBe("light.a");
      const before = popups.length;
      await vi.advanceTimersByTimeAsync(900);
      el.tap = "none";
      tap(el);
      expect(popups).toHaveLength(before);
      expect(hass.callService).not.toHaveBeenCalled();
    });

    it("lets a long press open Home Assistant's dialog directly, or do nothing", async () => {
      const { popups, infos } = listen();
      const el = await mount(ent("light.a", "off"), makeHass());
      el.hold = "more-info";
      await hold(el);
      expect(popups).toEqual([]);
      expect(infos).toEqual(["light.a"]);
      await vi.advanceTimersByTimeAsync(900);
      el.hold = "none";
      await hold(el);
      expect(infos).toEqual(["light.a"]);
    });

    it("opens one detail view per press even when the context menu follows the long press", async () => {
      const { popups } = listen();
      const el = await mount(ent("light.a", "off"), makeHass());
      el.hold = "popup";
      press(el);
      await vi.advanceTimersByTimeAsync(500);
      box(el).dispatchEvent(new Event("contextmenu", { cancelable: true, bubbles: true }));
      expect(popups).toEqual(["light.a"]);
    });
  });

  it("is a labelled button with a pressed state for switches", async () => {
    const el = await mount(ent("light.a", "on", { brightness: 128 }), makeHass());
    expect(box(el).getAttribute("role")).toBe("button");
    expect(box(el).getAttribute("tabindex")).toBe("0");
    expect(box(el).getAttribute("aria-pressed")).toBe("true");
    expect(box(el).getAttribute("aria-label")).toBe("Lamp, On · 50%");
    const scene = await mount(ent("scene.a", "unknown"), makeHass());
    expect(box(scene).hasAttribute("aria-pressed")).toBe(false);
  });
});

const homeHass = (over: Partial<Hass> = {}): Hass => {
  const list = [ent("light.lamp", "on", { friendly_name: "Living room Lamp" }), ent("cover.blind", "open", { friendly_name: "Blind" }), ent("scene.movie", "unknown", { friendly_name: "Movie" })];
  return makeHass({
    states: Object.fromEntries(list.map((s) => [s.entity_id, s])),
    floors: { ground: { floor_id: "ground", name: "Ground floor", level: 0 } },
    areas: { living: { area_id: "living", name: "Living room", floor_id: "ground" } },
    entities: {
      "light.lamp": { entity_id: "light.lamp", area_id: "living" },
      "cover.blind": { entity_id: "cover.blind", area_id: "living" },
      "scene.movie": { entity_id: "scene.movie" },
    },
    ...over,
  });
};

const root = async (hass: Hass, config = {}): Promise<AmbidashRoot> => {
  const el = document.createElement("ambidash-root") as AmbidashRoot;
  el.setConfig(config);
  el.hass = hass;
  document.body.append(el);
  await el.updateComplete;
  return el;
};

const texts = (el: AmbidashRoot, selector: string): string[] => [...el.shadowRoot!.querySelectorAll(selector)].map((n) => n.textContent!.trim());

describe("root card", () => {
  it("renders chips, floors, areas and one tile per entity", async () => {
    const el = await root(homeHass(), { design: "home", mode: "dark" });
    expect(texts(el, ".chip")).toEqual(["1 light on", "1 cover open"]);
    expect(texts(el, "h2")).toEqual(["Scenes", "Ground floor"]);
    expect(texts(el, "h3")).toEqual(["Living room"]);
    expect(el.shadowRoot!.querySelectorAll("ambidash-tile")).toHaveLength(3);
    expect((el.shadowRoot!.querySelector("ambidash-tile") as AmbidashTile).stateObj?.entity_id).toBe("scene.movie");
    expect(el.shadowRoot!.querySelector(".root")!.getAttribute("style")).toContain("--ambi-bg: #0e0f12;");
  });

  it("follows Home Assistant's light/dark setting unless the mode is fixed", async () => {
    const light = await root(homeHass({ themes: { darkMode: false } }), { design: "home" });
    expect(light.shadowRoot!.querySelector(".root")!.getAttribute("style")).toContain("--ambi-bg: #f2f2f7;");
    const fixed = await root(homeHass({ themes: { darkMode: false } }), { design: "home", mode: "dark" });
    expect(fixed.shadowRoot!.querySelector(".root")!.getAttribute("style")).toContain("--ambi-bg: #0e0f12;");
  });

  it("covers the window only in fullscreen mode, and then shows a title", async () => {
    const inside = await root(homeHass());
    expect(inside.hasAttribute("fullscreen")).toBe(false);
    expect(texts(inside, "h1")).toEqual([]);
    const full = await root(homeHass(), { fullscreen: true, title: "Kitchen" });
    expect(full.hasAttribute("fullscreen")).toBe(true);
    expect(texts(full, "h1")).toEqual(["Kitchen"]);
  });

  it("speaks the language of the HA user", async () => {
    const hass = homeHass({ language: "de" });
    hass.states["light.loose"] = ent("light.loose", "off", { friendly_name: "Loose" });
    hass.entities["light.loose"] = { entity_id: "light.loose" };
    const el = await root(hass);
    expect(texts(el, ".chip")).toEqual(["1 Licht an", "1 Rollladen offen"]);
    expect(texts(el, "h2")).toEqual(["Szenen", "Ground floor"]);
    expect(texts(el, "h3")).toEqual(["Living room", "Ohne Bereich"]);
  });

  it("repaints only the tile whose state changed", async () => {
    const hass = homeHass();
    const el = await root(hass);
    const tiles = [...el.shadowRoot!.querySelectorAll<AmbidashTile>("ambidash-tile")];
    const before = tiles.map((t) => t.stateObj);
    el.hass = { ...hass, states: { ...hass.states, "light.lamp": ent("light.lamp", "off", { friendly_name: "Living room Lamp" }) } };
    await el.updateComplete;
    const after = [...el.shadowRoot!.querySelectorAll<AmbidashTile>("ambidash-tile")].map((t) => t.stateObj);
    expect(after.filter((s, i) => s !== before[i])).toHaveLength(1);
    expect(texts(el, ".chip")).toEqual(["1 cover open"]);
  });

  it("hides what the options hide", async () => {
    const el = await root(homeHass(), { hide_domains: ["cover"], hide_entities: ["scene.movie"] });
    expect(texts(el, ".chip")).toEqual(["1 light on"]);
    expect(texts(el, "h2")).toEqual(["Ground floor"]);
    expect(el.shadowRoot!.querySelectorAll("ambidash-tile")).toHaveLength(1);
  });

  it("leads back to Home Assistant from fullscreen with a corner button", async () => {
    const seen: string[] = [];
    window.addEventListener("location-changed", () => seen.push(location.pathname));
    const el = await root(homeHass(), { fullscreen: true, exit_path: "/lovelace/0" });
    const button = el.shadowRoot!.querySelector<HTMLButtonElement>(".exit")!;
    expect(button.getAttribute("aria-label")).toBe("Back to Home Assistant");
    button.click();
    expect(location.pathname).toBe("/lovelace/0");
    expect(seen).toEqual(["/lovelace/0"]);
  });

  it("goes to the HA start page by default, and shows no button inside the HA view or when switched off", async () => {
    const full = await root(homeHass(), { fullscreen: true });
    full.shadowRoot!.querySelector<HTMLButtonElement>(".exit")!.click();
    expect(location.pathname).toBe("/");
    expect((await root(homeHass(), { fullscreen: true, exit_path: false })).shadowRoot!.querySelector(".exit")).toBeNull();
    expect((await root(homeHass())).shadowRoot!.querySelector(".exit")).toBeNull();
  });

  // A picture's address is resolved in a promise, so the card repaints once more after it
  const settle = async (el: AmbidashRoot) => {
    await el.updateComplete;
    await Promise.resolve();
    await el.updateComplete;
  };
  const layer = (el: AmbidashRoot) => el.shadowRoot!.querySelector<HTMLElement>(".bg");
  const rootStyle = (el: AmbidashRoot) => el.shadowRoot!.querySelector(".root")!.getAttribute("style")!;

  it("has no background layer unless one is configured", async () => {
    expect(layer(await root(homeHass()))).toBeNull();
  });

  it("lays a picture behind the tiles, dimmed and blurred, with light text and glass tiles", async () => {
    const el = await root(homeHass(), { design: "home", mode: "light", background: { image: "/local/room.jpg", shade: "strong", blur: 8 } });
    await settle(el);
    const style = layer(el)!.getAttribute("style")!;
    expect(style).toContain('background-image:url("/local/room.jpg")');
    expect(style).toContain("filter:blur(8px)");
    expect(style).toContain("--shade:rgba(0, 0, 0, 0.55)");
    expect(rootStyle(el)).toContain("--ambi-ink: #ffffff;");
    expect(rootStyle(el)).toContain("--ambi-card-filter: blur(");
  });

  it("dims a picture a little by default, and not at all with shade none", async () => {
    const dimmed = await root(homeHass(), { background: { image: "/local/room.jpg" } });
    expect(layer(dimmed)!.getAttribute("style")).toContain("--shade:rgba(0, 0, 0, 0.35)");
    const plain = await root(homeHass(), { background: { image: "/local/room.jpg", shade: "none" } });
    expect(layer(plain)!.getAttribute("style")).toContain("--shade:rgba(0, 0, 0, 0)");
  });

  it("lets Home Assistant sign media-source pictures, and carries on without one when that fails", async () => {
    const callWS = vi.fn(async () => ({ url: "/api/media_source/local_source/x.jpg?authSig=abc" })) as unknown as Hass["callWS"];
    const signed = await root(homeHass({ callWS }), { background: { image: "media-source://media_source/local/x.jpg" } });
    await settle(signed);
    expect(callWS).toHaveBeenCalledWith({ type: "media_source/resolve_media", media_content_id: "media-source://media_source/local/x.jpg", expires: 3600 });
    expect(layer(signed)!.getAttribute("style")).toContain("authSig=abc");

    const failing = (async () => {
      throw new Error("no");
    }) as unknown as Hass["callWS"];
    const broken = await root(homeHass({ callWS: failing }), { background: { image: "media-source://media_source/local/y.jpg", color: "#102030" } });
    await settle(broken);
    expect(layer(broken)!.getAttribute("style")).not.toContain("url(");
    expect(layer(broken)!.getAttribute("style")).toContain("background-color:#102030");
  });

  it("uses a colour or a gradient and picks the text colour that reads on it", async () => {
    const light = await root(homeHass(), { design: "home", mode: "dark", background: { color: "#f5f0e6" } });
    expect(rootStyle(light)).toContain("--ambi-ink: #141416;");
    const dark = await root(homeHass(), { background: { gradient: ["#102030", "#304050"], angle: 120 } });
    expect(layer(dark)!.getAttribute("style")).toContain("background-image:linear-gradient(120deg, #102030, #304050)");
    expect(rootStyle(dark)).toContain("--ambi-ink: #ffffff;");
  });

  it("keeps configured values from breaking out of the style attribute", async () => {
    const el = await root(homeHass(), { background: { color: "red;position:fixed", gradient: ["#000", "blue}"] } });
    const style = layer(el)!.getAttribute("style")!;
    expect(style).not.toMatch(/;\s*position/);
    expect(style).not.toContain("}");
  });

  it("applies the card style", async () => {
    expect(rootStyle(await root(homeHass(), { card_style: "outline" }))).toContain("--ambi-surface: transparent;");
    expect(rootStyle(await root(homeHass(), { card_style: "glass" }))).toContain("--ambi-card-filter:");
    expect(rootStyle(await root(homeHass()))).not.toContain("--ambi-card-filter");
  });

  it("applies a palette and your own accent colour, and ignores an unknown palette", async () => {
    expect(rootStyle(await root(homeHass(), { design: "home", mode: "dark", palette: "nordic" }))).toContain("--ambi-bg: #2e3440;");
    expect(rootStyle(await root(homeHass(), { mode: "dark", palette: "nordic", accent: "#ff6b35" }))).toContain("--ambi-accent: #ff6b35;");
    expect(rootStyle(await root(homeHass(), { design: "home", mode: "dark", palette: "nope" }))).toContain("--ambi-bg: #0e0f12;");
  });

  it("draws a design's page art and tile look, and no art behind a picture", async () => {
    const glass = await root(homeHass(), { design: "glass", mode: "dark" });
    expect(rootStyle(glass)).toContain("--ambi-bg-art: radial-gradient(");
    expect(rootStyle(glass)).toContain("--ambi-card-bg: linear-gradient(");
    expect(glass.shadowRoot!.querySelector(".art")).not.toBeNull();
    const picture = await root(homeHass(), { design: "glass", mode: "dark", background: { image: "/local/room.jpg" } });
    expect(rootStyle(picture)).not.toContain("--ambi-bg-art");
    expect(rootStyle(picture)).not.toContain("--ambi-card-bg");
    expect(picture.shadowRoot!.querySelector(".art")).toBeNull();
  });

  it("follows the date with the seasons design", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    try {
      vi.setSystemTime(new Date(2026, 9, 31));
      expect(rootStyle(await root(homeHass(), { design: "seasons", mode: "dark" }))).toContain("--ambi-bg: #120d14;");
      vi.setSystemTime(new Date(2026, 5, 15));
      expect(rootStyle(await root(homeHass(), { design: "seasons", mode: "dark" }))).toContain("--ambi-bg: #1a1410;");
    } finally {
      vi.useRealTimers();
    }
  });

  it("explains an empty dashboard", async () => {
    const el = await root(makeHass());
    expect(texts(el, ".empty")[0]).toMatch(/^No supported devices found/);
  });
});

describe("slideshow", () => {
  const FOLDER = "media-source://media_source/local/wallpaper";
  const image = (name: string) => ({ media_content_id: `${FOLDER}/${name}`, media_class: "image", title: name });
  const hassWithPhotos = (over: Record<string, unknown> = {}): Hass => {
    const answers: Record<string, unknown> = {
      "media_source/browse_media": { children: [image("a.jpg"), image("b.jpg")] },
      "media_source/resolve_media": (msg: Record<string, unknown>) => ({ url: `/signed/${String(msg.media_content_id).split("/").pop()}` }),
      "ambidash/photos/placeholder": [{ url: "/ambidash_photos/p1", credit: "Nebula · NASA" }],
      ...over,
    };
    const callWS = vi.fn(async (msg: Record<string, unknown>) => {
      const answer = answers[String(msg.type)];
      if (answer instanceof Error) throw answer;
      return typeof answer === "function" ? answer(msg) : answer;
    });
    return homeHass({ callWS: callWS as unknown as Hass["callWS"] });
  };
  const layers = (el: AmbidashRoot) => [...el.shadowRoot!.querySelectorAll<HTMLElement>(".bg")];
  const front = (el: AmbidashRoot) => layers(el).findIndex((l) => l.classList.contains("front"));
  const urlOf = (layer: HTMLElement) => /url\("([^"]*)"\)/.exec(layer.getAttribute("style")!)?.[1];
  /** Time passes, the pending promises settle and the card repaints */
  const pass = async (el: AmbidashRoot, ms = 0) => {
    await vi.advanceTimersByTimeAsync(ms);
    await el.updateComplete;
  };
  const hidePage = (hidden: boolean) => Object.defineProperty(document, "hidden", { configurable: true, get: () => hidden });

  beforeEach(() => {
    vi.spyOn(imageLoader, "load").mockResolvedValue(true);
  });
  afterEach(() => {
    vi.restoreAllMocks();
    Reflect.deleteProperty(document, "hidden");
  });

  it("shows the pictures of a folder in turn on two layers and fades the hidden one in", async () => {
    const el = await root(hassWithPhotos(), { background: { folder: FOLDER, interval: 5 } });
    await pass(el);
    expect(layers(el)).toHaveLength(2);
    expect(front(el)).toBe(0);
    const first = urlOf(layers(el)[0]);
    expect(first).toMatch(/^\/signed\/[ab]\.jpg$/);
    expect(urlOf(layers(el)[1])).toBeUndefined();

    await pass(el, 5 * 60e3);
    expect(front(el)).toBe(1);
    expect(urlOf(layers(el)[1])).toMatch(/^\/signed\/[ab]\.jpg$/);
    expect(urlOf(layers(el)[1])).not.toBe(first);
    expect(el.shadowRoot!.querySelector(".credit")).toBeNull();

    await pass(el, 5 * 60e3);
    expect(front(el)).toBe(0);
    expect(urlOf(layers(el)[0])).toBe(first); // two pictures: it starts over
  });

  it("judges a slideshow as a picture: light text, dimmed, glass tiles", async () => {
    const el = await root(hassWithPhotos(), { design: "home", mode: "light", background: { folder: FOLDER } });
    await pass(el);
    expect(el.shadowRoot!.querySelector(".root")!.getAttribute("style")).toContain("--ambi-ink: #ffffff;");
    expect(layers(el)[0].getAttribute("style")).toContain("--shade:rgba(0, 0, 0, 0.35)");
  });

  it("shows the configured picture until the slideshow has one, and while the folder cannot be read", async () => {
    const hass = hassWithPhotos({ "media_source/browse_media": new Error("no such folder") });
    const el = await root(hass, { background: { folder: FOLDER, image: "/local/room.jpg" } });
    expect(urlOf(layers(el)[0])).toBe("/local/room.jpg");
    await pass(el);
    expect(urlOf(layers(el)[0])).toBe("/local/room.jpg");
    const browses = () => (hass.callWS as unknown as ReturnType<typeof vi.fn>).mock.calls.filter(([m]) => m.type === "media_source/browse_media").length;
    expect(browses()).toBe(1);
    await pass(el, 60e3);
    expect(browses()).toBe(2);
  });

  it("shows placeholder photos with their credit, and hides the credit when asked", async () => {
    const el = await root(hassWithPhotos(), { background: { placeholder: "nasa" } });
    await pass(el);
    expect(urlOf(layers(el)[0])).toBe("/ambidash_photos/p1");
    expect(texts(el, ".credit")).toEqual(["Nebula · NASA"]);
    const quiet = await root(hassWithPhotos(), { background: { placeholder: "nasa", credit: false } });
    await pass(quiet);
    expect(urlOf(layers(quiet)[0])).toBe("/ambidash_photos/p1");
    expect(quiet.shadowRoot!.querySelector(".credit")).toBeNull();
  });

  it("falls back to the colour when the placeholder switch is off", async () => {
    const el = await root(hassWithPhotos({ "ambidash/photos/placeholder": new Error("external_disabled") }), { background: { placeholder: "nasa", color: "#102030" } });
    await pass(el);
    expect(urlOf(layers(el)[0])).toBeUndefined();
    expect(layers(el)[0].getAttribute("style")).toContain("background-color:#102030");
  });

  it("skips a picture that does not load", async () => {
    const load = vi.mocked(imageLoader.load).mockResolvedValueOnce(false).mockResolvedValue(true);
    const el = await root(hassWithPhotos(), { background: { folder: FOLDER } });
    await pass(el);
    expect(load).toHaveBeenCalledTimes(2);
    expect(urlOf(layers(el)[0])).toMatch(/^\/signed\/[ab]\.jpg$/);
  });

  it("waits while the page is hidden and carries on when it is shown again", async () => {
    const el = await root(hassWithPhotos(), { background: { folder: FOLDER, interval: 5 } });
    await pass(el);
    hidePage(true);
    await pass(el, 20 * 60e3);
    expect(front(el)).toBe(0);
    hidePage(false);
    document.dispatchEvent(new Event("visibilitychange"));
    await pass(el);
    expect(front(el)).toBe(1);
  });

  it("stops when the card is removed, and starts over when the options change", async () => {
    const hass = hassWithPhotos();
    const calls = () => (hass.callWS as unknown as ReturnType<typeof vi.fn>).mock.calls.length;
    const el = await root(hass, { background: { folder: FOLDER, interval: 1 } });
    await pass(el);
    el.setConfig({ background: { placeholder: "nasa" } });
    await pass(el);
    expect(urlOf(layers(el)[0])).toBe("/ambidash_photos/p1");
    expect(front(el)).toBe(0);
    el.remove();
    const before = calls();
    await vi.advanceTimersByTimeAsync(60 * 60e3);
    expect(calls()).toBe(before);
  });
});

describe("own layout", () => {
  const pages: Page[] = [
    {
      id: "p1",
      name: "Ground floor",
      items: [{ id: "s", type: "summary" }, { id: "h", type: "heading", text: "Living room" }, { id: "t1", type: "tile", entity: "light.lamp" }, { id: "t2", type: "tile", entity: "cover.blind" }, { id: "t3", type: "tile", entity: "light.gone" }],
      layouts: { tablet: { s: [0, 0, 8, 1], h: [0, 1, 8, 1], t1: [0, 2, 2, 2], t2: [2, 2, 2, 2], t3: [4, 2, 2, 2] } },
    },
    { id: "p2", name: "Upstairs", items: [{ id: "h2", type: "heading", text: "Bedroom" }], layouts: {} },
  ];
  const pass = async (el: AmbidashRoot) => {
    for (let i = 0; i < 3; i++) {
      await el.updateComplete;
      await Promise.resolve();
    }
  };
  const canvas = (el: AmbidashRoot) => el.shadowRoot!.querySelector<HTMLElement>(".canvas");
  const cellStyles = (el: AmbidashRoot) => [...el.shadowRoot!.querySelectorAll<HTMLElement>(".cell")].map((c) => c.getAttribute("style"));

  it("puts the items on the grid of the tablet by default, in the places of the layout", async () => {
    const el = await root(homeHass(), { pages });
    expect(canvas(el)!.getAttribute("style")).toContain("--cols:8");
    expect(cellStyles(el)).toEqual([
      "grid-column:1 / span 8;grid-row:1 / span 1",
      "grid-column:1 / span 8;grid-row:2 / span 1",
      "grid-column:1 / span 2;grid-row:3 / span 2",
      "grid-column:3 / span 2;grid-row:3 / span 2",
      "grid-column:5 / span 2;grid-row:3 / span 2",
    ]);
    expect(el.shadowRoot!.querySelector(".tiles")).toBeNull();
  });

  it("shows summary, heading and tiles, and leaves a hole for a device that is gone", async () => {
    const el = await root(homeHass(), { pages });
    expect(texts(el, ".cell .chip")).toEqual(["1 light on", "1 cover open"]);
    expect(texts(el, ".heading")).toEqual(["Living room"]);
    const tiles = [...el.shadowRoot!.querySelectorAll<AmbidashTile>("ambidash-tile")];
    expect(tiles.map((t) => t.stateObj?.entity_id)).toEqual(["light.lamp", "cover.blind"]);
    expect(tiles.map((t) => t.name)).toEqual(["Lamp", "Blind"]);
  });

  it("opens the pop-up of a tile inside the card, and closes it again", async () => {
    const el = await root(homeHass(), { pages });
    const tile = el.shadowRoot!.querySelector<AmbidashTile>("ambidash-tile")!;
    const seen: string[] = [];
    document.addEventListener("hass-more-info", (e) => seen.push((e as CustomEvent).detail.entityId));
    expect(el.shadowRoot!.querySelector("ambidash-popup")).toBeNull();
    tile.shadowRoot!.querySelector(".tile")!.dispatchEvent(new Event("contextmenu", { cancelable: true, bubbles: true }));
    await pass(el);
    const popup = el.shadowRoot!.querySelector<HTMLElement & { entityId: string }>("ambidash-popup")!;
    expect(popup.entityId).toBe("light.lamp");
    expect(seen).toEqual([]);
    popup.dispatchEvent(new CustomEvent("close"));
    await pass(el);
    expect(el.shadowRoot!.querySelector("ambidash-popup")).toBeNull();
  });

  it("hands the tap and hold actions of an item on to its tile", async () => {
    const acting: Page[] = [{ id: "p", name: "P", items: [{ id: "t", type: "tile", entity: "light.lamp", tap: "popup", hold: "none" }] }];
    const el = await root(homeHass(), { pages: acting });
    const tile = el.shadowRoot!.querySelector<AmbidashTile>("ambidash-tile")!;
    expect([tile.tap, tile.hold]).toEqual(["popup", "none"]);
  });

  it("takes a tile's own name before the one Home Assistant gives", async () => {
    const own: Page[] = [{ id: "p", name: "P", items: [{ id: "t", type: "tile", entity: "light.lamp", name: "Reading light" }] }];
    const el = await root(homeHass(), { pages: own });
    expect((el.shadowRoot!.querySelector("ambidash-tile") as AmbidashTile).name).toBe("Reading light");
  });

  it("follows the width of the card: four columns on a phone, twelve on a wall display", async () => {
    const observers: ((entries: { contentRect: { width: number } }[]) => void)[] = [];
    vi.stubGlobal("ResizeObserver", class { constructor(cb: (entries: { contentRect: { width: number } }[]) => void) { observers.push(cb); } observe() {} disconnect() {} });
    const el = await root(homeHass(), { pages });
    observers[0]([{ contentRect: { width: 390 } }]);
    await pass(el);
    expect(canvas(el)!.getAttribute("style")).toContain("--cols:4");
    expect(cellStyles(el)[0]).toBe("grid-column:1 / span 4;grid-row:1 / span 1");
    observers[0]([{ contentRect: { width: 1400 } }]);
    await pass(el);
    expect(canvas(el)!.getAttribute("style")).toContain("--cols:12");
    el.remove();
    vi.unstubAllGlobals();
  });

  it("offers tabs for several pages and shows the chosen one", async () => {
    const el = await root(homeHass(), { pages });
    expect(texts(el, '[role="tab"]')).toEqual(["Ground floor", "Upstairs"]);
    expect(el.shadowRoot!.querySelector('[role="tab"][aria-selected="true"]')?.textContent).toBe("Ground floor");
    el.shadowRoot!.querySelectorAll<HTMLButtonElement>('[role="tab"]')[1].click();
    await pass(el);
    expect(texts(el, ".heading")).toEqual(["Bedroom"]);
    expect(el.shadowRoot!.querySelector("ambidash-tile")).toBeNull();
  });

  it("shows no tabs for one page, and the automatic view without pages", async () => {
    const single = await root(homeHass(), { pages: [pages[0]] });
    expect(single.shadowRoot!.querySelector('[role="tab"]')).toBeNull();
    const auto = await root(homeHass(), {});
    expect(canvas(auto)).toBeNull();
    expect(auto.shadowRoot!.querySelector(".tiles")).not.toBeNull();
  });
});

describe("dashboards saved in the Studio", () => {
  const saved = (...options: AmbidashConfig[]): StoredConfig => ({ version: 1, dashboards: options.map((o, i) => ({ id: i ? `d${i}` : "kueche", name: "Küche", options: o })) });
  const pass = async (el: AmbidashRoot) => {
    for (let i = 0; i < 4; i++) {
      await el.updateComplete;
      await Promise.resolve();
    }
  };
  /** A connection that sends `initial` at once and lets the test send more */
  const follow = (initial?: StoredConfig) => {
    let send: (m: { config: StoredConfig }) => void = () => undefined;
    const stop = vi.fn();
    const subscribeMessage = vi.fn(async (callback: (m: { config: StoredConfig }) => void) => {
      send = callback;
      if (initial) callback({ config: initial });
      return stop;
    });
    return { hass: homeHass({ connection: { subscribeMessage } as unknown as Hass["connection"] }), push: (config: StoredConfig) => send({ config }), stop, subscribeMessage };
  };
  const style = (el: AmbidashRoot) => el.shadowRoot!.querySelector(".root")?.getAttribute("style") ?? "";

  it("uses what the Studio saved, and lets what is written in the card win", async () => {
    const { hass, subscribeMessage } = follow(saved({ design: "glass", mode: "light" }));
    const el = await root(hass, { dashboard: "kueche", mode: "dark" });
    await pass(el);
    expect(subscribeMessage).toHaveBeenCalledWith(expect.any(Function), { type: "ambidash/config/subscribe" });
    expect(style(el)).toContain("--ambi-bg: #0b1020;");
  });

  it("follows a save in the Studio at once", async () => {
    const { hass, push } = follow(saved({ design: "glass", mode: "dark" }));
    const el = await root(hass, { dashboard: "kueche" });
    await pass(el);
    expect(style(el)).toContain("--ambi-bg: #0b1020;");
    push(saved({ design: "paper", mode: "dark" }));
    await pass(el);
    expect(style(el)).toContain("--ambi-bg: #000000;");
  });

  it("shows nothing until the saved options have arrived", async () => {
    const el = await root(follow().hass, { dashboard: "kueche" });
    await pass(el);
    expect(el.shadowRoot!.querySelector(".root")).toBeNull();
  });

  it("says so when the dashboard is not (or no longer) saved in the Studio", async () => {
    const { hass, push } = follow(saved({ design: "glass" }));
    const el = await root(hass, { dashboard: "kueche" });
    await pass(el);
    push({ version: 1, dashboards: [] });
    await pass(el);
    expect(texts(el, ".empty")).toEqual(["This dashboard is not saved in the Studio (any more)."]);
  });

  it("stops following when the card is taken out of the page, and does not follow without a dashboard", async () => {
    const { hass, stop, subscribeMessage } = follow(saved({ design: "glass" }));
    const el = await root(hass, { dashboard: "kueche" });
    await pass(el);
    el.remove();
    expect(stop).toHaveBeenCalledTimes(1);
    await root(hass, { design: "home" });
    expect(subscribeMessage).toHaveBeenCalledTimes(1);
  });
});

describe("strategy", () => {
  it("builds one panel view with the root card and passes the options on", async () => {
    const config = await AmbidashStrategy.generate({ type: "custom:ambidash", design: "clear", fullscreen: true, title: "Home" });
    expect(config).toEqual({
      title: "Home",
      views: [{ type: "panel", path: "home", title: "Home", cards: [{ type: "custom:ambidash-root", design: "clear", fullscreen: true, title: "Home" }] }],
    });
  });

  it("is titled Ambidash by default and never regenerates on registry changes", async () => {
    expect((await AmbidashStrategy.generate({ type: "custom:ambidash" })).title).toBe("Ambidash");
    expect(AmbidashStrategy.registryDependencies).toEqual([]);
  });
});
