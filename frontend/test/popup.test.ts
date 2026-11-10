// @vitest-environment happy-dom
// @vitest-environment-options {"url": "http://localhost:8123/ambidash"}
// The pop-up: the controls of each kind of device, and the ways to close it
import { afterEach, describe, expect, it, vi } from "vitest";
import { setLang } from "../src/i18n";
import "../src/popup";
import type { AmbidashPopup } from "../src/popup";
import type { Hass, HassEntity } from "../src/types";

const ent = (entity_id: string, state: string, attributes: Record<string, unknown> = {}): HassEntity => ({ entity_id, state, attributes: { friendly_name: "Thing", ...attributes }, last_changed: "" });

const mount = async (state: HassEntity) => {
  const hass = { states: { [state.entity_id]: state }, entities: {}, devices: {}, areas: {}, floors: {}, language: "en", callService: vi.fn(async () => undefined) } as unknown as Hass;
  const el = document.createElement("ambidash-popup") as AmbidashPopup;
  el.hass = hass;
  el.entityId = state.entity_id;
  document.body.append(el);
  await el.updateComplete;
  return { el, call: hass.callService as ReturnType<typeof vi.fn> };
};

const q = (el: AmbidashPopup, selector: string) => el.shadowRoot!.querySelector<HTMLElement>(selector);
const all = (el: AmbidashPopup, selector: string) => [...el.shadowRoot!.querySelectorAll<HTMLElement>(selector)];
const byLabel = (el: AmbidashPopup, label: string) => all(el, "button").find((b) => b.getAttribute("aria-label") === label || b.textContent?.trim() === label) as HTMLButtonElement;
const slide = (el: AmbidashPopup, value: number) => {
  const input = q(el, "input[type=range]") as HTMLInputElement;
  input.value = String(value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.dispatchEvent(new Event("change", { bubbles: true }));
};

afterEach(() => {
  document.body.innerHTML = "";
  setLang("en");
});

describe("pop-up", () => {
  it("names the device, shows how it is and has a dialog role", async () => {
    const { el } = await mount(ent("light.a", "on", { brightness: 128 }));
    expect(q(el, ".name")?.textContent).toBe("Thing");
    expect(q(el, ".state")?.textContent).toBe("On · 50%");
    expect(q(el, ".card")?.getAttribute("role")).toBe("dialog");
    expect(q(el, ".card")?.getAttribute("aria-modal")).toBe("true");
  });

  it("switches a light and sets brightness and colour temperature when the slider is let go", async () => {
    const { el, call } = await mount(ent("light.a", "on", { brightness: 128, supported_color_modes: ["color_temp"], color_temp_kelvin: 3000, min_color_temp_kelvin: 2000, max_color_temp_kelvin: 6500 }));
    byLabel(el, "On").click();
    expect(call).toHaveBeenCalledWith("light", "toggle", {}, { entity_id: "light.a" });
    const [brightness, kelvin] = all(el, "input[type=range]") as HTMLInputElement[];
    expect([brightness.value, kelvin.value, kelvin.min, kelvin.max]).toEqual(["50", "3000", "2000", "6500"]);
    brightness.value = "80";
    brightness.dispatchEvent(new Event("input", { bubbles: true }));
    expect(brightness.previousElementSibling?.textContent).toBe("80%");
    expect(call).toHaveBeenCalledTimes(1); // dragging only shows the value
    brightness.dispatchEvent(new Event("change", { bubbles: true }));
    expect(call).toHaveBeenLastCalledWith("light", "turn_on", { brightness_pct: 80 }, { entity_id: "light.a" });
    kelvin.value = "4000";
    kelvin.dispatchEvent(new Event("change", { bubbles: true }));
    expect(call).toHaveBeenLastCalledWith("light", "turn_on", { color_temp_kelvin: 4000 }, { entity_id: "light.a" });
  });

  it("shows no sliders for a light that is off or cannot dim", async () => {
    const off = await mount(ent("light.a", "off", { supported_color_modes: ["brightness"] }));
    expect(q(off.el, "input[type=range]")).toBeNull();
    expect(q(off.el, ".big")?.textContent?.trim()).toBe("Off");
    document.body.innerHTML = "";
    const plain = await mount(ent("light.b", "on", { supported_color_modes: ["onoff"] }));
    expect(q(plain.el, "input[type=range]")).toBeNull();
  });

  it("switches switches and activates scenes", async () => {
    const sw = await mount(ent("switch.a", "off"));
    q(sw.el, ".big")!.click();
    expect(sw.call).toHaveBeenCalledWith("switch", "toggle", {}, { entity_id: "switch.a" });
    document.body.innerHTML = "";
    const scene = await mount(ent("scene.a", "unknown"));
    byLabel(scene.el, "Activate").click();
    expect(scene.call).toHaveBeenCalledWith("scene", "turn_on", {}, { entity_id: "scene.a" });
  });

  it("steps the target temperature within its limits and sets the mode", async () => {
    const { el, call } = await mount(ent("climate.a", "heat", { temperature: 21, current_temperature: 19.5, target_temp_step: 0.5, min_temp: 7, max_temp: 21.2, hvac_modes: ["off", "heat", "auto"] }));
    expect(q(el, ".info")?.textContent).toBe("Now 19.5°");
    expect(q(el, ".stepper output")?.textContent).toBe("21°");
    byLabel(el, "Lower the target temperature").click();
    expect(call).toHaveBeenLastCalledWith("climate", "set_temperature", { temperature: 20.5 }, { entity_id: "climate.a" });
    byLabel(el, "Raise the target temperature").click();
    expect(call).toHaveBeenLastCalledWith("climate", "set_temperature", { temperature: 21.2 }, { entity_id: "climate.a" });
    expect(all(el, ".row button").map((b) => [b.textContent, b.classList.contains("on")])).toEqual([["Off", false], ["Heat", true], ["Auto", false]]);
    byLabel(el, "Off").click();
    expect(call).toHaveBeenLastCalledWith("climate", "set_hvac_mode", { hvac_mode: "off" }, { entity_id: "climate.a" });
  });

  it("offers no stepper for a thermostat without a target", async () => {
    const { el } = await mount(ent("climate.a", "off", { hvac_modes: ["off", "heat_cool", "fan_only", "dry", "cool"] }));
    expect(q(el, ".stepper")).toBeNull();
    expect(all(el, ".row button").map((b) => b.textContent)).toEqual(["Off", "Heat/Cool", "Fan", "Dry", "Cool"]);
  });

  it("opens, stops and closes a cover and sets its position", async () => {
    const { el, call } = await mount(ent("cover.a", "open", { supported_features: 15, current_position: 60 }));
    byLabel(el, "Open the cover").click();
    byLabel(el, "Stop the cover").click();
    byLabel(el, "Close the cover").click();
    expect(call.mock.calls.map((c) => c[1])).toEqual(["open_cover", "stop_cover", "close_cover"]);
    slide(el, 25);
    expect(call).toHaveBeenLastCalledWith("cover", "set_cover_position", { position: 25 }, { entity_id: "cover.a" });
  });

  it("leaves out what a cover cannot do", async () => {
    const { el } = await mount(ent("cover.a", "open", { supported_features: 3 }));
    expect(byLabel(el, "Stop the cover")).toBeUndefined();
    expect(q(el, "input[type=range]")).toBeNull();
  });

  it("plays, skips and sets the volume of a player", async () => {
    const { el, call } = await mount(ent("media_player.a", "playing", { media_title: "Song", media_artist: "Band", volume_level: 0.3 }));
    expect(q(el, ".info")?.textContent?.replace(/\s+/g, " ").trim()).toBe("Song · Band");
    byLabel(el, "Previous track").click();
    byLabel(el, "Play or pause").click();
    byLabel(el, "Next track").click();
    expect(call.mock.calls.map((c) => c[1])).toEqual(["media_previous_track", "media_play_pause", "media_next_track"]);
    expect((q(el, "input[type=range]") as HTMLInputElement).value).toBe("30");
    slide(el, 55);
    expect(call).toHaveBeenLastCalledWith("media_player", "volume_set", { volume_level: 0.55 }, { entity_id: "media_player.a" });
  });

  it("closes with the close button, Escape and a click beside the card, but not with a click on it", async () => {
    const { el } = await mount(ent("sensor.a", "20"));
    let closed = 0;
    el.addEventListener("close", () => closed++);
    q(el, ".card")!.click();
    expect(closed).toBe(0);
    byLabel(el, "Close").click();
    q(el, ".overlay")!.click();
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "a" }));
    expect(closed).toBe(3);
    el.remove();
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(closed).toBe(3);
  });

  it("leads to Home Assistant's own dialog and closes", async () => {
    const { el } = await mount(ent("light.a", "on"));
    const seen: string[] = [];
    document.addEventListener("hass-more-info", (e) => seen.push((e as CustomEvent).detail.entityId));
    let closed = 0;
    el.addEventListener("close", () => closed++);
    byLabel(el, "More options").click();
    expect(seen).toEqual(["light.a"]);
    expect(closed).toBe(1);
  });

  it("shows nothing for a device that is gone, and takes the language of the card", async () => {
    const { el } = await mount(ent("light.a", "on"));
    el.entityId = "light.gone";
    await el.updateComplete;
    expect(q(el, ".card")).toBeNull();
    setLang("de");
    el.entityId = "light.a";
    await el.updateComplete;
    expect(byLabel(el, "Schließen")).toBeDefined();
    expect(q(el, "footer button")?.textContent).toBe("Mehr Optionen");
  });
});
