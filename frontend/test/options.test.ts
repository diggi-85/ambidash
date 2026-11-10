// The Studio's small helpers: hidden lists and YAML
import { describe, expect, it } from "vitest";
import { toYaml, toggleIn } from "../src/studio/options";

describe("toggleIn", () => {
  it("adds once, removes, and leaves no empty list", () => {
    expect(toggleIn(undefined, "light", true)).toEqual(["light"]);
    expect(toggleIn(["light"], "light", true)).toEqual(["light"]);
    expect(toggleIn(["light", "cover"], "light", false)).toEqual(["cover"]);
    expect(toggleIn(["light"], "light", false)).toBeUndefined();
    expect(toggleIn(undefined, "light", false)).toBeUndefined();
  });

  it("does not change the list it is given", () => {
    const list = ["a"];
    toggleIn(list, "b", true);
    expect(list).toEqual(["a"]);
  });
});

describe("toYaml", () => {
  it("writes objects, lists, strings, numbers and booleans", () => {
    expect(toYaml({ type: "custom:ambidash", design: "home", fullscreen: true, background: { gradient: ["#111111", "#222222"], angle: 160 } })).toBe(
      ['type: "custom:ambidash"', 'design: "home"', "fullscreen: true", "background:", "  gradient:", '    - "#111111"', '    - "#222222"', "  angle: 160"].join("\n"),
    );
  });

  it("lines up lists of objects under their dash", () => {
    const pages = [{ id: "p1", name: "Ground", items: [{ id: "t1", type: "tile", entity: "light.a" }], layouts: {} }];
    expect(toYaml({ pages })).toBe(
      ["pages:", '  - id: "p1"', '    name: "Ground"', "    items:", '      - id: "t1"', '        type: "tile"', '        entity: "light.a"', "    layouts: {}"].join("\n"),
    );
  });

  it("quotes what could be read as something else, and skips undefined", () => {
    expect(toYaml({ a: "yes", b: "12", c: 'say "hi": now', d: undefined, e: [] })).toBe(['a: "yes"', 'b: "12"', 'c: "say \\"hi\\": now"', "e: []"].join("\n"));
  });
});
