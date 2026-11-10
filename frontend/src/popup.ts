// The Ambidash pop-up: the controls of one device (brightness, target temperature, position, volume …) over the dashboard.
import { LitElement, css, html, nothing, type TemplateResult } from "lit";
import { callService, entityName, moreInfo } from "./adapter";
import { tileView } from "./describe";
import { t } from "./i18n";
import { areaNameOf } from "./model";
import type { Hass, HassEntity } from "./types";

/** Home Assistant's feature flags of covers that matter here */
const COVER_SET_POSITION = 4;
const COVER_STOP = 8;

const round = (value: number): number => Math.round(value * 10) / 10;

const modeLabel = (mode: string): string => {
  switch (mode) {
    case "off":
      return t("Off");
    case "heat":
      return t("Heat");
    case "cool":
      return t("Cool");
    case "auto":
      return t("Auto");
    case "heat_cool":
      return t("Heat/Cool");
    case "dry":
      return t("Dry");
    case "fan_only":
      return t("Fan");
    default:
      return mode;
  }
};

export class AmbidashPopup extends LitElement {
  static properties = {
    hass: { attribute: false },
    entityId: {},
  };

  static styles = css`
    :host {
      position: fixed;
      inset: 0;
      z-index: 10;
      display: block;
    }
    .overlay {
      position: absolute;
      inset: 0;
      display: grid;
      place-items: center;
      padding: 16px;
      background: rgba(0, 0, 0, 0.55);
    }
    .card {
      box-sizing: border-box;
      width: min(100%, 420px);
      max-height: 100%;
      overflow: auto;
      padding: 16px;
      border-radius: var(--ambi-radius, 20px);
      border: 1px solid var(--ambi-line);
      background: var(--ambi-bg);
      color: var(--ambi-ink);
      font-family: var(--ambi-font);
    }
    header {
      display: flex;
      align-items: flex-start;
      gap: 12px;
    }
    header > div {
      flex: 1;
      min-width: 0;
    }
    .name {
      font: 600 20px / 1.2 var(--ambi-display);
    }
    .state {
      margin-top: 2px;
      color: var(--ambi-ink-2);
    }
    button {
      min-height: 44px;
      min-width: 44px;
      padding: 0 14px;
      border-radius: 12px;
      border: 1px solid var(--ambi-line);
      background: var(--ambi-surface);
      color: var(--ambi-ink);
      font: inherit;
      cursor: pointer;
    }
    button:focus-visible,
    input:focus-visible {
      outline: 2px solid var(--ambi-accent);
      outline-offset: 2px;
    }
    button.on {
      background: var(--ambi-on-bg);
      color: var(--ambi-on-ink);
    }
    .big {
      width: 100%;
      margin-top: 16px;
      font-weight: 600;
    }
    .row {
      display: flex;
      gap: 8px;
      margin-top: 16px;
      flex-wrap: wrap;
    }
    .row button {
      flex: 1 1 auto;
    }
    .info {
      margin-top: 12px;
      color: var(--ambi-ink-2);
    }
    .stepper {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin-top: 16px;
    }
    .stepper output {
      font: 600 32px / 1 var(--ambi-display);
    }
    .slider {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 4px 12px;
      margin-top: 16px;
    }
    .slider input {
      grid-column: 1 / -1;
      width: 100%;
      min-height: 44px;
      accent-color: var(--ambi-accent);
    }
    footer {
      margin-top: 16px;
      display: flex;
      justify-content: flex-end;
    }
    footer button {
      background: transparent;
      border-color: transparent;
      color: var(--ambi-ink-2);
    }
    @media (prefers-reduced-motion: no-preference) {
      .card {
        animation: pop 0.18s var(--ambi-ease, ease-out);
      }
    }
    @keyframes pop {
      from {
        opacity: 0;
        transform: translateY(8px) scale(0.98);
      }
    }
  `;

  hass?: Hass;
  entityId = "";

  connectedCallback(): void {
    super.connectedCallback();
    window.addEventListener("keydown", this.onKey);
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    window.removeEventListener("keydown", this.onKey);
  }

  protected firstUpdated(): void {
    this.renderRoot.querySelector<HTMLElement>(".x")?.focus();
  }

  private onKey = (e: KeyboardEvent): void => {
    if (e.key === "Escape") this.close();
  };

  private close(): void {
    this.dispatchEvent(new CustomEvent("close"));
  }

  private more(): void {
    moreInfo(this, this.entityId);
    this.close();
  }

  private call(service: string, data: Record<string, unknown> = {}): void {
    const state = this.hass?.states[this.entityId];
    if (!state || !this.hass) return;
    callService(this.hass, state.entity_id.slice(0, state.entity_id.indexOf(".")), service, state.entity_id, data).catch(() => undefined);
  }

  /** A slider that shows its value while it moves and sets it once it is let go */
  private slider(label: string, value: number, min: number, max: number, unit: string, set: (value: number) => void) {
    return html`<label class="slider"
      ><span>${label}</span><output>${value}${unit}</output
      ><input
        type="range"
        min=${min}
        max=${max}
        step="1"
        .value=${String(value)}
        @input=${(e: Event) => {
          const input = e.target as HTMLInputElement;
          (input.previousElementSibling as HTMLOutputElement).textContent = `${input.value}${unit}`;
        }}
        @change=${(e: Event) => set(Number((e.target as HTMLInputElement).value))}
    /></label>`;
  }

  private icon(name: string, label: string, service: string, data?: Record<string, unknown>) {
    return html`<button aria-label=${label} title=${label} @click=${() => this.call(service, data)}><ha-icon icon=${name}></ha-icon></button>`;
  }

  render() {
    const hass = this.hass;
    const state = hass?.states[this.entityId];
    if (!hass || !state) return nothing;
    const name = entityName(hass, state, areaNameOf(hass, state.entity_id));
    return html`<div class="overlay" @click=${(e: Event) => e.target === e.currentTarget && this.close()}>
      <div class="card" role="dialog" aria-modal="true" aria-label=${name}>
        <header>
          <div><div class="name">${name}</div><div class="state">${tileView(state).status}</div></div>
          <button class="x" aria-label=${t("Close")} @click=${this.close}><ha-icon icon="mdi:close"></ha-icon></button>
        </header>
        ${this.controls(state)}
        <footer><button @click=${this.more}>${t("More options")}</button></footer>
      </div>
    </div>`;
  }

  private controls(state: HassEntity): TemplateResult | typeof nothing {
    const a = state.attributes;
    switch (state.entity_id.slice(0, state.entity_id.indexOf("."))) {
      case "light": {
        const on = state.state === "on";
        const modes: string[] = a.supported_color_modes ?? [];
        const brightness = typeof a.brightness === "number" ? Math.round((a.brightness / 255) * 100) : 0;
        const kelvin = [a.color_temp_kelvin, a.min_color_temp_kelvin, a.max_color_temp_kelvin];
        return html`<button class="big ${on ? "on" : ""}" aria-pressed=${String(on)} @click=${() => this.call("toggle")}>${on ? t("On") : t("Off")}</button>
          ${on && modes.some((m) => m !== "onoff") ? this.slider(t("Brightness"), brightness, 1, 100, "%", (v) => this.call("turn_on", { brightness_pct: v })) : nothing}
          ${on && modes.includes("color_temp") && kelvin.every((k) => typeof k === "number") ? this.slider(t("Colour temperature"), kelvin[0], kelvin[1], kelvin[2], " K", (v) => this.call("turn_on", { color_temp_kelvin: v })) : nothing}`;
      }
      case "switch": {
        const on = state.state === "on";
        return html`<button class="big ${on ? "on" : ""}" aria-pressed=${String(on)} @click=${() => this.call("toggle")}>${on ? t("On") : t("Off")}</button>`;
      }
      case "scene":
        return html`<button class="big" @click=${() => this.call("turn_on")}>${t("Activate")}</button>`;
      case "climate": {
        const target: number | undefined = typeof a.temperature === "number" ? a.temperature : undefined;
        const step: number = typeof a.target_temp_step === "number" ? a.target_temp_step : 0.5;
        const min: number = typeof a.min_temp === "number" ? a.min_temp : 7;
        const max: number = typeof a.max_temp === "number" ? a.max_temp : 35;
        const set = (value: number) => this.call("set_temperature", { temperature: Math.min(max, Math.max(min, round(value))) });
        const modes: string[] = a.hvac_modes ?? [];
        return html`${typeof a.current_temperature === "number" ? html`<div class="info">${t("Now {temp}°", { temp: a.current_temperature })}</div>` : nothing}
          ${target !== undefined
            ? html`<div class="stepper">
                <button aria-label=${t("Lower the target temperature")} @click=${() => set(target - step)}>−</button><output>${target}°</output
                ><button aria-label=${t("Raise the target temperature")} @click=${() => set(target + step)}>+</button>
              </div>`
            : nothing}
          ${modes.length ? html`<div class="row">${modes.map((m) => html`<button class=${state.state === m ? "on" : ""} @click=${() => this.call("set_hvac_mode", { hvac_mode: m })}>${modeLabel(m)}</button>`)}</div>` : nothing}`;
      }
      case "cover": {
        const features = Number(a.supported_features ?? 0);
        return html`<div class="row">
            ${this.icon("mdi:arrow-up", t("Open the cover"), "open_cover")} ${features & COVER_STOP ? this.icon("mdi:stop", t("Stop the cover"), "stop_cover") : nothing} ${this.icon("mdi:arrow-down", t("Close the cover"), "close_cover")}
          </div>
          ${features & COVER_SET_POSITION && typeof a.current_position === "number" ? this.slider(t("Position"), a.current_position, 0, 100, "%", (v) => this.call("set_cover_position", { position: v })) : nothing}`;
      }
      case "media_player": {
        const volume = typeof a.volume_level === "number" ? Math.round(a.volume_level * 100) : undefined;
        return html`${a.media_title ? html`<div class="info">${a.media_title}${a.media_artist ? html` · ${a.media_artist}` : nothing}</div>` : nothing}
          <div class="row">
            ${this.icon("mdi:skip-previous", t("Previous track"), "media_previous_track")} ${this.icon(state.state === "playing" ? "mdi:pause" : "mdi:play", t("Play or pause"), "media_play_pause")}
            ${this.icon("mdi:skip-next", t("Next track"), "media_next_track")}
          </div>
          ${volume !== undefined ? this.slider(t("Volume"), volume, 0, 100, "%", (v) => this.call("volume_set", { volume_level: v / 100 })) : nothing}`;
      }
      default:
        return nothing;
    }
  }
}

if (!customElements.get("ambidash-popup")) customElements.define("ambidash-popup", AmbidashPopup);
