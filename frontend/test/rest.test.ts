// @vitest-environment happy-dom
// @vitest-environment-options {"url": "http://localhost:8123/ambidash"}
// The Ruhemodus: when it starts, what it shows, and how it is left again
import { contrast } from "@ambi/core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "../src/root";
import type { AmbidashRoot } from "../src/root";
import type { Hass, HassEntity, RestConfig } from "../src/types";

const ent = (entity_id: string, state: string, attributes: Record<string, unknown> = {}): HassEntity => ({ entity_id, state, attributes, last_changed: "" });
const makeHass = (): Hass =>
  ({
    states: { "light.lamp": ent("light.lamp", "on", { friendly_name: "Lamp" }), "weather.home": ent("weather.home", "sunny", { temperature: 20 }) },
    entities: {},
    devices: {},
    areas: {},
    floors: {},
    language: "en",
    themes: { darkMode: false },
    callService: vi.fn(async () => undefined),
  }) as unknown as Hass;

const PAGES = [{ id: "p", name: "P", items: [{ id: "t", type: "tile" as const, entity: "light.lamp" }] }];
const root = async (rest: RestConfig | undefined, preview = false, hass = makeHass()): Promise<AmbidashRoot> => {
  const el = document.createElement("ambidash-root") as AmbidashRoot;
  el.setConfig({ pages: PAGES, ...(rest ? { rest } : {}) });
  el.preview = preview;
  el.hass = hass;
  document.body.append(el);
  await el.updateComplete;
  return el;
};

const layer = (el: AmbidashRoot) => el.shadowRoot!.querySelector<HTMLButtonElement>(".rest");
const page = (el: AmbidashRoot) => el.shadowRoot!.querySelector<HTMLElement>(".page")!;
const pass = async (el: AmbidashRoot) => {
  for (let i = 0; i < 3; i++) {
    await el.updateComplete;
    await Promise.resolve();
  }
};
/** Lets time pass, in seconds */
const wait = async (el: AmbidashRoot, seconds: number) => {
  await vi.advanceTimersByTimeAsync(seconds * 1000);
  await pass(el);
};
const touch = () => document.dispatchEvent(new Event("pointerdown"));

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  document.body.innerHTML = "";
});

describe("the Ruhemodus", () => {
  it("starts after the set minutes without a touch: a clock instead of the page", async () => {
    const el = await root({ after: 2 });
    expect(layer(el)).toBeNull();
    await wait(el, 119);
    expect(layer(el)).toBeNull();
    await wait(el, 2);
    const rest = layer(el)!;
    expect(rest).not.toBeNull();
    expect(rest.getAttribute("aria-label")).toBe("Wake up");
    expect(rest.getAttribute("style")).toContain("--rest-dim:0.4");
    const clock = rest.querySelector<HTMLElement & { format: string; seconds: boolean; date: boolean }>("ambidash-clock")!;
    expect([clock.format, clock.seconds, clock.date]).toEqual(["auto", false, true]);
    expect(page(el).hasAttribute("inert")).toBe(true);
    expect(rest.querySelector("ambidash-weather")).toBeNull();
  });

  it("waits five minutes when it does not say", async () => {
    const el = await root({});
    await wait(el, 299);
    expect(layer(el)).toBeNull();
    await wait(el, 2);
    expect(layer(el)).not.toBeNull();
  });

  it("is not there without the option", async () => {
    const el = await root(undefined);
    await wait(el, 3600);
    expect(layer(el)).toBeNull();
  });

  it("starts the time over with every touch", async () => {
    const el = await root({ after: 2 });
    await wait(el, 60);
    touch();
    await wait(el, 90); // 150 s in, 90 s after the touch
    expect(layer(el)).toBeNull();
    await wait(el, 31);
    expect(layer(el)).not.toBeNull();
  });

  it("counts a key, the wheel and scrolling as being used too", async () => {
    const el = await root({ after: 1 });
    for (const event of [new KeyboardEvent("keydown", { key: "a" }), new Event("wheel"), new Event("scroll")]) {
      await wait(el, 25);
      document.dispatchEvent(event);
      await wait(el, 25);
      expect(layer(el)).toBeNull();
    }
    await wait(el, 40); // 65 s since the last one
    expect(layer(el)).not.toBeNull();
  });

  it("is woken by a click on the layer, which reaches nothing underneath, and then waits again", async () => {
    const hass = makeHass();
    const el = await root({ after: 1 }, false, hass);
    await wait(el, 61);
    layer(el)!.click();
    await pass(el);
    expect(layer(el)).toBeNull();
    expect(page(el).hasAttribute("inert")).toBe(false);
    expect(hass.callService).not.toHaveBeenCalled();
    await wait(el, 61);
    expect(layer(el)).not.toBeNull();
  });

  it("is woken by a key, which does nothing else, and by the wheel", async () => {
    const el = await root({ after: 1 });
    await wait(el, 61);
    const key = new KeyboardEvent("keydown", { key: " ", cancelable: true, bubbles: true });
    document.dispatchEvent(key);
    await pass(el);
    expect(key.defaultPrevented).toBe(true);
    expect(layer(el)).toBeNull();
    await wait(el, 61);
    layer(el)!.dispatchEvent(new Event("wheel"));
    await pass(el);
    expect(layer(el)).toBeNull();
  });

  it("does not start while a pop-up is open, and starts once it is closed", async () => {
    const el = await root({ after: 1 });
    el.dispatchEvent(new CustomEvent("ambidash-popup", { detail: { entityId: "light.lamp" }, cancelable: true }));
    await pass(el);
    await wait(el, 130);
    expect(layer(el)).toBeNull();
    el.shadowRoot!.querySelector("ambidash-popup")!.dispatchEvent(new CustomEvent("close"));
    await wait(el, 61);
    expect(layer(el)).not.toBeNull();
  });

  describe("device classes", () => {
    const widths = (callbacks: ((entries: { contentRect: { width: number } }[]) => void)[]) =>
      vi.stubGlobal("ResizeObserver", class { constructor(cb: (entries: { contentRect: { width: number } }[]) => void) { callbacks.push(cb); } observe() {} disconnect() {} });

    it("is for the tablet and the wall display, not the phone, unless the options say", async () => {
      const callbacks: ((entries: { contentRect: { width: number } }[]) => void)[] = [];
      widths(callbacks);
      const el = await root({ after: 1 });
      callbacks[0]([{ contentRect: { width: 390 } }]);
      await pass(el);
      await wait(el, 120);
      expect(layer(el)).toBeNull();
      callbacks[0]([{ contentRect: { width: 1400 } }]); // a wall display
      await pass(el);
      await wait(el, 61);
      expect(layer(el)).not.toBeNull();
    });

    it("is for the phone when the options list it", async () => {
      const callbacks: ((entries: { contentRect: { width: number } }[]) => void)[] = [];
      widths(callbacks);
      const el = await root({ after: 1, devices: ["phone"] });
      callbacks[0]([{ contentRect: { width: 390 } }]);
      await pass(el);
      await wait(el, 61);
      expect(layer(el)).not.toBeNull();
      layer(el)!.click();
      callbacks[0]([{ contentRect: { width: 800 } }]); // a tablet: not in the list
      await pass(el);
      await wait(el, 120);
      expect(layer(el)).toBeNull();
    });
  });

  it("does not start by itself in the Studio's preview, but starts when asked, whatever the device class", async () => {
    const el = await root({ after: 1, devices: ["wall"] }, true);
    await wait(el, 600);
    expect(layer(el)).toBeNull();
    el.startRest();
    await pass(el);
    expect(layer(el)).not.toBeNull();
    layer(el)!.click();
    await pass(el);
    expect(layer(el)).toBeNull();
    await wait(el, 600);
    expect(layer(el)).toBeNull();
  });

  it("ends when the option is taken away", async () => {
    const el = await root({ after: 1 });
    await wait(el, 61);
    expect(layer(el)).not.toBeNull();
    el.setConfig({ pages: PAGES });
    await pass(el);
    expect(layer(el)).toBeNull();
    await wait(el, 600);
    expect(layer(el)).toBeNull();
  });

  describe("what it shows", () => {
    const started = async (rest: RestConfig) => {
      const el = await root(rest);
      el.startRest();
      await pass(el);
      return el;
    };

    it("the clock as the options write it", async () => {
      const el = await started({ format: "24", seconds: true, date: false });
      const clock = layer(el)!.querySelector<HTMLElement & { format: string; seconds: boolean; date: boolean }>("ambidash-clock")!;
      expect([clock.format, clock.seconds, clock.date]).toEqual(["24", true, false]);
    });

    it("the weather under the clock, without the forecast, when there is a weather entity", async () => {
      const el = await started({ weather: "weather.home" });
      const weather = layer(el)!.querySelector<HTMLElement & { stateObj: HassEntity; forecast: boolean }>("ambidash-weather")!;
      expect([weather.stateObj.entity_id, weather.forecast]).toEqual(["weather.home", false]);
      const none = await started({ weather: "weather.gone" });
      expect(layer(none)!.querySelector("ambidash-weather")).toBeNull();
    });

    it("the background darkened as much as the options say", async () => {
      expect(layer(await started({ dim: 70 }))!.getAttribute("style")).toContain("--rest-dim:0.7");
      expect(layer(await started({ dim: 0 }))!.getAttribute("style")).toContain("--rest-dim:0");
    });

    it("the clock in a slightly different place every minute, never far from the middle", async () => {
      const el = await started({});
      const place = () => /translate\((-?\d+)px, (-?\d+)px\)/.exec(layer(el)!.querySelector(".restbox")!.getAttribute("style")!)!.slice(1).map(Number);
      const seen = new Set<string>();
      for (let minute = 0; minute < 6; minute++) {
        const [x, y] = place();
        expect(Math.abs(x)).toBeLessThanOrEqual(14);
        expect(Math.abs(y)).toBeLessThanOrEqual(14);
        seen.add(`${x},${y}`);
        await wait(el, 60);
      }
      expect(seen.size).toBeGreaterThan(3);
    });
  });

  describe("conditions for when it may start", () => {
    const quiet: RestConfig["when"] = [{ condition: "not_state", entity: "media_player.tv", state: "playing" }];
    const hassWith = (tv: string): Hass => {
      const hass = makeHass();
      hass.states["media_player.tv"] = ent("media_player.tv", tv);
      return hass;
    };

    it("does not start while they do not hold, asks again every minute, and starts once they do", async () => {
      const el = await root({ after: 1, when: quiet }, false, hassWith("playing"));
      await wait(el, 61);
      expect(layer(el)).toBeNull();
      await wait(el, 180);
      expect(layer(el)).toBeNull();
      el.hass = hassWith("idle");
      await wait(el, 61);
      expect(layer(el)).not.toBeNull();
    });

    it("looks at the clock for a time of day", async () => {
      vi.setSystemTime(new Date("2026-11-12T10:00:00"));
      const el = await root({ after: 1, when: [{ condition: "time", after: "22:00", before: "05:00" }] });
      await wait(el, 180);
      expect(layer(el)).toBeNull();
      vi.setSystemTime(new Date("2026-11-12T22:30:00"));
      await wait(el, 61);
      expect(layer(el)).not.toBeNull();
    });

    it("ends when they stop holding, and starts again once they hold and nobody has touched it", async () => {
      const el = await root({ after: 1, when: quiet }, false, hassWith("idle"));
      await wait(el, 61);
      expect(layer(el)).not.toBeNull();
      el.hass = hassWith("playing");
      await pass(el);
      expect(layer(el)).toBeNull();
      expect(page(el).hasAttribute("inert")).toBe(false);
      el.hass = hassWith("idle");
      await wait(el, 61);
      expect(layer(el)).not.toBeNull();
    });

    it("ends when the time of day is over", async () => {
      vi.setSystemTime(new Date("2026-11-12T10:58:30"));
      const el = await root({ after: 1, when: [{ condition: "time", before: "11:00" }] });
      await wait(el, 61); // 10:59:31, resting
      expect(layer(el)).not.toBeNull();
      await wait(el, 60); // past 11:00, the clock of the layer ticks over
      expect(layer(el)).toBeNull();
    });

    it("does not end what was started with try it, whatever the conditions say", async () => {
      const el = await root({ after: 1, when: quiet }, true, hassWith("playing"));
      el.startRest();
      await pass(el);
      expect(layer(el)).not.toBeNull();
      el.hass = hassWith("playing");
      await wait(el, 130);
      expect(layer(el)).not.toBeNull();
    });

    it("asks Home Assistant for a template and starts only when it says yes, and ends when it says no", async () => {
      type Message = { result?: unknown; error?: string };
      const subs: { template: string; send: (message: Message) => void }[] = [];
      const hass = makeHass();
      (hass as unknown as { connection: unknown }).connection = {
        subscribeMessage: vi.fn(async (callback: (message: Message) => void, message: { template: string }) => {
          subs.push({ template: message.template, send: callback });
          return vi.fn();
        }),
      };
      const el = await root({ after: 1, when: [{ condition: "template", value_template: "{{ nobody_home }}" }] }, false, hass);
      await pass(el);
      expect(subs.map((s) => s.template)).toEqual(["{{ nobody_home }}"]);
      await wait(el, 61); // no answer yet
      expect(layer(el)).toBeNull();
      subs[0].send({ result: true });
      await wait(el, 61);
      expect(layer(el)).not.toBeNull();
      subs[0].send({ result: false });
      await pass(el);
      expect(layer(el)).toBeNull();
    });

    it("asks again within a minute when a pop-up kept it from starting", async () => {
      const el = await root({ after: 5 });
      await wait(el, 240);
      el.dispatchEvent(new CustomEvent("ambidash-popup", { detail: { entityId: "light.lamp" }, cancelable: true }));
      await pass(el);
      await wait(el, 61); // the five minutes are over, a pop-up is open
      expect(layer(el)).toBeNull();
      el.shadowRoot!.querySelector("ambidash-popup")!.dispatchEvent(new CustomEvent("close"));
      await wait(el, 61);
      expect(layer(el)).not.toBeNull();
    });
  });

  it("leaves no timer behind when the card goes away", async () => {
    const before = vi.getTimerCount();
    const el = await root({ after: 1 });
    expect(vi.getTimerCount()).toBeGreaterThan(before);
    el.startRest();
    await pass(el);
    el.remove();
    await pass(el);
    expect(vi.getTimerCount()).toBe(before);
  });

  it("keeps the clock readable: white on the scrim behind it stays above 4.5:1 even over a white ground", () => {
    // the scrim is 55% black at its middle (see .restbox::before in root.ts): white ground → 45% of white
    const ground = Math.round(255 * 0.45);
    expect(contrast("#ffffff", `rgb(${ground}, ${ground}, ${ground})`)).toBeGreaterThanOrEqual(4.5);
  });
});
