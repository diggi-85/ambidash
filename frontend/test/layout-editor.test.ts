// @vitest-environment happy-dom
// @vitest-environment-options {"url": "http://localhost:8123/ambidash"}
// The layout editor: choosing, moving and resizing items, adding and removing them, pages, devices
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { setLang } from "../src/i18n";
import "../src/studio/layout-editor";
import type { AmbidashLayoutEditor } from "../src/studio/layout-editor";
import type { Hass, Page } from "../src/types";

const ent = (entity_id: string, state: string, name: string) => ({ entity_id, state, attributes: { friendly_name: name }, last_changed: "" });

const PAGE: Page = {
  id: "p1",
  name: "Ground floor",
  items: [
    { id: "h1", type: "heading", text: "Living room" },
    { id: "t1", type: "tile", entity: "light.lamp" },
    { id: "t2", type: "tile", entity: "cover.blind" },
    { id: "t3", type: "tile", entity: "scene.movie" },
  ],
  layouts: { tablet: { h1: [0, 0, 8, 1], t1: [0, 1, 2, 2], t2: [2, 1, 2, 2], t3: [0, 3, 2, 2] } },
};
const OTHER: Page = { id: "p2", name: "Upstairs", items: [], layouts: {} };

const hass = {
  states: { "light.lamp": ent("light.lamp", "on", "Lamp"), "cover.blind": ent("cover.blind", "open", "Blind"), "scene.movie": ent("scene.movie", "unknown", "Movie"), "light.desk": ent("light.desk", "off", "Desk lamp"), "sensor.temp": ent("sensor.temp", "20", "Temperature") },
  entities: {},
  devices: {},
  areas: {},
  floors: {},
  language: "en",
  callService: vi.fn(),
} as unknown as Hass;

type Change = [Page[], string | undefined];

const mount = async (pages: Page[] = [PAGE, OTHER]) => {
  const changes: Change[] = [];
  const el = document.createElement("ambidash-layout-editor") as AmbidashLayoutEditor;
  el.hass = hass;
  el.pages = pages;
  el.options = { design: "home", mode: "dark" };
  el.onChange = (next, key) => changes.push([next, key]);
  document.body.append(el);
  await el.updateComplete;
  return { el, changes };
};

const $ = (el: AmbidashLayoutEditor, selector: string) => el.shadowRoot!.querySelector<HTMLElement>(selector);
const all = (el: AmbidashLayoutEditor, selector: string) => [...el.shadowRoot!.querySelectorAll<HTMLElement>(selector)];
const text = (el: AmbidashLayoutEditor) => el.shadowRoot!.textContent!.replace(/\s+/g, " ");
const button = (el: AmbidashLayoutEditor, label: string) => all(el, "button").find((b) => b.textContent?.trim().startsWith(label)) as HTMLButtonElement;
const settle = async (el: AmbidashLayoutEditor) => {
  for (let i = 0; i < 3; i++) {
    await el.updateComplete;
    await Promise.resolve();
  }
};
const item = (el: AmbidashLayoutEditor, index: number) => all(el, ".item")[index];
const pointer = (type: string, x = 0, y = 0, extra: PointerEventInit = {}) => new PointerEvent(type, { bubbles: true, composed: true, clientX: x, clientY: y, button: 0, pointerId: 1, ...extra });
const key = async (el: AmbidashLayoutEditor, k: string, init: KeyboardEventInit = {}) => {
  window.dispatchEvent(new KeyboardEvent("keydown", { key: k, cancelable: true, ...init }));
  await settle(el);
};
/** Pixels one grid cell is wide on the tablet drawing: (768 − 2 × 16 − 7 × 10) / 8 + 10, drawn at the scale 600 / 768 of the default stage */
const CELL = (((768 - 32 - 70) / 8 + 10) * 600) / 768;

beforeEach(() => {
  vi.stubGlobal("confirm", vi.fn(() => true));
});

afterEach(() => {
  vi.unstubAllGlobals();
  document.body.innerHTML = "";
  setLang("en");
});

describe("layout editor", () => {
  it("lists the pages and draws the items of the first on the grid of the tablet", async () => {
    const { el } = await mount();
    expect(all(el, ".page").map((p) => p.textContent?.trim())).toEqual(["Ground floor", "Upstairs"]);
    expect(all(el, ".item")).toHaveLength(4);
    expect($(el, ".grid")!.getAttribute("style")).toContain("--cols:8");
    expect(item(el, 1).getAttribute("style")).toContain("grid-column:1 / span 2;grid-row:2 / span 2");
    expect(text(el)).toContain("The tablet layout is the base");
    expect(all(el, "ambidash-tile").map((t) => (t as unknown as { name: string }).name)).toEqual(["Lamp", "Blind", "Movie"]);
  });

  it("switches to another page", async () => {
    const { el } = await mount();
    button(el, "Upstairs").click();
    await settle(el);
    expect(all(el, ".item")).toHaveLength(0);
    expect(text(el)).toContain("This page is empty");
  });

  it("draws the phone on four columns and says it follows the tablet until something is changed there", async () => {
    const { el } = await mount();
    button(el, "Phone").click();
    await settle(el);
    expect($(el, ".grid")!.getAttribute("style")).toContain("--cols:4");
    expect(text(el)).toContain("The phone follows the tablet layout until you change something here.");
    button(el, "Wall display").click();
    await settle(el);
    expect(text(el)).toContain("The wall display follows the tablet layout");
  });

  it("offers to follow the tablet again when a device has a layout of its own", async () => {
    const own: Page = { ...PAGE, layouts: { ...PAGE.layouts, phone: { h1: [0, 0, 4, 1], t1: [0, 1, 2, 2], t2: [2, 1, 2, 2], t3: [0, 3, 2, 2] } } };
    const { el, changes } = await mount([own]);
    button(el, "Phone").click();
    await settle(el);
    expect(text(el)).toContain("This device has a layout of its own.");
    button(el, "Follow the tablet again").click();
    expect(changes[0][0][0].layouts).toEqual({ tablet: PAGE.layouts!.tablet });
  });

  it("selects an item and shows what can be changed on it", async () => {
    const { el, changes } = await mount();
    expect(text(el)).toContain("Click an item to edit it");
    item(el, 1).dispatchEvent(pointer("pointerdown"));
    item(el, 1).dispatchEvent(pointer("pointerup"));
    await settle(el);
    expect(item(el, 1).classList.contains("sel")).toBe(true);
    expect($(el, ".props h2")?.textContent).toBe("Tile");
    expect(text(el)).toContain("light.lamp");
    expect(text(el)).toContain("2 × 2 cells");

    const name = $(el, "#n") as HTMLInputElement;
    name.value = "Reading light";
    name.dispatchEvent(new Event("input", { bubbles: true }));
    expect(changes.at(-1)![0][0].items[1].name).toBe("Reading light");
    expect(changes.at(-1)![1]).toBe("layout:name:t1");
  });

  it("shows the text of a heading for editing, and a click beside the items clears the selection", async () => {
    const { el, changes } = await mount();
    item(el, 0).dispatchEvent(pointer("pointerdown"));
    await settle(el);
    const field = $(el, "#x") as HTMLInputElement;
    field.value = "Kitchen";
    field.dispatchEvent(new Event("input", { bubbles: true }));
    expect(changes.at(-1)![0][0].items[0].text).toBe("Kitchen");
    $(el, ".canvas")!.dispatchEvent(pointer("pointerdown"));
    await settle(el);
    expect(all(el, ".item.sel")).toHaveLength(0);
  });

  it("moves an item by dragging, shows it on its way and reports it once the pointer is let go", async () => {
    const { el, changes } = await mount();
    item(el, 3).dispatchEvent(pointer("pointerdown", 100, 100));
    $(el, ".canvas")!.dispatchEvent(pointer("pointermove", 100 + 2 * CELL + 5, 100));
    await settle(el);
    expect(item(el, 3).getAttribute("style")).toContain("grid-column:3 / span 2;grid-row:4 / span 2");
    expect(changes).toHaveLength(0);
    $(el, ".canvas")!.dispatchEvent(pointer("pointerup", 100 + 2 * CELL + 5, 100));
    await settle(el);
    expect(changes).toHaveLength(1);
    const page = changes[0][0][0];
    expect(page.layouts?.tablet?.t3).toEqual([2, 3, 2, 2]);
    expect(page.layouts?.tablet?.t1).toEqual([0, 1, 2, 2]);
  });

  it("does not move an item onto another, and reports nothing when nothing moved", async () => {
    const { el, changes } = await mount();
    item(el, 3).dispatchEvent(pointer("pointerdown", 100, 100));
    $(el, ".canvas")!.dispatchEvent(pointer("pointermove", 100, 100 - 2 * CELL));
    $(el, ".canvas")!.dispatchEvent(pointer("pointerup", 100, 100 - 2 * CELL));
    await settle(el);
    expect(changes).toHaveLength(0);
  });

  it("changes the size with the corner and moves several selected items together", async () => {
    const { el, changes } = await mount();
    item(el, 3).dispatchEvent(pointer("pointerdown", 0, 0));
    item(el, 3).querySelector(".handle")!.dispatchEvent(pointer("pointerdown", 0, 0));
    $(el, ".canvas")!.dispatchEvent(pointer("pointermove", 2 * CELL, 0));
    $(el, ".canvas")!.dispatchEvent(pointer("pointerup", 2 * CELL, 0));
    await settle(el);
    expect(changes.at(-1)![0][0].layouts?.tablet?.t3).toEqual([0, 3, 4, 2]);

    item(el, 1).dispatchEvent(pointer("pointerdown"));
    item(el, 2).dispatchEvent(pointer("pointerdown", 0, 0, { shiftKey: true }));
    await settle(el);
    expect(text(el)).toContain("2 items selected");
  });

  it("moves the selection with the arrow keys and resizes it with Shift", async () => {
    const { el, changes } = await mount();
    item(el, 3).dispatchEvent(pointer("pointerdown"));
    item(el, 3).dispatchEvent(pointer("pointerup"));
    await key(el, "ArrowRight");
    expect(changes.at(-1)![0][0].layouts?.tablet?.t3).toEqual([1, 3, 2, 2]);
    expect(changes.at(-1)![1]).toBe("layout:keys");
    await key(el, "ArrowDown", { shiftKey: true });
    expect(changes.at(-1)![0][0].layouts?.tablet?.t3).toEqual([0, 3, 2, 3]);
    await key(el, "ArrowLeft");
    expect(changes).toHaveLength(2); // already at the edge: nothing to report
  });

  it("removes and duplicates the selection from the keyboard, and Escape clears it", async () => {
    const { el, changes } = await mount();
    item(el, 3).dispatchEvent(pointer("pointerdown"));
    await key(el, "d", { ctrlKey: true });
    expect(changes.at(-1)![0][0].items.map((i) => i.id)).toEqual(["h1", "t1", "t2", "t3", "t5"]);
    expect(changes.at(-1)![0][0].layouts?.tablet?.t5).toEqual([4, 1, 2, 2]); // the first free place of that size, reading row by row

    el.pages = [PAGE, OTHER];
    await settle(el);
    item(el, 3).dispatchEvent(pointer("pointerdown"));
    await settle(el);
    await key(el, "Delete");
    expect(changes.at(-1)![0][0].items.map((i) => i.id)).toEqual(["h1", "t1", "t2"]);
    expect(changes.at(-1)![0][0].layouts?.tablet).not.toHaveProperty("t3");

    item(el, 1).dispatchEvent(pointer("pointerdown"));
    await settle(el);
    await key(el, "Escape");
    expect(all(el, ".item.sel")).toHaveLength(0);
  });

  it("leaves the keys to a text field while somebody types", async () => {
    const { el, changes } = await mount();
    item(el, 3).dispatchEvent(pointer("pointerdown"));
    await settle(el);
    const field = $(el, "#n") as HTMLInputElement;
    field.dispatchEvent(new KeyboardEvent("keydown", { key: "Delete", bubbles: true, composed: true }));
    await settle(el);
    expect(changes).toHaveLength(0);
  });

  it("adds a heading and the summary on the first free places", async () => {
    const { el, changes } = await mount();
    button(el, "Heading").click();
    const first = changes.at(-1)![0][0];
    expect(first.items.at(-1)).toEqual({ id: "h5", type: "heading", text: "New heading" });
    expect(first.layouts?.tablet?.h5).toEqual([0, 5, 8, 1]);
    button(el, "Summary").click();
    expect(changes.at(-1)![0][0].items.at(-1)).toEqual({ id: "s5", type: "summary" });
  });

  it("changes the device of a tile and keeps its name, place and actions", async () => {
    const named: Page = { ...PAGE, items: PAGE.items.map((i) => (i.id === "t1" ? { ...i, name: "Reading light", tap: "popup" as const } : i)) };
    const { el, changes } = await mount([named, OTHER]);
    item(el, 1).dispatchEvent(pointer("pointerdown"));
    item(el, 1).dispatchEvent(pointer("pointerup"));
    await settle(el);
    button(el, "Change").click();
    await settle(el);
    expect($(el, ".props h2")?.textContent).toBe("Change the device");
    all(el, ".results button").find((b) => b.textContent?.includes("Desk lamp"))!.click();
    expect(changes.at(-1)![0][0].items[1]).toEqual({ id: "t1", type: "tile", entity: "light.desk", name: "Reading light", tap: "popup" });
    expect(changes.at(-1)![0][0].layouts).toEqual(PAGE.layouts);
    await settle(el);
    expect(text(el)).not.toContain("Change the device");
  });

  it("cancels the device picker without changing anything", async () => {
    const { el, changes } = await mount();
    item(el, 1).dispatchEvent(pointer("pointerdown"));
    item(el, 1).dispatchEvent(pointer("pointerup"));
    await settle(el);
    button(el, "Change").click();
    await settle(el);
    button(el, "Cancel").click();
    await settle(el);
    expect(changes).toEqual([]);
    expect($(el, ".props h2")?.textContent).toBe("Tile");
  });

  it("chooses what a tap and a long press do, and offers no pop-up choices on headings", async () => {
    const { el, changes } = await mount();
    item(el, 1).dispatchEvent(pointer("pointerdown"));
    item(el, 1).dispatchEvent(pointer("pointerup"));
    await settle(el);
    const tap = $(el, "#a-tap") as HTMLSelectElement;
    const hold = $(el, "#a-hold") as HTMLSelectElement;
    expect([tap.value, hold.value]).toEqual(["", "popup"]);
    expect([...tap.options].map((o) => o.textContent?.trim())).toEqual(["Like the device", "Open the pop-up", "Open Home Assistant's dialog", "Do nothing"]);
    expect([...hold.options].map((o) => o.value)).toEqual(["popup", "more-info", "none"]);

    tap.value = "more-info";
    tap.dispatchEvent(new Event("change", { bubbles: true }));
    expect(changes.at(-1)![0][0].items[1]).toEqual({ id: "t1", type: "tile", entity: "light.lamp", tap: "more-info" });
    hold.value = "none";
    hold.dispatchEvent(new Event("change", { bubbles: true }));
    expect(changes.at(-1)![0][0].items[1]).toEqual({ id: "t1", type: "tile", entity: "light.lamp", hold: "none" });

    item(el, 0).dispatchEvent(pointer("pointerdown"));
    item(el, 0).dispatchEvent(pointer("pointerup"));
    await settle(el);
    expect($(el, "#a-tap")).toBeNull();
  });

  describe("clock and weather", () => {
    it("adds a clock with the defaults, drawn as a real clock", async () => {
      const { el, changes } = await mount();
      button(el, "Clock").click();
      const added = changes.at(-1)![0][0].items.at(-1)!;
      expect(added).toMatchObject({ type: "clock" });
      expect(changes.at(-1)![0][0].layouts?.tablet?.[added.id]?.slice(2)).toEqual([4, 2]);
      const withClock = await mount([{ ...PAGE, items: [...PAGE.items, { id: "k1", type: "clock" }], layouts: { tablet: { ...PAGE.layouts!.tablet!, k1: [4, 0, 4, 2] } } }]);
      expect(withClock.el.shadowRoot!.querySelector("ambidash-clock")).not.toBeNull();
    });

    it("sets the time format, seconds and the date of the selected clock; options at their default are not stored", async () => {
      const page: Page = { ...PAGE, items: [{ id: "k1", type: "clock" }], layouts: { tablet: { k1: [0, 0, 4, 2] } } };
      const { el, changes } = await mount([page]);
      item(el, 0).dispatchEvent(pointer("pointerdown"));
      item(el, 0).dispatchEvent(pointer("pointerup"));
      await settle(el);
      expect($(el, ".props h2")?.textContent).toBe("Clock");
      const format = $(el, "#clk-format") as HTMLSelectElement;
      expect([...format.options].map((o) => o.textContent?.trim())).toEqual(["Like the language", "12 hours", "24 hours"]);
      format.value = "24";
      format.dispatchEvent(new Event("change", { bubbles: true }));
      expect(changes.at(-1)![0][0].items[0]).toEqual({ id: "k1", type: "clock", format: "24" });
      const [seconds, date] = all(el, ".props .check input") as HTMLInputElement[];
      expect([seconds.checked, date.checked]).toEqual([false, true]);
      seconds.checked = true;
      seconds.dispatchEvent(new Event("change", { bubbles: true }));
      expect(changes.at(-1)![0][0].items[0]).toEqual({ id: "k1", type: "clock", seconds: true });
      date.checked = false;
      date.dispatchEvent(new Event("change", { bubbles: true }));
      expect(changes.at(-1)![0][0].items[0]).toEqual({ id: "k1", type: "clock", date: false });
    });

    it("adds a weather widget after choosing a weather entity, and lists nothing else", async () => {
      const withWeather = { ...hass, states: { ...hass.states, "weather.home": ent("weather.home", "sunny", "Home") } } as unknown as Hass;
      const el = document.createElement("ambidash-layout-editor") as AmbidashLayoutEditor;
      const changes: Change[] = [];
      el.hass = withWeather;
      el.pages = [PAGE];
      el.options = {};
      el.onChange = (next, key) => changes.push([next, key]);
      document.body.append(el);
      await el.updateComplete;
      button(el, "Weather").click();
      await settle(el);
      expect($(el, ".props h2")?.textContent).toBe("Choose a weather entity");
      expect(all(el, ".results button").map((b) => b.querySelector("small")?.textContent)).toEqual(["weather.home"]);
      all(el, ".results button")[0].click();
      expect(changes.at(-1)![0][0].items.at(-1)).toEqual({ id: "w5", type: "weather", entity: "weather.home" });
    });

    it("says so when there is no weather entity", async () => {
      const { el } = await mount();
      button(el, "Weather").click();
      await settle(el);
      expect(text(el)).toContain("No weather entities found.");
    });

    it("changes the entity of a weather widget among weather entities, and switches the forecast", async () => {
      const withWeather = { ...hass, states: { ...hass.states, "weather.home": ent("weather.home", "sunny", "Home"), "weather.work": ent("weather.work", "rainy", "Work") } } as unknown as Hass;
      const page: Page = { ...PAGE, items: [{ id: "w1", type: "weather", entity: "weather.home" }], layouts: { tablet: { w1: [0, 0, 4, 3] } } };
      const el = document.createElement("ambidash-layout-editor") as AmbidashLayoutEditor;
      const changes: Change[] = [];
      el.hass = withWeather;
      el.pages = [page];
      el.options = {};
      el.onChange = (next, key) => changes.push([next, key]);
      document.body.append(el);
      await el.updateComplete;
      expect($(el, ".cardbox b")?.textContent).toBe("Weather");
      item(el, 0).dispatchEvent(pointer("pointerdown"));
      item(el, 0).dispatchEvent(pointer("pointerup"));
      await settle(el);
      const forecast = $(el, ".props .check input") as HTMLInputElement;
      forecast.checked = false;
      forecast.dispatchEvent(new Event("change", { bubbles: true }));
      expect(changes.at(-1)![0][0].items[0]).toEqual({ id: "w1", type: "weather", entity: "weather.home", forecast: false });
      button(el, "Change").click();
      await settle(el);
      expect(all(el, ".results button").map((b) => b.querySelector("small")?.textContent)).toEqual(["weather.home · already on this page", "weather.work"]);
      all(el, ".results button")[1].click();
      expect(changes.at(-1)![0][0].items[0].entity).toBe("weather.work");
    });
  });

  describe("cards", () => {
    const CARD_PAGE: Page = {
      id: "p1",
      name: "Cards",
      items: [{ id: "c1", type: "card", card: { type: "tile", entity: "light.lamp", name: "Lamp" } }],
      layouts: { tablet: { c1: [0, 0, 4, 3] } },
    };
    const select = async (el: AmbidashLayoutEditor, index: number) => {
      item(el, index).dispatchEvent(pointer("pointerdown"));
      item(el, index).dispatchEvent(pointer("pointerup"));
      await settle(el);
    };
    const typeYaml = async (el: AmbidashLayoutEditor, value: string) => {
      const field = $(el, "#card") as HTMLTextAreaElement;
      field.value = value;
      field.dispatchEvent(new Event("input", { bubbles: true }));
      await settle(el);
    };

    it("adds a card with a markdown card to start from", async () => {
      const { el, changes } = await mount();
      button(el, "Card").click();
      const added = changes.at(-1)![0][0].items.at(-1)!;
      expect(added.type).toBe("card");
      expect(added.card).toEqual({ type: "markdown", content: "Paste the YAML of a Home Assistant card into the properties on the right." });
      expect(changes.at(-1)![0][0].layouts?.tablet?.[added.id]?.slice(2)).toEqual([4, 3]);
    });

    it("draws a card as a box with its type and what it is about", async () => {
      const { el } = await mount([CARD_PAGE]);
      expect([$(el, ".cardbox b")?.textContent, $(el, ".cardbox span")?.textContent]).toEqual(["tile", "Lamp"]);
    });

    it("shows the YAML of the selected card and saves what is typed as soon as it is a card", async () => {
      const { el, changes } = await mount([CARD_PAGE]);
      await select(el, 0);
      expect($(el, ".props h2")?.textContent).toBe("Card");
      expect(($(el, "#card") as HTMLTextAreaElement).value).toBe(["type: \"tile\"", "entity: \"light.lamp\"", "name: \"Lamp\""].join("\n"));
      await typeYaml(el, "type: entities\nentities:\n  - light.lamp\n  - entity: light.desk\n    name: Desk\n");
      expect(changes.at(-1)![0][0].items[0].card).toEqual({ type: "entities", entities: ["light.lamp", { entity: "light.desk", name: "Desk" }] });
      expect(changes.at(-1)![1]).toBe("layout:card:c1");
      expect($(el, ".hint[style]")).toBeNull();
    });

    it("keeps what is typed and says what is wrong, saving nothing, until it is a card", async () => {
      const { el, changes } = await mount([CARD_PAGE]);
      await select(el, 0);
      await typeYaml(el, "type: [tile");
      expect(changes).toEqual([]);
      expect($(el, ".hint[style]")?.textContent).toContain("Not valid YAML: line 1");
      expect(($(el, "#card") as HTMLTextAreaElement).value).toBe("type: [tile");
      await typeYaml(el, "entity: light.lamp");
      expect(changes).toEqual([]);
      expect($(el, ".hint[style]")?.textContent).toBe("The card needs a type, for example type: tile.");
      await typeYaml(el, "- tile");
      expect($(el, ".hint[style]")?.textContent).toBe("The card needs a type, for example type: tile.");
    });

    it("shows the card as it is after another change, and forgets what was typed when another item is selected", async () => {
      const second: Page = { ...CARD_PAGE, items: [...CARD_PAGE.items, { id: "c2", type: "card", card: { type: "markdown", content: "Hi" } }], layouts: { tablet: { c1: [0, 0, 4, 3], c2: [4, 0, 4, 3] } } };
      const { el } = await mount([second]);
      await select(el, 0);
      await typeYaml(el, "type: [broken");
      await select(el, 1);
      expect(($(el, "#card") as HTMLTextAreaElement).value).toContain("markdown");
      await select(el, 0);
      expect(($(el, "#card") as HTMLTextAreaElement).value).toContain("entity");
      expect($(el, ".hint[style]")).toBeNull();
    });

    it("has no card field on a tile", async () => {
      const { el } = await mount();
      item(el, 1).dispatchEvent(pointer("pointerdown"));
      item(el, 1).dispatchEvent(pointer("pointerup"));
      await settle(el);
      expect($(el, "#card")).toBeNull();
    });
  });

  describe("when an item is shown", () => {
    const pick = async (el: AmbidashLayoutEditor, index: number) => {
      item(el, index).dispatchEvent(pointer("pointerdown"));
      item(el, index).dispatchEvent(pointer("pointerup"));
      await settle(el);
    };
    const when = (el: AmbidashLayoutEditor) => $(el, "#when") as HTMLSelectElement;
    /** What the Studio does after every change: hands the new pages back down */
    const sync = async (el: AmbidashLayoutEditor, changes: Change[]) => {
      if (changes.length) el.pages = changes.at(-1)![0];
      await settle(el);
    };
    const choose = async (el: AmbidashLayoutEditor, changes: Change[], id: string) => {
      when(el).value = id;
      when(el).dispatchEvent(new Event("change", { bubbles: true }));
      await sync(el, changes);
    };
    const type = async (el: AmbidashLayoutEditor, changes: Change[], selector: string, value: string, event = "input") => {
      const field = $(el, selector) as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
      field.value = value;
      field.dispatchEvent(new Event(event, { bubbles: true }));
      await sync(el, changes);
    };
    const t1 = (changes: Change[]) => changes.at(-1)![0][0].items[1];
    const results = (el: AmbidashLayoutEditor) => all(el, ".results button").map((b) => b.querySelector("small")?.textContent);

    it("offers the sentences on every kind of item, starting with always", async () => {
      const { el } = await mount();
      for (const index of [0, 1]) {
        await pick(el, index);
        expect(when(el).value).toBe("always");
      }
      expect([...when(el).options].map((o) => o.value)).toEqual(["always", "morning", "day", "evening", "night", "phone", "tablet", "wall", "state"]);
      expect(when(el).options[1].textContent?.trim()).toBe("Only in the morning (05:00–11:00)");
    });

    it("stores a sentence as plain conditions, and leaves nothing behind for always", async () => {
      const { el, changes } = await mount();
      await pick(el, 1);
      await choose(el, changes, "morning");
      expect(t1(changes)).toEqual({ id: "t1", type: "tile", entity: "light.lamp", show_if: [{ condition: "time", after: "05:00", before: "11:00" }] });
      expect(when(el).value).toBe("morning");
      await choose(el, changes, "wall");
      expect(t1(changes).show_if).toEqual([{ condition: "device", devices: ["wall"] }]);
      await choose(el, changes, "always");
      expect(t1(changes)).toEqual({ id: "t1", type: "tile", entity: "light.lamp" });
    });

    it("marks an item that is only shown under conditions", async () => {
      const page: Page = { ...PAGE, items: PAGE.items.map((i) => (i.id === "t1" ? { ...i, show_if: [{ condition: "device" as const, devices: ["wall" as const] }] } : i)) };
      const { el } = await mount([page, OTHER]);
      expect(all(el, ".item .cond")).toHaveLength(1);
      expect(item(el, 1).querySelector(".cond")?.getAttribute("aria-label")).toBe("Shown only under conditions");
      expect(item(el, 0).querySelector(".cond")).toBeNull();
    });

    it("asks for a device when 'while a device is in a state' is chosen, and writes the rule for it", async () => {
      const { el, changes } = await mount();
      await pick(el, 1);
      await choose(el, changes, "state");
      expect(text(el)).toContain("Choose the device or sensor");
      expect(results(el)).toContain("sensor.temp"); // every entity, not only the ones that can be tiles
      all(el, ".results button").find((b) => b.querySelector("small")?.textContent === "sensor.temp")!.click();
      expect(t1(changes).show_if).toEqual([{ condition: "state", entity: "sensor.temp", state: "on" }]);
      await sync(el, changes);
      // the form of a device in a state is there (the select's own value is not checked: happy-dom picks a late option wrongly)
      expect(all(el, ".props code").map((c) => c.textContent)).toEqual(["light.lamp", "sensor.temp"]);
      expect($(el, 'select[aria-label="Comparison"]')).not.toBeNull();
    });

    it("changes the comparison, the state and the device of that rule", async () => {
      const page: Page = { ...PAGE, items: PAGE.items.map((i) => (i.id === "t1" ? { ...i, show_if: [{ condition: "state" as const, entity: "sensor.temp", state: "on" }] } : i)) };
      const { el, changes } = await mount([page, OTHER]);
      await pick(el, 1);
      await type(el, changes, 'select[aria-label="Comparison"]', "not", "change");
      expect(t1(changes).show_if).toEqual([{ condition: "not_state", entity: "sensor.temp", state: "on" }]);
      await type(el, changes, 'input[aria-label="State"]', "21");
      expect(t1(changes).show_if).toEqual([{ condition: "not_state", entity: "sensor.temp", state: "21" }]);
      expect(changes.at(-1)![1]).toBe("layout:when:t1");
      const count = changes.length;
      await type(el, changes, 'input[aria-label="State"]', "  ");
      expect(changes).toHaveLength(count); // an empty state would not be a rule
      all(el, "button").filter((b) => b.textContent?.trim() === "Change")[1].click();
      await settle(el);
      all(el, ".results button").find((b) => b.querySelector("small")?.textContent === "light.desk")!.click();
      expect(t1(changes).show_if).toEqual([{ condition: "not_state", entity: "light.desk", state: "21" }]);
    });

    it("leaves the item as it was when the device picker is cancelled", async () => {
      const { el, changes } = await mount();
      await pick(el, 1);
      await choose(el, changes, "state");
      button(el, "Cancel").click();
      await settle(el);
      expect(changes).toEqual([]);
      expect(when(el).value).toBe("always");
    });

    it("shows the YAML field in advanced mode only", async () => {
      const { el } = await mount();
      await pick(el, 1);
      expect($(el, "#when-yaml")).toBeNull();
      el.advanced = true;
      await settle(el);
      expect(($(el, "#when-yaml") as HTMLTextAreaElement).value).toBe("");
    });

    it("saves conditions typed as YAML as soon as they are a list, and calls such conditions 'own'", async () => {
      const { el, changes } = await mount();
      el.advanced = true;
      await pick(el, 1);
      await type(el, changes, "#when-yaml", "- condition: numeric\n  entity: sensor.temp\n  above: 18\n");
      expect(t1(changes).show_if).toEqual([{ condition: "numeric", entity: "sensor.temp", above: 18 }]);
      expect(changes.at(-1)![1]).toBe("layout:when:t1");
      expect([...when(el).options].map((o) => o.value)).toContain("custom"); // only offered for conditions no sentence says
      expect($(el, 'select[aria-label="Comparison"]')).toBeNull();
      expect($(el, ".hint[style]")).toBeNull();
      expect(($(el, "#when-yaml") as HTMLTextAreaElement).value).toContain("above: 18");
    });

    it("keeps what is typed and says what is wrong, saving nothing, until it is a list of conditions", async () => {
      const { el, changes } = await mount();
      el.advanced = true;
      await pick(el, 1);
      await type(el, changes, "#when-yaml", "- condition: [state");
      expect(changes).toEqual([]);
      expect($(el, ".hint[style]")?.textContent).toContain("Not valid YAML: line 1");
      expect(($(el, "#when-yaml") as HTMLTextAreaElement).value).toBe("- condition: [state");
      await type(el, changes, "#when-yaml", "condition: state");
      expect(changes).toEqual([]);
      expect($(el, ".hint[style]")?.textContent).toBe("The conditions are a list, and each has a condition type, for example - condition: state.");
      await type(el, changes, "#when-yaml", "- entity: light.lamp");
      expect(changes).toEqual([]);
      expect($(el, ".hint[style]")).not.toBeNull();
    });

    it("takes the conditions away when the YAML is emptied", async () => {
      const page: Page = { ...PAGE, items: PAGE.items.map((i) => (i.id === "t1" ? { ...i, show_if: [{ condition: "numeric" as const, entity: "sensor.temp", above: 18 }] } : i)) };
      const { el, changes } = await mount([page, OTHER]);
      el.advanced = true;
      await pick(el, 1);
      await type(el, changes, "#when-yaml", "");
      expect(t1(changes)).toEqual({ id: "t1", type: "tile", entity: "light.lamp" });
    });
  });

  describe("looks by state", () => {
    const RULE = { when: [{ condition: "state" as const, entity: "light.lamp", state: "on" }], color: "alert" as const };
    const withRules = (...states: NonNullable<Page["items"][number]["states"]>): Page[] => [{ ...PAGE, items: PAGE.items.map((i) => (i.id === "t1" ? { ...i, states } : i)) }, OTHER];
    const pick = async (el: AmbidashLayoutEditor, index: number) => {
      item(el, index).dispatchEvent(pointer("pointerdown"));
      item(el, index).dispatchEvent(pointer("pointerup"));
      await settle(el);
    };
    const sync = async (el: AmbidashLayoutEditor, changes: Change[]) => {
      if (changes.length) el.pages = changes.at(-1)![0];
      await settle(el);
    };
    const edit = async (el: AmbidashLayoutEditor, changes: Change[], selector: string, value: string, event = "input") => {
      const field = all(el, selector)[0] as HTMLInputElement | HTMLSelectElement;
      field.value = value;
      field.dispatchEvent(new Event(event, { bubbles: true }));
      await sync(el, changes);
    };
    const rule = (changes: Change[], index = 0) => changes.at(-1)![0][0].items[1].states![index];
    const COLOR = '.rule select[aria-label="Colour"]';

    it("is offered on tiles only", async () => {
      const { el } = await mount();
      await pick(el, 0);
      expect(text(el)).not.toContain("Looks by state");
      await pick(el, 1);
      expect(text(el)).toContain("Looks by state");
      expect(all(el, ".rule")).toHaveLength(0);
    });

    it("adds a rule for the device of the tile, in the accent colour, and takes it away again", async () => {
      const { el, changes } = await mount();
      await pick(el, 1);
      button(el, "Add a rule").click();
      expect(rule(changes)).toEqual({ when: [{ condition: "state", entity: "light.lamp", state: "on" }], color: "accent" });
      await sync(el, changes);
      expect(all(el, ".rule")).toHaveLength(1);
      expect($(el, ".rule")!.getAttribute("aria-label")).toBe("Rule 1");
      ($(el, 'button[aria-label="Remove the rule"]') as HTMLButtonElement).click();
      expect(changes.at(-1)![0][0].items[1]).toEqual({ id: "t1", type: "tile", entity: "light.lamp" });
    });

    it("changes the comparison, the state, the colour, the icon and the status text of a rule", async () => {
      const { el, changes } = await mount(withRules(RULE));
      await pick(el, 1);
      await edit(el, changes, '.rule select[aria-label="Comparison"]', "not", "change");
      expect(rule(changes).when).toEqual([{ condition: "not_state", entity: "light.lamp", state: "on" }]);
      await edit(el, changes, '.rule input[aria-label="State"]', "off");
      expect(rule(changes).when).toEqual([{ condition: "not_state", entity: "light.lamp", state: "off" }]);
      expect(changes.at(-1)![1]).toBe("layout:states:t1:0:when");
      await edit(el, changes, COLOR, "good", "change");
      expect(rule(changes).color).toBe("good");
      await edit(el, changes, '.rule input[aria-label="Icon"]', "mdi:door-open");
      await edit(el, changes, '.rule input[aria-label="Status text"]', "  Open  ");
      expect(rule(changes)).toEqual({ when: [{ condition: "not_state", entity: "light.lamp", state: "off" }], color: "good", icon: "mdi:door-open", status: "Open" });
      await edit(el, changes, COLOR, "", "change");
      expect(rule(changes)).toEqual({ when: [{ condition: "not_state", entity: "light.lamp", state: "off" }], icon: "mdi:door-open", status: "Open" });
    });

    it("does not save an icon that cannot be one yet, and leaves a rule that would change nothing in the accent colour", async () => {
      const { el, changes } = await mount(withRules({ when: RULE.when, color: "alert" }));
      await pick(el, 1);
      const count = changes.length;
      await edit(el, changes, '.rule input[aria-label="Icon"]', "md");
      expect(changes).toHaveLength(count);
      await edit(el, changes, COLOR, "", "change");
      expect(rule(changes)).toEqual({ when: RULE.when, color: "accent" });
    });

    it("shows a rule with conditions of its own as such, and still lets its look be changed", async () => {
      const own = { when: [{ condition: "numeric" as const, entity: "sensor.temp", above: 25 }], color: "alert" as const };
      const { el, changes } = await mount(withRules(own));
      await pick(el, 1);
      expect($(el, '.rule select[aria-label="Comparison"]')).toBeNull();
      expect($(el, ".rule .hint")?.textContent).toContain("conditions of its own");
      await edit(el, changes, '.rule input[aria-label="Status text"]', "Hot");
      expect(rule(changes)).toEqual({ ...own, status: "Hot" });
    });

    it("keeps at most eight rules", async () => {
      const { el } = await mount(withRules(...Array.from({ length: 8 }, () => RULE)));
      await pick(el, 1);
      expect(all(el, ".rule")).toHaveLength(8);
      expect(button(el, "Add a rule").disabled).toBe(true);
    });
  });

  it("adds a device found by searching, and marks the ones that are already there", async () => {
    const { el, changes } = await mount();
    button(el, "Device").click();
    await settle(el);
    expect(text(el)).toContain("Add a device");
    expect(all(el, ".results button").map((b) => b.querySelector("small")?.textContent)).toEqual(["cover.blind · already on this page", "light.desk", "light.lamp · already on this page", "scene.movie · already on this page"]);

    const search = $(el, ".props input") as HTMLInputElement;
    search.value = "desk";
    search.dispatchEvent(new Event("input", { bubbles: true }));
    await settle(el);
    expect(all(el, ".results button")).toHaveLength(1);
    all(el, ".results button")[0].click();
    expect(changes.at(-1)![0][0].items.at(-1)).toEqual({ id: "t5", type: "tile", entity: "light.desk" });
    await settle(el);
    expect(text(el)).not.toContain("Add a device");

    button(el, "Device").click();
    await settle(el);
    const none = $(el, ".props input") as HTMLInputElement;
    none.value = "zzz";
    none.dispatchEvent(new Event("input", { bubbles: true }));
    await settle(el);
    expect(text(el)).toContain("No matching devices.");
  });

  it("adds, renames and deletes pages, and keeps the last one", async () => {
    const { el, changes } = await mount();
    button(el, "New page").click();
    expect(changes.at(-1)![0].map((p) => [p.id, p.name])).toEqual([["p1", "Ground floor"], ["p2", "Upstairs"], ["page-3", "Page 3"]]);

    button(el, "Upstairs").click();
    await settle(el);
    const name = $(el, "#p") as HTMLInputElement;
    name.value = "Attic";
    name.dispatchEvent(new Event("input", { bubbles: true }));
    expect(changes.at(-1)![0][1].name).toBe("Attic");

    (button(el, "Delete page") as HTMLButtonElement).click();
    expect(confirm).toHaveBeenCalledWith("Delete the page “Upstairs” and everything on it?");
    expect(changes.at(-1)![0].map((p) => p.id)).toEqual(["p1"]);

    const single = await mount([PAGE]);
    expect((button(single.el, "Delete page") as HTMLButtonElement).disabled).toBe(true);
  });
});
