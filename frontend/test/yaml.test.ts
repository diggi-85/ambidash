// The YAML reader for pasted card configurations, and its way back (toYaml)
import { describe, expect, it } from "vitest";
import { toYaml } from "../src/studio/options";
import { YamlError, parseYaml } from "../src/studio/yaml";

describe("parseYaml", () => {
  it("reads the card Home Assistant's editors write: maps, lists, scalars", () => {
    const yaml = `type: tile
entity: light.kitchen
name: "Kitchen: main"   # a comment
show_entity_picture: false
vertical: true
features_position: bottom
icon_tap_action:
  action: toggle
tap_action: {action: navigate, navigation_path: /lights}
columns: 3
ratio: 1.5
nothing:
empty: ~
`;
    expect(parseYaml(yaml)).toEqual({
      type: "tile",
      entity: "light.kitchen",
      name: "Kitchen: main",
      show_entity_picture: false,
      vertical: true,
      features_position: "bottom",
      icon_tap_action: { action: "toggle" },
      tap_action: { action: "navigate", navigation_path: "/lights" },
      columns: 3,
      ratio: 1.5,
      nothing: null,
      empty: null,
    });
  });

  it("reads lists of scalars and of maps, indented or at the key's column", () => {
    const yaml = `type: entities
title: Lights
entities:
  - light.a
  - entity: light.b
    name: B
    secondary_info: last-changed
  - type: divider
extra:
- x
- 'it''s'
- "tab\\there"
after: 1
`;
    expect(parseYaml(yaml)).toEqual({
      type: "entities",
      title: "Lights",
      entities: ["light.a", { entity: "light.b", name: "B", secondary_info: "last-changed" }, { type: "divider" }],
      extra: ["x", "it's", "tab\there"],
      after: 1,
    });
  });

  it("reads flow lists and maps, nested, and quoted keys", () => {
    expect(parseYaml("a: [1, two, 'three', [4, 5], {six: 6}]\n\"b c\": {x: y, 'z': [ ]}")).toEqual({ a: [1, "two", "three", [4, 5], { six: 6 }], "b c": { x: "y", z: [] } });
    expect(parseYaml("[a, b]")).toEqual(["a", "b"]);
    expect(parseYaml("{}")).toEqual({});
  });

  it("reads | and > blocks with their chomping, as templates in custom cards use them", () => {
    const yaml = `type: custom:button-card
template: |
  [[[
    return entity.state === 'on';
  ]]]
label: >-
  one
  two

  three
keep: |+
  x

after: ok
strip: |-
  y
`;
    expect(parseYaml(yaml)).toEqual({
      type: "custom:button-card",
      template: "[[[\n  return entity.state === 'on';\n]]]\n",
      label: "one two\nthree",
      keep: "x\n\n",
      after: "ok",
      strip: "y",
    });
  });

  it("reads a block as a list item and keeps # inside a block", () => {
    expect(parseYaml("- |\n  a # not a comment\n  b\n- next")).toEqual(["a # not a comment\nb\n", "next"]);
  });

  it("keeps a # inside quotes or a URL, and takes it as a comment after a space", () => {
    expect(parseYaml('color: "#ff0000"\nurl: http://x/#y\nlabel: hi # gone\nfrag: a#b')).toEqual({ color: "#ff0000", url: "http://x/#y", label: "hi", frag: "a#b" });
  });

  it("types scalars like YAML 1.2: on and yes stay strings, 007 is a string", () => {
    expect(parseYaml("a: on\nb: yes\nc: 007\nd: -3\ne: 1e3\nf: null\ng: True")).toEqual({ a: "on", b: "yes", c: "007", d: -3, e: 1000, f: null, g: true });
  });

  it("takes a leading --- and returns null for nothing", () => {
    expect(parseYaml("---\ntype: markdown")).toEqual({ type: "markdown" });
    expect(parseYaml("")).toBeNull();
    expect(parseYaml("# only a comment\n")).toBeNull();
  });

  it("reads a Bubble Card style config with nested maps and lists", () => {
    const yaml = `type: custom:bubble-card
card_type: pop-up
hash: '#kitchen'
name: Kitchen
button_action:
  tap_action:
    action: navigate
sub_button:
  - entity: light.kitchen
    icon: mdi:lightbulb
    show_background: false
styles: |
  .bubble-icon { color: red; }
`;
    expect(parseYaml(yaml)).toEqual({
      type: "custom:bubble-card",
      card_type: "pop-up",
      hash: "#kitchen",
      name: "Kitchen",
      button_action: { tap_action: { action: "navigate" } },
      sub_button: [{ entity: "light.kitchen", icon: "mdi:lightbulb", show_background: false }],
      styles: ".bubble-icon { color: red; }\n",
    });
  });

  it.each([
    ["a: &x 1", "line 1"],
    ["a: *x", "line 1"],
    ["a: !!str 1", "line 1"],
    ["a: 1\n\tb: 2", "line 2"],
    ["a: 1\na: 2", "line 2"],
    ["a: 1\n  b: 2", "line 2"],
    ["a: 'open", "line 1"],
    ["a: [1, 2", "line 1"],
    ["a: [1] x", "line 1"],
    ["a: 1\n- b", "line 2"],
    ["__proto__: 1", "line 1"],
    ["a: |2\n  x", "line 1"],
    ["a: \"\\q\"", "line 1"],
  ])("refuses %j (%s)", (yaml, where) => {
    expect(() => parseYaml(yaml)).toThrow(YamlError);
    expect(() => parseYaml(yaml)).toThrow(where);
  });
});

describe("toYaml and parseYaml together", () => {
  const cases: unknown[] = [
    { type: "tile", entity: "light.a", name: "A: B", on: "yes", n: 3, ok: true, nothing: null },
    { type: "entities", entities: ["light.a", { entity: "light.b", name: "B" }, []], opts: {}, deep: { a: { b: { c: [1, [2, 3], { d: "e" }] } } } },
    { template: "[[[\n  return 1;\n]]]\n", label: "one\ntwo", keep: "x\n\n", strip: "y\nz", list: ["a\nb", { m: "p\nq\n" }] },
    { "odd key": 1, "a: b": 2, true: 3, "1": 4 },
    { text: " leading space\nsecond", tabbed: "a\tb", cr: "a\r\nb", blank: "a\n \nb" },
  ];
  it.each(cases.map((c, i) => [i, c] as const))("round trip %i", (_, value) => {
    expect(parseYaml(toYaml(value))).toEqual(value);
  });

  it("writes multi-line strings as blocks", () => {
    expect(toYaml({ t: "a\nb" })).toBe("t: |-\n  a\n  b");
    expect(toYaml({ t: "a\nb\n" })).toBe("t: |\n  a\n  b");
    expect(toYaml(["a\nb"])).toBe("- |-\n  a\n  b");
  });
});
