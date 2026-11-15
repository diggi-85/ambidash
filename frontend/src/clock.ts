// The clock widget: the time and, under it, the date, set in the design's clock type (weight, tracking, colon colour).
// Only this element repaints, once a minute (once a second with seconds), on the tick of the clock.
import { LitElement, css, html, nothing } from "lit";
import { locale } from "./i18n";

export class AmbidashClock extends LitElement {
  static properties = {
    format: {},
    seconds: { type: Boolean },
    date: { type: Boolean },
    now: { state: true },
  };

  static styles = css`
    :host {
      display: block;
      height: 100%;
      min-width: 0;
      container-type: size;
      color: var(--ambi-ink);
    }
    .clock {
      box-sizing: border-box;
      height: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 0.4em;
      overflow: hidden;
      text-align: center;
    }
    .time {
      font-family: var(--ambi-num-font, var(--ambi-display, var(--ambi-font)));
      font-weight: var(--ambi-clock-weight, 300);
      letter-spacing: var(--ambi-clock-track, -0.02em);
      font-variant-numeric: tabular-nums;
      font-size: clamp(18px, min(24cqw, 54cqh), 220px);
      line-height: 1;
      white-space: nowrap;
    }
    .colon {
      color: var(--ambi-colon, inherit);
      opacity: var(--ambi-colon-opacity, 1);
    }
    .period {
      margin-left: 0.15em;
      font-size: 0.32em;
      letter-spacing: 0;
      font-weight: 600;
      color: var(--ambi-ink-2);
    }
    .date {
      font-family: var(--ambi-font);
      font-size: clamp(11px, min(6cqw, 13cqh), 28px);
      color: var(--ambi-ink-2);
      white-space: nowrap;
    }
    @container (max-height: 70px) {
      .date {
        display: none;
      }
    }
  `;

  /** auto follows the language, 12 and 24 are 12 and 24 hours */
  format: "auto" | "12" | "24" = "auto";
  seconds = false;
  date = true;
  private now = new Date();
  private timer?: number;

  connectedCallback(): void {
    super.connectedCallback();
    document.addEventListener("visibilitychange", this.onVisible);
    this.tick();
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    document.removeEventListener("visibilitychange", this.onVisible);
    clearTimeout(this.timer);
  }

  protected updated(changed: Map<string, unknown>): void {
    if (changed.has("seconds")) this.schedule();
  }

  private onVisible = (): void => {
    if (!document.hidden) this.tick();
  };

  /** Shows the time now and waits for the next minute (second) to start */
  private tick = (): void => {
    this.now = new Date();
    this.schedule();
  };

  private schedule(): void {
    clearTimeout(this.timer);
    const step = this.seconds ? 1000 : 60_000;
    this.timer = window.setTimeout(this.tick, step - (Date.now() % step) + 20);
  }

  render() {
    const hour12 = this.format === "12" ? true : undefined;
    const parts = new Intl.DateTimeFormat(locale(), {
      hour: this.format === "24" ? "2-digit" : "numeric",
      minute: "2-digit",
      second: this.seconds ? "2-digit" : undefined,
      ...(hour12 ? { hour12 } : this.format === "24" ? { hourCycle: "h23" as const } : {}),
    }).formatToParts(this.now);
    const date = this.date ? new Intl.DateTimeFormat(locale(), { weekday: "long", day: "numeric", month: "long" }).format(this.now) : "";
    return html`<div class="clock">
      <time class="time" datetime=${this.now.toISOString()}
        >${parts.map((p) => (p.type === "literal" ? (p.value.trim() === ":" ? html`<span class="colon">:</span>` : nothing) : p.type === "dayPeriod" ? html`<span class="period">${p.value}</span>` : p.value))}</time
      >
      ${date ? html`<div class="date">${date}</div>` : nothing}
    </div>`;
  }
}

if (!customElements.get("ambidash-clock")) customElements.define("ambidash-clock", AmbidashClock);
