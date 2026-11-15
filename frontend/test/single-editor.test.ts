// @vitest-environment happy-dom
// @vitest-environment-options {"url": "http://localhost:8123/lovelace/0"}
// The visual editor of the single cards: which fields each card gets, and that only what differs from the default is written
import { afterEach, describe, expect, it, vi } from "vitest";
import { lang, setLang } from "../src/i18n";
import { AmbidashClockCard, AmbidashTileCard, AmbidashWeatherCard } from "../src/single";
import type { Hass } from "../src/types";

const hass = (language = "en") => ({ states: {}, language, themes: { darkMode: false } }) as unknown as Hass;

type Editor = HTMLElement & { setConfig(config: object): void; hass: Hass; updateComplete: Promise<boolean> };
interface Form extends HTMLElement {
  schema: { name: string; selector: Record<string, Record<string, unknown>> }[];
  data: Record<string, unknown>;
  computeLabel(s: { name: string }): string;
  computeHelper(s: { name: string }): string | undefined;
}
const open = async (config: object, h = hass()): Promise<{ editor: Editor; form: Form }> => {
  const editor = AmbidashClockCard.getConfigElement() as Editor;
  editor.setConfig(config);
  editor.hass = h;
  document.body.append(editor);
  await editor.updateComplete;
  return { editor, form: editor.shadowRoot!.querySelector<Form>("ha-form")! };
};
/** What the card dialog receives after the user changes `value` in the form */
const edit = (editor: Editor, form: Form, value: Record<string, unknown>): object => {
  const seen = vi.fn();
  editor.addEventListener("config-changed", (e) => seen((e as CustomEvent).detail.config));
  form.dispatchEvent(new CustomEvent("value-changed", { detail: { value: { ...form.data, ...value } } }));
  return seen.mock.calls[0][0];
};
const names = (form: Form) => form.schema.map((s) => s.name);

afterEach(() => {
  document.body.innerHTML = "";
  setLang("en");
});

describe("the card editor", () => {
  it("is what all three cards hand to Home Assistant", () => {
    for (const card of [AmbidashClockCard, AmbidashWeatherCard, AmbidashTileCard]) expect(card.getConfigElement().localName).toBe("ambidash-card-editor");
  });

  it("gives each card the fields it has, and all of them the look", async () => {
    expect(names((await open({ type: "custom:ambidash-clock-card" })).form)).toEqual(["format", "seconds", "date", "no_background", "design", "mode", "palette", "accent", "language"]);
    expect(names((await open({ type: "custom:ambidash-weather-card", entity: "weather.home" })).form).slice(0, 3)).toEqual(["entity", "forecast", "no_background"]);
    expect(names((await open({ type: "custom:ambidash-tile-card", entity: "light.lamp" })).form).slice(0, 4)).toEqual(["entity", "name", "tap", "hold"]);
  });

  it("limits the entity to what the card can show", async () => {
    const weather = (await open({ type: "custom:ambidash-weather-card" })).form.schema[0].selector.entity;
    const tile = (await open({ type: "custom:ambidash-tile-card" })).form.schema[0].selector.entity;
    expect(weather).toEqual({ filter: { domain: "weather" } });
    expect(tile).toEqual({ filter: { domain: ["light", "switch", "climate", "cover", "media_player", "scene"] } });
  });

  it("shows the defaults for what the card does not say, and what it does say", async () => {
    const { form } = await open({ type: "custom:ambidash-clock-card", seconds: true, design: "newspaper" });
    expect(form.data).toMatchObject({ format: "auto", seconds: true, date: true, no_background: false, design: "newspaper", mode: "default", accent: "" });
    const tile = await open({ type: "custom:ambidash-tile-card", entity: "light.lamp", hold_action: { action: "none" } });
    expect(tile.form.data).toMatchObject({ entity: "light.lamp", tap: "toggle", hold: "none" });
  });

  it("offers every design and palette", async () => {
    const { form } = await open({ type: "custom:ambidash-clock-card" });
    const options = (name: string) => (form.schema.find((s) => s.name === name)!.selector.select.options as { value: string }[]).map((o) => o.value);
    expect(options("design")).toEqual(expect.arrayContaining(["default", "home", "seasons", "newspaper"]));
    expect(options("palette")).toEqual(expect.arrayContaining(["default", "nordic"]));
  });

  it("writes only what differs from the default", async () => {
    const { editor, form } = await open({ type: "custom:ambidash-clock-card", format: "24", seconds: true });
    expect(edit(editor, form, { format: "12", date: false, design: "newspaper" })).toEqual({ type: "custom:ambidash-clock-card", format: "12", seconds: true, date: false, design: "newspaper" });
    expect(edit(editor, form, { format: "auto", seconds: false, design: "default" })).toEqual({ type: "custom:ambidash-clock-card" });
  });

  it("turns tap and hold into actions, and the defaults back into nothing", async () => {
    const { editor, form } = await open({ type: "custom:ambidash-tile-card", entity: "light.lamp", name: "Lamp" });
    expect(edit(editor, form, { tap: "more-info", hold: "none" })).toEqual({ type: "custom:ambidash-tile-card", entity: "light.lamp", name: "Lamp", tap_action: { action: "more-info" }, hold_action: { action: "none" } });
    expect(edit(editor, form, { tap: "toggle", hold: "more-info", name: "" })).toEqual({ type: "custom:ambidash-tile-card", entity: "light.lamp" });
  });

  it("keeps what the form does not know (the type, a YAML-only key)", async () => {
    const { editor, form } = await open({ type: "custom:ambidash-weather-card", entity: "weather.home", grid_options: { columns: 6 } });
    expect(edit(editor, form, { forecast: false })).toEqual({ type: "custom:ambidash-weather-card", entity: "weather.home", grid_options: { columns: 6 }, forecast: false });
  });

  it("keeps the form's own value-changed to itself", async () => {
    const { editor, form } = await open({ type: "custom:ambidash-clock-card" });
    const outer = vi.fn();
    editor.addEventListener("value-changed", outer);
    form.dispatchEvent(new CustomEvent("value-changed", { detail: { value: { ...form.data } }, bubbles: true, composed: true }));
    expect(outer).not.toHaveBeenCalled();
  });

  it("labels the fields in the language of the Home Assistant user and leaves the card's language alone", async () => {
    setLang("fr");
    const { form } = await open({ type: "custom:ambidash-clock-card", language: "fr" }, hass("de"));
    expect(form.computeLabel({ name: "seconds" })).toBe("Sekunden zeigen");
    expect(form.computeLabel({ name: "design" })).toBe("Design");
    expect(form.computeHelper({ name: "accent" })).toContain("#ff6b35");
    expect(lang()).toBe("fr");
  });

  it("shows nothing until it has the config and hass", async () => {
    const editor = AmbidashClockCard.getConfigElement() as Editor;
    document.body.append(editor);
    await editor.updateComplete;
    expect(editor.shadowRoot!.querySelector("ha-form")).toBeNull();
  });
});
