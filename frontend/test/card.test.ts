// @vitest-environment happy-dom
// @vitest-environment-options {"url": "http://localhost:8123/ambidash"}
// A Home Assistant card in the layout: built through hui-card when Home Assistant's card helpers exist, a notice where they do not
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { setLang } from "../src/i18n";
import "../src/card";
import type { AmbidashCard } from "../src/card";
import type { Hass } from "../src/types";

const hass = (n = 0): Hass => ({ states: {}, entities: {}, devices: {}, areas: {}, floors: {}, language: "en", callService: vi.fn(), tag: n }) as unknown as Hass;

class HuiCard extends HTMLElement {
  config?: Record<string, unknown>;
  hass?: Hass;
}

const mount = async (config?: Record<string, unknown>, h?: Hass): Promise<AmbidashCard> => {
  const el = document.createElement("ambidash-card") as AmbidashCard;
  if (h) el.hass = h;
  el.config = config;
  document.body.append(el);
  await settle(el);
  return el;
};
const settle = async (el: AmbidashCard) => {
  for (let i = 0; i < 5; i++) {
    await el.updateComplete;
    await Promise.resolve();
  }
};
const inner = (el: AmbidashCard) => el.shadowRoot!.querySelector<HuiCard>("hui-card");
const note = (el: AmbidashCard) => el.shadowRoot!.querySelector(".note")?.textContent?.replace(/\s+/g, " ").trim();

beforeEach(() => {
  if (!customElements.get("hui-card")) customElements.define("hui-card", HuiCard);
});

afterEach(() => {
  document.body.innerHTML = "";
  delete (window as { loadCardHelpers?: unknown }).loadCardHelpers;
  setLang("en");
});

describe("card", () => {
  it("says it is shown in the dashboard where Home Assistant has no card helpers (the Studio panel)", async () => {
    const el = await mount({ type: "custom:bubble-card" });
    expect(note(el)).toBe("custom:bubble-card This card is shown in the dashboard itself.");
    expect(inner(el)).toBeNull();
  });

  it("builds Home Assistant's hui-card with the configuration and the hass, and passes on every new hass", async () => {
    const load = vi.fn(async () => ({}));
    (window as { loadCardHelpers?: unknown }).loadCardHelpers = load;
    const first = hass(1);
    const el = await mount({ type: "tile", entity: "light.a" }, first);
    expect(load).toHaveBeenCalledTimes(1);
    const card = inner(el)!;
    expect(card.config).toEqual({ type: "tile", entity: "light.a" });
    expect(card.hass).toBe(first);
    const second = hass(2);
    el.hass = second;
    expect(card.hass).toBe(second);
    expect(el.hass).toBe(second);
  });

  it("builds again only when the configuration really changed", async () => {
    (window as { loadCardHelpers?: unknown }).loadCardHelpers = async () => ({});
    const el = await mount({ type: "tile", entity: "light.a" });
    const first = inner(el)!;
    el.config = { type: "tile", entity: "light.a" }; // a fresh copy, the same card
    await settle(el);
    expect(inner(el)).toBe(first);
    el.config = { type: "tile", entity: "light.b" };
    await settle(el);
    expect(inner(el)).not.toBe(first);
    expect(inner(el)!.config).toEqual({ type: "tile", entity: "light.b" });
  });

  it("shows nothing for no configuration, and says so when the card cannot be loaded", async () => {
    (window as { loadCardHelpers?: unknown }).loadCardHelpers = async () => {
      throw new Error("boom");
    };
    expect(inner(await mount())).toBeNull();
    document.body.innerHTML = "";
    const el = await mount({ type: "entities" });
    expect(note(el)).toBe("entities This card could not be loaded.");
  });

  it("drops a card that was replaced while it was still loading", async () => {
    let release!: () => void;
    (window as { loadCardHelpers?: unknown }).loadCardHelpers = () => new Promise((resolve) => (release = () => resolve({})));
    const el = await mount({ type: "tile", entity: "light.a" });
    el.config = { type: "tile", entity: "light.b" };
    await settle(el);
    (window as { loadCardHelpers?: unknown }).loadCardHelpers = async () => ({});
    release();
    await settle(el);
    expect(el.shadowRoot!.querySelectorAll("hui-card")).toHaveLength(1);
    expect(inner(el)!.config).toEqual({ type: "tile", entity: "light.b" });
  });

  it("speaks the language of the card", async () => {
    setLang("de");
    expect(note(await mount({ type: "tile" }))).toBe("tile Diese Karte erscheint erst im Dashboard selbst.");
  });
});
