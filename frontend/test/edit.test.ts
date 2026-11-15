// The edits of the layout editor: moving, resizing, adding, removing, copying
import { describe, expect, it } from "vitest";
import { addItem, boxesOf, duplicateItems, followTablet, freeSpot, move, newItemId, newPageId, overlap, removeItems, resize, setItem, withBoxes } from "../src/studio/edit";
import type { LayoutItem, Page } from "../src/types";

const tile = (id: string): LayoutItem => ({ id, type: "tile", entity: `light.${id}` });
const page = (items: LayoutItem[], layouts: Page["layouts"] = {}): Page => ({ id: "p", name: "P", items, layouts });
const base = page([{ id: "h", type: "heading", text: "Kitchen" }, tile("a"), tile("b")], { tablet: { h: [0, 0, 8, 1], a: [0, 1, 2, 2], b: [2, 1, 2, 2] } });

describe("boxes", () => {
  it("lists where everything is, own and derived places alike", () => {
    expect(boxesOf(base, "tablet")).toEqual({ h: [0, 0, 8, 1], a: [0, 1, 2, 2], b: [2, 1, 2, 2] });
    expect(boxesOf(base, "phone")).toEqual({ h: [0, 0, 4, 1], a: [0, 1, 2, 2], b: [2, 1, 2, 2] });
  });

  it("knows what overlaps", () => {
    expect(overlap([0, 0, 2, 2], [1, 1, 2, 2])).toBe(true);
    expect(overlap([0, 0, 2, 2], [2, 0, 2, 2])).toBe(false);
    expect(overlap([0, 0, 2, 2], [0, 2, 2, 2])).toBe(false);
  });
});

describe("move", () => {
  const boxes = boxesOf(base, "tablet");

  it("moves by whole cells", () => {
    expect(move(boxes, ["b"], 2, 0, 8).b).toEqual([4, 1, 2, 2]);
    expect(move(boxes, ["b"], 0, 2, 8).b).toEqual([2, 3, 2, 2]);
  });

  it("moves several items together and keeps their distance", () => {
    const next = move(boxes, ["a", "b"], 0, 2, 8);
    expect([next.a, next.b]).toEqual([[0, 3, 2, 2], [2, 3, 2, 2]]);
  });

  it("stops at the edge of the grid and does not move at all when another item is in the way", () => {
    expect(move(boxes, ["a"], -1, 0, 8)).toBe(boxes);
    expect(move(boxes, ["b"], 6, 0, 8).b).toEqual([6, 1, 2, 2]);
    expect(move(boxes, ["b"], 9, 0, 8).b).toEqual([6, 1, 2, 2]);
    expect(move(boxes, ["a"], 1, 0, 8)).toBe(boxes);
    expect(move(boxes, ["a"], 0, 0, 8)).toBe(boxes);
  });

  it("moves in the direction that is free when the diagonal is blocked", () => {
    expect(move(boxes, ["a"], 1, 1, 8).a).toEqual([0, 2, 2, 2]);
  });
});

describe("resize", () => {
  const boxes = boxesOf(base, "tablet");
  const item = tile("a");

  it("makes an item wider and higher, and smaller down to its least size", () => {
    expect(resize(boxes, "b", tile("b"), 2, 1, 8).b).toEqual([2, 1, 4, 3]);
    expect(resize(boxes, "b", tile("b"), -5, -5, 8).b).toEqual([2, 1, 2, 2]);
  });

  it("does not run into the next item or off the grid, but still grows as much as fits", () => {
    expect(resize(boxes, "a", item, 1, 0, 8)).toBe(boxes);
    expect(resize(boxes, "a", item, 1, 1, 8).a).toEqual([0, 1, 2, 3]);
    expect(resize(boxes, "b", tile("b"), 9, 0, 8).b).toEqual([2, 1, 6, 2]);
    expect(resize(boxes, "a", item, 0, 0, 8)).toBe(boxes);
    expect(resize(boxes, "a", item, -3, -3, 8)).toBe(boxes);
  });
});

describe("free places", () => {
  it("finds the first free place, reading row by row", () => {
    expect(freeSpot({ a: [0, 0, 2, 2] }, 8, 2, 2)).toEqual([2, 0, 2, 2]);
    expect(freeSpot({ a: [0, 0, 8, 1] }, 8, 2, 2)).toEqual([0, 1, 2, 2]);
    expect(freeSpot({}, 4, 6, 1)).toEqual([0, 0, 4, 1]);
  });
});

describe("pages", () => {
  it("gives a device a layout of its own, with every item and no stranger", () => {
    const next = withBoxes(base, "phone", { ...boxesOf(base, "phone"), a: [2, 1, 2, 2], gone: [0, 9, 2, 2] });
    expect(next.layouts?.phone).toEqual({ h: [0, 0, 4, 1], a: [2, 1, 2, 2], b: [2, 1, 2, 2] });
    expect(base.layouts?.phone).toBeUndefined();
  });

  it("lets a device follow the tablet again", () => {
    const own = withBoxes(base, "phone", boxesOf(base, "phone"));
    expect(followTablet(own, "phone").layouts).toEqual({ tablet: base.layouts?.tablet });
  });

  it("adds an item on the first free place of the device and lets the others derive it", () => {
    const { page: next, id } = addItem(base, "tablet", { type: "tile", entity: "light.c" });
    expect(id).toBe("t4");
    expect(next.items.at(-1)).toEqual({ id: "t4", type: "tile", entity: "light.c" });
    expect(next.layouts?.tablet?.t4).toEqual([4, 1, 2, 2]);
    expect(boxesOf(next, "phone").t4).toBeDefined();
    const wide = addItem(base, "wall", { type: "summary" });
    expect(wide.page.layouts?.wall?.[wide.id]).toEqual([0, 3, 12, 1]);
  });

  it("gives new items ids nobody has", () => {
    expect(newItemId(base, "t")).toBe("t4");
    expect(newItemId(page([tile("t4"), tile("t5")]), "t")).toBe("t3");
    expect(newPageId([{ id: "page-2", name: "", items: [] }])).toBe("page-3");
  });

  it("removes items from the page and from every layout", () => {
    const next = removeItems(withBoxes(base, "phone", boxesOf(base, "phone")), ["a"]);
    expect(next.items.map((i) => i.id)).toEqual(["h", "b"]);
    expect(next.layouts?.tablet).toEqual({ h: [0, 0, 8, 1], b: [2, 1, 2, 2] });
    expect(next.layouts?.phone).toEqual({ h: [0, 0, 4, 1], b: [2, 1, 2, 2] });
  });

  it("copies items onto free places of the same size", () => {
    const { page: next, ids } = duplicateItems(base, "tablet", ["a", "h"]);
    expect(ids).toEqual(["t4", "h5"]);
    expect(next.items.find((i) => i.id === "t4")).toEqual({ id: "t4", type: "tile", entity: "light.a" });
    expect(next.layouts?.tablet?.t4).toEqual([4, 1, 2, 2]);
    expect(next.layouts?.tablet?.h5).toEqual([0, 3, 8, 1]);
    expect(duplicateItems(base, "tablet", ["nope"]).ids).toEqual([]);
  });

  it("changes the name or text of one item and drops an empty name", () => {
    const named = setItem(base, "a", { name: "Reading light" });
    expect(named.items.find((i) => i.id === "a")?.name).toBe("Reading light");
    expect("name" in (setItem(named, "a", { name: "" }).items.find((i) => i.id === "a") ?? {})).toBe(false);
    expect(setItem(base, "h", { text: "Living room" }).items[0].text).toBe("Living room");
    expect(base.items[0].text).toBe("Kitchen");
  });

  it("sets the conditions of one item and leaves nothing behind for an empty list", () => {
    const wall = [{ condition: "device" as const, devices: ["wall" as const] }];
    const shown = setItem(base, "a", { show_if: wall });
    expect(shown.items.find((i) => i.id === "a")?.show_if).toEqual(wall);
    expect(setItem(shown, "a", { name: "Lamp" }).items.find((i) => i.id === "a")?.show_if).toEqual(wall);
    expect("show_if" in (setItem(shown, "a", { show_if: [] }).items.find((i) => i.id === "a") ?? {})).toBe(false);
    expect("show_if" in (setItem(shown, "a", { show_if: undefined }).items.find((i) => i.id === "a") ?? {})).toBe(false);
    expect(base.items.find((i) => i.id === "a")).not.toHaveProperty("show_if");
  });

  it("sets the state rules of one item and leaves nothing behind for an empty list", () => {
    const rules = [{ when: [{ condition: "state" as const, entity: "light.a", state: "on" }], color: "good" as const }];
    const styled = setItem(base, "a", { states: rules });
    expect(styled.items.find((i) => i.id === "a")?.states).toEqual(rules);
    expect("states" in (setItem(styled, "a", { states: [] }).items.find((i) => i.id === "a") ?? {})).toBe(false);
    expect(base.items.find((i) => i.id === "a")).not.toHaveProperty("states");
  });

  it("adds a card four cells wide and three high next to the tiles, and the whole width of a phone", () => {
    const card = { type: "card" as const, card: { type: "markdown", content: "x" } };
    const tablet = addItem(base, "tablet", card);
    expect(tablet.id).toBe("c4");
    expect(boxesOf(tablet.page, "tablet")[tablet.id]).toEqual([4, 1, 4, 3]);
    const phone = addItem(base, "phone", card);
    expect(boxesOf(phone.page, "phone")[phone.id][2]).toBe(4);
    expect(tablet.page.items.at(-1)).toEqual({ ...card, id: "c4" });
  });

  it("adds a clock and a weather widget with the sizes of their kind and ids of their own", () => {
    const clock = addItem(base, "tablet", { type: "clock" });
    expect(clock.id).toBe("k4");
    expect(boxesOf(clock.page, "tablet")[clock.id].slice(2)).toEqual([4, 2]);
    const weather = addItem(clock.page, "tablet", { type: "weather", entity: "weather.home" });
    expect(weather.id).toBe("w5");
    expect(boxesOf(weather.page, "tablet")[weather.id].slice(2)).toEqual([4, 4]);
    expect(boxesOf(addItem(base, "phone", { type: "weather", entity: "weather.home" }).page, "phone")["w4"][2]).toBe(4);
  });

  it("stores a clock or weather option only when it is not the default, and sets it again", () => {
    const added = addItem(base, "tablet", { type: "clock" }).page;
    const set = (patch: Parameters<typeof setItem>[2]) => setItem(added, "k4", patch).items.find((i) => i.id === "k4");
    expect(set({ seconds: true })).toEqual({ id: "k4", type: "clock", seconds: true });
    expect(set({ seconds: false, date: true, format: "auto" })).toEqual({ id: "k4", type: "clock" });
    expect(set({ date: false, format: "24" })).toEqual({ id: "k4", type: "clock", date: false, format: "24" });
    const weather = addItem(base, "tablet", { type: "weather", entity: "weather.home" }).page;
    expect(setItem(weather, "w4", { forecast: false }).items.find((i) => i.id === "w4")).toEqual({ id: "w4", type: "weather", entity: "weather.home", forecast: false });
    expect(setItem(weather, "w4", { forecast: true }).items.find((i) => i.id === "w4")).toEqual({ id: "w4", type: "weather", entity: "weather.home" });
  });

  it("replaces the configuration of a card, whole", () => {
    const added = addItem(base, "tablet", { type: "card", card: { type: "markdown", content: "x", extra: 1 } }).page;
    const next = setItem(added, "c4", { card: { type: "tile", entity: "light.a" } });
    expect(next.items.find((i) => i.id === "c4")?.card).toEqual({ type: "tile", entity: "light.a" });
    expect(added.items.find((i) => i.id === "c4")?.card).toEqual({ type: "markdown", content: "x", extra: 1 });
  });

  it("swaps the device and sets what a tap or a long press does; an empty value brings the default back", () => {
    const acting = setItem(setItem(setItem(base, "a", { entity: "light.desk" }), "a", { tap: "popup" }), "a", { hold: "more-info" });
    expect(acting.items.find((i) => i.id === "a")).toEqual({ id: "a", type: "tile", entity: "light.desk", tap: "popup", hold: "more-info" });
    const plain = setItem(setItem(acting, "a", { tap: "" as never }), "a", { hold: undefined });
    expect(plain.items.find((i) => i.id === "a")).toEqual({ id: "a", type: "tile", entity: "light.desk" });
    expect(base.items.find((i) => i.id === "a")).toEqual(tile("a"));
  });
});
