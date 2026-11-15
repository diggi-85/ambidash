// @vitest-environment happy-dom
// @vitest-environment-options {"url": "http://localhost:8123/lovelace/0"}
// The widgets as cards of their own, in any Home Assistant dashboard
import { afterEach, describe, expect, it, vi } from "vitest";
import { setLang } from "../src/i18n";
import "../src/single";
import type { Hass, HassEntity } from "../src/types";

const ent = (entity_id: string, state: string, attributes: Record<string, unknown> = {}): HassEntity => ({ entity_id, state, attributes, last_changed: "" });
const makeHass = (over: Partial<Hass> & { states?: Record<string, HassEntity> } = {}): Hass =>
  ({
    states: { "light.lamp": ent("light.lamp", "on", { friendly_name: "Lamp", brightness: 128 }), "weather.home": ent("weather.home", "sunny", { temperature: 20 }), "sensor.x": ent("sensor.x", "1") },
    entities: {},
    devices: {},
    areas: {},
    floors: {},
    language: "en",
    themes: { darkMode: false },
    callService: vi.fn(),
    ...over,
  }) as unknown as Hass;

type Card = HTMLElement & { setConfig(config: object): void; hass: Hass; updateComplete: Promise<boolean>; stateObj?: HassEntity; getCardSize(): number; getGridOptions(): Record<string, number> };
const mount = async (tag: string, config: object, hass = makeHass()): Promise<Card> => {
  const el = document.createElement(tag) as Card;
  el.setConfig(config);
  el.hass = hass;
  document.body.append(el);
  await el.updateComplete;
  return el;
};
const face = (el: Card) => el.shadowRoot!.querySelector<HTMLElement>(".face")!;
const widget = (el: Card) => el.shadowRoot!.querySelector<HTMLElement & Record<string, unknown>>("[data-widget]")!;

afterEach(() => {
  document.body.innerHTML = "";
  setLang("en");
});

describe("cards of their own", () => {
  it("are defined and listed in Home Assistant's card picker under their -card names", () => {
    for (const tag of ["ambidash-clock-card", "ambidash-weather-card", "ambidash-tile-card"]) expect(customElements.get(tag), tag).toBeDefined();
    const cards = (window as unknown as { customCards: { type: string; name: string; preview: boolean }[] }).customCards;
    expect(cards.map((c) => c.type)).toEqual(["ambidash-clock-card", "ambidash-weather-card", "ambidash-tile-card"]);
    expect(cards.every((c) => c.name.startsWith("Ambidash") && c.preview)).toBe(true);
  });

  it("refuse a configuration that is not an object", () => {
    const el = document.createElement("ambidash-clock-card") as Card;
    expect(() => el.setConfig(null as never)).toThrow("Invalid configuration");
  });

  it("tell Home Assistant how big they want to be, and offer a configuration to start from", () => {
    const sizes = (tag: string) => {
      const el = document.createElement(tag) as Card;
      return [el.getCardSize(), el.getGridOptions()] as const;
    };
    expect(sizes("ambidash-clock-card")).toEqual([2, { columns: 6, rows: 2, min_columns: 3, min_rows: 1 }]);
    expect(sizes("ambidash-weather-card")).toEqual([4, { columns: 12, rows: 4, min_columns: 4, min_rows: 2 }]);
    expect(sizes("ambidash-tile-card")).toEqual([1, { columns: 6, rows: 1, min_columns: 3, min_rows: 1 }]);
    const stub = (tag: string) => (customElements.get(tag) as unknown as { getStubConfig(hass: Hass): object }).getStubConfig(makeHass());
    expect(stub("ambidash-clock-card")).toEqual({});
    expect(stub("ambidash-weather-card")).toEqual({ entity: "weather.home" });
    expect(stub("ambidash-tile-card")).toEqual({ entity: "light.lamp" });
  });
});

describe("clock card", () => {
  it("shows the clock with its options on a card that looks like Home Assistant's", async () => {
    const el = await mount("ambidash-clock-card", { format: "24", seconds: true, date: false });
    expect([widget(el).format, widget(el).seconds, widget(el).date]).toEqual(["24", true, false]);
    expect(face(el).className).not.toContain("own");
    expect(face(el).getAttribute("style")).toContain("--ambi-bg: #f2f2f7;"); // the Home design, light
  });

  it("follows Home Assistant's dark mode, unless the mode is fixed", async () => {
    const dark = makeHass({ themes: { darkMode: true } });
    expect(face(await mount("ambidash-clock-card", {}, dark)).getAttribute("style")).toContain("--ambi-bg: #0e0f12;");
    document.body.innerHTML = "";
    expect(face(await mount("ambidash-clock-card", { mode: "light" }, dark)).getAttribute("style")).toContain("--ambi-bg: #f2f2f7;");
    document.body.innerHTML = "";
    const el = await mount("ambidash-clock-card", {});
    el.hass = dark;
    await el.updateComplete;
    expect(face(el).getAttribute("style")).toContain("--ambi-bg: #0e0f12;");
  });

  it("takes a design, a palette and an accent colour, and paints the design's page; no_background leaves the card bare", async () => {
    const el = await mount("ambidash-clock-card", { design: "calm", mode: "dark", accent: "#123456" });
    expect(face(el).className).toContain("own");
    expect(face(el).getAttribute("style")).toContain("--ambi-bg: #0a0d0b;");
    expect(face(el).getAttribute("style")).toContain("--ambi-accent: #123456;");
    document.body.innerHTML = "";
    expect(face(await mount("ambidash-clock-card", { no_background: true })).className).toContain("bare");
  });

  it("refuses a time format it does not know", () => {
    expect(() => (document.createElement("ambidash-clock-card") as Card).setConfig({ format: "13" })).toThrow("format must be auto, 12 or 24");
  });
});

describe("weather card", () => {
  it("needs a weather entity", () => {
    const el = document.createElement("ambidash-weather-card") as Card;
    expect(() => el.setConfig({})).toThrow("Please set entity to a weather entity");
    expect(() => el.setConfig({ entity: "light.lamp" })).toThrow("weather entity");
    setLang("de");
    expect(() => el.setConfig({})).toThrow("Bitte setze entity auf eine Wetter-Entität");
  });

  it("shows the weather widget for the entity, with the forecast unless it is switched off", async () => {
    const hass = makeHass();
    const el = await mount("ambidash-weather-card", { entity: "weather.home" }, hass);
    expect(widget(el).stateObj).toBe(hass.states["weather.home"]);
    expect(widget(el).forecast).toBe(true);
    expect(widget(el).hass).toBe(hass);
    document.body.innerHTML = "";
    expect(widget(await mount("ambidash-weather-card", { entity: "weather.home", forecast: false })).forecast).toBe(false);
  });

  it("repaints when the entity changes, only passes a new hass on while other things change, and says when the entity is missing", async () => {
    const hass = makeHass();
    const el = await mount("ambidash-weather-card", { entity: "weather.home" }, hass);
    const first = widget(el);
    const rainy = ent("weather.home", "rainy", { temperature: 8 });
    const next = makeHass({ states: { ...hass.states, "weather.home": rainy } });
    el.hass = next;
    await el.updateComplete;
    expect(widget(el)).toBe(first);
    expect(widget(el).stateObj).toBe(rainy);
    const other = makeHass({ states: { ...next.states, "sensor.x": ent("sensor.x", "2") } });
    el.hass = other;
    expect(widget(el).hass).toBe(other); // handed on without repainting
    document.body.innerHTML = "";
    const gone = await mount("ambidash-weather-card", { entity: "weather.gone" });
    expect(gone.shadowRoot!.querySelector(".note")?.textContent).toBe("weather.gone was not found.");
    document.body.innerHTML = "";
    const german = await mount("ambidash-weather-card", { entity: "weather.gone" }, makeHass({ language: "de" }));
    expect(german.shadowRoot!.querySelector(".note")?.textContent).toBe("weather.gone wurde nicht gefunden.");
  });
});

describe("tile card", () => {
  it("needs a device Ambidash has a tile for", () => {
    const el = document.createElement("ambidash-tile-card") as Card;
    expect(() => el.setConfig({})).toThrow("Please set entity to a light");
    expect(() => el.setConfig({ entity: "sensor.x" })).toThrow("Please set entity to a light");
    expect(() => el.setConfig({ entity: "light.lamp" })).not.toThrow();
  });

  it("shows the tile of the device, with Home Assistant's name unless one is given, and no card around it", async () => {
    const el = await mount("ambidash-tile-card", { entity: "light.lamp" });
    expect(widget(el).stateObj).toBe(el.hass.states["light.lamp"]);
    expect(widget(el).name).toBe("Lamp");
    expect(face(el).className).toContain("loose");
    document.body.innerHTML = "";
    expect(widget(await mount("ambidash-tile-card", { entity: "light.lamp", name: "Reading light" })).name).toBe("Reading light");
  });

  it("takes more-info, none and toggle as actions, and refuses the rest with a hint", async () => {
    const el = await mount("ambidash-tile-card", { entity: "light.lamp", tap_action: { action: "more-info" }, hold_action: { action: "none" } });
    expect([widget(el).tap, widget(el).hold]).toEqual(["more-info", "none"]);
    document.body.innerHTML = "";
    const toggle = await mount("ambidash-tile-card", { entity: "light.lamp", tap_action: { action: "toggle" } });
    expect([widget(toggle).tap, widget(toggle).hold]).toEqual([undefined, undefined]);
    const bare = document.createElement("ambidash-tile-card") as Card;
    for (const config of [{ tap_action: { action: "navigate" } }, { hold_action: { action: "toggle" } }, { tap_action: { action: "call-service" } }]) {
      expect(() => bare.setConfig({ entity: "light.lamp", ...config })).toThrow("not supported here");
    }
  });

  it("opens Home Assistant's dialog on a press and hold, as there is no Ambidash card around to show a pop-up", async () => {
    vi.useFakeTimers();
    const el = await mount("ambidash-tile-card", { entity: "light.lamp" });
    const seen: string[] = [];
    document.addEventListener("hass-more-info", (e) => seen.push((e as CustomEvent).detail.entityId));
    const tile = widget(el).shadowRoot!.querySelector(".tile")!;
    tile.dispatchEvent(new MouseEvent("pointerdown", { button: 0, bubbles: true }));
    await vi.advanceTimersByTimeAsync(500);
    tile.dispatchEvent(new MouseEvent("pointerup", { button: 0, bubbles: true }));
    vi.useRealTimers();
    expect(seen).toEqual(["light.lamp"]);
  });
});
