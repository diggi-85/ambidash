// The layout editor: pages on the left, the chosen page as a grid in the middle where items are dragged around, the chosen item on the right.
import { designCss, type Mode } from "@ambi/core";
import { LitElement, css, html, nothing, type PropertyValues } from "lit";
import { repeat } from "lit/directives/repeat.js";
import { entityName, isDark } from "../adapter";
import { t } from "../i18n";
import { COLUMNS } from "../layout";
import { DOMAINS, areaNameOf } from "../model";
import "../tile";
import type { AmbidashConfig, Box, Device, Hass, LayoutItem, Page, TileAction } from "../types";
import { addItem, boxesOf, duplicateItems, followTablet, move, newPageId, removeItems, resize, setItem, withBoxes, type Boxes } from "./edit";

/** Widths the devices are drawn at, and the sizes of the grid (the same numbers as the root card uses) */
const WIDTH: Record<Device, number> = { phone: 390, tablet: 768, wall: 1180 };
const GAP = 10;
const ROW = 44;
const PAD = 16;
const DEVICES: Device[] = ["phone", "tablet", "wall"];

interface Drag {
  mode: "move" | "resize";
  id: string;
  startX: number;
  startY: number;
  start: Boxes;
  ids: string[];
}

export class AmbidashLayoutEditor extends LitElement {
  static properties = {
    hass: { attribute: false },
    pages: { attribute: false },
    options: { attribute: false },
    onChange: { attribute: false },
    pageId: { state: true },
    device: { state: true },
    selected: { state: true },
    live: { state: true },
    picking: { state: true },
    search: { state: true },
    stageWidth: { state: true },
  };

  static styles = css`
    :host {
      display: grid;
      grid-template-columns: 200px minmax(0, 1fr) 280px;
      min-height: calc(100vh - 120px);
      color: var(--primary-text-color);
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
      padding: 0 12px;
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
    button.on {
      background: color-mix(in srgb, var(--primary-color) 16%, transparent);
      border-color: var(--primary-color);
    }
    button.danger {
      color: var(--error-color, #db4437);
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
    aside {
      padding: 12px;
      min-width: 0;
    }
    .pages {
      border-right: 1px solid var(--divider-color);
    }
    .props {
      border-left: 1px solid var(--divider-color);
    }
    h2 {
      margin: 0 0 8px;
      font-size: 14px;
      font-weight: 600;
      color: var(--secondary-text-color);
    }
    .page {
      display: block;
      width: 100%;
      margin-bottom: 4px;
      text-align: left;
    }
    .center {
      padding: 12px 16px;
      min-width: 0;
    }
    .seg {
      display: flex;
      flex-wrap: wrap;
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
    .hint {
      margin: 8px 0;
      color: var(--secondary-text-color);
      font-size: 13px;
    }
    .stage {
      position: relative;
      overflow: hidden;
      border-radius: 12px;
      border: 1px solid var(--divider-color);
      margin: 8px 0;
      background: var(--card-background-color);
    }
    .canvas {
      position: absolute;
      top: 0;
      left: 0;
      transform-origin: top left;
      padding: ${PAD}px;
      background: var(--ambi-bg);
      color: var(--ambi-ink);
      font-family: var(--ambi-font);
      touch-action: none;
      user-select: none;
      --ambi-tile-min: 0px;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(var(--cols), minmax(0, 1fr));
      grid-auto-rows: ${ROW}px;
      gap: ${GAP}px;
    }
    .slot {
      border: 1px dashed color-mix(in srgb, var(--ambi-ink) 16%, transparent);
      border-radius: 6px;
    }
    .item {
      position: relative;
      min-width: 0;
      min-height: 0;
      cursor: grab;
      border-radius: 6px;
      z-index: 1;
    }
    .item.sel {
      outline: 2px solid var(--primary-color);
      outline-offset: 2px;
      z-index: 2;
    }
    .item .body {
      height: 100%;
      pointer-events: none;
    }
    .item.heading .body {
      display: flex;
      align-items: flex-end;
      font: 600 22px / 1.2 var(--ambi-display);
    }
    .item .chip {
      display: inline-block;
      padding: 8px 14px;
      border-radius: 999px;
      border: 1px solid var(--ambi-line);
      background: var(--ambi-surface);
      font-size: 14px;
    }
    .handle {
      display: none;
      position: absolute;
      right: -4px;
      bottom: -4px;
      width: 16px;
      height: 16px;
      border-radius: 4px;
      background: var(--primary-color);
      cursor: nwse-resize;
    }
    .item.sel .handle {
      display: block;
    }
    .add {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      align-items: center;
    }
    .field {
      margin: 12px 0;
    }
    .field label {
      display: block;
      margin-bottom: 4px;
      font-size: 13px;
      color: var(--secondary-text-color);
    }
    .actions {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      margin-top: 12px;
    }
    .results button {
      display: block;
      width: 100%;
      min-height: 44px;
      margin-top: 4px;
      text-align: left;
    }
    .results small {
      display: block;
      color: var(--secondary-text-color);
    }
    code {
      font-size: 12px;
      word-break: break-all;
    }
    @media (max-width: 900px) {
      :host {
        grid-template-columns: minmax(0, 1fr);
      }
      .pages,
      .props {
        border: none;
      }
    }
  `;

  hass?: Hass;
  pages: Page[] = [];
  options: AmbidashConfig = {};
  /** Called with the new pages after every change; the Studio keeps them in the working copy */
  onChange?: (pages: Page[], key?: string) => void;
  private pageId?: string;
  private device: Device = "tablet";
  private selected: string[] = [];
  /** The boxes while an item is being dragged; the change is only reported when the pointer is let go */
  private live?: Boxes;
  /** The device picker: adds a new tile, or swaps the device of the selected one */
  private picking: false | "add" | "change" = false;
  private search = "";
  private stageWidth = 600;
  private drag?: Drag;
  private resizer?: ResizeObserver;

  connectedCallback(): void {
    super.connectedCallback();
    window.addEventListener("keydown", this.onKey);
    if (typeof ResizeObserver !== "undefined") {
      this.resizer = new ResizeObserver(() => this.measure());
      this.resizer.observe(this);
    }
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    window.removeEventListener("keydown", this.onKey);
    this.resizer?.disconnect();
  }

  protected willUpdate(changed: PropertyValues): void {
    if (changed.has("pages")) {
      const ids = new Set(this.page?.items.map((i) => i.id));
      if (this.selected.some((id) => !ids.has(id))) this.selected = this.selected.filter((id) => ids.has(id));
    }
  }

  protected updated(): void {
    this.measure();
  }

  private measure(): void {
    const stage = this.renderRoot.querySelector<HTMLElement>(".center");
    const width = stage ? stage.clientWidth - 34 : 0;
    if (width > 0 && Math.abs(width - this.stageWidth) > 1) this.stageWidth = width;
  }

  private get page(): Page | undefined {
    return this.pages.find((p) => p.id === this.pageId) ?? this.pages[0];
  }

  private get scale(): number {
    return Math.min(1, this.stageWidth / WIDTH[this.device]);
  }

  /** Cell sizes in the drawing: how far one column and one row are apart */
  private get step(): { x: number; y: number } {
    const cols = COLUMNS[this.device];
    const cell = (WIDTH[this.device] - 2 * PAD - GAP * (cols - 1)) / cols;
    return { x: cell + GAP, y: ROW + GAP };
  }

  private commit(page: Page, key?: string): void {
    this.onChange?.(this.pages.map((p) => (p.id === page.id ? page : p)), key);
  }

  // ── keyboard and pointer ────────────────────────────────────────────────────────────────────────────────────────

  private onKey = (e: KeyboardEvent): void => {
    const page = this.page;
    const typing = ["INPUT", "SELECT", "TEXTAREA"].includes((e.composedPath()[0] as HTMLElement | undefined)?.tagName ?? "");
    if (!page || typing) return;
    const cols = COLUMNS[this.device];
    const mod = e.metaKey || e.ctrlKey;
    const arrow: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    if (e.key === "Escape") {
      this.selected = [];
      this.picking = false;
    } else if (mod && e.key.toLowerCase() === "a") {
      e.preventDefault();
      this.selected = page.items.map((i) => i.id);
    } else if (mod && e.key.toLowerCase() === "d" && this.selected.length) {
      e.preventDefault();
      this.duplicate();
    } else if ((e.key === "Delete" || e.key === "Backspace") && this.selected.length) {
      e.preventDefault();
      this.removeSelected();
    } else if (arrow[e.key] && this.selected.length) {
      e.preventDefault();
      const [dx, dy] = arrow[e.key];
      const boxes = boxesOf(page, this.device);
      const item = page.items.find((i) => i.id === this.selected[0]);
      const next = e.shiftKey && this.selected.length === 1 && item ? resize(boxes, item.id, item, dx, dy, cols) : move(boxes, this.selected, dx, dy, cols);
      if (next !== boxes) this.commit(withBoxes(page, this.device, next), "layout:keys");
    }
  };

  private down(e: PointerEvent, id: string): void {
    const page = this.page;
    if (!page || e.button !== 0) return;
    const handle = (e.composedPath()[0] as HTMLElement).classList?.contains("handle");
    const additive = e.shiftKey || e.metaKey || e.ctrlKey;
    if (additive) this.selected = this.selected.includes(id) ? this.selected.filter((x) => x !== id) : [...this.selected, id];
    else if (!this.selected.includes(id)) this.selected = [id];
    if (!this.selected.includes(id)) return;
    this.drag = { mode: handle ? "resize" : "move", id, startX: e.clientX, startY: e.clientY, start: boxesOf(page, this.device), ids: this.selected };
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    e.preventDefault();
  }

  private moved(e: PointerEvent): void {
    const { drag, page } = this;
    if (!drag || !page) return;
    const dx = Math.round((e.clientX - drag.startX) / (this.step.x * this.scale));
    const dy = Math.round((e.clientY - drag.startY) / (this.step.y * this.scale));
    const cols = COLUMNS[this.device];
    const item = page.items.find((i) => i.id === drag.id);
    const next = drag.mode === "resize" && item ? resize(drag.start, drag.id, item, dx, dy, cols) : move(drag.start, drag.ids, dx, dy, cols);
    this.live = next === drag.start ? undefined : next;
  }

  private up(): void {
    const { drag, page, live } = this;
    this.drag = undefined;
    this.live = undefined;
    if (drag && page && live) this.commit(withBoxes(page, this.device, live));
  }

  // ── changes ─────────────────────────────────────────────────────────────────────────────────────────────────────

  private add(item: Omit<LayoutItem, "id">): void {
    const page = this.page;
    if (!page) return;
    const added = addItem(page, this.device, item);
    this.selected = [added.id];
    this.picking = false;
    this.commit(added.page);
  }

  private change(id: string, entity: string): void {
    const page = this.page;
    if (!page) return;
    this.picking = false;
    this.commit(setItem(page, id, { entity }));
  }

  private duplicate(): void {
    const page = this.page;
    if (!page) return;
    const copies = duplicateItems(page, this.device, this.selected);
    this.selected = copies.ids;
    this.commit(copies.page);
  }

  private removeSelected(): void {
    const page = this.page;
    if (!page) return;
    const ids = this.selected;
    this.selected = [];
    this.commit(removeItems(page, ids));
  }

  private addPage(): void {
    const id = newPageId(this.pages);
    this.pageId = id;
    this.selected = [];
    this.onChange?.([...this.pages, { id, name: t("Page {n}", { n: this.pages.length + 1 }), items: [], layouts: {} }]);
  }

  private deletePage(page: Page): void {
    if (!confirm(t("Delete the page “{name}” and everything on it?", { name: page.name }))) return;
    this.pageId = undefined;
    this.selected = [];
    this.onChange?.(this.pages.filter((p) => p.id !== page.id));
  }

  private tileName(item: LayoutItem): string {
    const state = item.entity ? this.hass?.states[item.entity] : undefined;
    return item.name || (state && this.hass ? entityName(this.hass, state, areaNameOf(this.hass, item.entity!)) : (item.entity ?? ""));
  }

  // ── views ───────────────────────────────────────────────────────────────────────────────────────────────────────

  render() {
    const page = this.page;
    return html`<aside class="pages">${this.renderPages()}</aside>
      <div class="center">${page ? this.renderCenter(page) : nothing}</div>
      <aside class="props">${page ? this.renderProps(page) : nothing}</aside>`;
  }

  private renderPages() {
    const current = this.page;
    return html`<h2>${t("Pages")}</h2>
      ${this.pages.map((p) => html`<button class="page ${p === current ? "on" : ""}" @click=${() => ((this.pageId = p.id), (this.selected = []))}>${p.name}</button>`)}
      <button @click=${this.addPage}>${t("New page")}</button>`;
  }

  private renderCenter(page: Page) {
    const cols = COLUMNS[this.device];
    const boxes = this.live ?? boxesOf(page, this.device);
    const rows = Math.max(8, ...Object.values(boxes).map(([, y, , h]) => y + h + 2));
    const scale = this.scale;
    const mode: Mode = this.options.mode === "light" || this.options.mode === "dark" ? this.options.mode : this.hass && isDark(this.hass) ? "dark" : "light";
    const tokens = designCss(this.options.design, mode, { palette: this.options.palette, accent: this.options.accent, cardStyle: this.options.card_style });
    const height = rows * (ROW + GAP) - GAP + 2 * PAD;
    const own = !!page.layouts?.[this.device];
    const names: Record<Device, string> = { phone: t("Phone · 4 columns"), tablet: t("Tablet · 8 columns"), wall: t("Wall display · 12 columns") };
    return html`<div class="seg" role="group" aria-label=${t("Device")}>
        ${DEVICES.map((d) => html`<button class=${d === this.device ? "on" : ""} @click=${() => ((this.device = d), (this.selected = []))}>${names[d]}</button>`)}
      </div>
      <div class="hint">
        ${this.device === "tablet"
          ? t("The tablet layout is the base: phone and wall display follow it until you place things there.")
          : own
            ? html`${t("This device has a layout of its own.")} <button @click=${() => this.commit(followTablet(page, this.device))}>${t("Follow the tablet again")}</button>`
            : this.device === "phone"
              ? t("The phone follows the tablet layout until you change something here.")
              : t("The wall display follows the tablet layout until you change something here.")}
      </div>
      <div class="stage" style="height:${Math.round(height * scale)}px">
        <div class="canvas" style="width:${WIDTH[this.device]}px;height:${height}px;left:${Math.max(0, Math.round((this.stageWidth - WIDTH[this.device] * scale) / 2))}px;transform:scale(${scale});${tokens}" @pointermove=${this.moved} @pointerup=${this.up} @pointercancel=${this.up} @pointerdown=${(e: PointerEvent) => e.target === e.currentTarget && (this.selected = [])}>
          <div class="grid" style="--cols:${cols};grid-template-rows:repeat(${rows},${ROW}px)">
            ${Array.from({ length: cols * rows }, (_, i) => html`<div class="slot" style="grid-column:${(i % cols) + 1};grid-row:${Math.floor(i / cols) + 1}"></div>`)}
            ${repeat(
              page.items.filter((i) => boxes[i.id]),
              (item) => item.id,
              (item) => this.renderItem(item, boxes[item.id]),
            )}
          </div>
        </div>
      </div>
      ${page.items.length ? nothing : html`<div class="hint">${t("This page is empty. Add a device, a heading or the summary below.")}</div>`}
      <div class="add">
        <span class="hint">${t("Add")}</span>
        <button @click=${() => ((this.picking = "add"), (this.search = ""))}>${t("Device")}</button>
        <button @click=${() => this.add({ type: "heading", text: t("New heading") })}>${t("Heading")}</button>
        <button @click=${() => this.add({ type: "summary" })}>${t("Summary")}</button>
      </div>
      <div class="hint">${t("Drag to move, the corner at the bottom right changes the size. Arrow keys move, with Shift they resize, Delete removes.")}</div>`;
  }

  private renderItem(item: LayoutItem, [x, y, w, h]: Box) {
    const state = item.entity ? this.hass?.states[item.entity] : undefined;
    const body =
      item.type === "heading"
        ? html`<div class="body">${item.text}</div>`
        : item.type === "summary"
          ? html`<div class="body"><span class="chip">${t("Summary")}</span></div>`
          : html`<div class="body" inert>${state ? html`<ambidash-tile .stateObj=${state} .name=${this.tileName(item)} .hass=${this.hass}></ambidash-tile>` : html`<span class="chip">${item.entity}</span>`}</div>`;
    return html`<div class="item ${item.type} ${this.selected.includes(item.id) ? "sel" : ""}" style="grid-column:${x + 1} / span ${w};grid-row:${y + 1} / span ${h}" @pointerdown=${(e: PointerEvent) => this.down(e, item.id)}>
      ${body}<span class="handle"></span>
    </div>`;
  }

  private renderProps(page: Page) {
    if (this.picking) return this.renderPicker(page);
    const items = page.items.filter((i) => this.selected.includes(i.id));
    if (items.length > 1) {
      return html`<h2>${t("{n} items selected", { n: items.length })}</h2>
        <div class="actions"><button @click=${this.duplicate}>${t("Duplicate")}</button><button class="danger" @click=${this.removeSelected}>${t("Delete")}</button></div>`;
    }
    if (items.length === 1) {
      const item = items[0];
      const [, , w, h] = boxesOf(page, this.device)[item.id] ?? [0, 0, 0, 0];
      return html`<h2>${{ tile: t("Tile"), heading: t("Heading"), summary: t("Summary") }[item.type]}</h2>
        ${item.type === "heading"
          ? html`<div class="field"><label for="x">${t("Text")}</label><input id="x" .value=${item.text ?? ""} @input=${(e: Event) => this.commit(setItem(page, item.id, { text: (e.target as HTMLInputElement).value }), `layout:text:${item.id}`)} /></div>`
          : nothing}
        ${item.type === "tile"
          ? html`<div class="field"><label for="n">${t("Name")}</label><input id="n" .value=${item.name ?? ""} placeholder=${this.tileName({ ...item, name: undefined })} @input=${(e: Event) => this.commit(setItem(page, item.id, { name: (e.target as HTMLInputElement).value }), `layout:name:${item.id}`)} />
              </div>
              <div class="field"><label>${t("Device")}</label><code>${item.entity}</code>
                <div class="actions"><button @click=${() => ((this.picking = "change"), (this.search = ""))}>${t("Change")}</button></div></div>
              ${this.actionField(page, item, "tap")} ${this.actionField(page, item, "hold")}`
          : nothing}
        ${item.type === "summary" ? html`<div class="hint">${t("Counts the lights, covers and players that are on.")}</div>` : nothing}
        <div class="field"><label>${t("Size")}</label>${t("{w} × {h} cells", { w, h })}</div>
        <div class="actions"><button @click=${this.duplicate}>${t("Duplicate")}</button><button class="danger" @click=${this.removeSelected}>${t("Delete")}</button></div>`;
    }
    return html`<h2>${t("Page")}</h2>
      <div class="field"><label for="p">${t("Name")}</label><input id="p" .value=${page.name} @input=${(e: Event) => this.commit({ ...page, name: (e.target as HTMLInputElement).value }, `layout:page:${page.id}`)} /></div>
      <div class="hint">${t("Click an item to edit it, or add one below.")}</div>
      <div class="actions"><button class="danger" ?disabled=${this.pages.length < 2} @click=${() => this.deletePage(page)}>${t("Delete page")}</button></div>`;
  }

  /** What a tap or a long press on this tile does; a tap may also be left to the device (switch, play, activate) */
  private actionField(page: Page, item: LayoutItem, key: "tap" | "hold") {
    const value = item[key] ?? (key === "hold" ? "popup" : "");
    const options: [string, string][] = [
      ...(key === "tap" ? [["", t("Like the device")] as [string, string]] : []),
      ["popup", t("Open the pop-up")],
      ["more-info", t("Open Home Assistant's dialog")],
      ["none", t("Do nothing")],
    ];
    const id = `a-${key}`;
    return html`<div class="field">
      <label for=${id}>${key === "tap" ? t("When tapped") : t("When pressed and held")}</label>
      <select id=${id} @change=${(e: Event) => this.commit(setItem(page, item.id, { [key]: (e.target as HTMLSelectElement).value as TileAction }))}>
        ${options.map(([v, label]) => html`<option value=${v} ?selected=${v === value}>${label}</option>`)}
      </select>
    </div>`;
  }

  private renderPicker(page: Page) {
    const changing = this.picking === "change" ? page.items.find((i) => i.id === this.selected[0]) : undefined;
    const hass = this.hass;
    const placed = new Set(page.items.map((i) => i.entity));
    const query = this.search.trim().toLowerCase();
    const found = Object.values(hass?.states ?? {})
      .filter((s) => (DOMAINS as readonly string[]).includes(s.entity_id.slice(0, s.entity_id.indexOf("."))))
      .map((s) => ({ id: s.entity_id, name: hass ? entityName(hass, s, areaNameOf(hass, s.entity_id)) : s.entity_id }))
      .filter((e) => !query || e.name.toLowerCase().includes(query) || e.id.includes(query))
      .sort((a, b) => a.name.localeCompare(b.name, hass?.language))
      .slice(0, 60);
    return html`<h2>${changing ? t("Change the device") : t("Add a device")}</h2>
      <input autofocus aria-label=${t("Search devices")} placeholder=${t("Search devices")} .value=${this.search} @input=${(e: Event) => (this.search = (e.target as HTMLInputElement).value)} />
      <div class="results">
        ${found.length
          ? found.map((e) => html`<button @click=${() => (changing ? this.change(changing.id, e.id) : this.add({ type: "tile", entity: e.id }))}>${e.name}<small>${e.id}${placed.has(e.id) ? ` · ${t("already on this page")}` : ""}</small></button>`)
          : html`<div class="hint">${t("No matching devices.")}</div>`}
      </div>
      <div class="actions"><button @click=${() => (this.picking = false)}>${t("Cancel")}</button></div>`;
  }
}

if (!customElements.get("ambidash-layout-editor")) customElements.define("ambidash-layout-editor", AmbidashLayoutEditor);
