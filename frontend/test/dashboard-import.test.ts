// Importing a Home Assistant dashboard: views become pages, cards become tiles, headings or embedded cards
import { describe, expect, it } from "vitest";
import { importDashboard } from "../src/studio/dashboard-import";
import type { LayoutItem, Page } from "../src/types";

const ok = (config: unknown, existing: Page[] = []) => {
  const result = importDashboard(config, existing);
  if (!result.ok) throw new Error(`not imported: ${result.reason}`);
  return result;
};
const items = (page: Page): Omit<LayoutItem, "id">[] => page.items.map(({ id: _id, ...rest }) => rest);

describe("importDashboard", () => {
  it("makes a page of each view, named after its title or path", () => {
    const { pages, report } = ok({ views: [{ title: "Kitchen", cards: [{ type: "tile", entity: "light.a" }] }, { path: "garden", cards: [{ type: "tile", entity: "light.b" }] }, { cards: [{ type: "tile", entity: "light.c" }] }] });
    expect(pages.map((p) => [p.id, p.name])).toEqual([["page-1", "Kitchen"], ["page-2", "garden"], ["page-3", "Page 3"]]);
    expect(report).toMatchObject({ pages: 3, tiles: 3, headings: 0, cards: 0, skipped: 0, badges: false, cut: false });
  });

  it("turns tile cards of supported devices into tiles, keeping the name and what tap and hold do", () => {
    const { pages } = ok({
      views: [
        {
          cards: [
            { type: "tile", entity: "light.a", name: "Reading light" },
            { type: "light", entity: "light.b" },
            { type: "thermostat", entity: "climate.c" },
            { type: "button", entity: "scene.d", name: " " },
            { type: "tile", entity: "cover.e", tap_action: { action: "more-info" }, hold_action: { action: "none" } },
            { type: "tile", entity: "switch.f", tap_action: { action: "toggle" }, grid_options: { columns: 6 } },
          ],
        },
      ],
    });
    expect(items(pages[0])).toEqual([
      { type: "tile", entity: "light.a", name: "Reading light" },
      { type: "tile", entity: "light.b" },
      { type: "tile", entity: "climate.c" },
      { type: "tile", entity: "scene.d" },
      { type: "tile", entity: "cover.e", tap: "more-info", hold: "none" },
      { type: "tile", entity: "switch.f" },
    ]);
  });

  it("embeds a tile card when it would lose something: other actions, icons, features, unsupported devices", () => {
    const cards = [
      { type: "tile", entity: "light.a", tap_action: { action: "navigate", navigation_path: "/x" } },
      { type: "tile", entity: "light.a", hold_action: { action: "toggle" } },
      { type: "tile", entity: "light.a", icon: "mdi:lamp" },
      { type: "tile", entity: "light.a", features: [{ type: "light-brightness" }] },
      { type: "tile", entity: "sensor.temperature" },
      { type: "tile", entity: "light.a", visibility: [{ condition: "screen", media_query: "(min-width: 600px)" }] },
      { type: "tile", entity: "Light.A" },
    ];
    const { pages, report } = ok({ views: [{ cards }] });
    expect(items(pages[0])).toEqual(cards.map((card) => ({ type: "card", card })));
    expect(report).toMatchObject({ tiles: 0, cards: 7, conditions: 0 });
  });

  describe("conditions", () => {
    const door = { condition: "state", entity: "binary_sensor.door", state: "on" } as const;
    const only = (cards: unknown[]) => items(ok({ views: [{ cards }] }).pages[0]);

    it("takes the visibility of a card over as the conditions of its item, and the card no longer has it", () => {
      const result = only([
        { type: "tile", entity: "light.a", name: "Lamp", visibility: [door] },
        { type: "heading", heading: "Kitchen", visibility: [{ condition: "state", entity: "light.b", state_not: ["off", "unavailable"] }] },
        { type: "weather-forecast", entity: "weather.home", visibility: [{ condition: "numeric_state", entity: "sensor.temp", above: 15, below: 30 }] },
        { type: "markdown", content: "Hi", visibility: [door, { condition: "numeric_state", entity: "sensor.t", below: 5 }] },
      ]);
      expect(result).toEqual([
        { type: "tile", entity: "light.a", name: "Lamp", show_if: [{ condition: "state", entity: "binary_sensor.door", state: "on" }] },
        { type: "heading", text: "Kitchen", show_if: [{ condition: "not_state", entity: "light.b", state: ["off", "unavailable"] }] },
        { type: "weather", entity: "weather.home", show_if: [{ condition: "numeric", entity: "sensor.temp", above: 15, below: 30 }] },
        { type: "card", card: { type: "markdown", content: "Hi" }, show_if: [{ condition: "state", entity: "binary_sensor.door", state: "on" }, { condition: "numeric", entity: "sensor.t", below: 5 }] },
      ]);
    });

    it("turns and and or into groups, as deep as the server takes", () => {
      const deep = (levels: number): unknown => (levels ? { condition: "or", conditions: [deep(levels - 1), door] } : door);
      const group = { condition: "and", conditions: [door, { condition: "or", conditions: [door, { condition: "numeric_state", entity: "sensor.t", above: 1 }] }] };
      expect(only([{ type: "tile", entity: "light.a", visibility: [group] }])[0].show_if).toEqual([
        { condition: "and", conditions: [door, { condition: "or", conditions: [door, { condition: "numeric", entity: "sensor.t", above: 1 }] }] },
      ]);
      expect(only([{ type: "tile", entity: "light.a", visibility: [deep(3)] }])[0]).toHaveProperty("show_if"); // lists 0 to 3
      expect(only([{ type: "tile", entity: "light.a", visibility: [deep(4)] }])[0]).toMatchObject({ type: "card" }); // one level too deep
    });

    it("keeps what Ambidash cannot say as it is: a card with a screen size, a user or odd values stays a card with its visibility", () => {
      const cards = [
        { type: "tile", entity: "light.a", visibility: [door, { condition: "screen", media_query: "(min-width: 600px)" }] },
        { type: "markdown", content: "x", visibility: [{ condition: "user", users: ["abc"] }] },
        { type: "tile", entity: "light.a", visibility: [{ condition: "numeric_state", entity: "sensor.t", above: "input_number.limit" }] },
        { type: "tile", entity: "light.a", visibility: [{ condition: "state", entity: "light.b", state: "on", state_not: "off" }] },
        { type: "tile", entity: "light.a", visibility: [{ condition: "state", entity: "light.b" }] },
        { type: "tile", entity: "light.a", visibility: [{ condition: "state", entity: "light.b", state: true }] },
        { type: "tile", entity: "light.a", visibility: [{ condition: "state", entity: "Light.B", state: "on" }] },
        { type: "tile", entity: "light.a", visibility: [{ condition: "numeric_state", entity: "sensor.t" }] },
        { type: "tile", entity: "light.a", visibility: [{ condition: "weekday", weekdays: ["mon"] }] },
        { type: "tile", entity: "light.a", visibility: [{ condition: "and", conditions: [] }] },
        { type: "tile", entity: "light.a", visibility: "on" },
      ];
      expect(only(cards)).toEqual(cards.map((card) => ({ type: "card", card })));
    });

    it("keeps conditions that are too many or too long for the server with the card", () => {
      const many = Array.from({ length: 11 }, () => door);
      const long = [{ condition: "state", entity: "light.b", state: Array.from({ length: 20 }, () => "x".repeat(120)) }, { condition: "state", entity: "light.c", state: Array.from({ length: 20 }, () => "y".repeat(120)) }];
      const cards = [
        { type: "tile", entity: "light.a", visibility: many },
        { type: "tile", entity: "light.a", visibility: long },
        { type: "tile", entity: "light.a", visibility: [{ condition: "state", entity: "light.b", state: "x".repeat(121) }] },
      ];
      expect(only(cards)).toEqual(cards.map((card) => ({ type: "card", card })));
    });

    it("drops an empty visibility without a trace on a card Ambidash makes native", () => {
      expect(only([{ type: "tile", entity: "light.a", visibility: [] }])).toEqual([{ type: "tile", entity: "light.a" }]);
    });

    it("turns a conditional card into its card with the conditions, the older and the newer way of writing them", () => {
      const result = only([
        { type: "conditional", conditions: [{ entity: "light.a", state: "on" }, { entity: "light.b", state_not: "off" }], card: { type: "tile", entity: "light.a" } },
        { type: "conditional", conditions: [door, { condition: "numeric_state", entity: "sensor.t", above: 20 }], card: { type: "markdown", content: "Hot" } },
      ]);
      expect(result).toEqual([
        { type: "tile", entity: "light.a", show_if: [{ condition: "state", entity: "light.a", state: "on" }, { condition: "not_state", entity: "light.b", state: "off" }] },
        { type: "card", card: { type: "markdown", content: "Hot" }, show_if: [{ condition: "state", entity: "binary_sensor.door", state: "on" }, { condition: "numeric", entity: "sensor.t", above: 20 }] },
      ]);
    });

    it("embeds a conditional card whole when its conditions cannot be taken over, or it says more", () => {
      const cards = [
        { type: "conditional", conditions: [{ condition: "screen", media_query: "(min-width: 600px)" }], card: { type: "tile", entity: "light.a" } },
        { type: "conditional", conditions: [{ entity: "light.a", state: "on" }], card: { type: "tile", entity: "light.a" }, extra: true },
        { type: "conditional", conditions: [{ entity: "light.a", state: "on" }] },
        { type: "conditional", conditions: [{ condition: "state", entity: "light.a", state_not: "on", state: "off" }], card: { type: "tile", entity: "light.a" } },
      ];
      expect(only(cards)).toEqual(cards.map((card) => ({ type: "card", card })));
    });

    it("lets the conditions of a stack go to every item made from it, added to the ones of its cards", () => {
      const result = only([
        {
          type: "vertical-stack",
          visibility: [door],
          cards: [{ type: "heading", heading: "Door" }, { type: "tile", entity: "light.a", visibility: [{ condition: "numeric_state", entity: "sensor.t", below: 5 }] }],
        },
      ]);
      expect(result).toEqual([
        { type: "heading", text: "Door", show_if: [{ condition: "state", entity: "binary_sensor.door", state: "on" }] },
        { type: "tile", entity: "light.a", show_if: [{ condition: "numeric", entity: "sensor.t", below: 5 }, { condition: "state", entity: "binary_sensor.door", state: "on" }] },
      ]);
    });

    it("embeds a stack whole when a card in it has conditions of its own that cannot be taken over", () => {
      const stack = { type: "vertical-stack", cards: [{ type: "tile", entity: "light.a", visibility: [{ condition: "user", users: ["abc"] }] }, { type: "tile", entity: "light.b" }] };
      expect(only([stack])).toEqual([{ type: "card", card: stack }]);
    });

    it("does not let a stack and a card together have more conditions than the server takes: the stack is embedded, with its own conditions on the item", () => {
      const nine = Array.from({ length: 9 }, () => door);
      const inner = { type: "tile", entity: "light.a", visibility: nine };
      const stack = { type: "vertical-stack", visibility: [door, door], cards: [inner] };
      expect(only([stack])).toEqual([{ type: "card", card: { type: "vertical-stack", cards: [inner] }, show_if: [door, door] }]);
    });

    it("counts the items that got conditions", () => {
      const { report } = ok({ views: [{ cards: [{ type: "tile", entity: "light.a", visibility: [door] }, { type: "markdown", content: "x", visibility: [door] }, { type: "tile", entity: "light.b" }] }] });
      expect(report).toMatchObject({ tiles: 2, cards: 1, conditions: 2 });
    });

    it("does not change what it is given", () => {
      const config = { views: [{ cards: [{ type: "tile", entity: "light.a", visibility: [door] }, { type: "conditional", conditions: [{ entity: "light.a", state: "on" }], card: { type: "markdown", content: "x" } }] }] };
      const copy = structuredClone(config);
      importDashboard(config);
      expect(config).toEqual(copy);
    });
  });

  it("turns a heading card into a heading and an entities card of devices into a heading and tiles", () => {
    const { pages } = ok({
      views: [
        {
          cards: [
            { type: "heading", heading: "Living room", heading_style: "title" },
            { type: "entities", title: "Lights", entities: ["light.a", { entity: "cover.b", name: "Blind" }], state_color: true },
          ],
        },
      ],
    });
    expect(items(pages[0])).toEqual([{ type: "heading", text: "Living room" }, { type: "heading", text: "Lights" }, { type: "tile", entity: "light.a" }, { type: "tile", entity: "cover.b", name: "Blind" }]);
  });

  it("embeds an entities card as it is when any row is not a supported device or has more to it", () => {
    const rows = [
      { type: "entities", title: "Mixed", entities: ["light.a", "sensor.temp"] },
      { type: "entities", entities: ["light.a", { entity: "light.b", secondary_info: "last-changed" }] },
      { type: "entities", entities: ["light.a", { type: "divider" }] },
      { type: "entities", entities: [], title: "Empty" },
      { type: "entities", entities: ["light.a"], footer: { type: "buttons" } },
      { type: "heading", heading: "With icon", icon: "mdi:sofa" },
    ];
    const { pages } = ok({ views: [{ cards: rows }] });
    expect(items(pages[0])).toEqual(rows.map((card) => ({ type: "card", card })));
  });

  it("takes a stack or grid apart only when every card in it becomes a tile or heading, and otherwise embeds it whole", () => {
    const apart = ok({
      views: [
        {
          cards: [
            { type: "vertical-stack", title: "Lamps", cards: [{ type: "tile", entity: "light.a" }, { type: "horizontal-stack", cards: [{ type: "tile", entity: "light.b" }] }] },
            { type: "grid", columns: 2, square: false, cards: [{ type: "tile", entity: "light.c" }] },
          ],
        },
      ],
    });
    expect(items(apart.pages[0])).toEqual([{ type: "heading", text: "Lamps" }, { type: "tile", entity: "light.a" }, { type: "tile", entity: "light.b" }, { type: "tile", entity: "light.c" }]);
    expect(apart.report).toMatchObject({ tiles: 3, headings: 1, cards: 0 });

    const popup = { type: "vertical-stack", cards: [{ type: "custom:bubble-card", card_type: "pop-up", hash: "#kitchen" }, { type: "tile", entity: "light.a" }] };
    const mixed = { type: "grid", cards: [{ type: "tile", entity: "light.a" }, { type: "markdown", content: "hi" }] };
    const empty = { type: "vertical-stack", cards: [] };
    const { pages } = ok({ views: [{ cards: [popup, mixed, empty] }] });
    expect(items(pages[0])).toEqual([popup, mixed, empty].map((card) => ({ type: "card", card })));
  });

  it("turns the digital clock card and the daily weather forecast card into the widgets, with what they said", () => {
    const { pages, report } = ok({
      views: [
        {
          cards: [
            { type: "clock" },
            { type: "clock", show_seconds: true, time_format: "24", clock_size: "large", no_background: true, grid_options: { columns: 6, rows: 2 } },
            { type: "clock", time_format: 12 },
            { type: "weather-forecast", entity: "weather.home" },
            { type: "weather-forecast", entity: "weather.home", show_forecast: false, forecast_type: "daily", show_current: true },
          ],
        },
      ],
    });
    expect(items(pages[0])).toEqual([
      { type: "clock", date: false },
      { type: "clock", date: false, format: "24", seconds: true },
      { type: "clock", date: false, format: "12" },
      { type: "weather", entity: "weather.home" },
      { type: "weather", entity: "weather.home", forecast: false },
    ]);
    expect(report).toMatchObject({ widgets: 5, cards: 0 });
    expect(pages[0].layouts?.tablet?.k2).toEqual([4, 0, 4, 2]); // the second clock asked for six of twelve columns
  });

  it("embeds a clock or weather card that says more than the widget can: analog, time zone, title, hourly forecast, no current weather, other entity", () => {
    const cards = [
      { type: "clock", clock_style: "analog" },
      { type: "clock", time_zone: "Europe/Berlin" },
      { type: "clock", title: "Berlin" },
      { type: "clock", time_format: "13" },
      { type: "weather-forecast", entity: "weather.home", forecast_type: "hourly" },
      { type: "weather-forecast", entity: "weather.home", show_current: false },
      { type: "weather-forecast", entity: "weather.home", secondary_info_attribute: "humidity" },
      { type: "weather-forecast", entity: "sensor.temperature" },
    ];
    const { pages } = ok({ views: [{ cards }] });
    expect(items(pages[0])).toEqual(cards.map((card) => ({ type: "card", card })));
  });

  it("embeds every other card whole: markdown, custom cards, glance", () => {
    const cards = [
      { type: "markdown", content: "# Hello\n\nworld" },
      { type: "custom:bubble-card", card_type: "pop-up", hash: "#kitchen", sub_button: [{ entity: "light.a" }] },
      { type: "glance", entities: ["sensor.a", "sensor.b"] },
    ];
    const { pages } = ok({ views: [{ cards }] });
    expect(items(pages[0])).toEqual(cards.map((card) => ({ type: "card", card })));
  });

  it("reads the cards of sections views and of views that have both", () => {
    const { pages } = ok({
      views: [
        {
          type: "sections",
          sections: [
            { type: "grid", cards: [{ type: "heading", heading: "A" }, { type: "tile", entity: "light.a" }] },
            { type: "grid", cards: [{ type: "tile", entity: "light.b" }] },
          ],
        },
        { type: "panel", cards: [{ type: "map", entities: [] }] },
      ],
    });
    expect(pages.map((p) => p.items.length)).toEqual([3, 1]);
    expect(items(pages[1])).toEqual([{ type: "card", card: { type: "map", entities: [] } }]);
  });

  it("places everything on the tablet grid: headings across, tiles two by two, cards where they asked to be", () => {
    const { pages } = ok({
      views: [
        {
          cards: [
            { type: "heading", heading: "H" },
            { type: "tile", entity: "light.a" },
            { type: "tile", entity: "light.b" },
            { type: "markdown", content: "default size" },
            { type: "custom:x-card", grid_options: { columns: 6, rows: 4 } },
            { type: "custom:y-card", grid_options: { columns: "full", rows: "auto" } },
            { type: "custom:z-card", grid_options: { columns: 1 } },
          ],
        },
      ],
    });
    const page = pages[0];
    expect(page.layouts?.tablet).toEqual({
      h1: [0, 0, 8, 1],
      t2: [0, 1, 2, 2],
      t3: [2, 1, 2, 2],
      c4: [4, 1, 4, 3],
      c5: [0, 4, 4, 5],
      c6: [0, 9, 8, 3], // full width: a row of its own
      c7: [0, 12, 2, 3], // a card is never narrower than two cells
    });
  });

  it("keeps the card configuration but not the placement keys that only Home Assistant's grid understood", () => {
    const { pages } = ok({ views: [{ cards: [{ type: "custom:x", a: 1, grid_options: { columns: 6 }, layout_options: { grid_columns: 2 }, view_layout: { column: 1 } }] }] });
    expect(pages[0].items[0].card).toEqual({ type: "custom:x", a: 1 });
  });

  it("adds to existing pages without clashing with their ids, and keeps within 30 pages", () => {
    const existing: Page[] = [{ id: "page-1", name: "A", items: [] }, { id: "page-3", name: "C", items: [] }];
    const { pages } = ok({ views: [{ cards: [{ type: "tile", entity: "light.a" }] }, { cards: [{ type: "tile", entity: "light.b" }] }] }, existing);
    expect(pages.map((p) => p.id)).toEqual(["page-4", "page-5"]);
    expect(new Set([...existing, ...pages].map((p) => p.id)).size).toBe(4);

    const many = Array.from({ length: 29 }, (_, i) => ({ id: `page-${i + 1}`, name: "P", items: [] }));
    const cut = ok({ views: [{ cards: [{ type: "tile", entity: "light.a" }] }, { cards: [{ type: "tile", entity: "light.b" }] }] }, many);
    expect(cut.pages).toHaveLength(1);
    expect(cut.report.cut).toBe(true);
  });

  it("counts what it could not take over, notes badges, and leaves out views with nothing in them", () => {
    const tooLarge = { type: "markdown", content: "x".repeat(20001) };
    const { pages, report } = ok({
      views: [
        { title: "Only badges", badges: ["person.a"], cards: [] },
        { title: "Mixed", badges: [{ type: "entity", entity: "person.a" }], cards: [null, "text", { entity: "light.a" }, { type: "Bad Type!" }, tooLarge, { type: "tile", entity: "light.a" }] },
      ],
    });
    expect(pages.map((p) => p.name)).toEqual(["Mixed"]);
    expect(report).toMatchObject({ pages: 1, tiles: 1, skipped: 5, badges: true });
  });

  it("shortens names and texts to what the server accepts", () => {
    const long = "L".repeat(200);
    const { pages } = ok({ views: [{ title: long, cards: [{ type: "heading", heading: long }, { type: "tile", entity: "light.a", name: long }] }] });
    expect(pages[0].name).toHaveLength(60);
    expect(pages[0].items[0].text).toHaveLength(80);
    expect(pages[0].items[1].name).toHaveLength(80);
  });

  it("says why nothing was imported: a strategy dashboard, a dashboard without cards, something else", () => {
    expect(importDashboard({ strategy: { type: "original-states" } })).toEqual({ ok: false, reason: "strategy" });
    expect(importDashboard({ views: [] })).toEqual({ ok: false, reason: "empty" });
    expect(importDashboard({ views: [{ title: "x", cards: [] }] })).toEqual({ ok: false, reason: "empty" });
    expect(importDashboard(null)).toEqual({ ok: false, reason: "empty" });
    expect(importDashboard("views")).toEqual({ ok: false, reason: "empty" });
  });

  it("does not change what it is given", () => {
    const config = { views: [{ cards: [{ type: "custom:x", grid_options: { columns: 6 } }] }] };
    const copy = JSON.stringify(config);
    ok(config);
    expect(JSON.stringify(config)).toBe(copy);
  });
});
