// One tile: tap switches or activates, long press (or the context-menu key) opens Home Assistant's detail dialog.
import { LitElement, css, html, nothing, type PropertyValues } from "lit";
import { callService, moreInfo } from "./adapter";
import { tileView } from "./describe";
import { t } from "./i18n";
import type { Hass, HassEntity, TileAction } from "./types";

const HOLD_MS = 500;
/** How long a tile shows the expected state before it believes Home Assistant again */
const OPTIMISTIC_MS = 4000;

export class AmbidashTile extends LitElement {
  static properties = {
    stateObj: { attribute: false },
    name: {},
    tap: {},
    hold: {},
    pending: { state: true },
  };

  static styles = css`
    :host {
      display: block;
      height: 100%;
    }
    .tile {
      box-sizing: border-box;
      display: flex;
      align-items: center;
      gap: 12px;
      width: 100%;
      height: 100%;
      min-height: calc(var(--ambi-tile-min, 72px) * var(--ambi-fs, 1));
      padding: 12px 14px;
      border-radius: var(--ambi-radius, 20px);
      border: var(--ambi-card-border, 1px solid var(--ambi-line));
      /* A design may put a rule on top of its tiles instead of a frame */
      border-top: var(--ambi-card-rule, var(--ambi-card-border, 1px solid var(--ambi-line)));
      background: var(--ambi-card-bg, var(--ambi-surface));
      -webkit-backdrop-filter: var(--ambi-card-filter, none);
      backdrop-filter: var(--ambi-card-filter, none);
      box-shadow: var(--ambi-card-shadow, none);
      color: var(--ambi-ink);
      cursor: pointer;
      user-select: none;
      -webkit-user-select: none;
      -webkit-tap-highlight-color: transparent;
      touch-action: manipulation;
      transition:
        background var(--ambi-dur, 0.25s) var(--ambi-ease, ease),
        transform var(--ambi-dur, 0.25s) var(--ambi-ease, ease),
        box-shadow var(--ambi-dur, 0.25s) var(--ambi-ease, ease);
    }
    .tile.on {
      background: var(--ambi-on-bg);
      color: var(--ambi-on-ink);
      box-shadow: var(--ambi-card-shadow, var(--ambi-shadow, none));
    }
    .tile:active {
      transform: scale(var(--ambi-press, 0.98));
    }
    .tile:focus-visible {
      outline: 2px solid var(--ambi-accent);
      outline-offset: 2px;
    }
    .tile.offline {
      opacity: 0.55;
    }
    .icon {
      flex: none;
      display: grid;
      place-items: center;
      width: 44px;
      height: 44px;
      border-radius: 50%;
      color: var(--ambi-ink-2);
      transition: background var(--ambi-dur, 0.25s) var(--ambi-ease, ease);
    }
    .on .icon {
      background: var(--tile-color);
      color: var(--tile-glyph);
    }
    ha-state-icon {
      display: block;
      --mdc-icon-size: 24px;
    }
    .text {
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .name {
      font-weight: 600;
      font-size: calc(15px * var(--ambi-fs, 1));
      line-height: 1.25;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .status {
      font-size: calc(13px * var(--ambi-fs, 1));
      color: var(--ambi-ink-2);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .on .status {
      color: var(--ambi-on-ink-2);
    }
    @media (prefers-reduced-motion: reduce) {
      .tile,
      .icon {
        transition: none;
      }
      .tile:active {
        transform: none;
      }
    }
  `;

  /** Not reactive on purpose: Home Assistant hands over a new hass with every state change anywhere, which must not repaint every tile. */
  hass?: Hass;
  stateObj?: HassEntity;
  name = "";
  /** What a tap / a long press does instead of the default; see TileAction */
  tap?: TileAction;
  hold?: TileAction;
  /** The state a tap expects, shown at once until Home Assistant confirms or contradicts it */
  private pending?: boolean;
  private holdTimer?: number;
  private pendingTimer?: number;
  private held = false;
  private lastOpen = 0;

  protected willUpdate(changed: PropertyValues): void {
    if (changed.has("stateObj")) this.clearPending();
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    clearTimeout(this.holdTimer);
    clearTimeout(this.pendingTimer);
  }

  render() {
    const s = this.stateObj;
    if (!s) return nothing;
    const view = tileView(s);
    const on = this.pending ?? view.on;
    const status = this.pending === undefined ? view.status : on ? t("On") : t("Off");
    return html`<div
      class="tile ${on ? "on" : ""} ${view.unavailable ? "offline" : ""}"
      role="button"
      tabindex="0"
      aria-pressed=${view.action === "toggle" ? String(on) : nothing}
      aria-label=${t("{name}, {status}", { name: this.name, status })}
      style="--tile-color:${view.color};--tile-glyph:${view.glyph}"
      @pointerdown=${this.onDown}
      @pointerup=${this.onUp}
      @pointercancel=${this.onCancel}
      @pointerleave=${this.onCancel}
      @keydown=${this.onKey}
      @contextmenu=${this.onContext}
    >
      <span class="icon"><ha-state-icon .hass=${this.hass} .stateObj=${s}></ha-state-icon></span>
      <span class="text"><span class="name">${this.name}</span><span class="status">${status}</span></span>
    </div>`;
  }

  private onDown = (e: PointerEvent): void => {
    if (e.button !== 0) return;
    this.held = false;
    clearTimeout(this.holdTimer);
    this.holdTimer = window.setTimeout(() => {
      this.held = true;
      this.open();
    }, HOLD_MS);
  };

  private onUp = (e: PointerEvent): void => {
    if (e.button !== 0) return;
    clearTimeout(this.holdTimer);
    if (!this.held) void this.activate();
  };

  private onCancel = (): void => {
    clearTimeout(this.holdTimer);
  };

  private onKey = (e: KeyboardEvent): void => {
    if (e.key !== "Enter" && e.key !== " ") return;
    e.preventDefault();
    if (e.shiftKey) this.open();
    else void this.activate();
  };

  // Right click, the context-menu key and the long-press menu of some touch browsers all mean "details"
  private onContext = (e: Event): void => {
    e.preventDefault();
    this.open();
  };

  /** One detail view per press: a long press can raise both the hold timer and a context-menu event */
  private once(): boolean {
    const now = Date.now();
    if (!this.stateObj || now - this.lastOpen < 800) return false;
    this.lastOpen = now;
    return true;
  }

  /** The Ambidash pop-up where something answers for it (the root card), otherwise Home Assistant's own dialog */
  private popup(): void {
    const entityId = this.stateObj!.entity_id;
    if (this.dispatchEvent(new CustomEvent("ambidash-popup", { detail: { entityId }, bubbles: true, composed: true, cancelable: true }))) moreInfo(this, entityId);
  }

  /** What a long press, Shift+Enter and the context menu do: the pop-up unless the tile says otherwise */
  private open(): void {
    const action = this.hold ?? "popup";
    if (action === "none" || !this.once()) return;
    if (action === "more-info") moreInfo(this, this.stateObj!.entity_id);
    else this.popup();
  }

  private async activate(): Promise<void> {
    const s = this.stateObj;
    if (!s || !this.hass) return;
    if (this.tap === "none") return;
    if (this.tap) {
      if (!this.once()) return;
      if (this.tap === "more-info") moreInfo(this, s.entity_id);
      else this.popup();
      return;
    }
    const view = tileView(s);
    if (!view.service) {
      if (this.once()) this.popup();
      return;
    }
    if (view.action === "toggle") this.setPending(!view.on);
    try {
      await callService(this.hass, view.service[0], view.service[1], s.entity_id);
    } catch {
      this.clearPending();
    }
  }

  private setPending(on: boolean): void {
    this.pending = on;
    clearTimeout(this.pendingTimer);
    this.pendingTimer = window.setTimeout(() => this.clearPending(), OPTIMISTIC_MS);
  }

  private clearPending(): void {
    clearTimeout(this.pendingTimer);
    this.pending = undefined;
  }
}

if (!customElements.get("ambidash-tile")) customElements.define("ambidash-tile", AmbidashTile);
