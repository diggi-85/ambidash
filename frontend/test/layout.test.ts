// Where the items of a page sit on phone, tablet and wall display
import { describe, expect, it } from "vitest";
import { COLUMNS, deviceFor, flow, resolveLayout } from "../src/layout";
import type { Box, LayoutItem, Page } from "../src/types";

const tile = (id: string): LayoutItem => ({ id, type: "tile", entity: `light.${id}` });
const heading = (id: string): LayoutItem => ({ id, type: "heading", text: id });
const page = (items: LayoutItem[], layouts: Page["layouts"] = {}): Page => ({ id: "p", name: "P", items, layouts });
const boxes = (p: Page, device: "phone" | "tablet" | "wall"): Record<string, Box> => Object.fromEntries(resolveLayout(p, device).map(({ item, x, y, w, h }) => [item.id, [x, y, w, h]]));

describe("device classes", () => {
  it("are chosen by the width of the card", () => {
    expect([deviceFor(0), deviceFor(390), deviceFor(639), deviceFor(640), deviceFor(1099), deviceFor(1100), deviceFor(1920)]).toEqual(["phone", "phone", "phone", "tablet", "tablet", "wall", "wall"]);
    expect(COLUMNS).toEqual({ phone: 4, tablet: 8, wall: 12 });
  });
});

describe("flow", () => {
  const size = (id: string, wide = false, w = 2, h = 2) => ({ id, wide, w, h });

  it("fills a row with tiles and wraps to the next", () => {
    expect(flow([size("a"), size("b"), size("c"), size("d"), size("e")], 8)).toEqual({ a: [0, 0, 2, 2], b: [2, 0, 2, 2], c: [4, 0, 2, 2], d: [6, 0, 2, 2], e: [0, 2, 2, 2] });
  });

  it("gives wide items a row of their own, below a row that is not full", () => {
    expect(flow([size("a"), size("h", true, 8, 1), size("b")], 8)).toEqual({ a: [0, 0, 2, 2], h: [0, 2, 8, 1], b: [0, 3, 2, 2] });
  });

  it("starts below `startY` and never makes a tile wider than the grid", () => {
    expect(flow([size("a", false, 6)], 4, 5)).toEqual({ a: [0, 5, 4, 2] });
  });
});

describe("layout of a page", () => {
  it("flows a page nobody placed anything on: heading across, tiles two by two", () => {
    expect(boxes(page([heading("h"), tile("a"), tile("b"), tile("c"), tile("d"), tile("e")]), "tablet")).toEqual({
      h: [0, 0, 8, 1],
      a: [0, 1, 2, 2],
      b: [2, 1, 2, 2],
      c: [4, 1, 2, 2],
      d: [6, 1, 2, 2],
      e: [0, 3, 2, 2],
    });
  });

  const placed = page([heading("h"), tile("t1"), tile("t2"), tile("t3")], { tablet: { h: [0, 0, 8, 1], t1: [4, 1, 2, 2], t2: [0, 1, 2, 2], t3: [0, 3, 2, 2] } });

  it("uses the places given for the device", () => {
    expect(boxes(placed, "tablet")).toEqual({ h: [0, 0, 8, 1], t1: [4, 1, 2, 2], t2: [0, 1, 2, 2], t3: [0, 3, 2, 2] });
  });

  it("derives the phone from the tablet: same order and sizes on four columns", () => {
    expect(boxes(placed, "phone")).toEqual({ h: [0, 0, 4, 1], t2: [0, 1, 2, 2], t1: [2, 1, 2, 2], t3: [0, 3, 2, 2] });
  });

  it("derives the wall display from the tablet: the same on twelve columns", () => {
    expect(boxes(placed, "wall")).toEqual({ h: [0, 0, 12, 1], t2: [0, 1, 2, 2], t1: [2, 1, 2, 2], t3: [4, 1, 2, 2] });
  });

  it("keeps what was placed on a device and flows the rest in below it", () => {
    const own = page(placed.items, { ...placed.layouts, phone: { t1: [0, 0, 2, 2] } });
    expect(boxes(own, "phone")).toEqual({ t1: [0, 0, 2, 2], h: [0, 2, 4, 1], t2: [0, 3, 2, 2], t3: [2, 3, 2, 2] });
  });

  it("puts items that came later after the ones placed, and ignores places for items that are gone", () => {
    const later = page([tile("a"), tile("b")], { tablet: { a: [0, 0, 2, 2], gone: [2, 0, 2, 2] } });
    expect(boxes(later, "tablet")).toEqual({ a: [0, 0, 2, 2], b: [0, 2, 2, 2] });
  });

  it("makes every box fit the grid and the smallest size of its kind", () => {
    const wild = page([tile("a"), heading("h")], { tablet: { a: [7, 0, 4, 1], h: [20, -3, 1, 0] } });
    expect(boxes(wild, "tablet")).toEqual({ a: [4, 0, 4, 2], h: [7, 0, 1, 1] });
  });

  it("lists the items in reading order, row by row", () => {
    expect(resolveLayout(placed, "tablet").map((p) => p.item.id)).toEqual(["h", "t2", "t1", "t3"]);
  });

  it("is empty for a page without items", () => {
    expect(resolveLayout(page([]), "wall")).toEqual([]);
  });
});
