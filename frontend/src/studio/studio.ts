// The Studio: the admin panel in Home Assistant's sidebar where dashboards are set up, with a preview that runs on your real data.
import { DESIGNS, PALETTES, designCss, resolveTokens, type Mode } from "@ambi/core";
import { LitElement, css, html, nothing, type PropertyValues } from "lit";
import { isDark, loadStored, navigate, restoreStored, saveStored } from "../adapter";
import { generatePages } from "../generate";
import { resolveLang, setLang, t } from "../i18n";
import { DOMAINS, buildModel, type Domain } from "../model";
import "../root";
import "../tile";
import type { AmbidashRoot } from "../root";
import type { AmbidashConfig, Background, Hass, Page, StoredConfig, StoredDashboard } from "../types";
import { KINDS, kindOf, startOf, withBackground, type BackgroundKind } from "./background";
import { History } from "./history";
import { toYaml, toggleIn } from "./options";
import "./layout-editor";

const DEVICES = { phone: { width: 390, height: 720 }, tablet: { width: 768, height: 600 }, wide: { width: 1180, height: 560 } } as const;
type Device = keyof typeof DEVICES;

const DESIGN_CHOICES = [...DESIGNS.map((d) => ({ id: d.id, name: d.name })), { id: "seasons", name: "Seasons" }];
type View = "name" | "contents" | "look" | "technical" | "advanced" | "layout";
const STEPS: Exclude<View, "layout">[] =["name", "contents", "look", "technical"];
const ADVANCED_KEY = "ambidash.advanced";
const readAdvanced = (): boolean => {
  try {
    return localStorage.getItem(ADVANCED_KEY) === "1";
  } catch {
    return false;
  }
};
const CARD_STYLES = ["", "solid", "glass", "outline", "none"] as const;

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const same = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);
const message = (err: unknown): string => (err as { message?: string } | undefined)?.message ?? String(err);
/** A colour input only takes #rrggbb; anything else (rgb(), names) shows the fallback until a colour is picked */
const hex = (value: string | undefined, fallback: string): string => (value && /^#[0-9a-f]{6}$/i.test(value) ? value : fallback);

/** An id for a new dashboard: lower case letters, digits and dashes, different from the ones taken. */
export const slug = (name: string, taken: Set<string>): string => {
  const base =
    name
      .toLowerCase()
      .replace(/ä/g, "ae")
      .replace(/ö/g, "oe")
      .replace(/ü/g, "ue")
      .replace(/ß/g, "ss")
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 30) || "dashboard";
  let id = base;
  for (let n = 2; taken.has(id); n++) id = `${base}-${n}`;
  return id;
};

export class AmbidashStudio extends LitElement {
  static properties = {
    hass: { attribute: false },
    narrow: { type: Boolean },
    route: { attribute: false },
    panel: { attribute: false },
    loadState: { state: true },
    saved: { state: true },
    draft: { state: true },
    hasPrevious: { state: true },
    error: { state: true },
    editing: { state: true },
    device: { state: true },
    saving: { state: true },
    sidebar: { state: true },
    creating: { state: true },
    newName: { state: true },
    previewWidth: { state: true },
    view: { state: true },
    kindPick: { state: true },
    advancedOn: { state: true },
    advText: { state: true },
  };

  static styles = css`
    :host {
      display: block;
      min-height: 100%;
      box-sizing: border-box;
      background: var(--primary-background-color);
      color: var(--primary-text-color);
      font-family: var(--paper-font-body1_-_font-family, system-ui, sans-serif);
    }
    * {
      box-sizing: border-box;
    }
    button,
    input,
    select {
      font: inherit;
      color: inherit;
    }
    button {
      min-height: 40px;
      padding: 0 14px;
      border-radius: 10px;
      border: 1px solid var(--divider-color);
      background: var(--card-background-color);
      cursor: pointer;
    }
    button:hover:not(:disabled) {
      border-color: var(--secondary-text-color);
    }
    button:disabled {
      opacity: 0.45;
      cursor: default;
    }
    button.primary {
      background: var(--primary-color);
      border-color: var(--primary-color);
      color: var(--text-primary-color, #fff);
    }
    button.danger {
      color: var(--error-color, #db4437);
    }
    button.on {
      background: color-mix(in srgb, var(--primary-color) 16%, transparent);
      border-color: var(--primary-color);
    }
    input,
    select {
      width: 100%;
      min-height: 40px;
      padding: 0 10px;
      border-radius: 10px;
      border: 1px solid var(--divider-color);
      background: var(--card-background-color);
    }
    :focus-visible {
      outline: 2px solid var(--primary-color);
      outline-offset: 2px;
    }
    .bar {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 16px;
      border-bottom: 1px solid var(--divider-color);
      background: var(--card-background-color);
      position: sticky;
      top: 0;
      z-index: 2;
    }
    .bar .title {
      font-weight: 600;
      font-size: 18px;
    }
    .bar .grow {
      flex: 1;
    }
    .bar .dirty {
      color: var(--secondary-text-color);
      font-size: 13px;
    }
    .alert {
      margin: 12px 16px 0;
      padding: 10px 14px;
      border-radius: 10px;
      background: color-mix(in srgb, var(--error-color, #db4437) 14%, transparent);
      border: 1px solid var(--error-color, #db4437);
    }
    .page {
      max-width: 960px;
      margin: 0 auto;
      padding: 20px 16px 48px;
    }
    h1 {
      margin: 0 0 4px;
      font-size: 24px;
      font-weight: 600;
    }
    .sub {
      margin: 0 0 20px;
      color: var(--secondary-text-color);
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
      gap: 12px;
    }
    .card {
      display: flex;
      flex-direction: column;
      gap: 10px;
      padding: 14px;
      border-radius: 14px;
      border: 1px solid var(--divider-color);
      background: var(--card-background-color);
    }
    .card .name {
      font-weight: 600;
    }
    .card .meta {
      color: var(--secondary-text-color);
      font-size: 13px;
    }
    textarea {
      width: 100%;
      padding: 8px 10px;
      border-radius: 10px;
      border: 1px solid var(--divider-color);
      background: var(--card-background-color);
      color: inherit;
      font: 12px / 1.45 ui-monospace, monospace;
    }
    pre {
      margin: 4px 0;
      padding: 10px;
      overflow: auto;
      border-radius: 10px;
      border: 1px solid var(--divider-color);
      font-size: 12px;
    }
    .gallery {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(112px, 1fr));
      gap: 10px;
    }
    .dcard {
      display: flex;
      flex-direction: column;
      gap: 6px;
      padding: 6px;
      text-align: left;
      border: 2px solid var(--divider-color);
      border-radius: 12px;
      background: var(--card-background-color);
      color: var(--primary-text-color);
      font: inherit;
      cursor: pointer;
    }
    .dcard.on {
      border-color: var(--primary-color);
    }
    .dpage {
      display: block;
      height: 64px;
      overflow: hidden;
      padding: 10px;
      border-radius: 8px;
      background-color: var(--ambi-bg);
      background-image: var(--ambi-bg-art, none);
      background-size: var(--ambi-bg-size, auto);
    }
    .dtile {
      display: flex;
      align-items: center;
      gap: 6px;
      height: 100%;
      padding: 0 8px;
      border: var(--ambi-card-border, 1px solid var(--ambi-line));
      border-top: var(--ambi-card-rule, var(--ambi-card-border, 1px solid var(--ambi-line)));
      border-radius: min(var(--ambi-radius, 12px), 14px);
      background: var(--ambi-card-bg, var(--ambi-surface));
      -webkit-backdrop-filter: var(--ambi-card-filter, none);
      backdrop-filter: var(--ambi-card-filter, none);
      box-shadow: var(--ambi-card-shadow, none);
      color: var(--ambi-ink);
    }
    .dtile i {
      flex: none;
      width: 14px;
      height: 14px;
      border-radius: 50%;
      background: var(--ambi-accent);
    }
    .dtile b {
      font: 600 18px / 1 var(--ambi-display, serif);
    }
    .dname {
      padding: 0 2px 2px;
      font-size: 12px;
    }
    .check {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 12px 0;
      min-height: 44px;
    }
    .check input {
      width: auto;
      min-height: 0;
    }
    .swatch {
      height: 64px;
      border-radius: 10px;
      position: relative;
      border: 1px solid var(--divider-color);
    }
    .swatch i {
      position: absolute;
      left: 10px;
      right: 40px;
      top: 12px;
      height: 22px;
      border-radius: 8px;
    }
    .swatch b {
      position: absolute;
      right: 12px;
      top: 14px;
      width: 12px;
      height: 12px;
      border-radius: 50%;
    }
    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    .new {
      display: flex;
      gap: 8px;
      margin-bottom: 16px;
      max-width: 480px;
    }
    .body {
      display: grid;
      grid-template-columns: 230px minmax(0, 1fr) minmax(320px, 460px);
      min-height: calc(100vh - 120px);
    }
    .body.narrow {
      grid-template-columns: minmax(0, 1fr);
    }
    nav {
      padding: 12px;
      border-right: 1px solid var(--divider-color);
    }
    nav .step {
      display: flex;
      gap: 10px;
      width: 100%;
      padding: 8px 10px;
      margin-bottom: 4px;
      border-radius: 10px;
      border: 1px solid transparent;
      background: transparent;
      color: inherit;
      font: inherit;
      text-align: left;
      cursor: pointer;
    }
    nav .step.on {
      background: var(--card-background-color);
      border-color: var(--divider-color);
    }
    nav .num {
      flex: none;
      width: 24px;
      height: 24px;
      border-radius: 50%;
      display: grid;
      place-items: center;
      font-size: 12px;
      background: var(--divider-color);
    }
    nav .on .num {
      background: var(--primary-color);
      color: var(--text-primary-color, #fff);
    }
    nav small {
      display: block;
      color: var(--secondary-text-color);
      font-size: 12px;
    }
    main {
      padding: 16px 20px;
      min-width: 0;
    }
    main h2 {
      margin: 0 0 2px;
      font-size: 20px;
    }
    .field {
      margin: 16px 0;
    }
    .field > label {
      display: block;
      margin-bottom: 6px;
      color: var(--secondary-text-color);
      font-size: 13px;
    }
    .seg {
      display: flex;
    }
    .seg button {
      border-radius: 0;
      margin-left: -1px;
    }
    .seg button:first-child {
      border-radius: 10px 0 0 10px;
      margin-left: 0;
    }
    .seg button:last-child {
      border-radius: 0 10px 10px 0;
    }
    aside {
      padding: 16px;
      border-left: 1px solid var(--divider-color);
      min-width: 0;
    }
    .pbox {
      margin-top: 12px;
      position: relative;
      overflow: hidden;
      border-radius: 12px;
      border: 1px solid var(--divider-color);
    }
    .frame {
      position: absolute;
      top: 0;
      left: 0;
      transform-origin: top left;
      overflow: auto;
      /* A transformed box holds the card's fixed-position parts (exit button, credit line) inside the preview */
      background: var(--card-background-color);
    }
    .frame ambidash-root {
      height: 100%;
    }
    .hint {
      margin-top: 10px;
      color: var(--secondary-text-color);
      font-size: 13px;
    }
    @media (max-width: 900px) {
      .body {
        grid-template-columns: minmax(0, 1fr);
      }
      nav,
      aside {
        border: none;
      }
    }
  `;

  hass?: Hass;
  narrow = false;
  route?: unknown;
  panel?: unknown;
  private loadState: "idle" | "loading" | "ready" | "error" = "idle";
  private saved?: StoredConfig;
  private draft?: StoredConfig;
  private hasPrevious = false;
  private error?: string;
  private editing?: string;
  private device: Device = "phone";
  private saving = false;
  private sidebar = new Set<string>();
  private creating = false;
  private newName = "";
  private previewWidth = 360;
  /** What the editor shows: the look of the dashboard, or its layout */
  private view: View = "look";
  /** The background kind just chosen, until the data says the same (a picture without an address has no data yet) */
  private kindPick?: { id: string; kind: BackgroundKind };
  /** Advanced mode shows the options as text; remembered on this device */
  private advancedOn = readAdvanced();
  private advText?: { id: string; text: string };
  private history = new History<StoredConfig>();
  private pushed = "";
  private resizer?: ResizeObserver;

  connectedCallback(): void {
    super.connectedCallback();
    window.addEventListener("keydown", this.onKey);
    window.addEventListener("beforeunload", this.onLeave);
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    window.removeEventListener("keydown", this.onKey);
    window.removeEventListener("beforeunload", this.onLeave);
    this.resizer?.disconnect();
  }

  private get dirty(): boolean {
    return !!this.draft && !same(this.draft, this.saved);
  }

  private onLeave = (e: BeforeUnloadEvent): void => {
    if (this.dirty) {
      e.preventDefault();
      e.returnValue = "";
    }
  };

  private onKey = (e: KeyboardEvent): void => {
    if (!(e.metaKey || e.ctrlKey)) return;
    const key = e.key.toLowerCase();
    const typing = ["INPUT", "SELECT", "TEXTAREA"].includes((e.composedPath()[0] as HTMLElement | undefined)?.tagName ?? "");
    if (key === "s") {
      e.preventDefault();
      void this.save();
    } else if (key === "z" && !typing) {
      e.preventDefault();
      if (e.shiftKey) this.redo();
      else this.undo();
    } else if (key === "y" && !typing) {
      e.preventDefault();
      this.redo();
    }
  };

  protected willUpdate(changed: PropertyValues): void {
    if (changed.has("hass") && this.hass) {
      setLang(resolveLang(undefined, this.hass.language));
      if (this.loadState === "idle") void this.load();
    }
  }

  protected firstUpdated(): void {
    if (typeof ResizeObserver !== "undefined") {
      this.resizer = new ResizeObserver(() => this.measure());
      this.resizer.observe(this);
    }
  }

  protected updated(changed: PropertyValues): void {
    this.measure();
    // The name field of a new dashboard is ready for typing
    if (changed.has("creating") && this.creating) this.renderRoot.querySelector<HTMLInputElement>(".new input")?.focus();
    const root = this.renderRoot.querySelector<AmbidashRoot>("ambidash-root");
    const dashboard = this.current;
    if (!root || !dashboard) return;
    // The card gets new options only when they changed, otherwise it would rebuild its tiles on every update here
    const options = JSON.stringify(dashboard.options);
    if (options !== this.pushed) {
      this.pushed = options;
      root.setConfig(clone(dashboard.options));
    }
  }

  private measure(): void {
    const box = this.renderRoot.querySelector<HTMLElement>("aside");
    const width = box ? box.clientWidth - 34 : 0;
    if (width > 0 && Math.abs(width - this.previewWidth) > 1) this.previewWidth = width;
  }

  private get current(): StoredDashboard | undefined {
    return this.draft?.dashboards.find((d) => d.id === this.editing);
  }

  // ── data ────────────────────────────────────────────────────────────────────────────────────────────────────────

  private async load(): Promise<void> {
    const hass = this.hass;
    if (!hass) return;
    this.loadState = "loading";
    try {
      const reply = await loadStored(hass);
      this.saved = reply.config;
      this.draft = clone(reply.config);
      this.hasPrevious = reply.has_previous;
      this.history.reset();
      this.loadState = "ready";
    } catch (err) {
      this.error = t("Could not load the saved dashboards: {error}", { error: message(err) });
      this.loadState = "error";
      return;
    }
    try {
      const list = await hass.callWS?.<{ url_path: string }[]>({ type: "lovelace/dashboards/list" });
      this.sidebar = new Set((list ?? []).map((d) => d.url_path));
    } catch {
      // without the list "Add to sidebar" is simply offered everywhere
    }
  }

  private async save(): Promise<void> {
    if (!this.hass || !this.draft || !this.dirty || this.saving) return;
    this.saving = true;
    this.error = undefined;
    try {
      const reply = await saveStored(this.hass, this.draft);
      this.saved = reply.config;
      this.draft = clone(reply.config);
      this.hasPrevious = reply.has_previous;
      this.history.reset();
    } catch (err) {
      this.error = t("Could not save: {error}", { error: message(err) });
    } finally {
      this.saving = false;
    }
  }

  private discard(): void {
    if (!this.saved) return;
    this.draft = clone(this.saved);
    this.history.reset();
    this.error = undefined;
    if (!this.current) this.editing = undefined;
  }

  private async restore(): Promise<void> {
    if (!this.hass) return;
    try {
      const reply = await restoreStored(this.hass);
      this.saved = reply.config;
      this.draft = clone(reply.config);
      this.hasPrevious = reply.has_previous;
      this.history.reset();
      if (!this.current) this.editing = undefined;
    } catch (err) {
      this.error = t("Could not save: {error}", { error: message(err) });
    }
  }

  /** Changes the working copy; changes with the same key in quick succession are one undo step. */
  private change(mutate: (config: StoredConfig) => void, key?: string): void {
    if (!this.draft) return;
    const next = clone(this.draft);
    mutate(next);
    if (same(next, this.draft)) return;
    this.history.record(this.draft, key);
    this.draft = next;
  }

  private undo(): void {
    const before = this.draft && this.history.undo(this.draft);
    if (before) this.draft = before;
    if (!this.current) this.editing = undefined;
  }

  private redo(): void {
    const next = this.draft && this.history.redo(this.draft);
    if (next) this.draft = next;
    if (!this.current) this.editing = undefined;
  }

  private create(): void {
    const name = this.newName.trim();
    if (!name || !this.draft) return;
    const id = slug(name, new Set(this.draft.dashboards.map((d) => d.id)));
    this.change((c) => void c.dashboards.push({ id, name, options: { design: "home" } }));
    this.creating = false;
    this.newName = "";
    this.editing = id;
    this.view = "name";
  }

  private deleteDashboard(dashboard: StoredDashboard): void {
    if (!confirm(t("Delete “{name}”? It is gone for good once you save.", { name: dashboard.name }))) return;
    this.change((c) => void (c.dashboards = c.dashboards.filter((d) => d.id !== dashboard.id)));
    if (this.editing === dashboard.id) this.editing = undefined;
  }

  private setOption(key: keyof AmbidashConfig, value: unknown, historyKey?: string): void {
    const id = this.editing;
    this.change((c) => {
      const options = c.dashboards.find((d) => d.id === id)?.options as Record<string, unknown> | undefined;
      if (!options) return;
      if (value === undefined || value === "") delete options[key];
      else options[key] = value;
    }, historyKey);
  }

  /** The layout editor reports the new pages; no pages left means the automatic view again */
  private setPages(pages: Page[], historyKey?: string): void {
    this.setOption("pages", pages.length ? pages : undefined, historyKey);
  }

  /** A starting layout from the floors and areas: one page per floor, to be moved around afterwards */
  private createLayout(): void {
    const hass = this.hass;
    const dashboard = this.current;
    if (!hass || !dashboard) return;
    if (dashboard.options.pages?.length && !confirm(t("Replace your layout with a new one made from your areas?"))) return;
    const pages = generatePages(buildModel(hass, t("Unassigned"), dashboard.options));
    if (!pages.length) {
      this.error = t("Nothing to put on a page yet: assign devices to areas first.");
      return;
    }
    this.error = undefined;
    this.setOption("pages", pages);
  }

  private rename(name: string): void {
    const id = this.editing;
    this.change((c) => {
      const dashboard = c.dashboards.find((d) => d.id === id);
      if (dashboard) dashboard.name = name;
    }, "name");
  }

  private async addToSidebar(dashboard: StoredDashboard): Promise<void> {
    const hass = this.hass;
    if (!hass?.callWS) return;
    const url_path = `ambidash-${dashboard.id}`;
    try {
      await hass.callWS({ type: "lovelace/dashboards/create", url_path, title: dashboard.name, icon: "mdi:view-dashboard", show_in_sidebar: true, require_admin: false, mode: "storage" });
      await hass.callWS({ type: "lovelace/config/save", url_path, config: { strategy: { type: "custom:ambidash", dashboard: dashboard.id } } });
      this.sidebar = new Set([...this.sidebar, url_path]);
    } catch (err) {
      this.error = t("Could not add the dashboard to the sidebar: {error}", { error: message(err) });
    }
  }

  // ── views ───────────────────────────────────────────────────────────────────────────────────────────────────────

  render() {
    if (this.loadState === "error") return html`<div class="page"><div class="alert">${this.error}</div></div>`;
    if (!this.draft) return html`<div class="page"><p class="sub">${t("Loading…")}</p></div>`;
    return html`${this.renderBar()} ${this.error ? html`<div class="alert" role="alert">${this.error}</div>` : nothing}
    ${this.current ? this.renderEditor(this.current) : this.renderOverview(this.draft)}`;
  }

  private renderBar() {
    const dashboard = this.current;
    return html`<div class="bar">
      ${dashboard ? html`<button aria-label=${t("Back")} @click=${() => (this.view === "layout" ? (this.view = "contents") : (this.editing = undefined))}><ha-icon icon="mdi:arrow-left"></ha-icon></button>` : nothing}
      <span class="title">${dashboard ? dashboard.name : "Ambidash"}</span>
      <span class="grow"></span>
      ${this.dirty ? html`<span class="dirty">${t("Unsaved changes")}</span>` : nothing}
      <button aria-label=${t("Undo")} title=${t("Undo")} ?disabled=${!this.history.canUndo} @click=${this.undo}><ha-icon icon="mdi:undo"></ha-icon></button>
      <button aria-label=${t("Redo")} title=${t("Redo")} ?disabled=${!this.history.canRedo} @click=${this.redo}><ha-icon icon="mdi:redo"></ha-icon></button>
      ${this.hasPrevious ? html`<button title=${t("Go back to the version before the last save")} @click=${this.restore}>${t("Last version")}</button>` : nothing}
      <button ?disabled=${!this.dirty} @click=${this.discard}>${t("Discard")}</button>
      <button class="primary" ?disabled=${!this.dirty || this.saving} @click=${this.save}>${this.saving ? t("Saving…") : t("Save")}</button>
    </div>`;
  }

  private swatch(options: AmbidashConfig) {
    const tokens = resolveTokens(options.design, "dark", { palette: options.palette });
    return html`<div class="swatch" style="background:${tokens.bg}"><i style="background:${tokens.surface};border:1px solid ${tokens.line}"></i><b style="background:${tokens.accent}"></b></div>`;
  }

  private renderOverview(config: StoredConfig) {
    return html`<div class="page">
      <h1>${t("Your dashboards")}</h1>
      <p class="sub">${t("Create dashboards, shape their look and see the result at once.")}</p>
      ${this.creating
        ? html`<div class="new">
            <input .value=${this.newName} placeholder=${t("Name")} aria-label=${t("Name")} @input=${(e: Event) => (this.newName = (e.target as HTMLInputElement).value)} @keydown=${(e: KeyboardEvent) => e.key === "Enter" && this.create()} />
            <button class="primary" ?disabled=${!this.newName.trim()} @click=${this.create}>${t("Create")}</button>
            <button @click=${() => (this.creating = false)}>${t("Cancel")}</button>
          </div>`
        : html`<p><button class="primary" @click=${() => (this.creating = true)}>${t("New dashboard")}</button></p>`}
      ${config.dashboards.length
        ? html`<div class="grid">${config.dashboards.map((d) => this.renderCard(d))}</div>`
        : html`<p class="sub">${t("No dashboards yet. Create the first one.")}</p>`}
    </div>`;
  }

  private renderCard(d: StoredDashboard) {
    const path = `ambidash-${d.id}`;
    const isSaved = !!this.saved?.dashboards.some((s) => s.id === d.id);
    return html`<div class="card">
      ${this.swatch(d.options)}
      <div><div class="name">${d.name}</div><div class="meta">${DESIGN_CHOICES.find((c) => c.id === (d.options.design ?? DESIGNS[0].id))?.name ?? d.options.design}</div></div>
      <div class="actions">
        <button class="primary" @click=${() => ((this.editing = d.id), (this.view = "look"))}>${t("Edit")}</button>
        ${this.sidebar.has(path)
          ? html`<button @click=${() => navigate(`/${path}`)}>${t("Open dashboard")}</button>`
          : html`<button ?disabled=${!isSaved} title=${isSaved ? "" : t("Save the dashboard first to add it to the sidebar.")} @click=${() => this.addToSidebar(d)}>${t("Add to sidebar")}</button>`}
        <button class="danger" @click=${() => this.deleteDashboard(d)}>${t("Delete")}</button>
      </div>
    </div>`;
  }

  private renderEditor(d: StoredDashboard) {
    if (this.view === "layout" && d.options.pages?.length) return this.renderLayoutView(d);
    const titles: Record<Exclude<View, "layout">, [string, string]> = {
      name: [t("Name & device"), t("Where does it run?")],
      contents: [t("Contents"), t("What does it show?")],
      look: [t("Look"), t("How does it feel?")],
      technical: [t("Technical"), t("Title and language")],
      advanced: [t("Advanced"), t("The options as text")],
    };
    const current = this.view === "layout" ? "contents" : this.view;
    const shown: Exclude<View, "layout">[] = this.advancedOn ? [...STEPS, "advanced"] : [...STEPS];
    const step = { name: () => this.renderNameStep(d), contents: () => this.renderContentsStep(d), look: () => this.renderLookStep(d), technical: () => this.renderTechnicalStep(d), advanced: () => this.renderAdvancedStep(d) }[current]();
    const at = STEPS.indexOf(current);
    return html`<div class="body ${this.narrow ? "narrow" : ""}">
      <nav aria-label=${t("Steps")}>
        ${shown.map((v, i) => html`<button class="step ${v === current ? "on" : ""}" data-step=${v} aria-current=${v === current ? "step" : "false"} @click=${() => (this.view = v)}><span class="num">${i + 1}</span><div>${titles[v][0]}<small>${titles[v][1]}</small></div></button>`)}
        <label class="check"><input type="checkbox" .checked=${this.advancedOn} @change=${this.toggleAdvanced} /> ${t("Advanced mode")}</label>
      </nav>
      <main>
        ${step}
        <div class="actions" style="margin-top: 20px">
          ${at > 0 ? html`<button @click=${() => (this.view = STEPS[at - 1])}>${t("Back")}</button>` : nothing}
          ${at >= 0 && at < STEPS.length - 1 ? html`<button class="primary" @click=${() => (this.view = STEPS[at + 1])}>${t("Next")}</button>` : nothing}
        </div>
      </main>
      <aside>
        <div class="seg" role="group" aria-label=${t("Preview size")}>
          ${(Object.keys(DEVICES) as Device[]).map((key) => html`<button class=${this.device === key ? "on" : ""} @click=${() => (this.device = key)}>${{ phone: t("Phone"), tablet: t("Tablet"), wide: t("Wide") }[key]}</button>`)}
        </div>
        ${this.renderPreview()}
        <div class="hint">${t("Preview with your real data. Nothing is saved until you press Save.")}</div>
      </aside>
    </div>`;
  }

  private toggleAdvanced(): void {
    this.advancedOn = !this.advancedOn;
    try {
      localStorage.setItem(ADVANCED_KEY, this.advancedOn ? "1" : "0");
    } catch {
      // without storage the mode is simply not remembered
    }
    if (!this.advancedOn && this.view === "advanced") this.view = "look";
  }

  /** Step 1: the name, and whether the dashboard lives inside Home Assistant or fills a screen of its own */
  private renderNameStep(d: StoredDashboard) {
    const wall = !!d.options.fullscreen;
    const choices: [boolean, string, string][] = [
      [false, t("Phone or computer"), t("Inside Home Assistant: phone, app or browser.")],
      [true, t("Wall tablet or kiosk"), t("Fills the whole screen: for a mounted tablet or kiosk.")],
    ];
    return html`<h2>${t("Name & device")}</h2>
      <div class="sub">${t("Where does it run?")}</div>
      <div class="field"><label for="n">${t("Name")}</label><input id="n" .value=${d.name} @input=${(e: Event) => this.rename((e.target as HTMLInputElement).value)} /></div>
      <div class="field">
        <label>${t("Where does it run?")}</label>
        <div class="seg" role="group" aria-label=${t("Where does it run?")}>
          ${choices.map(([full, label]) => html`<button class=${full === wall ? "on" : ""} @click=${() => this.chooseDevice(full)}>${label}</button>`)}
        </div>
        <div class="hint">${choices.find((c) => c[0] === wall)?.[2]}</div>
      </div>`;
  }

  private chooseDevice(wall: boolean): void {
    this.device = wall ? "tablet" : "phone";
    this.setOption("fullscreen", wall ? true : undefined);
  }

  /** Step 2: which areas and kinds of devices are shown, and the layout */
  private renderContentsStep(d: StoredDashboard) {
    const o = d.options;
    const model = this.hass ? buildModel(this.hass, t("Unassigned"), { hide_domains: o.hide_domains }) : { scenes: [], floors: [] };
    const hiddenAreas = (o.hide_areas ?? []).map((a) => a.toLowerCase());
    const kinds: Record<Domain, string> = { light: t("Lights"), switch: t("Switches"), climate: t("Climate"), cover: t("Covers"), media_player: t("Media players"), scene: t("Scenes") };
    const row = (label: string, count: number | undefined, shown: boolean, toggle: (on: boolean) => void) =>
      html`<label class="check"><input type="checkbox" .checked=${shown} @change=${(e: Event) => toggle((e.target as HTMLInputElement).checked)} /> ${label}${count === undefined ? nothing : html` <small>${count}</small>`}</label>`;
    return html`<h2>${t("Contents")}</h2>
      <div class="sub">${t("What does it show?")}</div>
      <div class="field">
        <label>${t("Areas")}</label>
        ${model.floors.map(
          (f) => html`${f.name ? html`<div class="hint">${f.name}</div>` : nothing}${f.areas.map((a) =>
            a.id
              ? row(a.name, a.items.length, !hiddenAreas.includes(a.id.toLowerCase()), (on) => this.setOption("hide_areas", toggleIn(o.hide_areas, a.id, !on)))
              : row(a.name, a.items.length, !o.hide_unassigned, (on) => this.setOption("hide_unassigned", on ? undefined : true)),
          )}`,
        )}
      </div>
      <div class="field">
        <label>${t("Kinds of devices")}</label>
        ${DOMAINS.map((k) => row(kinds[k], undefined, !o.hide_domains?.includes(k), (on) => this.setOption("hide_domains", toggleIn(o.hide_domains, k, !on))))}
      </div>
      <div class="field">
        <label>${t("Layout")}</label>
        <div>${o.pages?.length ? t("Own layout: pages on a grid for phone, tablet and wall display.") : t("Automatic: all devices, area by area.")}</div>
        <div class="hint">${t("Your choices above show in the automatic view at once; an own layout keeps its devices until you create it from the areas again.")}</div>
        <div class="actions" style="margin-top: 8px">
          ${o.pages?.length ? html`<button class="primary" @click=${() => (this.view = "layout")}>${t("Edit layout")}</button>` : nothing}
          <button @click=${this.createLayout}>${t("Create from areas")}</button>
          ${o.pages?.length ? html`<button @click=${() => this.setOption("pages", undefined)}>${t("Back to automatic")}</button>` : nothing}
        </div>
      </div>`;
  }

  /** One design of the gallery: a small page with a tile, drawn with the design's own tokens in the light or dark the dashboard uses */
  private designCard(choice: { id: string; name: string }, o: AmbidashConfig) {
    const current = (o.design ?? DESIGNS[0].id) === choice.id;
    const mode: Mode = o.mode === "light" || o.mode === "dark" ? o.mode : isDark(this.hass) ? "dark" : "light";
    return html`<button class="dcard ${current ? "on" : ""}" role="radio" aria-checked=${String(current)} data-design=${choice.id} style=${designCss(choice.id, mode, { palette: o.palette })} @click=${() => this.setOption("design", choice.id)}>
      <span class="dpage"><span class="dtile"><i></i><b>Aa</b></span></span>
      <span class="dname">${choice.name}</span>
    </button>`;
  }

  /** Step 3: design, light or dark, palette, tiles, accent colour, background */
  private renderLookStep(d: StoredDashboard) {
    const o = d.options;
    const modes: [string, string][] = [["", t("Like Home Assistant")], ["light", t("Light")], ["dark", t("Dark")]];
    const styles: Record<string, string> = { "": t("Automatic"), solid: t("Solid"), glass: t("Glass"), outline: t("Outline"), none: t("None") };
    return html`<h2>${t("Look")}</h2>
      <div class="sub">${t("How does it feel?")}</div>
      <div class="field">
        <label id="design-label">${t("Design")}</label>
        <div class="gallery" role="radiogroup" aria-labelledby="design-label">${DESIGN_CHOICES.map((c) => this.designCard(c, o))}</div>
      </div>
      <div class="field">
        <label>${t("Light or dark")}</label>
        <div class="seg">${modes.map(([value, label]) => html`<button class=${(o.mode === undefined ? "" : o.mode) === value ? "on" : ""} @click=${() => this.setOption("mode", value)}>${label}</button>`)}</div>
      </div>
      <div class="field">
        <label for="p">${t("Colour palette")}</label>
        <select id="p" @change=${(e: Event) => this.setOption("palette", (e.target as HTMLSelectElement).value)}>
          <option value="" ?selected=${!o.palette}>${t("The design's own colours")}</option>
          ${PALETTES.map((p) => html`<option value=${p.id} ?selected=${o.palette === p.id}>${p.name}</option>`)}
        </select>
      </div>
      <div class="field">
        <label for="c">${t("Tiles")}</label>
        <select id="c" @change=${(e: Event) => this.setOption("card_style", (e.target as HTMLSelectElement).value)}>
          ${CARD_STYLES.map((s) => html`<option value=${s} ?selected=${(o.card_style ?? "") === s}>${styles[s]}</option>`)}
        </select>
      </div>
      <div class="field">
        <label for="ac">${t("Accent colour")}</label>
        <div class="actions">
          <input id="ac" type="color" style="width: 64px" .value=${hex(o.accent, "#ff6b35")} @input=${(e: Event) => this.setOption("accent", (e.target as HTMLInputElement).value, "accent")} />
          ${o.accent ? html`<button @click=${() => this.setOption("accent", undefined)}>${t("Reset")}</button>` : html`<span class="hint">${t("The design's own colours")}</span>`}
        </div>
      </div>
      ${this.renderBackground(o)}`;
  }

  /** Step 4: title and language */
  private renderTechnicalStep(d: StoredDashboard) {
    const o = d.options;
    const langs: [string, string][] = [["", t("Automatic")], ["en", "English"], ["de", "Deutsch"], ["nl", "Nederlands"], ["fr", "Français"]];
    return html`<h2>${t("Technical")}</h2>
      <div class="sub">${t("Title and language")}</div>
      <div class="field">
        <label for="tt">${t("Title")}</label>
        <input id="tt" .value=${o.title ?? ""} placeholder="Ambidash" @input=${(e: Event) => this.setOption("title", (e.target as HTMLInputElement).value, "title")} />
        <div class="hint">${t("Shown at the top when the dashboard fills the screen.")}</div>
      </div>
      <div class="field">
        <label for="lg">${t("Language")}</label>
        <select id="lg" @change=${(e: Event) => this.setOption("language", (e.target as HTMLSelectElement).value)}>
          ${langs.map(([v, label]) => html`<option value=${v} ?selected=${(o.language ?? "") === v}>${label}</option>`)}
        </select>
      </div>`;
  }

  /** Advanced mode: all options of the dashboard as text, and the same as a YAML dashboard */
  private renderAdvancedStep(d: StoredDashboard) {
    const json = JSON.stringify(d.options, null, 2);
    const own = this.advText && this.advText.id === this.editing ? this.advText.text : undefined;
    const text = own ?? json;
    let problem: string | undefined;
    try {
      const value: unknown = JSON.parse(text);
      if (typeof value !== "object" || value === null || Array.isArray(value)) problem = t("The options have to be an object.");
    } catch (err) {
      problem = t("Not valid JSON: {error}", { error: message(err) });
    }
    return html`<h2>${t("Advanced")}</h2>
      <div class="sub">${t("The options as text")}</div>
      <div class="field">
        <label for="adv">${t("Options as JSON")}</label>
        <textarea id="adv" rows="14" spellcheck="false" .value=${text} @input=${(e: Event) => (this.advText = { id: this.editing ?? "", text: (e.target as HTMLTextAreaElement).value })}></textarea>
        ${problem ? html`<div class="hint" style="color: var(--error-color, #db4437)">${problem}</div>` : nothing}
        <div class="actions" style="margin-top: 8px">
          <button class="primary" ?disabled=${!!problem || text === json} @click=${this.applyAdvanced}>${t("Apply")}</button>
          <button ?disabled=${own === undefined} @click=${() => (this.advText = undefined)}>${t("Reset")}</button>
        </div>
      </div>
      <div class="field">
        <label>${t("As a YAML dashboard")}</label>
        <pre>${toYaml({ strategy: { type: "custom:ambidash", ...d.options } })}</pre>
        <div class="hint">${t("Home Assistant checks the options when you save.")}</div>
      </div>`;
  }

  private applyAdvanced(): void {
    const id = this.editing;
    if (!this.advText || this.advText.id !== id) return;
    try {
      const options = JSON.parse(this.advText.text) as AmbidashConfig;
      this.change((c) => {
        const dashboard = c.dashboards.find((x) => x.id === id);
        if (dashboard) dashboard.options = options;
      });
      this.advText = undefined;
    } catch {
      // the Apply button is disabled for text that is not JSON
    }
  }

  /** The background: none, a colour, a gradient, a picture, or photos (a folder and/or free placeholder photos) */
  private renderBackground(o: AmbidashConfig) {
    const bg = o.background;
    const kind = this.kindPick && this.kindPick.id === this.editing ? this.kindPick.kind : kindOf(bg);
    const names: Record<BackgroundKind, string> = { none: t("None"), color: t("Colour"), gradient: t("Gradient"), image: t("Picture"), photos: t("Photos") };
    const set = (patch: Partial<Record<keyof Background, unknown>>) => this.setOption("background", withBackground(bg, patch), `bg:${Object.keys(patch)[0]}`);
    const colour = (id: string, label: string, value: string, apply: (v: string) => void) =>
      html`<div class="field"><label for=${id}>${label}</label><input id=${id} type="color" style="width: 64px" .value=${value} @input=${(e: Event) => apply((e.target as HTMLInputElement).value)} /></div>`;
    const text = (id: string, label: string, field: keyof Background, placeholder: string) =>
      html`<div class="field"><label for=${id}>${label}</label><input id=${id} .value=${(bg?.[field] as string | undefined) ?? ""} placeholder=${placeholder} @change=${(e: Event) => set({ [field]: (e.target as HTMLInputElement).value.trim() })} /></div>`;
    const range = (id: string, label: string, value: number, max: number, field: "angle" | "blur") =>
      html`<div class="field"><label for=${id}>${label}</label><input id=${id} type="range" min="0" max=${max} .value=${String(value)} @input=${(e: Event) => set({ [field]: Number((e.target as HTMLInputElement).value) })} /></div>`;
    const shades: [string, string][] = [["none", t("None")], ["light", t("Slight")], ["strong", t("Strong")]];
    const sources: [string, string][] = [["", t("No free photos")], ["wikimedia", "Wikimedia Commons"], ["art", t("Art")], ["nasa", "NASA"], ["picsum", "Picsum"], ["bing", "Bing"]];
    return html`<div class="field">
        <label>${t("Background")}</label>
        <div class="seg" role="group" aria-label=${t("Background")}>
          ${KINDS.map((k) => html`<button class=${k === kind ? "on" : ""} @click=${() => this.pickBackground(k)}>${names[k]}</button>`)}
        </div>
      </div>
      ${kind === "color" ? colour("bc", t("Colour"), hex(bg?.color, "#1e2a3a"), (v) => set({ color: v })) : nothing}
      ${kind === "gradient"
        ? html`${colour("g1", t("From"), hex(bg?.gradient?.[0], "#1e3a5f"), (v) => set({ gradient: [v, hex(bg?.gradient?.[1], "#0e0f12")] }))}
          ${colour("g2", t("To"), hex(bg?.gradient?.[1], "#0e0f12"), (v) => set({ gradient: [hex(bg?.gradient?.[0], "#1e3a5f"), v] }))}
          ${range("ga", t("Angle"), bg?.angle ?? 160, 360, "angle")}`
        : nothing}
      ${kind === "image" ? text("bi", t("Address of the picture"), "image", "/local/wallpaper.jpg") : nothing}
      ${kind === "photos"
        ? html`${text("bf", t("Folder in the media browser"), "folder", "media-source://media_source/local/wallpaper")}
          <div class="field">
            <label for="bp">${t("Free photos")}</label>
            <select id="bp" @change=${(e: Event) => set({ placeholder: (e.target as HTMLSelectElement).value })}>${sources.map(([v, label]) => html`<option value=${v} ?selected=${(bg?.placeholder ?? "") === v}>${label}</option>`)}</select>
            <div class="hint">${t("Home Assistant fetches free photos for you; the integration's internet switch has to be on.")}</div>
          </div>
          ${bg?.folder && bg?.placeholder ? html`<label class="check"><input type="checkbox" .checked=${!!bg.mix} @change=${(e: Event) => set({ mix: (e.target as HTMLInputElement).checked || undefined })} /> ${t("Mix with the folder")}</label>` : nothing}
          <div class="field"><label for="bm">${t("Minutes between pictures")}</label><input id="bm" type="number" min="1" max="1440" .value=${String(bg?.interval ?? 10)} @change=${(e: Event) => set({ interval: Number((e.target as HTMLInputElement).value) || undefined })} /></div>
          ${bg?.placeholder ? html`<label class="check"><input type="checkbox" .checked=${bg.credit !== false} @change=${(e: Event) => set({ credit: (e.target as HTMLInputElement).checked ? undefined : false })} /> ${t("Show the photo credit")}</label>` : nothing}`
        : nothing}
      ${kind === "image" || kind === "photos"
        ? html`<div class="field"><label for="bs">${t("Darkening of the picture")}</label>
              <select id="bs" @change=${(e: Event) => set({ shade: (e.target as HTMLSelectElement).value })}>${shades.map(([v, label]) => html`<option value=${v} ?selected=${(bg?.shade ?? "light") === v}>${label}</option>`)}</select></div>
            ${range("bb", t("Blur"), bg?.blur ?? 0, 40, "blur")}`
        : nothing}`;
  }

  private pickBackground(kind: BackgroundKind): void {
    this.kindPick = this.editing ? { id: this.editing, kind } : undefined;
    this.setOption("background", withBackground(undefined, { ...startOf(kind) }));
  }

  private renderLayoutView(d: StoredDashboard) {
    return html`<ambidash-layout-editor .hass=${this.hass} .pages=${d.options.pages ?? []} .options=${d.options} .onChange=${(pages: Page[], key?: string) => this.setPages(pages, key)}></ambidash-layout-editor>`;
  }

  private renderPreview() {
    const { width, height } = DEVICES[this.device];
    const scale = Math.min(1, this.previewWidth / width);
    return html`<div class="pbox" style="height:${Math.round(height * scale)}px">
      <div class="frame" style="width:${width}px;height:${height}px;transform:scale(${scale});--ambi-vh:${height}px"><ambidash-root .hass=${this.hass}></ambidash-root></div>
    </div>`;
  }
}

if (!customElements.get("ambidash-studio")) customElements.define("ambidash-studio", AmbidashStudio);
