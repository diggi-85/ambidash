// A Home Assistant card in the layout. Home Assistant's own hui-card does the work (custom cards, templates, actions);
// this element gives it a cell, lets it take the design's colours, and says so where a card cannot be drawn.
import { LitElement, css, html, nothing, type PropertyValues } from "lit";
import { cardsAvailable, createCard } from "./adapter";
import { t } from "./i18n";
import type { Hass } from "./types";

export class AmbidashCard extends LitElement {
  static properties = {
    config: { attribute: false },
    built: { state: true },
    problem: { state: true },
  };

  static styles = css`
    :host {
      display: block;
      height: 100%;
      min-width: 0;
      overflow: hidden;
      border-radius: var(--ambi-radius, 20px);
      /* Home Assistant's variables take the design's colours, so a card sits in the page like the tiles do */
      --primary-text-color: var(--ambi-ink);
      --secondary-text-color: var(--ambi-ink-2);
      --divider-color: var(--ambi-line);
      --primary-color: var(--ambi-accent);
      --card-background-color: var(--ambi-surface);
      --ha-card-background: var(--ambi-card-bg, var(--ambi-surface));
      --ha-card-border-radius: var(--ambi-radius, 20px);
      --ha-card-border-color: var(--ambi-line);
      --ha-card-box-shadow: var(--ambi-card-shadow, none);
      --ha-card-backdrop-filter: var(--ambi-card-filter, none);
      color: var(--ambi-ink);
    }
    hui-card {
      display: block;
      height: 100%;
    }
    .note {
      box-sizing: border-box;
      height: 100%;
      display: flex;
      flex-direction: column;
      justify-content: center;
      gap: 4px;
      padding: 12px 14px;
      border: 1px dashed var(--ambi-line);
      border-radius: var(--ambi-radius, 20px);
      background: var(--ambi-surface);
      font-family: var(--ambi-font);
      font-size: 13px;
      color: var(--ambi-ink-2);
    }
    .note b {
      font-size: 15px;
      color: var(--ambi-ink);
    }
  `;

  /** The card's configuration; its `type` names the card (tile, entities, custom:bubble-card …) */
  config?: Record<string, unknown>;
  private built?: HTMLElement & { hass?: Hass };
  private problem?: "unavailable" | "failed";
  private current?: Hass;
  private builtFor = "";
  private token = 0;

  /** Not reactive on purpose, like the tiles' hass: the card gets every new hass directly */
  set hass(value: Hass | undefined) {
    this.current = value;
    if (this.built) this.built.hass = value;
  }

  get hass(): Hass | undefined {
    return this.current;
  }

  protected updated(changed: PropertyValues): void {
    if (changed.has("config")) void this.build();
  }

  /** Builds the card again only when its configuration really changed (the Studio hands over fresh copies on every edit) */
  private async build(): Promise<void> {
    const key = JSON.stringify(this.config ?? null);
    if (key === this.builtFor) return;
    this.builtFor = key;
    const token = ++this.token;
    this.built = undefined;
    this.problem = undefined;
    if (!this.config) return;
    if (!cardsAvailable()) {
      this.problem = "unavailable";
      return;
    }
    try {
      const card = await createCard(this.config);
      if (token !== this.token) return;
      card.hass = this.current;
      this.built = card;
    } catch {
      if (token === this.token) this.problem = "failed";
    }
  }

  render() {
    if (this.problem) {
      const type = String(this.config?.type ?? "");
      return html`<div class="note" role="note">
        <b>${type}</b>
        <span>${this.problem === "unavailable" ? t("This card is shown in the dashboard itself.") : t("This card could not be loaded.")}</span>
      </div>`;
    }
    return this.built ?? nothing;
  }
}

if (!customElements.get("ambidash-card")) customElements.define("ambidash-card", AmbidashCard);
