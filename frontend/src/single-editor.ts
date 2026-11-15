// The visual editor of the single cards (card picker → "Show visual editor"): one form made with Home Assistant's own ha-form,
// with the fields of the card type that is edited. It writes only what differs from the default, so the YAML stays short.
import { DESIGNS, PALETTES } from "@ambi/core";
import { LitElement, html, nothing } from "lit";
import { lang, resolveLang, setLang, t } from "./i18n";
import { DOMAINS } from "./model";
import type { Hass } from "./types";

type Config = Record<string, unknown>;
interface Field {
  name: string;
  label: string;
  selector: Record<string, unknown>;
  helper?: string;
}

/** The value of "nothing chosen" in the select fields (ha-form selects need a string) */
const NONE = "default";
/** What a field shows when the card does not say; a field set to this is left out of the config */
const DEFAULTS: Record<string, unknown> = { design: NONE, mode: NONE, palette: NONE, language: NONE, accent: "", name: "", format: "auto", seconds: false, date: true, forecast: true, no_background: false, tap: "toggle", hold: "more-info" };
/** The two fields that are stored as `{ action }` */
const ACTIONS: Record<string, string> = { tap: "tap_action", hold: "hold_action" };

const select = (options: [string, string][]) => ({ select: { mode: "dropdown", options: options.map(([value, label]) => ({ value, label })) } });
const text = { text: {} };
const toggle = { boolean: {} };

/** The fields of a card type, labelled in the language of the Home Assistant user (not the card's own `language`) */
const fieldsOf = (kind: string, hass: Hass): Field[] => {
  const before = lang();
  setLang(resolveLang(undefined, hass.language));
  const look: Field[] = [
    { name: "design", label: t("Design"), selector: select([[NONE, t("Default")], ...DESIGNS.map((d): [string, string] => [d.id, d.name]), ["seasons", "Seasons"]]) },
    { name: "mode", label: t("Light or dark"), selector: select([[NONE, t("Like Home Assistant")], ["light", t("Light")], ["dark", t("Dark")]]) },
    { name: "palette", label: t("Palette"), selector: select([[NONE, t("Default")], ...PALETTES.map((p): [string, string] => [p.id, p.name])]) },
    { name: "accent", label: t("Accent colour"), selector: text, helper: t("A colour such as #ff6b35; empty for the design's own colours.") },
    { name: "language", label: t("Language"), selector: select([[NONE, t("Automatic")], ["en", "English"], ["de", "Deutsch"], ["nl", "Nederlands"], ["fr", "Français"]]) },
  ];
  const own: Field[] =
    kind === "tile"
      ? [
          { name: "entity", label: t("Entity"), selector: { entity: { filter: { domain: [...DOMAINS] } } } },
          { name: "name", label: t("Name"), selector: text, helper: t("Empty for the device's own name.") },
          { name: "tap", label: t("When tapped"), selector: select([["toggle", t("Switch or activate")], ["more-info", t("Show details")], ["none", t("Nothing")]]) },
          { name: "hold", label: t("When held"), selector: select([["more-info", t("Show details")], ["none", t("Nothing")]]) },
        ]
      : kind === "weather"
        ? [
            { name: "entity", label: t("Weather entity"), selector: { entity: { filter: { domain: "weather" } } } },
            { name: "forecast", label: t("Show the forecast"), selector: toggle },
            { name: "no_background", label: t("No background"), selector: toggle },
          ]
        : [
            { name: "format", label: t("Time format"), selector: select([["auto", t("Automatic")], ["12", t("12-hour")], ["24", t("24-hour")]]) },
            { name: "seconds", label: t("Show seconds"), selector: toggle },
            { name: "date", label: t("Show the date"), selector: toggle },
            { name: "no_background", label: t("No background"), selector: toggle },
          ];
  setLang(before);
  return [...own, ...look];
};

export class AmbidashCardEditor extends LitElement {
  static properties = { hass: { attribute: false }, config: { attribute: false } };

  hass?: Hass;
  config?: Config;

  setConfig(config: Config): void {
    this.config = config;
  }

  /** The kind of card (clock, weather, tile) from its type, `custom:ambidash-clock-card` and so on */
  private get kind(): string {
    return /ambidash-(\w+)-card$/.exec(String(this.config?.type ?? ""))?.[1] ?? "clock";
  }

  private data(fields: Field[]): Record<string, unknown> {
    const c = this.config!;
    return Object.fromEntries(fields.map(({ name }) => [name, (name in ACTIONS ? (c[ACTIONS[name]] as { action?: string } | undefined)?.action : c[name]) ?? DEFAULTS[name]]));
  }

  private changed(e: CustomEvent<{ value: Record<string, unknown> }>, fields: Field[]): void {
    e.stopPropagation();
    const config = { ...this.config };
    for (const { name } of fields) {
      const value = e.detail.value[name];
      const key = ACTIONS[name] ?? name;
      if (value === DEFAULTS[name] || value === undefined || value === "") delete config[key];
      else config[key] = name in ACTIONS ? { action: value } : value;
    }
    this.dispatchEvent(new CustomEvent("config-changed", { detail: { config }, bubbles: true, composed: true }));
  }

  render() {
    if (!this.config || !this.hass) return nothing;
    const fields = fieldsOf(this.kind, this.hass);
    const label = (s: { name: string }) => fields.find((f) => f.name === s.name)?.label ?? s.name;
    const helper = (s: { name: string }) => fields.find((f) => f.name === s.name)?.helper;
    return html`<ha-form
      .hass=${this.hass}
      .data=${this.data(fields)}
      .schema=${fields.map(({ name, selector }) => ({ name, selector }))}
      .computeLabel=${label}
      .computeHelper=${helper}
      @value-changed=${(e: CustomEvent<{ value: Record<string, unknown> }>) => this.changed(e, fields)}
    ></ha-form>`;
  }
}

if (!customElements.get("ambidash-card-editor")) customElements.define("ambidash-card-editor", AmbidashCardEditor);
