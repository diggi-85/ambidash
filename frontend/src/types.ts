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
}

/** The screen classes a layout is made for; each has its own number of columns (see layout.ts) */
export type Device = "phone" | "tablet" | "wall";
/** Where an item sits on the grid: column, row, width and height, counted in cells from 0 */
export type Box = [x: number, y: number, w: number, h: number];
/** A tile of a device, a heading (text) or the row of summary chips */
export interface LayoutItem {
  id: string;
  type: "tile" | "heading" | "summary";
  entity?: string;
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
