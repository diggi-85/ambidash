// The edits of the layout editor as pure functions: they never change what they are given but return new pages.
import { COLUMNS, defaultSize, minSize, resolveLayout } from "../layout";
import type { Box, Device, LayoutItem, Page } from "../types";

export type Boxes = Record<string, Box>;

/** Where every item of the page sits on `device` right now (own places and derived ones alike) */
export const boxesOf = (page: Page, device: Device): Boxes =>
  Object.fromEntries(resolveLayout(page, device).map(({ item, x, y, w, h }) => [item.id, [x, y, w, h] as Box]));

export const overlap = (a: Box, b: Box): boolean => a[0] < b[0] + b[2] && a[0] + a[2] > b[0] && a[1] < b[1] + b[3] && a[1] + a[3] > b[1];

/** Do the boxes of `ids` stay on the grid and clear of every other box? */
const valid = (boxes: Boxes, ids: string[], cols: number): boolean => {
  const moved = ids.map((id) => boxes[id]);
  if (moved.some((b) => !b || b[0] < 0 || b[1] < 0 || b[0] + b[2] > cols)) return false;
  const rest = Object.entries(boxes)
    .filter(([id]) => !ids.includes(id))
    .map(([, b]) => b);
  return moved.every((b) => rest.every((o) => !overlap(b, o)));
};

const shift = (boxes: Boxes, ids: string[], dx: number, dy: number): Boxes => ({
  ...boxes,
  ...Object.fromEntries(ids.map((id) => [id, [boxes[id][0] + dx, boxes[id][1] + dy, boxes[id][2], boxes[id][3]] as Box])),
});

/** `v` shortened to at most `t` steps, keeping its direction */
const toward = (v: number, t: number): number => Math.sign(v) * Math.min(Math.abs(v), t);

/**
 * The attempts to do a change of (dx, dy) cells: all of it first, then less and less, each time also the horizontal and the
 * vertical part alone. The first attempt that works is taken, so an item dragged beyond the edge stops at the edge.
 */
function* attempts(dx: number, dy: number): Generator<[number, number]> {
  for (let t = Math.max(Math.abs(dx), Math.abs(dy)); t >= 1; t--) {
    yield [toward(dx, t), toward(dy, t)];
    yield [toward(dx, t), 0];
    yield [0, toward(dy, t)];
  }
}

/** Moves items by whole cells, as far as the grid and the other items allow. Returns `boxes` itself when nothing moves. */
export const move = (boxes: Boxes, ids: string[], dx: number, dy: number, cols: number): Boxes => {
  for (const [x, y] of attempts(dx, dy)) {
    if (x === 0 && y === 0) continue;
    const next = shift(boxes, ids, x, y);
    if (valid(next, ids, cols)) return next;
  }
  return boxes;
};

/** Makes one item wider or higher (or smaller, down to the least its kind may be), with the same fallbacks as `move`. */
export const resize = (boxes: Boxes, id: string, item: LayoutItem, dw: number, dh: number, cols: number): Boxes => {
  const [minW, minH] = minSize(item);
  const [x, y, w, h] = boxes[id];
  for (const [a, b] of attempts(dw, dh)) {
    const box: Box = [x, y, Math.max(minW, w + a), Math.max(minH, h + b)];
    if (box[2] === w && box[3] === h) continue;
    const next: Boxes = { ...boxes, [id]: box };
    if (valid(next, [id], cols)) return next;
  }
  return boxes;
};

/** The first free place of a w × h box, reading row by row */
export const freeSpot = (boxes: Boxes, cols: number, w: number, h: number): Box => {
  const width = Math.min(w, cols);
  const all = Object.values(boxes);
  for (let y = 0; ; y++) {
    for (let x = 0; x + width <= cols; x++) {
      const box: Box = [x, y, width, h];
      if (all.every((other) => !overlap(box, other))) return box;
    }
  }
};

/** The page with `boxes` as the layout of `device`; from then on that device has a layout of its own */
export const withBoxes = (page: Page, device: Device, boxes: Boxes): Page => {
  const ids = new Set(page.items.map((i) => i.id));
  return { ...page, layouts: { ...page.layouts, [device]: Object.fromEntries(Object.entries(boxes).filter(([id]) => ids.has(id))) } };
};

/** A device falls back to following the tablet layout */
export const followTablet = (page: Page, device: Device): Page => {
  const { [device]: _own, ...rest } = page.layouts ?? {};
  return { ...page, layouts: rest };
};

/** An id for a new item that no item of the page has */
export const newItemId = (page: Page, prefix: string): string => {
  const used = new Set(page.items.map((i) => i.id));
  for (let n = page.items.length + 1; ; n++) if (!used.has(`${prefix}${n}`)) return `${prefix}${n}`;
};

const PREFIX: Record<LayoutItem["type"], string> = { tile: "t", heading: "h", summary: "s" };

/** Adds an item and puts it on the first free place of `device` */
export const addItem = (page: Page, device: Device, item: Omit<LayoutItem, "id">): { page: Page; id: string } => {
  const full: LayoutItem = { ...item, id: newItemId(page, PREFIX[item.type]) };
  const cols = COLUMNS[device];
  const boxes = boxesOf(page, device);
  const [w, h] = defaultSize(full, cols);
  return { page: withBoxes({ ...page, items: [...page.items, full] }, device, { ...boxes, [full.id]: freeSpot(boxes, cols, w, h) }), id: full.id };
};

export const removeItems = (page: Page, ids: string[]): Page => {
  const gone = new Set(ids);
  const layouts = Object.fromEntries(Object.entries(page.layouts ?? {}).map(([device, boxes]) => [device, Object.fromEntries(Object.entries(boxes ?? {}).filter(([id]) => !gone.has(id)))]));
  return { ...page, items: page.items.filter((i) => !gone.has(i.id)), layouts };
};

/** Copies of the items, each on the first free place of the same size */
export const duplicateItems = (page: Page, device: Device, ids: string[]): { page: Page; ids: string[] } => {
  const cols = COLUMNS[device];
  let next = page;
  let boxes = boxesOf(page, device);
  const copies: string[] = [];
  for (const id of ids) {
    const original = page.items.find((i) => i.id === id);
    if (!original) continue;
    const copy: LayoutItem = { ...original, id: newItemId(next, PREFIX[original.type]) };
    const [, , w, h] = boxes[id];
    boxes = { ...boxes, [copy.id]: freeSpot(boxes, cols, w, h) };
    next = { ...next, items: [...next.items, copy] };
    copies.push(copy.id);
  }
  return { page: withBoxes(next, device, boxes), ids: copies };
};

/** Changes fields of one item; an empty name, tap or hold is removed (the default applies again) */
export const setItem = (page: Page, id: string, patch: Partial<Pick<LayoutItem, "name" | "text" | "entity" | "tap" | "hold">>): Page => ({
  ...page,
  items: page.items.map((item) => {
    if (item.id !== id) return item;
    const next = { ...item, ...patch };
    for (const key of ["name", "tap", "hold"] as const) if (!next[key]) delete next[key];
    return next;
  }),
});

/** An id for a new page */
export const newPageId = (pages: Page[]): string => {
  const used = new Set(pages.map((p) => p.id));
  for (let n = pages.length + 1; ; n++) if (!used.has(`page-${n}`)) return `page-${n}`;
};
