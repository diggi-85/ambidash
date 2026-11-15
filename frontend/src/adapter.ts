// Everything that depends on Home Assistant's frontend internals lives here, so a change in HA needs a fix in one place.
import type { Hass, HassEntity, StoredConfig } from "./types";

/** "Living room Lamp" in the area "Living room" becomes "Lamp"; the name stays when nothing would be left. */
export const stripArea = (name: string, area?: string): string => {
  if (!area || !name.toLowerCase().startsWith(`${area.toLowerCase()} `)) return name;
  const rest = name.slice(area.length).trim();
  return rest ? rest.charAt(0).toUpperCase() + rest.slice(1) : name;
};

/** Tile name: Home Assistant's own naming (2026.11: device + entity name) without the area the tile sits under. */
export const entityName = (hass: Hass, state: HassEntity, area?: string): string => {
  let name: string | undefined;
  try {
    name = hass.formatEntityName?.(state);
  } catch {
    // an HA change must not blank the dashboard; fall through to the attribute
  }
  // shortcut: friendly_name is planned for deprecation by HA; keep as fallback until formatEntityName is guaranteed
  name ||= (state.attributes.friendly_name as string | undefined) || state.entity_id;
  return stripArea(name, area);
};

/** Open Home Assistant's detail dialog for an entity. */
export const moreInfo = (from: HTMLElement, entityId: string): void => {
  from.dispatchEvent(new CustomEvent("hass-more-info", { detail: { entityId }, bubbles: true, composed: true }));
};

export const callService = (hass: Hass, domain: string, service: string, entityId: string, data: Record<string, unknown> = {}): Promise<unknown> =>
  hass.callService(domain, service, data, { entity_id: entityId });

/** An address the browser can load: media-source://… must be signed by Home Assistant first (valid for an hour). */
export const resolveImage = async (hass: Hass, src: string): Promise<string> => {
  if (!src.startsWith("media-source://") || !hass.callWS) return src;
  const { url } = await hass.callWS<{ url: string }>({ type: "media_source/resolve_media", media_content_id: src, expires: 3600 });
  return url;
};

/** The pictures in a media-source folder as media-source ids (flat, no subfolders). Rejects when the folder cannot be read. */
export const browseFolder = async (hass: Hass, folder: string): Promise<string[]> => {
  if (!hass.callWS) return [];
  const { children = [] } = await hass.callWS<{ children?: { media_content_id: string; media_class: string; title: string }[] }>({
    type: "media_source/browse_media",
    media_content_id: folder,
  });
  return children.filter((c) => c.media_class === "image" || /\.(jpe?g|png|webp|avif)$/i.test(c.title)).map((c) => c.media_content_id);
};

/** Free placeholder photos that Home Assistant fetches and serves; rejects when the integration's internet switch is off. */
export const placeholderPhotos = (hass: Hass, source: string, language?: string): Promise<{ url: string; credit: string }[]> =>
  hass.callWS ? hass.callWS({ type: "ambidash/photos/placeholder", source, language }) : Promise.resolve([]);

interface CardWindow {
  loadCardHelpers?: () => Promise<unknown>;
}

/** Home Assistant's card helpers exist once its dashboard code has loaded; a custom panel such as the Studio has none until a dashboard was opened. */
export const cardsAvailable = (): boolean => typeof (window as CardWindow).loadCardHelpers === "function";

/** An element of Home Assistant's own hui-card for a card configuration (it builds custom cards, runs their actions and rebuilds when a custom card is defined later). Rejects when cards are not available here. */
export const createCard = async (config: Record<string, unknown>): Promise<HTMLElement & { hass?: Hass }> => {
  const load = (window as CardWindow).loadCardHelpers;
  if (!load) throw new Error("card helpers are not available here");
  await load();
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("hui-card is not available")), 3000);
    void customElements.whenDefined("hui-card").then(() => (clearTimeout(timer), resolve()));
  });
  const card = document.createElement("hui-card") as HTMLElement & { hass?: Hass; config?: unknown };
  card.config = config;
  return card;
};

/** One day of a weather entity's daily forecast */
export interface ForecastDay {
  datetime: string;
  condition?: string;
  temperature?: number;
  templow?: number;
}

/** Bit of `supported_features` of a weather entity that says it has a daily forecast */
export const FORECAST_DAILY = 1;

/** Calls back with the daily forecast of a weather entity now and whenever it changes; returns the function that ends it. Without a connection nothing happens. */
export const subscribeForecast = async (hass: Hass, entityId: string, callback: (days: ForecastDay[]) => void): Promise<() => void> =>
  hass.connection
    ? hass.connection.subscribeMessage<{ forecast?: ForecastDay[] | null }>((m) => callback(m.forecast ?? []), { type: "weather/subscribe_forecast", forecast_type: "daily", entity_id: entityId })
    : () => undefined;

/** The state as Home Assistant writes it in the user's language ("Partly cloudy"); the raw state where it cannot say */
export const stateLabel = (hass: Hass, state: HassEntity): string => {
  try {
    return hass.formatEntityState?.(state) || state.state;
  } catch {
    return state.state;
  }
};

/** A dashboard of this Home Assistant; the default one has no url path */
export interface DashboardInfo {
  url_path: string | null;
  title: string;
}

/** The default dashboard followed by the others (admins only) */
export const listDashboards = async (hass: Hass, defaultTitle: string): Promise<DashboardInfo[]> => {
  const list = hass.callWS ? await hass.callWS<{ url_path: string; title?: string }[]>({ type: "lovelace/dashboards/list" }) : [];
  return [{ url_path: null, title: defaultTitle }, ...list.map((d) => ({ url_path: d.url_path, title: d.title || d.url_path }))];
};

/** The configuration of a dashboard (views and cards); rejects with code `config_not_found` for one that builds itself */
export const loadDashboardConfig = (hass: Hass, urlPath: string | null): Promise<unknown> =>
  hass.callWS ? hass.callWS({ type: "lovelace/config", url_path: urlPath, force: false }) : Promise.reject(new Error("no connection"));

/** Go to a path inside Home Assistant without reloading the page (what HA's own navigate() does). */
export const navigate = (path: string): void => {
  window.history.pushState(null, "", path);
  window.dispatchEvent(new CustomEvent("location-changed", { detail: { replace: false } }));
};

/** What the Studio saved, and whether an earlier version exists to go back to. */
export interface StoredReply {
  config: StoredConfig;
  has_previous: boolean;
}

export const loadStored = (hass: Hass): Promise<StoredReply> =>
  hass.callWS ? hass.callWS<StoredReply>({ type: "ambidash/config/get" }) : Promise.reject(new Error("no connection"));

/** Saves a new configuration; rejects with Home Assistant's error (code `invalid_config` names what is wrong and where). */
export const saveStored = (hass: Hass, config: StoredConfig): Promise<StoredReply> =>
  hass.callWS ? hass.callWS<StoredReply>({ type: "ambidash/config/save", config }) : Promise.reject(new Error("no connection"));

export const restoreStored = (hass: Hass): Promise<StoredReply> =>
  hass.callWS ? hass.callWS<StoredReply>({ type: "ambidash/config/restore_previous" }) : Promise.reject(new Error("no connection"));

/** Calls back with the saved configuration now and after every save; returns the function that ends it. */
export const subscribeStored = async (hass: Hass, callback: (config: StoredConfig) => void): Promise<() => void> =>
  hass.connection ? hass.connection.subscribeMessage<{ config: StoredConfig }>((m) => callback(m.config), { type: "ambidash/config/subscribe" }) : () => undefined;

/** Home Assistant's light/dark setting; the browser's when HA does not say. */
export const isDark = (hass?: Hass): boolean =>
  hass?.themes?.darkMode ?? (typeof matchMedia !== "undefined" && matchMedia("(prefers-color-scheme: dark)").matches);
