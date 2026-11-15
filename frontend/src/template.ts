// Jinja templates in conditions, names and status texts: Home Assistant judges them (WebSocket ambidash/template/subscribe) and the
// dashboard follows the results. The same template in several places shares one subscription.
import { templatesIn } from "./conditions";
import type { Hass, Page, RestConfig } from "./types";

export const isTemplate = (s: unknown): s is string => typeof s === "string" && (s.includes("{{") || s.includes("{%"));

/** A result as text: nothing is empty text, lists and objects are JSON, the rest as it is written */
export const templateText = (value: unknown): string => (value === undefined || value === null ? "" : typeof value === "object" ? JSON.stringify(value) : String(value));

/** Every template a dashboard uses: in the conditions of items and state rules, in names and status texts, and in the conditions of the Ruhemodus */
export const templatesOfPages = (pages: Page[] | undefined, rest?: RestConfig): string[] => {
  const found = new Set<string>();
  templatesIn(rest?.when).forEach((s) => found.add(s));
  for (const item of pages?.flatMap((p) => p.items) ?? []) {
    templatesIn(item.show_if).forEach((s) => found.add(s));
    if (isTemplate(item.name)) found.add(item.name);
    for (const rule of item.states ?? []) {
      templatesIn(rule.when).forEach((s) => found.add(s));
      if (isTemplate(rule.status)) found.add(rule.status);
    }
  }
  return [...found];
};

interface Sub {
  /** The latest result; stays undefined while there is none, and when the template cannot be judged */
  value?: unknown;
  /** Ends the subscription once it is there */
  stop: Promise<(() => void) | undefined>;
}

export class TemplateWatcher {
  private subs = new Map<string, Sub>();

  /** `changed` is called whenever a result arrives */
  constructor(private changed: () => void) {}

  /** Follows exactly these templates: new ones are subscribed to, the ones that are no longer used are let go */
  sync(hass: Hass, sources: Iterable<string>): void {
    const wanted = new Set(sources);
    for (const source of [...this.subs.keys()]) if (!wanted.has(source)) this.drop(source);
    for (const source of wanted) if (!this.subs.has(source)) this.start(hass, source);
  }

  /** The latest result of a template, undefined while there is none */
  value(source: string): unknown {
    return this.subs.get(source)?.value;
  }

  stop(): void {
    for (const source of [...this.subs.keys()]) this.drop(source);
  }

  private start(hass: Hass, source: string): void {
    const sub: Sub = { stop: Promise.resolve(undefined) };
    this.subs.set(source, sub);
    sub.stop =
      hass.connection
        ?.subscribeMessage<{ result?: unknown; error?: string }>(
          (message) => {
            if (this.subs.get(source) !== sub) return;
            sub.value = message.error === undefined ? message.result : undefined;
            this.changed();
          },
          { type: "ambidash/template/subscribe", template: source },
        )
        .catch(() => undefined) ?? Promise.resolve(undefined);
  }

  private drop(source: string): void {
    const sub = this.subs.get(source);
    this.subs.delete(source);
    void sub?.stop.then((stop) => stop?.());
  }
}
