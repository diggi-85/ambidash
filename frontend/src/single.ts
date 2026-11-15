// The widgets as cards of their own: custom:ambidash-clock-card, custom:ambidash-weather-card and custom:ambidash-tile-card work in
// any Home Assistant dashboard. By default they look like Ambidash's "Home" design in light or dark as Home Assistant is; `design`,
// `mode`, `palette` and `accent` choose another look, the same options as the dashboard has.
import { designCss, type Mode } from "@ambi/core";
import { LitElement, css, html, nothing, type TemplateResult } from "lit";
import { entityName, isDark } from "./adapter";
import "./clock";
import { resolveLang, setLang, t } from "./i18n";
import { DOMAINS, areaNameOf } from "./model";
import "./single-editor";
import "./tile";
import type { Hass, HassEntity, TileAction } from "./types";
import "./weather";

/** What every card takes: the look, and the language (`auto` follows the Home Assistant user) */
interface Config {
  type?: string;
  design?: string;
  mode?: string;
  palette?: string;
  accent?: string;
  language?: string;
  /** No card background (a clock on a picture, say) */
  no_background?: boolean;
  entity?: string;
  name?: string;
  format?: string;
  seconds?: boolean;
  date?: boolean;
  forecast?: boolean;
  tap_action?: { action?: string };
  hold_action?: { action?: string };
}

abstract class SingleCard extends LitElement {
  static properties = {
    config: { attribute: false },
    stateObj: { attribute: false },
    dark: { state: true },
  };

  static styles = css`
    /* A column that is at least --min high: in a masonry layout (no height given) it is that high, in a sections layout it fills
       its cell; the card and its widget share what is there (flex), so the widget has a height to measure itself against */
    :host {
      display: flex;
      flex-direction: column;
      height: 100%;
      min-height: var(--min, 72px);
    }
    .face {
      flex: 1 1 auto;
      display: flex;
      flex-direction: column;
      min-height: 0;
      box-sizing: border-box;
      padding: 12px;
      border-radius: var(--ha-card-border-radius, 12px);
      border: var(--ha-card-border-width, 1px) solid var(--ha-card-border-color, var(--divider-color));
      background: var(--ha-card-background, var(--card-background-color));
      box-shadow: var(--ha-card-box-shadow, none);
      color: var(--ambi-ink);
      font-family: var(--ambi-font);
    }
    /* Home Assistant's own cards have no background where the card says no_background; a chosen design paints its page */
    .face.own {
      border-radius: var(--ambi-radius, 12px);
      border-color: var(--ambi-line);
      background: var(--ambi-bg);
      background-image: var(--ambi-bg-art, none);
      background-size: var(--ambi-bg-size, auto);
    }
    .face.bare {
      padding: 0;
      border: 0;
      background: none;
      box-shadow: none;
    }
    .face.loose {
      padding: 0;
      border: 0;
      background: none;
      box-shadow: none;
    }
    [data-widget] {
      flex: 1 1 0;
      min-height: 0;
    }
    .note {
      display: flex;
      align-items: center;
      flex: 1;
      color: var(--ambi-ink-2);
      font-size: 13px;
    }
  `;

  config?: Config;
  stateObj?: HassEntity;
  private dark = false;
  private current?: Hass;

  /** Smallest height of the card in Home Assistant's masonry layout, in px (a sections layout sets the height itself) */
  protected minHeight = 72;
  /** The widget paints itself (the tile): the card adds no background of its own */
  protected loose = false;

  /** The visual editor in Home Assistant's card dialog */
  static getConfigElement(): HTMLElement {
    return document.createElement("ambidash-card-editor");
  }

  protected abstract validate(config: Config): void;
  protected abstract widget(): TemplateResult;
  abstract getCardSize(): number;
  abstract getGridOptions(): Record<string, number>;

  setConfig(config: Config): void {
    if (!config || typeof config !== "object") throw new Error("Invalid configuration");
    this.validate(config);
    this.config = { ...config };
    this.stateObj = config.entity ? this.current?.states[config.entity] : undefined;
  }

  /** Home Assistant hands over a new hass with every state change anywhere: only what this card shows repaints */
  set hass(hass: Hass) {
    this.current = hass;
    setLang(resolveLang(this.config?.language, hass.language));
    const state = this.config?.entity ? hass.states[this.config.entity] : undefined;
    if (state !== this.stateObj) this.stateObj = state;
    const dark = isDark(hass);
    if (dark !== this.dark) this.dark = dark;
    const inner = this.renderRoot?.querySelector<HTMLElement & { hass?: Hass }>("[data-widget]");
    if (inner) inner.hass = hass;
  }

  get hass(): Hass | undefined {
    return this.current;
  }

  render() {
    const c = this.config;
    if (!c) return nothing;
    const mode: Mode = c.mode === "light" || c.mode === "dark" ? c.mode : this.dark ? "dark" : "light";
    const classes = `face ${this.loose ? "loose" : c.design ? "own" : ""} ${c.no_background ? "bare" : ""}`;
    return html`<div class=${classes} style=${designCss(c.design ?? "home", mode, { palette: c.palette, accent: c.accent })}>${this.widget()}</div>`;
  }

  connectedCallback(): void {
    super.connectedCallback();
    this.style.setProperty("--min", `${this.minHeight}px`);
  }

  /** The entity the card shows, or a note that it is not there */
  protected withState(show: (state: HassEntity) => TemplateResult): TemplateResult {
    return this.stateObj ? show(this.stateObj) : html`<div class="note">${t("{entity} was not found.", { entity: this.config?.entity ?? "" })}</div>`;
  }
}

const unsupportedAction = () => new Error(t("This tap_action or hold_action is not supported here: use more-info, none or (for tap_action) toggle."));

/** `more-info`, `none` and, for a tap, `toggle` (the device's own way) are the actions a tile can have; anything else is refused */
const action = (value: { action?: string } | undefined, hold: boolean): TileAction | undefined => {
  if (value === undefined) return undefined;
  if (value.action === "more-info") return "more-info";
  if (value.action === "none") return "none";
  if (value.action === "toggle" && !hold) return undefined;
  throw unsupportedAction();
};

export class AmbidashClockCard extends SingleCard {
  protected minHeight = 112;
  static getStubConfig = (): Config => ({});
  protected validate(config: Config): void {
    if (config.format !== undefined && !["auto", "12", "24"].includes(config.format)) throw new Error("format must be auto, 12 or 24");
  }
  protected widget() {
    const c = this.config!;
    return html`<ambidash-clock data-widget .format=${(c.format ?? "auto") as "auto" | "12" | "24"} .seconds=${!!c.seconds} .date=${c.date !== false}></ambidash-clock>`;
  }
  getCardSize(): number {
    return 2;
  }
  getGridOptions(): Record<string, number> {
    return { columns: 6, rows: 2, min_columns: 3, min_rows: 1 };
  }
}

export class AmbidashWeatherCard extends SingleCard {
  protected minHeight = 200;
  static getStubConfig = (hass: Hass): Config => ({ entity: Object.keys(hass.states).find((id) => id.startsWith("weather.")) ?? "weather.home" });
  protected validate(config: Config): void {
    if (typeof config.entity !== "string" || !config.entity.startsWith("weather.")) throw new Error(t("Please set entity to a weather entity, for example entity: weather.home."));
  }
  protected widget() {
    return this.withState((state) => html`<ambidash-weather data-widget .stateObj=${state} .hass=${this.hass} .forecast=${this.config!.forecast !== false}></ambidash-weather>`);
  }
  getCardSize(): number {
    return 4;
  }
  getGridOptions(): Record<string, number> {
    return { columns: 12, rows: 4, min_columns: 4, min_rows: 2 };
  }
}

export class AmbidashTileCard extends SingleCard {
  protected loose = true;
  static getStubConfig = (hass: Hass): Config => ({ entity: Object.keys(hass.states).find((id) => id.startsWith("light.")) ?? "light.living_room" });
  protected validate(config: Config): void {
    if (typeof config.entity !== "string" || !(DOMAINS as readonly string[]).includes(config.entity.slice(0, config.entity.indexOf(".")))) {
      throw new Error(t("Please set entity to a light, switch, climate device, cover, media player or scene."));
    }
    action(config.tap_action, false);
    action(config.hold_action, true);
  }
  protected widget() {
    const c = this.config!;
    return this.withState(
      (state) =>
        html`<ambidash-tile data-widget .stateObj=${state} .name=${c.name || (this.hass ? entityName(this.hass, state, areaNameOf(this.hass, state.entity_id)) : state.entity_id)} .tap=${action(c.tap_action, false)} .hold=${action(c.hold_action, true)} .hass=${this.hass}></ambidash-tile>`,
    );
  }
  getCardSize(): number {
    return 1;
  }
  getGridOptions(): Record<string, number> {
    return { columns: 6, rows: 1, min_columns: 3, min_rows: 1 };
  }
}

/** Defines the card and lists it in Home Assistant's card picker */
const define = (type: string, element: CustomElementConstructor, name: string, description: string): void => {
  const tag = `ambidash-${type}-card`;
  if (!customElements.get(tag)) customElements.define(tag, element);
  const w = window as unknown as { customCards?: { type: string; name: string; description: string; preview?: boolean }[] };
  w.customCards = w.customCards ?? [];
  if (!w.customCards.some((c) => c.type === tag)) w.customCards.push({ type: tag, name, description, preview: true });
};

define("clock", AmbidashClockCard, "Ambidash clock", "The time and the date, in the clock type of an Ambidash design");
define("weather", AmbidashWeatherCard, "Ambidash weather", "How the weather is now and the forecast of the next days");
define("tile", AmbidashTileCard, "Ambidash tile", "A tile for a light, switch, climate device, cover, media player or scene");
