// How a tile looks while one of its state rules holds (`states` of an item): the first rule that holds wins. Pure logic, no DOM.
import { onColor } from "@ambi/core";
import { checkAll, type Context } from "./conditions";
import { isTemplate, templateText } from "./template";
import type { Hass, StateStyle } from "./types";

/** What a rule changes on a tile: the colour of the icon bubble (a design colour) with the glyph colour that reads on it, the icon, the status text */
export interface TileLook {
  color?: string;
  glyph?: string;
  icon?: string;
  status?: string;
}

/** The look the first holding rule asks for; the colour is the design's own value from `tokens` (accent, good or alert) */
export const lookFor = (hass: Hass, rules: StateStyle[] | undefined, tokens: Record<string, string>, ctx?: Context): TileLook | undefined => {
  const rule = rules?.find((r) => checkAll(hass, r.when, ctx));
  if (!rule) return undefined;
  const color = rule.color ? tokens[rule.color] : undefined;
  // A status text that is a template shows what Home Assistant says, and nothing until it has said it
  const status = isTemplate(rule.status) ? templateText(ctx?.templates?.(rule.status)) : rule.status;
  return { ...(color ? { color, glyph: onColor(color) } : {}), ...(rule.icon ? { icon: rule.icon } : {}), ...(status ? { status } : {}) };
};
