// Importing a Home Assistant dashboard: every view becomes a page. A card that Ambidash has a native version of (the tile of a
// device, a heading) becomes that, but only when nothing would be lost; every other card is embedded as it is.
import { COLUMNS, defaultSize, flow, idPrefix } from "../layout";
import { t } from "../i18n";
import "./i18n-studio";
import { DOMAINS } from "../model";
import type { Box, Condition, LayoutItem, Page, TileAction } from "../types";
import { newPageId } from "./edit";

type Obj = Record<string, unknown>;
const isObject = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);

// The limits the server checks (validation.py)
const MAX_PAGES = 30;
const MAX_ITEMS = 800;
const MAX_NAME = 60;
const MAX_TEXT = 80;
const MAX_CARD_CHARS = 20000;
const ENTITY = /^[a-z0-9_]+\.[a-z0-9_]+$/;
const CARD_TYPE = /^(custom:)?[a-z0-9][a-z0-9_-]{0,79}$/;

// The limits of show_if (validation.py)
const MAX_CONDITIONS = 10;
const MAX_DEPTH = 4;
const MAX_SHOW_IF_CHARS = 4000;
const MAX_STATE_CHARS = 120;

const DOMAIN_SET = new Set<string>(DOMAINS);
const supported = (v: unknown): v is string => typeof v === "string" && ENTITY.test(v) && DOMAIN_SET.has(v.slice(0, v.indexOf(".")));

/** Where a card sits is decided by the layout here, not by Home Assistant's grid, so these keys never stop a conversion */
const PLACEMENT = ["grid_options", "layout_options", "view_layout"];
const only = (card: Obj, allowed: string[]): boolean => Object.keys(card).every((k) => allowed.includes(k) || PLACEMENT.includes(k));

/** The cards that show one device and switch it on tap */
const TILE_TYPES = ["tile", "light", "thermostat", "button"];
const STACK_TYPES = ["vertical-stack", "horizontal-stack", "grid"];

/** What a tap or hold action becomes: undefined is the device's own way, false means it cannot be expressed (navigate, call a service …) */
const action = (value: unknown, hold: boolean): TileAction | undefined | false => {
  if (value === undefined) return undefined;
  const kind = isObject(value) && Object.keys(value).length === 1 ? value.action : undefined;
  if (kind === "more-info") return "more-info";
  if (kind === "none") return "none";
  return kind === "toggle" && !hold ? undefined : false;
};

/** The state text(s) of a state condition: a text, or a short list of texts */
const stateTexts = (v: unknown): string | string[] | undefined => {
  const text = (s: unknown): s is string => typeof s === "string" && s.length > 0 && s.length <= MAX_STATE_CHARS;
  return text(v) ? v : Array.isArray(v) && v.length > 0 && v.length <= 20 && v.every(text) ? (v as string[]) : undefined;
};

const keysIn = (c: Obj, allowed: string[]): boolean => Object.keys(c).every((k) => allowed.includes(k));

/**
 * One condition of Home Assistant (a card's `visibility`, a conditional card's `conditions`) as an Ambidash condition at list depth
 * `depth`. Undefined when it would not mean the same here: a screen size, a user, an entity as a limit, odd values, too deep.
 */
const condition = (c: unknown, depth: number, legacy: boolean): Condition | undefined => {
  if (!isObject(c)) return undefined;
  const kind = c.condition ?? (legacy ? "state" : undefined); // the conditional card's older conditions have no `condition`
  if ((kind === "state" || kind === "numeric_state") && (typeof c.entity !== "string" || !ENTITY.test(c.entity))) return undefined;
  if (kind === "state") {
    if (!keysIn(c, ["condition", "entity", "state", "state_not"]) || (c.state === undefined) === (c.state_not === undefined)) return undefined;
    const state = stateTexts(c.state ?? c.state_not);
    return state ? { condition: c.state === undefined ? "not_state" : "state", entity: c.entity as string, state } : undefined;
  }
  if (kind === "numeric_state") {
    const number = (v: unknown): number | undefined => (typeof v === "number" && Number.isFinite(v) ? v : undefined);
    const above = number(c.above);
    const below = number(c.below);
    const wrong = (c.above !== undefined && above === undefined) || (c.below !== undefined && below === undefined) || (above === undefined && below === undefined);
    if (!keysIn(c, ["condition", "entity", "above", "below"]) || wrong) return undefined;
    return { condition: "numeric", entity: c.entity as string, ...(above !== undefined ? { above } : {}), ...(below !== undefined ? { below } : {}) };
  }
  if (kind === "and" || kind === "or") {
    if (!keysIn(c, ["condition", "conditions"]) || depth + 1 >= MAX_DEPTH) return undefined;
    const conditions = conditionList(c.conditions, depth + 1, false);
    return conditions?.length ? { condition: kind, conditions } : undefined;
  }
  return undefined;
};

const conditionList = (v: unknown, depth: number, legacy: boolean): Condition[] | undefined => {
  if (!Array.isArray(v) || v.length > MAX_CONDITIONS) return undefined;
  const list = v.map((c) => condition(c, depth, legacy));
  return list.every((c) => c !== undefined) ? (list as Condition[]) : undefined;
};

/** The conditions that decide whether a card is shown, as `show_if` ([] for none); undefined when they cannot be taken over as they are */
const showIf = (v: unknown, legacy = false): Condition[] | undefined => {
  const list = conditionList(v, 0, legacy);
  return list && JSON.stringify(list).length <= MAX_SHOW_IF_CHARS ? list : undefined;
};

export interface ImportReport {
  pages: number;
  tiles: number;
  headings: number;
  cards: number;
  /** Clock and weather widgets made from clock and weather cards */
  widgets: number;
  /** Items that only show under the conditions their cards had (`visibility`, conditional cards) */
  conditions: number;
  /** Entries that could not be taken over (not a card, no usable type, too large) */
  skipped: number;
  /** The view had badges, which Ambidash does not show */
  badges: boolean;
  /** Pages or items beyond the limits were left out */
  cut: boolean;
}

export type ImportResult = { ok: true; pages: Page[]; report: ImportReport } | { ok: false; reason: "strategy" | "empty" };

interface Built {
  item: Omit<LayoutItem, "id">;
  /** Width and height in cells on the tablet grid, when the card says how big it wants to be */
  size?: [number, number];
}

const clamp = (n: number, min: number, max: number): number => Math.min(max, Math.max(min, n));

/** The pages for a dashboard's configuration (what `lovelace/config` returns); `existing` are the pages the new ones are added to */
export const importDashboard = (config: unknown, existing: Page[] = []): ImportResult => {
  if (!isObject(config) || !Array.isArray(config.views)) return { ok: false, reason: isObject(config) && config.strategy ? "strategy" : "empty" };
  const cols = COLUMNS.tablet;
  const report: ImportReport = { pages: 0, tiles: 0, headings: 0, cards: 0, widgets: 0, conditions: 0, skipped: 0, badges: false, cut: false };
  const text = (v: unknown, max: number): string | undefined => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : undefined);

  const tile = (entity: string, name: unknown, tap?: TileAction, hold?: TileAction): Built => {
    const label = text(name, MAX_TEXT);
    return { item: { type: "tile", entity, ...(label ? { name: label } : {}), ...(tap ? { tap } : {}), ...(hold ? { hold } : {}) } };
  };
  const heading = (title: unknown): Built[] => {
    const label = text(title, MAX_TEXT);
    return label ? [{ item: { type: "heading", text: label } }] : [];
  };

  /** The size a card asked for with `grid_options` (Home Assistant's grid has 12 columns and rows of about 56 px), on the tablet grid */
  const sizeHint = (card: Obj): [number, number] | undefined => {
    const g = isObject(card.grid_options) ? card.grid_options : {};
    const w = g.columns === "full" ? cols : typeof g.columns === "number" ? clamp(Math.round((g.columns * cols) / 12), 2, cols) : undefined;
    const h = typeof g.rows === "number" ? clamp(Math.round(g.rows * 1.2), 2, 30) : undefined;
    return w || h ? [w ?? 4, h ?? 3] : undefined;
  };

  const embed = (card: Obj): Built[] => {
    if (typeof card.type !== "string" || !CARD_TYPE.test(card.type)) return (report.skipped++, []);
    const { grid_options: _grid, layout_options: _layout, view_layout: _view, ...plain } = card;
    if (JSON.stringify(plain).length > MAX_CARD_CHARS) return (report.skipped++, []);
    return [{ item: { type: "card", card: plain }, size: sizeHint(card) }];
  };

  /** Puts conditions on every item; undefined when an item would get more than the server takes */
  const combine = (built: Built[], show_if: Condition[]): Built[] | undefined => {
    if (!show_if.length) return built;
    const joined: Built[] = [];
    for (const b of built) {
      const all = [...(b.item.show_if ?? []), ...show_if];
      if (all.length > MAX_CONDITIONS || JSON.stringify(all).length > MAX_SHOW_IF_CHARS) return undefined;
      joined.push({ ...b, item: { ...b.item, show_if: all } });
    }
    return joined;
  };

  /** The native version of a card, or undefined when it would not be the same card any more (then it is embedded) */
  const native = (card: unknown): Built[] | undefined => {
    if (!isObject(card)) return undefined;
    // A card with conditions that Ambidash can say as well: the item has them and the card does not, so they are not judged twice.
    // Conditions it cannot say stay with the card, whose Home Assistant card judges them itself.
    if (card.visibility !== undefined) {
      const show_if = showIf(card.visibility);
      const { visibility: _visibility, ...rest } = card;
      const built = show_if && native(rest);
      return built && show_if ? combine(built, show_if) : undefined;
    }
    // A conditional card is its card with the conditions on it
    if (card.type === "conditional") {
      const show_if = only(card, ["type", "conditions", "card"]) && isObject(card.card) ? showIf(card.conditions, true) : undefined;
      return show_if ? combine(convert(card.card), show_if) : undefined;
    }
    if (card.type === "heading") return only(card, ["type", "heading", "heading_style"]) && text(card.heading, MAX_TEXT) ? heading(card.heading) : undefined;
    if (typeof card.type === "string" && TILE_TYPES.includes(card.type)) {
      if (!only(card, ["type", "entity", "name", "tap_action", "hold_action"]) || !supported(card.entity)) return undefined;
      const tap = action(card.tap_action, false);
      const hold = action(card.hold_action, true);
      return tap === false || hold === false ? undefined : [tile(card.entity, card.name, tap, hold)];
    }
    // The digital clock and the weather forecast card of Home Assistant become the widgets, when the widget says all they did
    if (card.type === "clock") {
      if (!only(card, ["type", "time_format", "show_seconds", "clock_size", "no_background", "clock_style"]) || (card.clock_style !== undefined && card.clock_style !== "digital")) return undefined;
      const format = String(card.time_format ?? "auto");
      if (!["auto", "12", "24"].includes(format)) return undefined;
      return [{ item: { type: "clock", date: false, ...(format === "auto" ? {} : { format: format as "12" | "24" }), ...(card.show_seconds === true ? { seconds: true } : {}) }, size: sizeHint(card) }];
    }
    if (card.type === "weather-forecast") {
      if (!only(card, ["type", "entity", "show_current", "show_forecast", "forecast_type"]) || card.show_current === false) return undefined;
      if (card.forecast_type !== undefined && card.forecast_type !== "daily") return undefined;
      if (typeof card.entity !== "string" || !/^weather\.[a-z0-9_]+$/.test(card.entity)) return undefined;
      return [{ item: { type: "weather", entity: card.entity, ...(card.show_forecast === false ? { forecast: false } : {}) }, size: sizeHint(card) }];
    }
    if (card.type === "entities") {
      if (!only(card, ["type", "title", "entities", "state_color", "show_header_toggle"]) || !Array.isArray(card.entities) || !card.entities.length) return undefined;
      const rows = card.entities.map((row): Built | undefined => {
        const r = typeof row === "string" ? { entity: row } : row;
        return isObject(r) && only(r, ["entity", "name"]) && supported(r.entity) ? tile(r.entity, r.name) : undefined;
      });
      return rows.every(Boolean) ? [...heading(card.title), ...(rows as Built[])] : undefined;
    }
    // A stack or grid is a unit (think of a Bubble Card pop-up with its content): it is only taken apart when every card in it becomes a tile or heading
    if (typeof card.type === "string" && STACK_TYPES.includes(card.type) && Array.isArray(card.cards) && card.cards.length) {
      const parts = card.cards.map(native);
      return parts.every(Boolean) ? [...heading(card.title), ...parts.flatMap((p) => p as Built[])] : undefined;
    }
    return undefined;
  };

  const convert = (card: unknown): Built[] => {
    const built = native(card);
    if (built) return built;
    if (!isObject(card)) return (report.skipped++, []);
    // An embedded card keeps its conditions the Home Assistant way, unless Ambidash can say them too: then the item has them instead
    const show_if = card.visibility === undefined ? undefined : showIf(card.visibility);
    if (show_if?.length) {
      const { visibility: _visibility, ...rest } = card;
      const joined = combine(embed(rest), show_if);
      if (joined) return joined;
    }
    return embed(card);
  };

  const pages: Page[] = [];
  for (const view of config.views) {
    if (!isObject(view)) continue;
    if (Array.isArray(view.badges) && view.badges.length) report.badges = true;
    const cards = [...(Array.isArray(view.cards) ? view.cards : []), ...(Array.isArray(view.sections) ? view.sections.flatMap((s) => (isObject(s) && Array.isArray(s.cards) ? s.cards : [])) : [])];
    const built = cards.flatMap(convert);
    if (!built.length) continue;
    if (existing.length + pages.length >= MAX_PAGES) {
      report.cut = true;
      break;
    }
    if (built.length > MAX_ITEMS) report.cut = true;
    const items: LayoutItem[] = [];
    const sizes: { id: string; wide: boolean; w: number; h: number }[] = [];
    for (const b of built.slice(0, MAX_ITEMS)) {
      const type = b.item.type;
      const id = `${idPrefix(b.item)}${items.length + 1}`;
      items.push({ ...b.item, id });
      const [w, h] = b.size ?? defaultSize(b.item, cols);
      sizes.push({ id, wide: type === "heading", w, h });
      report[type === "tile" ? "tiles" : type === "heading" ? "headings" : type === "card" ? "cards" : "widgets"]++;
      if (b.item.show_if) report.conditions++;
    }
    const boxes: Record<string, Box> = flow(sizes, cols);
    pages.push({
      id: newPageId([...existing, ...pages]),
      name: text(view.title, MAX_NAME) ?? text(view.path, MAX_NAME) ?? t("Page {n}", { n: existing.length + pages.length + 1 }),
      items,
      layouts: { tablet: boxes },
    });
  }
  report.pages = pages.length;
  return pages.length ? { ok: true, pages, report } : { ok: false, reason: "empty" };
};
