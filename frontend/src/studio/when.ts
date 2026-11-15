// "When is this shown?" as plain sentences: every choice is an ordinary condition list (`show_if`), so what the Studio writes is what the YAML says.
import { t } from "../i18n";
import type { Condition } from "../types";
import { parseYaml } from "./yaml";

/** The conditions typed as YAML: the list (no text: none), or what is wrong with the text */
export const readConditions = (text: string): Condition[] | string => {
  if (!text.trim()) return [];
  let value: unknown;
  try {
    value = parseYaml(text);
  } catch (err) {
    return t("Not valid YAML: {error}", { error: (err as Error).message });
  }
  if (!Array.isArray(value) || !value.every((c) => typeof c === "object" && c !== null && typeof (c as { condition?: unknown }).condition === "string")) {
    return t("The conditions are a list, and each has a condition type, for example - condition: state.");
  }
  return value as Condition[];
};

/** The ready-made sentences; `always` is no condition at all */
export const WHEN: { id: string; show_if: Condition[] }[] = [
  { id: "always", show_if: [] },
  { id: "morning", show_if: [{ condition: "time", after: "05:00", before: "11:00" }] },
  { id: "day", show_if: [{ condition: "time", after: "08:00", before: "18:00" }] },
  { id: "evening", show_if: [{ condition: "time", after: "17:00", before: "23:00" }] },
  { id: "night", show_if: [{ condition: "time", after: "22:00", before: "05:00" }] },
  { id: "phone", show_if: [{ condition: "device", devices: ["phone"] }] },
  { id: "tablet", show_if: [{ condition: "device", devices: ["tablet"] }] },
  { id: "wall", show_if: [{ condition: "device", devices: ["wall"] }] },
];

/** The sentences for when the Ruhemodus may start: the times of day, and "not while a media player plays" (a template, so it follows every player there is) */
export const REST_WHEN: { id: string; show_if: Condition[] }[] = [
  ...WHEN.filter((w) => ["always", "morning", "day", "evening", "night"].includes(w.id)),
  { id: "quiet", show_if: [{ condition: "template", value_template: "{{ states.media_player | selectattr('state', 'eq', 'playing') | list | count == 0 }}" }] },
];

/** Which sentence the conditions of the Ruhemodus say: one of `REST_WHEN`, or `custom` (anything else, shown in the YAML) */
export const restWhenOf = (when?: Condition[]): string => (!when?.length ? "always" : (REST_WHEN.find((w) => JSON.stringify(w.show_if) === JSON.stringify(when))?.id ?? "custom"));

/** A single "device is (not) in this state" rule, which the simple form can show; anything else is not one */
export const stateRule = (show_if?: Condition[]): { entity: string; state: string; not: boolean } | undefined => {
  const c = show_if?.[0];
  if (show_if?.length !== 1 || !c || (c.condition !== "state" && c.condition !== "not_state") || typeof c.state !== "string" || c.attribute !== undefined) return undefined;
  return { entity: c.entity, state: c.state, not: c.condition === "not_state" };
};

export const stateIf = (entity: string, state: string, not: boolean): Condition[] => [{ condition: not ? "not_state" : "state", entity, state }];

/** Which sentence a condition list says: one of `WHEN`, `state` (a device in a state) or `custom` (anything else, shown in the YAML) */
export const whenOf = (show_if?: Condition[]): string => {
  if (!show_if?.length) return "always";
  const preset = WHEN.find((w) => JSON.stringify(w.show_if) === JSON.stringify(show_if));
  if (preset) return preset.id;
  return stateRule(show_if) ? "state" : "custom";
};
