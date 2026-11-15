// @vitest-environment happy-dom
// @vitest-environment-options {"url": "http://localhost:8123/ambidash"}
// The weather widget: how it is now, the forecast while it is on screen
import { afterEach, describe, expect, it, vi } from "vitest";
import { setLang } from "../src/i18n";
import "../src/weather";
import type { AmbidashWeather } from "../src/weather";
import type { Hass, HassEntity } from "../src/types";

const weather = (over: Record<string, unknown> = {}, id = "weather.home"): HassEntity => ({
  entity_id: id,
  state: "partlycloudy",
  attributes: { temperature: 21.4, temperature_unit: "°C", humidity: 60, wind_speed: 12.3, wind_speed_unit: "km/h", supported_features: 1, ...over },
  last_changed: "",
});

const DAYS = Array.from({ length: 7 }, (_, i) => ({ datetime: `2026-11-${13 + i}T12:00:00+00:00`, condition: i === 1 ? "rainy" : "sunny", temperature: 10 + i + 0.4, templow: 2 + i }));

const setup = () => {
  const stops: ReturnType<typeof vi.fn>[] = [];
  const subs: { message: Record<string, unknown>; send: (m: unknown) => void }[] = [];
  const subscribeMessage = vi.fn(async (callback: (m: unknown) => void, message: Record<string, unknown>) => {
    subs.push({ message, send: callback });
    const stop = vi.fn();
    stops.push(stop);
    return stop;
  });
  const hass = { states: {}, entities: {}, devices: {}, areas: {}, floors: {}, language: "en", callService: vi.fn(), connection: { subscribeMessage }, formatEntityState: () => "Partly cloudy" } as unknown as Hass;
  return { hass, stops, subs, subscribeMessage };
};

const mount = async (hass: Hass, stateObj: HassEntity, forecast = true): Promise<AmbidashWeather> => {
  const el = document.createElement("ambidash-weather") as AmbidashWeather;
  el.hass = hass;
  el.stateObj = stateObj;
  el.forecast = forecast;
  document.body.append(el);
  await settle(el);
  return el;
};
const settle = async (el: AmbidashWeather) => {
  for (let i = 0; i < 5; i++) {
    await el.updateComplete;
    await Promise.resolve();
  }
};
const text = (el: AmbidashWeather, selector: string) => el.shadowRoot!.querySelector(selector)?.textContent?.replace(/\s+/g, " ").trim();

afterEach(() => {
  document.body.innerHTML = "";
  setLang("en");
});

describe("weather", () => {
  it("shows the temperature, Home Assistant's wording, humidity and wind", async () => {
    const { hass } = setup();
    const el = await mount(hass, weather());
    expect(text(el, ".temp")).toBe("21°C");
    expect(text(el, ".label")).toBe("Partly cloudy");
    expect(text(el, ".extra")).toBe("60%12 km/h");
    expect(el.shadowRoot!.querySelector("ha-state-icon")).not.toBeNull();
  });

  it("gets by without humidity, wind and a wording from Home Assistant", async () => {
    const { hass } = setup();
    (hass as { formatEntityState?: unknown }).formatEntityState = undefined;
    const el = await mount(hass, weather({ humidity: undefined, wind_speed: undefined, temperature: undefined }, "weather.x"));
    expect(text(el, ".temp")).toBe("–");
    expect(text(el, ".label")).toBe("partlycloudy");
    expect(el.shadowRoot!.querySelector(".extra")).toBeNull();
  });

  it("shows nothing without a state or without Home Assistant", async () => {
    const { hass } = setup();
    const el = await mount(hass, weather());
    el.stateObj = undefined;
    await settle(el);
    expect(el.shadowRoot!.querySelector(".weather")).toBeNull();
  });

  it("subscribes to the daily forecast and shows the next five days with their condition and temperatures", async () => {
    const { hass, subs, subscribeMessage } = setup();
    const el = await mount(hass, weather());
    expect(subscribeMessage).toHaveBeenCalledTimes(1);
    expect(subs[0].message).toEqual({ type: "weather/subscribe_forecast", forecast_type: "daily", entity_id: "weather.home" });
    expect(el.shadowRoot!.querySelector(".days")).toBeNull();
    subs[0].send({ type: "forecast", forecast: DAYS });
    await settle(el);
    const days = [...el.shadowRoot!.querySelectorAll(".day")];
    expect(days).toHaveLength(5);
    expect(days[0].querySelector("span")?.textContent).toMatch(/^(Fri|Fri\.)$/);
    expect(days.map((d) => d.querySelector("ha-icon")?.getAttribute("icon"))).toEqual(["mdi:weather-sunny", "mdi:weather-rainy", "mdi:weather-sunny", "mdi:weather-sunny", "mdi:weather-sunny"]);
    expect(days[0].textContent!.replace(/\s+/g, " ")).toContain("10° 2°");
    subs[0].send({ forecast: null });
    await settle(el);
    expect(el.shadowRoot!.querySelector(".days")).toBeNull();
  });

  it("does not subscribe when the forecast is off, when the entity has none, or without a connection", async () => {
    const off = setup();
    await mount(off.hass, weather(), false);
    expect(off.subscribeMessage).not.toHaveBeenCalled();
    const none = setup();
    await mount(none.hass, weather({ supported_features: 2 }));
    expect(none.subscribeMessage).not.toHaveBeenCalled();
    const bare = setup();
    (bare.hass as { connection?: unknown }).connection = undefined;
    const el = await mount(bare.hass, weather());
    expect(el.shadowRoot!.querySelector(".days")).toBeNull();
  });

  it("ends the subscription when it is removed, and starts it again when it is put back", async () => {
    const { hass, stops, subscribeMessage } = setup();
    const el = await mount(hass, weather());
    el.remove();
    expect(stops[0]).toHaveBeenCalledTimes(1);
    document.body.append(el);
    await settle(el);
    expect(subscribeMessage).toHaveBeenCalledTimes(2);
  });

  it("follows the entity: another one ends the old subscription and starts a new one; switching the forecast off ends it", async () => {
    const { hass, stops, subs } = setup();
    const el = await mount(hass, weather());
    el.stateObj = weather({}, "weather.other");
    await settle(el);
    expect(stops[0]).toHaveBeenCalledTimes(1);
    expect(subs[1].message.entity_id).toBe("weather.other");
    el.stateObj = weather({ temperature: 5 }, "weather.other"); // a new state of the same entity keeps the subscription
    await settle(el);
    expect(subs).toHaveLength(2);
    el.forecast = false;
    await settle(el);
    expect(stops[1]).toHaveBeenCalledTimes(1);
  });

  it("ends a subscription that is answered after the widget has gone, and drops a forecast of the entity that was shown before", async () => {
    const { hass, subs } = setup();
    let release!: (stop: () => void) => void;
    (hass.connection!.subscribeMessage as unknown) = vi.fn(() => new Promise((resolve) => (release = resolve)));
    const el = await mount(hass, weather());
    el.remove();
    const late = vi.fn();
    release(late);
    await Promise.resolve();
    await Promise.resolve();
    expect(late).toHaveBeenCalledTimes(1);
    expect(subs).toHaveLength(0);
  });

  it("writes the weekdays in the language", async () => {
    setLang("de");
    const { hass, subs } = setup();
    const el = await mount(hass, weather());
    subs[0].send({ forecast: DAYS });
    await settle(el);
    expect(el.shadowRoot!.querySelector(".day span")?.textContent).toMatch(/^Fr/);
  });
});
