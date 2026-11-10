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
