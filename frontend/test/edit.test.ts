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

  it("swaps the device and sets what a tap or a long press does; an empty value brings the default back", () => {
    const acting = setItem(setItem(setItem(base, "a", { entity: "light.desk" }), "a", { tap: "popup" }), "a", { hold: "more-info" });
    expect(acting.items.find((i) => i.id === "a")).toEqual({ id: "a", type: "tile", entity: "light.desk", tap: "popup", hold: "more-info" });
    const plain = setItem(setItem(acting, "a", { tap: "" as never }), "a", { hold: undefined });
    expect(plain.items.find((i) => i.id === "a")).toEqual({ id: "a", type: "tile", entity: "light.desk" });
    expect(base.items.find((i) => i.id === "a")).toEqual(tile("a"));
  });
});
