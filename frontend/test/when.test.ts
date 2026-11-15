// "When is this shown?" as sentences: which sentence a condition list says, and the rules of the simple form
import { describe, expect, it } from "vitest";
import { toYaml } from "../src/studio/options";
import { REST_WHEN, WHEN, readConditions, restWhenOf, stateIf, stateRule, whenOf } from "../src/studio/when";
import { parseYaml } from "../src/studio/yaml";
import type { Condition } from "../src/types";

describe("whenOf", () => {
  it("says always for no conditions", () => {
    expect(whenOf(undefined)).toBe("always");
    expect(whenOf([])).toBe("always");
  });

  it("finds each ready-made sentence by its conditions", () => {
    for (const w of WHEN) expect(whenOf(w.show_if), w.id).toBe(w.id);
  });

  it("knows a device in a state, with is and is not", () => {
    expect(whenOf(stateIf("binary_sensor.door", "on", false))).toBe("state");
    expect(whenOf(stateIf("binary_sensor.door", "open", true))).toBe("state");
  });

  it("calls everything else custom", () => {
    expect(whenOf([{ condition: "time", after: "09:00", before: "10:00" }])).toBe("custom");
    expect(whenOf([{ condition: "state", entity: "a.b", state: ["on", "open"] }])).toBe("custom");
    expect(whenOf([{ condition: "state", entity: "a.b", state: "on", attribute: "mode" }])).toBe("custom");
    expect(whenOf([{ condition: "numeric", entity: "a.b", above: 3 }])).toBe("custom");
    expect(whenOf([...stateIf("a.b", "on", false), { condition: "device", devices: ["wall"] }])).toBe("custom");
  });
});

describe("stateRule and stateIf", () => {
  it("go back and forth", () => {
    expect(stateRule(stateIf("light.x", "off", true))).toEqual({ entity: "light.x", state: "off", not: true });
    expect(stateIf("light.x", "on", false)).toEqual([{ condition: "state", entity: "light.x", state: "on" }]);
    expect(stateIf("light.x", "on", true)).toEqual([{ condition: "not_state", entity: "light.x", state: "on" }]);
  });

  it("is not there for conditions the form cannot show", () => {
    expect(stateRule(undefined)).toBeUndefined();
    expect(stateRule([])).toBeUndefined();
    expect(stateRule([{ condition: "device", devices: ["wall"] }])).toBeUndefined();
  });
});

describe("the sentences for when the Ruhemodus may start", () => {
  it("are the times of day and not while a media player plays, each found again by its conditions", () => {
    expect(REST_WHEN.map((w) => w.id)).toEqual(["always", "morning", "day", "evening", "night", "quiet"]);
    for (const w of REST_WHEN) expect(restWhenOf(w.show_if), w.id).toBe(w.id);
    expect(REST_WHEN.find((w) => w.id === "quiet")!.show_if[0]).toMatchObject({ condition: "template" });
  });

  it("call no conditions always, and anything else custom", () => {
    expect(restWhenOf(undefined)).toBe("always");
    expect(restWhenOf([])).toBe("always");
    expect(restWhenOf([{ condition: "time", after: "01:00" }])).toBe("custom");
    expect(restWhenOf([{ condition: "device", devices: ["wall"] }])).toBe("custom"); // the device classes have their own option
  });
});

describe("readConditions", () => {
  it("reads a list of conditions, and no text as none", () => {
    expect(readConditions("")).toEqual([]);
    expect(readConditions("  \n")).toEqual([]);
    expect(readConditions("- condition: state\n  entity: light.a\n  state: 'on'\n")).toEqual([{ condition: "state", entity: "light.a", state: "on" }]);
  });

  it("says what is wrong with anything else", () => {
    expect(readConditions("- condition: [state")).toContain("Not valid YAML: line 1");
    for (const bad of ["condition: state", "- entity: light.a", "- 5", "just text"]) expect(readConditions(bad), bad).toBe("The conditions are a list, and each has a condition type, for example - condition: state.");
  });
});

describe("the ready-made sentences", () => {
  it("are valid conditions that read back from their YAML", () => {
    for (const w of WHEN.filter((x) => x.show_if.length)) expect(parseYaml(toYaml(w.show_if)) as Condition[], w.id).toEqual(w.show_if);
  });
});
