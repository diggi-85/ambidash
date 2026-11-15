// When something is shown: judges the conditions of an item (see Condition in types.ts). Pure logic, no DOM.
import type { Condition, Device, Hass } from "./types";

/** What a condition may ask besides the states: which device class shows the dashboard, and what time it is (a test sets it) */
export interface Context {
  device?: Device;
  now?: Date;
  /** The latest result of a Jinja template, undefined while there is none (the dashboard follows them, see template.ts) */
  templates?: (source: string) => unknown;
}

/** What a template result means as a yes or no, as in Home Assistant: true, on, yes, enable, 1, and numbers other than 0 */
export const templateTrue = (value: unknown): boolean => (typeof value === "boolean" ? value : typeof value === "number" ? value !== 0 : typeof value === "string" && ["true", "on", "yes", "enable", "1"].includes(value.trim().toLowerCase()));

/** "HH:MM" as minutes since midnight, or null for anything else */
const minutesOf = (hhmm?: string): number | null => {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm ?? "");
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
};

const list = (value: string | string[]): string[] => (Array.isArray(value) ? value : [value]).map(String);

/** The state of an entity, or the value of one of its attributes; undefined for an entity that is not there */
const valueOf = (hass: Hass, entity: string, attribute?: string): unknown => {
  const s = hass.states[entity];
  return s ? (attribute ? s.attributes[attribute] : s.state) : undefined;
};

export const checkCondition = (hass: Hass, c: Condition, ctx: Context = {}): boolean => {
  switch (c.condition) {
    case "and":
      return c.conditions.every((x) => checkCondition(hass, x, ctx));
    case "or":
      return c.conditions.some((x) => checkCondition(hass, x, ctx));
    case "not":
      return !c.conditions.some((x) => checkCondition(hass, x, ctx));
    case "state":
    case "not_state": {
      const value = valueOf(hass, c.entity, c.attribute);
      // An entity that is not there is in no state: `state` is false and `not_state` true
      const match = value !== undefined && list(c.state).includes(String(value));
      return c.condition === "state" ? match : !match;
    }
    case "numeric": {
      const raw = valueOf(hass, c.entity, c.attribute);
      const n = raw === undefined || raw === null || raw === "" ? NaN : Number(raw);
      return !Number.isNaN(n) && (c.above === undefined || n > c.above) && (c.below === undefined || n < c.below);
    }
    case "time": {
      const now = ctx.now ?? new Date();
      const minute = now.getHours() * 60 + now.getMinutes();
      const after = minutesOf(c.after);
      const before = minutesOf(c.before);
      if (after !== null && before !== null && after > before) return minute >= after || minute < before;
      return (after === null || minute >= after) && (before === null || minute < before);
    }
    case "device":
      // Where the device class is not known, nothing is held back
      return !ctx.device || c.devices.includes(ctx.device);
    case "template":
      // No result yet (or none can be had): the condition does not hold
      return templateTrue(ctx.templates?.(c.value_template));
    default:
      // A condition this version does not know (saved by a newer one) shows the item rather than hiding it
      return true;
  }
};

/** All of them hold (no conditions: always) */
export const checkAll = (hass: Hass, conditions: Condition[] | undefined, ctx?: Context): boolean => !conditions?.length || conditions.every((c) => checkCondition(hass, c, ctx));

/** The Jinja templates among them, also inside groups */
export const templatesIn = (conditions: Condition[] | undefined): string[] => (conditions ?? []).flatMap((c) => (c.condition === "template" ? [c.value_template] : "conditions" in c ? templatesIn(c.conditions) : []));

/** Does any of them look at the clock? Then the dashboard has to judge again every minute. */
export const usesTime = (conditions: Condition[] | undefined): boolean => !!conditions?.some((c) => c.condition === "time" || ("conditions" in c && usesTime(c.conditions)));
