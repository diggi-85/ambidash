// When something is shown: state, number, time, device and the groups
import { describe, expect, it } from "vitest";
import { checkAll, checkCondition, templatesIn, usesTime } from "../src/conditions";
import type { Condition, Hass, HassEntity } from "../src/types";

const ent = (entity_id: string, state: string, attributes: Record<string, unknown> = {}): HassEntity => ({ entity_id, state, attributes, last_changed: "" });
const hass = (...states: HassEntity[]): Hass => ({ states: Object.fromEntries(states.map((s) => [s.entity_id, s])) }) as unknown as Hass;
const at = (hhmm: string): Date => new Date(`2026-11-12T${hhmm}:00`);

const door = hass(ent("binary_sensor.door", "on"), ent("sensor.temp", "21.5", { unit: "°C", battery: "80" }), ent("sensor.broken", "unavailable"));

describe("state and not_state", () => {
  it("compares the state, or one of several", () => {
    expect(checkCondition(door, { condition: "state", entity: "binary_sensor.door", state: "on" })).toBe(true);
    expect(checkCondition(door, { condition: "state", entity: "binary_sensor.door", state: "off" })).toBe(false);
    expect(checkCondition(door, { condition: "state", entity: "binary_sensor.door", state: ["off", "on"] })).toBe(true);
    expect(checkCondition(door, { condition: "not_state", entity: "binary_sensor.door", state: "off" })).toBe(true);
    expect(checkCondition(door, { condition: "not_state", entity: "binary_sensor.door", state: ["on"] })).toBe(false);
  });

  it("can look at an attribute", () => {
    expect(checkCondition(door, { condition: "state", entity: "sensor.temp", attribute: "unit", state: "°C" })).toBe(true);
    expect(checkCondition(door, { condition: "state", entity: "sensor.temp", attribute: "nope", state: "°C" })).toBe(false);
  });

  it("treats an entity that is not there as in no state", () => {
    expect(checkCondition(door, { condition: "state", entity: "light.gone", state: "on" })).toBe(false);
    expect(checkCondition(door, { condition: "not_state", entity: "light.gone", state: "on" })).toBe(true);
  });
});

describe("numeric", () => {
  it("needs the value above and below, both exclusive", () => {
    expect(checkCondition(door, { condition: "numeric", entity: "sensor.temp", above: 21 })).toBe(true);
    expect(checkCondition(door, { condition: "numeric", entity: "sensor.temp", above: 21.5 })).toBe(false);
    expect(checkCondition(door, { condition: "numeric", entity: "sensor.temp", below: 22, above: 20 })).toBe(true);
    expect(checkCondition(door, { condition: "numeric", entity: "sensor.temp", below: 21.5 })).toBe(false);
  });

  it("reads an attribute, and is false for what is not a number", () => {
    expect(checkCondition(door, { condition: "numeric", entity: "sensor.temp", attribute: "battery", below: 90 })).toBe(true);
    expect(checkCondition(door, { condition: "numeric", entity: "sensor.broken", above: 0 })).toBe(false);
    expect(checkCondition(door, { condition: "numeric", entity: "light.gone", above: 0 })).toBe(false);
    expect(checkCondition(door, { condition: "numeric", entity: "sensor.temp", attribute: "missing", above: 0 })).toBe(false);
  });
});

describe("time", () => {
  const between: Condition = { condition: "time", after: "08:00", before: "18:00" };
  it("is true from the start minute up to the end minute", () => {
    expect(checkCondition(door, between, { now: at("07:59") })).toBe(false);
    expect(checkCondition(door, between, { now: at("08:00") })).toBe(true);
    expect(checkCondition(door, between, { now: at("17:59") })).toBe(true);
    expect(checkCondition(door, between, { now: at("18:00") })).toBe(false);
  });

  it("runs over midnight", () => {
    const night: Condition = { condition: "time", after: "22:00", before: "05:00" };
    expect(checkCondition(door, night, { now: at("23:30") })).toBe(true);
    expect(checkCondition(door, night, { now: at("04:59") })).toBe(true);
    expect(checkCondition(door, night, { now: at("12:00") })).toBe(false);
  });

  it("may have only one end", () => {
    expect(checkCondition(door, { condition: "time", after: "17:00" }, { now: at("20:00") })).toBe(true);
    expect(checkCondition(door, { condition: "time", before: "11:00" }, { now: at("20:00") })).toBe(false);
  });
});

describe("device", () => {
  it("holds on the listed device classes, and where the class is not known", () => {
    const wall: Condition = { condition: "device", devices: ["wall", "tablet"] };
    expect(checkCondition(door, wall, { device: "wall" })).toBe(true);
    expect(checkCondition(door, wall, { device: "phone" })).toBe(false);
    expect(checkCondition(door, wall)).toBe(true);
  });
});

describe("groups", () => {
  const on: Condition = { condition: "state", entity: "binary_sensor.door", state: "on" };
  const off: Condition = { condition: "state", entity: "binary_sensor.door", state: "off" };
  it("and, or, not", () => {
    expect(checkCondition(door, { condition: "and", conditions: [on, off] })).toBe(false);
    expect(checkCondition(door, { condition: "or", conditions: [off, on] })).toBe(true);
    expect(checkCondition(door, { condition: "not", conditions: [off] })).toBe(true);
    expect(checkCondition(door, { condition: "not", conditions: [on, off] })).toBe(false);
  });

  it("nest", () => {
    const c: Condition = { condition: "and", conditions: [on, { condition: "or", conditions: [off, { condition: "time", after: "08:00" }] }] };
    expect(checkCondition(door, c, { now: at("09:00") })).toBe(true);
    expect(checkCondition(door, c, { now: at("07:00") })).toBe(false);
  });
});

describe("checkAll", () => {
  it("shows what has no conditions, and needs every one otherwise", () => {
    const on: Condition = { condition: "state", entity: "binary_sensor.door", state: "on" };
    expect(checkAll(door, undefined)).toBe(true);
    expect(checkAll(door, [])).toBe(true);
    expect(checkAll(door, [on, { condition: "numeric", entity: "sensor.temp", above: 30 }])).toBe(false);
    expect(checkAll(door, [on, { condition: "numeric", entity: "sensor.temp", above: 20 }])).toBe(true);
  });

  it("shows an item whose condition this version does not know", () => {
    expect(checkAll(door, [{ condition: "from_the_future" } as unknown as Condition])).toBe(true);
  });
});

describe("template", () => {
  const holds = (value: unknown) => checkCondition(door, { condition: "template", value_template: "{{ x }}" }, { templates: () => value });

  it("holds for what Home Assistant calls true", () => {
    for (const yes of [true, 1, 2.5, -1, "true", "True", "on", "yes", "enable", "1", " on "]) expect(holds(yes), String(yes)).toBe(true);
  });

  it("does not hold for anything else, nor while there is no result", () => {
    for (const no of [false, 0, "false", "off", "no", "0", "", "unavailable", null, [], {}]) expect(holds(no), String(no)).toBe(false);
    expect(holds(undefined)).toBe(false);
    expect(checkCondition(door, { condition: "template", value_template: "{{ x }}" })).toBe(false);
  });

  it("asks for each template by its text, also inside groups", () => {
    const results: Record<string, unknown> = { "{{ a }}": true, "{{ b }}": false };
    const ctx = { templates: (source: string) => results[source] };
    expect(checkCondition(door, { condition: "and", conditions: [{ condition: "template", value_template: "{{ a }}" }, { condition: "not", conditions: [{ condition: "template", value_template: "{{ b }}" }] }] }, ctx)).toBe(true);
    expect(checkAll(door, [{ condition: "template", value_template: "{{ a }}" }, { condition: "template", value_template: "{{ b }}" }], ctx)).toBe(false);
  });

  it("is found among the conditions, also inside groups", () => {
    expect(templatesIn(undefined)).toEqual([]);
    expect(templatesIn([{ condition: "time", after: "08:00" }])).toEqual([]);
    expect(templatesIn([{ condition: "template", value_template: "{{ a }}" }, { condition: "or", conditions: [{ condition: "not", conditions: [{ condition: "template", value_template: "{{ b }}" }] }] }])).toEqual(["{{ a }}", "{{ b }}"]);
  });
});

describe("usesTime", () => {
  it("finds a time condition, also inside groups", () => {
    expect(usesTime(undefined)).toBe(false);
    expect(usesTime([{ condition: "state", entity: "a.b", state: "on" }])).toBe(false);
    expect(usesTime([{ condition: "time", after: "08:00" }])).toBe(true);
    expect(usesTime([{ condition: "or", conditions: [{ condition: "not", conditions: [{ condition: "time", before: "05:00" }] }] }])).toBe(true);
  });
});
