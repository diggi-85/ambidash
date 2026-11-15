// How a tile looks while a state rule holds: the first rule that holds wins, colours are the design's own
import { onColor, resolveTokens } from "@ambi/core";
import { describe, expect, it } from "vitest";
import { lookFor } from "../src/statestyle";
import type { Hass, HassEntity, StateStyle } from "../src/types";

const ent = (entity_id: string, state: string): HassEntity => ({ entity_id, state, attributes: {}, last_changed: "" });
const hass = (...states: HassEntity[]): Hass => ({ states: Object.fromEntries(states.map((s) => [s.entity_id, s])) }) as unknown as Hass;
const tokens = resolveTokens("home", "dark");
const door = (state: string) => hass(ent("binary_sensor.door", state), ent("sensor.temp", "27"));

describe("lookFor", () => {
  const rules: StateStyle[] = [
    { when: [{ condition: "state", entity: "binary_sensor.door", state: "off" }], color: "good" },
    { when: [{ condition: "numeric", entity: "sensor.temp", above: 25 }], color: "alert", icon: "mdi:fire" },
    { when: [{ condition: "state", entity: "binary_sensor.door", state: "on" }], status: "Open" },
  ];

  it("takes the first rule that holds, with the design's colour and a glyph colour that reads on it", () => {
    expect(lookFor(door("on"), rules, tokens)).toEqual({ color: tokens.alert, glyph: onColor(tokens.alert), icon: "mdi:fire" });
    expect(lookFor(door("off"), rules, tokens)).toEqual({ color: tokens.good, glyph: onColor(tokens.good) });
  });

  it("changes only what the rule asks for", () => {
    const only: StateStyle[] = [{ when: [{ condition: "state", entity: "binary_sensor.door", state: "on" }], status: "Open" }];
    expect(lookFor(door("on"), only, tokens)).toEqual({ status: "Open" });
  });

  it("changes nothing when no rule holds or there are none", () => {
    expect(lookFor(door("on"), [rules[0]], tokens)).toBeUndefined();
    expect(lookFor(door("on"), [], tokens)).toBeUndefined();
    expect(lookFor(door("on"), undefined, tokens)).toBeUndefined();
  });

  it("follows the design: another design gives another colour", () => {
    const rule: StateStyle[] = [{ when: [{ condition: "state", entity: "binary_sensor.door", state: "on" }], color: "accent" }];
    const bauhaus = resolveTokens("bauhaus", "light");
    expect(lookFor(door("on"), rule, tokens)?.color).toBe(tokens.accent);
    expect(lookFor(door("on"), rule, bauhaus)?.color).toBe(bauhaus.accent);
    expect(tokens.accent).not.toBe(bauhaus.accent);
  });

  it("shows what a template makes of a status text, and nothing until it has an answer", () => {
    const rule: StateStyle[] = [{ when: [{ condition: "state", entity: "binary_sensor.door", state: "on" }], color: "good", status: "{{ states('sensor.temp') }} °C" }];
    expect(lookFor(door("on"), rule, tokens, { templates: () => "27 °C" })).toEqual({ color: tokens.good, glyph: onColor(tokens.good), status: "27 °C" });
    expect(lookFor(door("on"), rule, tokens, { templates: () => 27 })?.status).toBe("27");
    expect(lookFor(door("on"), rule, tokens, { templates: () => undefined })).toEqual({ color: tokens.good, glyph: onColor(tokens.good) });
    expect(lookFor(door("on"), rule, tokens)).toEqual({ color: tokens.good, glyph: onColor(tokens.good) });
  });

  it("takes a rule whose condition is a template when its answer is yes", () => {
    const rule: StateStyle[] = [{ when: [{ condition: "template", value_template: "{{ a }}" }], color: "alert" }];
    expect(lookFor(door("on"), rule, tokens, { templates: () => true })?.color).toBe(tokens.alert);
    expect(lookFor(door("on"), rule, tokens, { templates: () => false })).toBeUndefined();
  });

  it("asks the device class too", () => {
    const wall: StateStyle[] = [{ when: [{ condition: "device", devices: ["wall"] }], color: "accent" }];
    expect(lookFor(door("on"), wall, tokens, { device: "phone" })).toBeUndefined();
    expect(lookFor(door("on"), wall, tokens, { device: "wall" })?.color).toBe(tokens.accent);
  });
});
