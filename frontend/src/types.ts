// The slice of Home Assistant's frontend objects Ambidash reads. `hass.entities`, `devices`, `areas` and
// `floors` are the registry "display" entries the frontend keeps up to date.

export interface HassEntity {
  entity_id: string;
  state: string;
  attributes: Record<string, any>;
  last_changed: string;
}

export interface RegistryEntity {
  entity_id: string;
  device_id?: string | null;
  area_id?: string | null;
  hidden?: boolean;
  entity_category?: string | null;
}

export interface Hass {
  states: Record<string, HassEntity>;
  entities: Record<string, RegistryEntity>;
  devices: Record<string, { area_id?: string | null }>;
  areas: Record<string, { area_id: string; name: string; floor_id?: string | null }>;
  floors: Record<string, { floor_id: string; name: string; level?: number | null }>;
  language?: string;
  themes?: { darkMode?: boolean };
  callService(domain: string, service: string, data?: Record<string, unknown>, target?: Record<string, unknown>): Promise<unknown>;
  callWS?: <T>(message: Record<string, unknown>) => Promise<T>;
  /** The WebSocket connection; subscriptions come back with a function that ends them */
  connection?: { subscribeMessage<T>(callback: (message: T) => void, subscribe: Record<string, unknown>): Promise<() => void> };  /** Home Assistant's own naming (2026.11: device name + entity name) */
  formatEntityName?(stateObj: HassEntity): string;
  /** Home Assistant's own wording of a state in the user's language */
  formatEntityState?(stateObj: HassEntity): string;
}

/** What sits behind the tiles: a picture, a colour, a gradient, or a mix (picture over gradient over colour). */
export interface Background {
  /** /local/…, media-source://… or any web address */
  image?: string;
  color?: string;
  /** Two or more colours; angle in degrees (default 160) */
  gradient?: string[];
  angle?: number;
  /** Darkening of a picture for readable text: none | light (default) | strong */
  shade?: "none" | "light" | "strong";
  /** Blur of a picture in px, 0 to 40 */
  blur?: number;
  /** A media-source folder whose pictures take turns, shuffled (flat, no subfolders); `image` is the fallback */
  folder?: string;
  /** Free photos Home Assistant fetches for you: wikimedia | art | nasa | picsum | bing. Used when there is no folder, or mixed in with `mix` */
  placeholder?: string;
  mix?: boolean;
  /** Minutes before the next picture (1 to 1440, default 10) */
  interval?: number;
  /** Show the credit line of placeholder photos (default true) */
  credit?: boolean;
}

/**
 * The Ruhemodus: after some minutes without a touch the dashboard shows a calm clock instead of its page, over the dimmed
 * background. A touch wakes it. Having the object turns it on; every field is optional.
 */
export interface RestConfig {
  /** Minutes without a touch before it starts: 1 to 240, default 5 */
  after?: number;
  /** The clock, the same options as the clock widget: how the time is written, seconds (default no) and the date (default yes) */
  format?: "auto" | "12" | "24";
  seconds?: boolean;
  date?: boolean;
  /** A weather entity shown under the clock */
  weather?: string;
  /** How much the background is darkened, in percent: 0 to 90, default 40 */
  dim?: number;
  /** The device classes it is for: default tablet and wall display, not the phone */
  devices?: Device[];
  /** It may start only while all of these hold, and ends when one stops holding (left out: whenever nobody touches it) */
  when?: Condition[];
}

/** Options of `custom:ambidash-root`, passed through from `strategy: { type: custom:ambidash, … }` */
export interface AmbidashConfig {
  /** calm, clear or home */
  design?: string;
  /** auto follows Home Assistant's light/dark setting */
  mode?: "auto" | "light" | "dark";
  /** Cover the whole window (wall tablets, kiosk) instead of sitting inside the HA view */
  fullscreen?: boolean;
  /** auto (default) follows the HA user's language */
  language?: string;
  title?: string;
  /** Domains (e.g. switch), areas (id or name) and single entities to leave out; scenes stay in a hidden area */
  hide_domains?: string[];
  hide_areas?: string[];
  hide_entities?: string[];
  /** Leave out devices without an area */
  hide_unassigned?: boolean;
  /** Fullscreen only: where the corner button leads (default "/"); false removes the button */
  exit_path?: string | false;
  /** nordic | vampire | mocha | retro | nightcity: colours over any design (shapes and fonts stay) */
  palette?: string;
  /** Your own accent colour (hex or rgb()); wins over palette and background */
  accent?: string;
  background?: Background;
  /** solid (the design's own) | glass | outline | none; glass is the default on a background */
  card_style?: "solid" | "glass" | "outline" | "none";
  /** Id of a dashboard saved in the Studio: its options apply, and what is written here wins over them */
  dashboard?: string;
  /** Own layout: pages with items placed on a grid. Without pages all devices are shown automatically, area by area. */
  pages?: Page[];
  /** The Ruhemodus (a calm clock after some time without a touch); left out, there is none */
  rest?: RestConfig;
}

/** The screen classes a layout is made for; each has its own number of columns (see layout.ts) */
export type Device = "phone" | "tablet" | "wall";
/** Where an item sits on the grid: column, row, width and height, counted in cells from 0 */
export type Box = [x: number, y: number, w: number, h: number];
/**
 * When something is shown, as plain data in the shape Ambiframe uses (see conditions.ts for how they are judged).
 * Times are "HH:MM" and may run over midnight (after 22:00, before 05:00); the groups need at least one condition.
 */
export type Condition =
  | { condition: "state" | "not_state"; entity: string; state: string | string[]; attribute?: string }
  | { condition: "numeric"; entity: string; above?: number; below?: number; attribute?: string }
  | { condition: "time"; after?: string; before?: string }
  | { condition: "device"; devices: Device[] }
  /** A Jinja template that Home Assistant judges (see template.ts): true, on, yes, enable, 1 or a number other than 0 holds */
  | { condition: "template"; value_template: string }
  | { condition: "and" | "or" | "not"; conditions: Condition[] };

/** How a tile looks while its conditions hold: a design colour for the icon bubble, another icon, another status text */
export interface StateStyle {
  when: Condition[];
  color?: "accent" | "good" | "alert";
  /** An icon such as mdi:door-open */
  icon?: string;
  status?: string;
}

/** A tile of a device, a heading (text), the row of summary chips or a Home Assistant card (its configuration in `card`) */
export interface LayoutItem {
  id: string;
  type: "tile" | "heading" | "summary" | "card" | "clock" | "weather";
  /** Shown only while all of these hold (left out: always shown) */
  show_if?: Condition[];
  /** Tile: the first of these rules that holds changes how the tile looks */
  states?: StateStyle[];
  entity?: string;
  /** Clock: how the time is written (`auto` follows the language), whether it shows seconds (default no) and the date (default yes) */
  format?: "auto" | "12" | "24";
  seconds?: boolean;
  date?: boolean;
  /** Weather: whether the forecast of the next days is shown (default yes) */
  forecast?: boolean;
  /** The configuration of a Home Assistant card, as in its YAML: always has a `type` (tile, entities, custom:bubble-card …) */
  card?: Record<string, unknown>;
  text?: string;
  /** Replaces the tile's name */
  name?: string;
  /** What a tap does instead of the device's own way (switching, playing, activating); left out, the device decides */
  tap?: TileAction;
  /** What pressing and holding does instead of opening the pop-up */
  hold?: TileAction;
}
/** The pop-up of Ambidash, Home Assistant's own dialog, or nothing */
export type TileAction = "popup" | "more-info" | "none";
/** The content of a page is the same everywhere; each device class may place it differently (what has no place is derived) */
export interface Page {
  id: string;
  name: string;
  items: LayoutItem[];
  layouts?: Partial<Record<Device, Record<string, Box>>>;
}

/** A dashboard as the Studio saves it (the same options the strategy takes in YAML) */
export interface StoredDashboard {
  id: string;
  name: string;
  options: AmbidashConfig;
}

/** Everything the Studio saves in `.storage/ambidash` */
export interface StoredConfig {
  version: number;
  dashboards: StoredDashboard[];
}
