// The weather widget: how it is now (icon, temperature, wording, humidity, wind) and the next days of the forecast.
// The forecast is subscribed to for as long as the widget is on screen; Home Assistant sends a new one when it changes.
import { LitElement, css, html, nothing, type PropertyValues } from "lit";
import { FORECAST_DAILY, stateLabel, subscribeForecast, type ForecastDay } from "./adapter";
import { locale } from "./i18n";
import type { Hass, HassEntity } from "./types";

/** The icon of a weather condition */
const ICONS: Record<string, string> = {
  "clear-night": "mdi:weather-night",
  cloudy: "mdi:weather-cloudy",
  exceptional: "mdi:alert-circle-outline",
  fog: "mdi:weather-fog",
  hail: "mdi:weather-hail",
  lightning: "mdi:weather-lightning",
  "lightning-rainy": "mdi:weather-lightning-rainy",
  partlycloudy: "mdi:weather-partly-cloudy",
  pouring: "mdi:weather-pouring",
  rainy: "mdi:weather-rainy",
  snowy: "mdi:weather-snowy",
  "snowy-rainy": "mdi:weather-snowy-rainy",
  sunny: "mdi:weather-sunny",
  windy: "mdi:weather-windy",
  "windy-variant": "mdi:weather-windy-variant",
};
const MAX_DAYS = 5;

export class AmbidashWeather extends LitElement {
  static properties = {
    stateObj: { attribute: false },
    forecast: { type: Boolean },
    days: { state: true },
  };

  static styles = css`
    :host {
      display: block;
      height: 100%;
      min-width: 0;
      container-type: size;
      color: var(--ambi-ink);
      font-family: var(--ambi-font);
    }
    .weather {
      box-sizing: border-box;
      height: 100%;
      display: flex;
      flex-direction: column;
      justify-content: center;
      gap: 8px;
      overflow: hidden;
    }
    .now {
      display: flex;
      align-items: center;
      gap: 14px;
      min-width: 0;
    }
    .big {
      flex: none;
      --mdc-icon-size: clamp(36px, 24cqh, 104px);
      color: var(--ambi-accent);
    }
    .text {
      min-width: 0;
      display: flex;
      flex-direction: column;
    }
    .temp {
      font-family: var(--ambi-display);
      font-weight: var(--ambi-clock-weight, 300);
      font-size: clamp(26px, min(12cqw, 24cqh), 96px);
      line-height: 1.05;
      letter-spacing: var(--ambi-clock-track, -0.02em);
    }
    .label {
      color: var(--ambi-ink-2);
      font-size: clamp(12px, 5cqh, 20px);
    }
    .extra {
      display: flex;
      flex-wrap: wrap;
      gap: 4px 12px;
      color: var(--ambi-ink-2);
      font-size: 13px;
    }
    .extra span {
      display: inline-flex;
      align-items: center;
      gap: 2px;
    }
    .extra ha-icon {
      --mdc-icon-size: 16px;
    }
    .days {
      display: flex;
      gap: 8px;
      padding-top: 8px;
      border-top: 1px solid var(--ambi-line);
    }
    .day {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 2px;
      font-size: 13px;
    }
    .day ha-icon {
      --mdc-icon-size: 24px;
      color: var(--ambi-accent);
    }
    .low {
      color: var(--ambi-ink-2);
    }
    @container (max-width: 360px) {
      .day:nth-child(n + 4) {
        display: none;
      }
    }
    @container (max-width: 230px) {
      .day:nth-child(n + 3),
      .extra {
        display: none;
      }
    }
    @container (max-height: 200px) {
      .extra {
        display: none;
      }
    }
    @container (max-height: 120px) {
      .days {
        display: none;
      }
    }
  `;

  stateObj?: HassEntity;
  /** Show the next days */
  forecast = true;
  /** Not reactive on purpose, like the tiles' hass: the state arrives as `stateObj` */
  hass?: Hass;
  private days: ForecastDay[] = [];
  private stop?: () => void;
  /** The entity whose forecast is subscribed to ("" for none); the token drops answers that arrive after a change */
  private following = "";
  private token = 0;

  connectedCallback(): void {
    super.connectedCallback();
    if (this.hasUpdated) this.follow();
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.end();
  }

  protected updated(_changed: PropertyValues): void {
    this.follow();
  }

  /** Subscribes to the forecast of the entity, if it has one and the widget wants it; ends the subscription of an entity that is no longer shown */
  private follow(): void {
    const s = this.stateObj;
    const id = this.forecast && s && (Number(s.attributes.supported_features) || 0) & FORECAST_DAILY ? s.entity_id : "";
    if (id === this.following) return;
    this.end();
    this.following = id;
    const hass = this.hass;
    if (!id || !hass) return;
    const token = ++this.token;
    subscribeForecast(hass, id, (days) => {
      if (token === this.token) this.days = days;
    }).then(
      (stop) => (token === this.token ? (this.stop = stop) : stop()),
      () => undefined,
    );
  }

  private end(): void {
    this.token++;
    this.stop?.();
    this.stop = undefined;
    this.following = "";
    if (this.days.length) this.days = [];
  }

  render() {
    const s = this.stateObj;
    const hass = this.hass;
    if (!s || !hass) return nothing;
    const a = s.attributes;
    const temp = typeof a.temperature === "number" ? `${Math.round(a.temperature)}${a.temperature_unit ?? "°"}` : "–";
    const humidity = typeof a.humidity === "number" ? `${Math.round(a.humidity)}%` : undefined;
    const wind = typeof a.wind_speed === "number" ? `${Math.round(a.wind_speed)} ${a.wind_speed_unit ?? ""}`.trim() : undefined;
    const day = new Intl.DateTimeFormat(locale(), { weekday: "short" });
    const days = this.forecast ? this.days.slice(0, MAX_DAYS) : [];
    return html`<div class="weather">
      <div class="now">
        <ha-state-icon class="big" .hass=${hass} .stateObj=${s}></ha-state-icon>
        <div class="text">
          <span class="temp">${temp}</span><span class="label">${stateLabel(hass, s)}</span>
          ${humidity || wind
            ? html`<span class="extra">${humidity ? html`<span><ha-icon icon="mdi:water-percent"></ha-icon>${humidity}</span>` : nothing}${wind ? html`<span><ha-icon icon="mdi:weather-windy"></ha-icon>${wind}</span>` : nothing}</span>`
            : nothing}
        </div>
      </div>
      ${days.length
        ? html`<div class="days">
            ${days.map(
              (d) => html`<div class="day">
                <span>${day.format(new Date(d.datetime))}</span><ha-icon icon=${ICONS[d.condition ?? ""] ?? "mdi:weather-cloudy"}></ha-icon>
                <span>${typeof d.temperature === "number" ? `${Math.round(d.temperature)}°` : "–"}${typeof d.templow === "number" ? html` <span class="low">${Math.round(d.templow)}°</span>` : nothing}</span>
              </div>`,
            )}
          </div>`
        : nothing}
    </div>`;
  }
}

if (!customElements.get("ambidash-weather")) customElements.define("ambidash-weather", AmbidashWeather);
