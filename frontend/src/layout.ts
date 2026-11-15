// The grid layout: where each item of a page sits on phone, tablet and wall display, and what happens to items nobody placed.
import type { Box, Device, LayoutItem, Page } from "./types";

export const COLUMNS: Record<Device, number> = { phone: 4, tablet: 8, wall: 12 };

/** The device class of a card that is `width` px wide */
export const deviceFor = (width: number): Device => (width < 640 ? "phone" : width < 1100 ? "tablet" : "wall");

export interface Placed {
  item: LayoutItem;
  x: number;
  y: number;
  w: number;
  h: number;
}

interface Kind {
  /** What the ids of new items of this kind start with */
  prefix: string;
  /** Spans the whole row by default (headings and the summary); the others sit side by side */
  wide?: boolean;
  /** The smallest it may be, in cells: width, height */
  min: readonly [number, number];
  /** The size a new one gets (on a phone no wider than the row) */
  size: readonly [number, number];
}

/** Everything the grid needs to know about a kind of item; a new kind of item starts here */
const KINDS: Record<LayoutItem["type"], Kind> = {
  tile: { prefix: "t", min: [2, 2], size: [2, 2] },
  heading: { prefix: "h", wide: true, min: [1, 1], size: [8, 1] },
  summary: { prefix: "s", wide: true, min: [1, 1], size: [8, 1] },
  card: { prefix: "c", min: [2, 2], size: [4, 3] },
  clock: { prefix: "k", min: [2, 2], size: [4, 2] },
  weather: { prefix: "w", min: [2, 2], size: [4, 4] },
};

const wide = (item: Pick<LayoutItem, "type">): boolean => !!KINDS[item.type].wide;

/** The smallest a kind of item may be, in cells: width, height */
export const minSize = (item: Pick<LayoutItem, "type">): readonly [number, number] => KINDS[item.type].min;

/** What the ids of new items of this kind start with */
export const idPrefix = (item: Pick<LayoutItem, "type">): string => KINDS[item.type].prefix;

/** The size a new item gets: headings and the summary across the whole width, the others as their kind says (never wider than the row) */
export const defaultSize = (item: Pick<LayoutItem, "type">, cols: number): [number, number] => (wide(item) ? [cols, 1] : [Math.min(KINDS[item.type].size[0], cols), KINDS[item.type].size[1]]);

interface Size {
  id: string;
  wide: boolean;
  w: number;
  h: number;
}

/** Places items one after the other, row by row below `startY`; a wide item gets a row of its own. */
export const flow = (sizes: Size[], cols: number, startY = 0): Record<string, Box> => {
  const boxes: Record<string, Box> = {};
  let x = 0;
  let y = startY;
  let rowHeight = 0;
  for (const s of sizes) {
    if (s.wide) {
      if (x > 0) y += rowHeight;
      boxes[s.id] = [0, y, cols, s.h];
      y += s.h;
      x = 0;
      rowHeight = 0;
      continue;
    }
    const w = Math.min(s.w, cols);
    if (x + w > cols) {
      y += rowHeight;
      x = 0;
      rowHeight = 0;
    }
    boxes[s.id] = [x, y, w, s.h];
    x += w;
    rowHeight = Math.max(rowHeight, s.h);
  }
  return boxes;
};

const bottom = (boxes: Record<string, Box>): number => Math.max(0, ...Object.values(boxes).map(([, y, , h]) => y + h));

/** A box that fits the grid and the smallest size of its kind */
const clamp = ([x, y, w, h]: Box, item: LayoutItem, cols: number): Box => {
  const [minW, minH] = minSize(item);
  const width = Math.max(minW, Math.min(w, cols));
  return [Math.max(0, Math.min(x, cols - width)), Math.max(0, y), width, Math.max(minH, h)];
};

/**
 * The box of every item on one device: what was placed there, and the rest flowed in below it. The rest keeps the order and
 * size it has on the tablet layout (which for tablet itself is the order of the items), so a layout made for the tablet
 * gives a sensible phone and wall display until somebody places things there.
 */
const boxesFor = (page: Page, device: Device): Record<string, Box> => {
  const cols = COLUMNS[device];
  const known = new Map(page.items.map((i) => [i.id, i]));
  const own: Record<string, Box> = {};
  for (const [id, box] of Object.entries(page.layouts?.[device] ?? {})) {
    const item = known.get(id);
    if (item) own[id] = clamp(box, item, cols);
  }
  const missing = page.items.filter((i) => !own[i.id]);
  if (!missing.length) return own;
  const tablet = device === "tablet" ? {} : (page.layouts?.tablet ?? {});
  const rank = (i: LayoutItem): number[] => (tablet[i.id] ? [tablet[i.id][1], tablet[i.id][0]] : [Infinity, Infinity]);
  const ordered = missing.slice().sort((a, b) => rank(a)[0] - rank(b)[0] || rank(a)[1] - rank(b)[1]);
  const sizes = ordered.map((i): Size => {
    const [minW, minH] = minSize(i);
    const [defW, defH] = defaultSize(i, cols);
    const box = tablet[i.id];
    return { id: i.id, wide: wide(i), w: box ? Math.max(minW, box[2]) : defW, h: box ? Math.max(minH, box[3]) : defH };
  });
  return { ...own, ...flow(sizes, cols, bottom(own)) };
};

/** The items of a page in reading order, each with its place on `device`. */
export const resolveLayout = (page: Page, device: Device): Placed[] => {
  const boxes = boxesFor(page, device);
  return page.items
    .filter((item) => boxes[item.id])
    .map((item) => ({ item, x: boxes[item.id][0], y: boxes[item.id][1], w: boxes[item.id][2], h: boxes[item.id][3] }))
    .sort((a, b) => a.y - b.y || a.x - b.x);
};
