// The dashboard card `custom:ambidash-root`: summary chips, then floors → areas → tiles.
import { SHADES, backdropTone, designCss, type Mode } from "@ambi/core";
import { LitElement, css, html, nothing, type PropertyValues } from "lit";
import { repeat } from "lit/directives/repeat.js";
import { entityName, isDark, navigate, resolveImage, subscribeStored } from "./adapter";
import { resolveLang, setLang, t } from "./i18n";
import { COLUMNS, deviceFor, resolveLayout } from "./layout";
import { areaNameOf, buildModel, summarize, type Item, type Model } from "./model";
import { SlideshowController, slideshowOn } from "./photos";
import { registerFonts } from "./fonts";
import "./popup";
import "./tile";
import type { AmbidashConfig, Background, Device, Hass, LayoutItem, Page } from "./types";

/** Values from the dashboard configuration end up in a style attribute; drop what could break out of it. */
const clean = (value: unknown): string => String(value).replace(/[;{}<>\\"]/g, "");

/** The background layers and what they mean for the tiles' colours; nothing when no background is configured. */
const backdropOf = (bg: Background | undefined) => {
  const stops = bg?.gradient;
  const gradient = Array.isArray(stops) ? stops.map(clean).filter(Boolean) : [];
  const color = bg?.color ? clean(bg.color) : undefined;
  const picture = !!bg?.image || slideshowOn(bg);
  if (!picture && !color && !gradient.length) return undefined;
  const shade = SHADES[bg?.shade as keyof typeof SHADES] ?? SHADES.light;
  const blur = Math.min(40, Math.max(0, Number(bg?.blur) || 0));
  const angle = typeof bg?.angle === "number" ? bg.angle : 160;
  /** The style of one layer showing `imageUrl` (a slideshow has two) */
  const style = (imageUrl?: string): string => {
    const layers = [
      imageUrl && `url("${imageUrl.replace(/["\\]/g, encodeURIComponent)}")`,
      gradient.length > 0 && `linear-gradient(${angle}deg, ${gradient.join(", ")})`,
    ].filter(Boolean);
    return [
      color && `background-color:${color}`,
      layers.length > 0 && `background-image:${layers.join(", ")}`,
      blur > 0 && `filter:blur(${blur}px)`,
      `--shade:rgba(0, 0, 0, ${picture ? shade : 0})`,
    ]
      .filter(Boolean)
      .join(";");
  };
  // A picture is judged dark (it is dimmed and gets light text); a colour or gradient by its own tone
  const tokens = picture ? { tone: "dark" as const, color: "#0b0d10" } : { tone: backdropTone([...(color ? [color] : []), ...gradient]), color: color ?? gradient[0] };
  return { style, tokens };
};

export class AmbidashRoot extends LitElement {
  static properties = {
    hass: { attribute: false },
    config: { state: true },
    imageUrl: { state: true },
    stored: { state: true },
    storedState: { state: true },
    device: { state: true },
    pageId: { state: true },
    popupFor: { state: true },
  };

  static styles = css`
    :host {
      display: block;
      height: 100%;
    }
    :host([fullscreen]) {
      position: fixed;
      inset: 0;
      z-index: 100;
      height: auto;
      overflow: auto;
    }
    .root {
      box-sizing: border-box;
      min-height: 100%;
      padding: 16px 16px 64px;
      background-color: var(--ambi-bg);
      color: var(--ambi-ink);
      font-family: var(--ambi-font);
      -webkit-font-smoothing: antialiased;
      /* Sizes follow the card's own width, so a narrow preview in the Studio looks like a phone */
      container-type: inline-size;
    }
    .page {
      position: relative;
      z-index: 1;
      max-width: 1280px;
      margin: 0 auto;
    }
    /* Stays in view while the tiles scroll over it; the shade is a veil on top of the picture. A slideshow has two
       layers on top of each other and fades the hidden one in. */
    .bgs {
      position: sticky;
      top: 0;
      height: var(--ambi-vh, 100vh);
      margin: -16px -16px calc(-1 * var(--ambi-vh, 100vh));
      pointer-events: none;
    }
    .bg {
      position: absolute;
      inset: 0;
      background: center / cover no-repeat;
      opacity: 0;
      transition: opacity calc(var(--ambi-dur, 0.25s) * 5) ease;
    }
    .bg.front {
      opacity: 1;
    }
    .credit {
      position: fixed;
      right: 12px;
      bottom: 8px;
      z-index: 1;
      max-width: min(60vw, 480px);
      padding: 3px 10px;
      border-radius: 999px;
      background: rgba(0, 0, 0, 0.6);
      color: #fff;
      font-size: 11px;
      line-height: 1.4;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      pointer-events: none;
    }
    .bg::after {
      content: "";
      position: absolute;
      inset: 0;
      background: var(--shade, transparent);
    }
    /* The design's own page art (colour clouds, grid, dots); like .bg it stays in view while the tiles scroll */
    .art {
      position: sticky;
      top: 0;
      height: var(--ambi-vh, 100vh);
      margin: -16px -16px calc(-1 * var(--ambi-vh, 100vh));
      background-image: var(--ambi-bg-art, none);
      background-size: var(--ambi-bg-size, cover);
      pointer-events: none;
    }
    /* Opaque so tiles scrolling underneath never show through */
    .exit {
      position: fixed;
      top: 12px;
      right: 12px;
      z-index: 1;
      display: grid;
      place-items: center;
      width: 44px;
      height: 44px;
      padding: 0;
      border-radius: 50%;
      border: 1px solid var(--ambi-line);
      background: var(--ambi-bg);
      color: var(--ambi-ink-2);
      cursor: pointer;
      -webkit-tap-highlight-color: transparent;
    }
    .exit:focus-visible {
      outline: 2px solid var(--ambi-accent);
      outline-offset: 2px;
    }
    h1 {
      margin: 8px 0 12px;
      font: 600 clamp(28px, 5vw, 40px) / 1.1 var(--ambi-display);
      letter-spacing: -0.02em;
    }
    .chips {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin: 4px 0 8px;
    }
    .chip {
      padding: 8px 14px;
      border-radius: 999px;
      border: 1px solid var(--ambi-line);
      background: var(--ambi-surface);
      -webkit-backdrop-filter: var(--ambi-card-filter, none);
      backdrop-filter: var(--ambi-card-filter, none);
      font-size: calc(14px * var(--ambi-fs, 1));
    }
    h2 {
      margin: 28px 0 0;
      font: var(--ambi-label-weight, 600) calc(13px * var(--ambi-fs, 1)) / 1.2 var(--ambi-font);
      letter-spacing: var(--ambi-label-track, 0.12em);
      text-transform: var(--ambi-label-case, uppercase);
      color: var(--ambi-label-color, var(--ambi-ink-2));
    }
    h3 {
      margin: 16px 0 10px;
      font: 600 clamp(20px, 3vw, 26px) / 1.2 var(--ambi-display);
    }
    .tiles {
      --tile-min: 150px;
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(var(--tile-min), 1fr));
      gap: 10px;
    }
    /* Two columns on a phone; wider tiles on tablets and screens so status texts are not cut off */
    @container (min-width: 640px) {
      .tiles {
        --tile-min: 190px;
      }
    }
    @container (min-width: 1100px) {
      .tiles {
        --tile-min: 220px;
      }
    }
    /* An own layout: items sit on a grid whose columns depend on the device class (see layout.ts) */
    .canvas {
      display: grid;
      grid-template-columns: repeat(var(--cols, 8), minmax(0, 1fr));
      grid-auto-rows: 44px;
      gap: 10px;
      margin-top: 12px;
      --ambi-tile-min: 0px;
    }
    .cell {
      min-width: 0;
      min-height: 0;
    }
    .heading {
      margin: 0;
      height: 100%;
      display: flex;
      align-items: flex-end;
      font: 600 clamp(18px, 3vw, 24px) / 1.2 var(--ambi-display);
    }
    .cell .chips {
      margin: 0;
    }
    .pagetabs {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin: 8px 0 0;
    }
    .pagetabs button {
      min-height: 44px;
      padding: 0 16px;
      border-radius: 999px;
      border: 1px solid var(--ambi-line);
      background: var(--ambi-surface);
      color: var(--ambi-ink);
      font: inherit;
      cursor: pointer;
    }
    .pagetabs button.on {
      background: var(--ambi-on-bg);
      color: var(--ambi-on-ink);
    }
    .pagetabs button:focus-visible {
      outline: 2px solid var(--ambi-accent);
      outline-offset: 2px;
    }
    .empty {
      max-width: 48ch;
      line-height: 1.5;
      color: var(--ambi-ink-2);
    }
    @media (prefers-reduced-motion: reduce) {
      .bg {
        transition: none;
      }
    }
  `;

  hass?: Hass;
  config: AmbidashConfig = {};
  private model: Model = { scenes: [], floors: [] };
  private registries: unknown[] = [];
  /** The picture's address once Home Assistant has signed it; `imageSrc` is the configured one it belongs to */
  private imageUrl?: string;
  private imageSrc?: string;
  private slides = new SlideshowController(this, () => this.hass);
  /** The options of the dashboard saved in the Studio (when `dashboard` is set) and whether they have arrived */
  private stored?: AmbidashConfig;
  private storedState: "loading" | "ready" | "missing" = "ready";
  /** What is really used: the Studio's options with the ones written in the card on top */
  private cfg?: AmbidashConfig;
  private subscribedTo?: string;
  private followToken?: object;
  private unsubscribe?: () => void;
  /** The device class the card's width calls for, and the page chosen in the tabs */
  private device: Device = "tablet";
  private pageId?: string;
  private sizer?: ResizeObserver;
  /** The device whose pop-up is open */
  private popupFor?: string;

  setConfig(config: AmbidashConfig): void {
    this.config = { ...config };
  }

  getCardSize(): number {
    return 8;
  }

  constructor() {
    super();
    // A tile asks for its pop-up; the card answers, so the pop-up opens inside the card's design
    this.addEventListener("ambidash-popup", (e) => {
      e.preventDefault();
      this.popupFor = (e as CustomEvent<{ entityId: string }>).detail.entityId;
    });
  }

  connectedCallback(): void {
    super.connectedCallback();
    registerFonts();
    this.requestUpdate(); // follows the Studio's dashboard again after being moved in the page
    if (typeof ResizeObserver !== "undefined") {
      this.sizer = new ResizeObserver((entries) => {
        const device = deviceFor(entries[0]?.contentRect.width ?? 0);
        if (device !== this.device) this.device = device;
      });
      this.sizer.observe(this);
    }
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.stopFollowing();
    this.subscribedTo = undefined;
    this.sizer?.disconnect();
    this.sizer = undefined;
  }

  /** The dashboard saved in the Studio and kept up to date: a save there shows here at once. */
  private follow(hass: Hass): void {
    const id = this.config.dashboard;
    if (id === this.subscribedTo) return;
    this.stopFollowing();
    this.subscribedTo = id;
    this.stored = undefined;
    this.storedState = id ? "loading" : "ready";
    if (!id) return;
    const token = {};
    this.followToken = token;
    subscribeStored(hass, (saved) => {
      if (this.followToken !== token) return;
      const dashboard = saved.dashboards.find((d) => d.id === id);
      this.stored = dashboard?.options;
      this.storedState = dashboard ? "ready" : "missing";
    }).then(
      (stop) => (this.followToken === token ? (this.unsubscribe = stop) : stop()),
      () => {
        if (this.followToken === token) this.storedState = "missing";
      },
    );
  }

  private stopFollowing(): void {
    this.followToken = undefined;
    this.unsubscribe?.();
    this.unsubscribe = undefined;
  }

  protected willUpdate(changed: PropertyValues): void {
    const hass = this.hass;
    if (!hass) return;
    this.follow(hass);
    // What is written in the card wins over what the Studio saved; the object stays the same until one of them changes
    if (!this.cfg || changed.has("config") || changed.has("stored")) {
      const { dashboard: _dashboard, ...written } = this.config;
      this.cfg = { ...this.stored, ...written };
    }
    const cfg = this.cfg;
    setLang(resolveLang(cfg.language, hass.language));
    // The model depends on the registries and the options only; state changes just repaint the tiles that changed
    const registries = [hass.entities, hass.devices, hass.areas, hass.floors, hass.language, cfg];
    if (registries.some((r, i) => r !== this.registries[i])) {
      this.registries = registries;
      this.model = buildModel(hass, t("Unassigned"), cfg);
    }
    this.toggleAttribute("fullscreen", !!cfg.fullscreen);
    this.slides.configure(cfg.background);
    const src = cfg.background?.image;
    if (src !== this.imageSrc) {
      this.imageSrc = src;
      this.imageUrl = undefined;
      if (src) resolveImage(hass, src).then((url) => (src === this.imageSrc ? (this.imageUrl = url) : undefined), () => undefined);
    }
  }

  render() {
    const hass = this.hass;
    if (!hass || this.storedState === "loading") return nothing;
    const cfg = this.cfg ?? {};
    const mode: Mode = cfg.mode === "light" || cfg.mode === "dark" ? cfg.mode : isDark(hass) ? "dark" : "light";
    if (this.storedState === "missing") {
      return html`<div class="root" style=${designCss(undefined, mode)}><p class="empty">${t("This dashboard is not saved in the Studio (any more).")}</p></div>`;
    }
    const sum = summarize(hass, this.model.floors);
    const chips = [
      sum.lights > 0 && (sum.lights === 1 ? t("1 light on") : t("{n} lights on", { n: sum.lights })),
      sum.covers > 0 && (sum.covers === 1 ? t("1 cover open") : t("{n} covers open", { n: sum.covers })),
      sum.playing > 0 && t("{n} playing", { n: sum.playing }),
    ].filter(Boolean);

    // Fullscreen hides Home Assistant's own navigation, so a corner button leads back (exit_path: false removes it)
    const exit = cfg.fullscreen && cfg.exit_path !== false ? (cfg.exit_path ?? "/") : undefined;

    const backdrop = backdropOf(cfg.background);
    const { slides } = this;
    // The configured picture is what shows until a slideshow has its first one
    const urls = slides.active && (slides.urls[0] || slides.urls[1]) ? slides.urls : [this.imageUrl, undefined];
    const front = slides.active ? slides.front : 0;

    return html`<div class="root" style=${designCss(cfg.design, mode, { palette: cfg.palette, accent: cfg.accent, cardStyle: cfg.card_style, backdrop: backdrop?.tokens })}>
      ${backdrop
        ? html`<div class="bgs">${(slides.active ? [0, 1] : [0]).map((i) => html`<div class="bg ${front === i ? "front" : ""}" style=${backdrop.style(urls[i])}></div>`)}</div>`
        : html`<div class="art"></div>`}
      ${slides.active && slides.credit ? html`<div class="credit">${slides.credit}</div>` : nothing}
      ${exit
        ? html`<button class="exit" type="button" aria-label=${t("Back to Home Assistant")} @click=${() => navigate(exit)}>
            <ha-icon icon="mdi:home-assistant"></ha-icon>
          </button>`
        : nothing}
      <div class="page">
        ${cfg.fullscreen ? html`<h1>${cfg.title ?? "Ambidash"}</h1>` : nothing}
        ${cfg.pages?.length ? this.renderPages(hass, cfg.pages, chips) : this.renderAuto(hass, chips)}
      </div>
      ${this.popupFor ? html`<ambidash-popup .hass=${hass} .entityId=${this.popupFor} @close=${() => (this.popupFor = undefined)}></ambidash-popup>` : nothing}
    </div>`;
  }

  private chipRow(chips: unknown[]) {
    return html`<div class="chips">${chips.map((c) => html`<span class="chip">${c}</span>`)}</div>`;
  }

  /** Without an own layout: summary, scenes, then floor by floor and area by area, whatever Home Assistant knows. */
  private renderAuto(hass: Hass, chips: unknown[]) {
    return html`${chips.length ? this.chipRow(chips) : nothing}
    ${this.model.scenes.length ? html`<section><h2>${t("Scenes")}</h2>${this.tiles(hass, this.model.scenes)}</section>` : nothing}
    ${this.model.floors.map(
      (floor) => html`<section>
        ${floor.name ? html`<h2>${floor.name}</h2>` : nothing}
        ${floor.areas.map((area) => html`<div class="area"><h3>${area.name}</h3>${this.tiles(hass, area.items)}</div>`)}
      </section>`,
    )}
    ${this.model.scenes.length || this.model.floors.length
      ? nothing
      : html`<p class="empty">${t("No supported devices found. Assign lights, switches, climate devices, covers, media players or scenes to areas.")}</p>`}`;
  }

  /** With an own layout: the pages as tabs (when there are several) and the items of the chosen page on the grid of this device. */
  private renderPages(hass: Hass, pages: Page[], chips: unknown[]) {
    const page = pages.find((p) => p.id === this.pageId) ?? pages[0];
    const placed = resolveLayout(page, this.device);
    return html`${pages.length > 1
      ? html`<div class="pagetabs" role="tablist">
          ${pages.map((p) => html`<button type="button" role="tab" class=${p === page ? "on" : ""} aria-selected=${String(p === page)} @click=${() => (this.pageId = p.id)}>${p.name}</button>`)}
        </div>`
      : nothing}
    <div class="canvas" style="--cols:${COLUMNS[this.device]}">
      ${repeat(
        placed,
        ({ item }) => item.id,
        ({ item, x, y, w, h }) => html`<div class="cell" style="grid-column:${x + 1} / span ${w};grid-row:${y + 1} / span ${h}">${this.renderItem(hass, item, chips)}</div>`,
      )}
    </div>`;
  }

  private renderItem(hass: Hass, item: LayoutItem, chips: unknown[]) {
    if (item.type === "heading") return html`<h3 class="heading">${item.text}</h3>`;
    if (item.type === "summary") return chips.length ? this.chipRow(chips) : nothing;
    const state = item.entity ? hass.states[item.entity] : undefined;
    if (!item.entity || !state) return nothing;
    return html`<ambidash-tile .stateObj=${state} .name=${item.name || entityName(hass, state, areaNameOf(hass, item.entity))} .tap=${item.tap} .hold=${item.hold} .hass=${hass}></ambidash-tile>`;
  }

  private tiles(hass: Hass, items: Item[]) {
    return html`<div class="tiles">
      ${repeat(
        items,
        (item) => item.id,
        (item) => html`<ambidash-tile .stateObj=${hass.states[item.id]} .name=${item.name} .hass=${hass}></ambidash-tile>`,
      )}
    </div>`;
  }
}

if (!customElements.get("ambidash-root")) customElements.define("ambidash-root", AmbidashRoot);
