// Jinja templates: which texts are templates, which the pages use, and the shared subscriptions that follow their results
import { describe, expect, it, vi } from "vitest";
import { TemplateWatcher, isTemplate, templateText, templatesOfPages } from "../src/template";
import type { Hass, Page } from "../src/types";

type Callback = (message: { result?: unknown; error?: string }) => void;

/** A Home Assistant connection that remembers who subscribed to what, and can send results */
const connection = () => {
  const subs: { template: string; send: Callback; stop: ReturnType<typeof vi.fn> }[] = [];
  const subscribeMessage = vi.fn(async (callback: Callback, message: { type: string; template: string }) => {
    const stop = vi.fn();
    subs.push({ template: message.template, send: callback, stop });
    return stop;
  });
  return { subs, hass: { connection: { subscribeMessage } } as unknown as Hass, subscribeMessage };
};
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("isTemplate and templateText", () => {
  it("knows a template by its braces", () => {
    expect(isTemplate("{{ 1 }}")).toBe(true);
    expect(isTemplate("{% if x %}a{% endif %}")).toBe(true);
    expect(isTemplate("Kitchen")).toBe(false);
    expect(isTemplate("{ not }")).toBe(false);
    expect(isTemplate(undefined)).toBe(false);
    expect(isTemplate(5)).toBe(false);
  });

  it("writes a result as text", () => {
    expect(templateText("21 °C")).toBe("21 °C");
    expect(templateText(21.5)).toBe("21.5");
    expect(templateText(true)).toBe("true");
    expect(templateText(0)).toBe("0");
    expect(templateText(undefined)).toBe("");
    expect(templateText(null)).toBe("");
    expect(templateText(["a", 1])).toBe('["a",1]');
  });
});

describe("templatesOfPages", () => {
  it("finds the templates of conditions, state rules, names and status texts, each once", () => {
    const pages: Page[] = [
      {
        id: "p",
        name: "P",
        items: [
          { id: "h", type: "heading", text: "x", show_if: [{ condition: "template", value_template: "{{ a }}" }] },
          {
            id: "t",
            type: "tile",
            entity: "light.x",
            name: "{{ n }}",
            show_if: [{ condition: "or", conditions: [{ condition: "not", conditions: [{ condition: "template", value_template: "{{ b }}" }] }] }],
            states: [{ when: [{ condition: "template", value_template: "{{ a }}" }], status: "{{ s }}" }, { when: [{ condition: "time", after: "08:00" }], status: "plain", color: "good" }],
          },
          { id: "t2", type: "tile", entity: "light.y", name: "Plain" },
        ],
      },
    ];
    expect(templatesOfPages(pages).sort()).toEqual(["{{ a }}", "{{ b }}", "{{ n }}", "{{ s }}"]);
    expect(templatesOfPages(undefined)).toEqual([]);
  });

  it("also finds the templates in the conditions of the Ruhemodus, once each", () => {
    const pages: Page[] = [{ id: "p", name: "P", items: [{ id: "h", type: "heading", text: "x", show_if: [{ condition: "template", value_template: "{{ a }}" }] }] }];
    const rest = { when: [{ condition: "not" as const, conditions: [{ condition: "template" as const, value_template: "{{ r }}" }, { condition: "template" as const, value_template: "{{ a }}" }] }] };
    expect(templatesOfPages(pages, rest).sort()).toEqual(["{{ a }}", "{{ r }}"]);
    expect(templatesOfPages(undefined, rest).sort()).toEqual(["{{ a }}", "{{ r }}"]);
    expect(templatesOfPages(pages, {}).sort()).toEqual(["{{ a }}"]);
  });
});

describe("TemplateWatcher", () => {
  it("subscribes to each template once, however often it is asked", async () => {
    const { hass, subs, subscribeMessage } = connection();
    const watcher = new TemplateWatcher(() => undefined);
    watcher.sync(hass, ["{{ a }}", "{{ b }}"]);
    watcher.sync(hass, ["{{ a }}", "{{ b }}", "{{ a }}"]);
    await settle();
    expect(subscribeMessage).toHaveBeenCalledTimes(2);
    expect(subs.map((s) => s.template)).toEqual(["{{ a }}", "{{ b }}"]);
  });

  it("keeps the latest result, says when one arrives, and has none for a template that fails", async () => {
    const { hass, subs } = connection();
    const changed = vi.fn();
    const watcher = new TemplateWatcher(changed);
    watcher.sync(hass, ["{{ a }}"]);
    await settle();
    expect(watcher.value("{{ a }}")).toBeUndefined();
    subs[0].send({ result: 21 });
    expect(watcher.value("{{ a }}")).toBe(21);
    expect(changed).toHaveBeenCalledTimes(1);
    subs[0].send({ result: 22 });
    expect(watcher.value("{{ a }}")).toBe(22);
    subs[0].send({ error: "ZeroDivisionError" });
    expect(watcher.value("{{ a }}")).toBeUndefined();
    expect(changed).toHaveBeenCalledTimes(3);
    expect(watcher.value("{{ unknown }}")).toBeUndefined();
  });

  it("lets go of a template that is no longer used, and of all of them on stop", async () => {
    const { hass, subs } = connection();
    const watcher = new TemplateWatcher(() => undefined);
    watcher.sync(hass, ["{{ a }}", "{{ b }}"]);
    await settle();
    watcher.sync(hass, ["{{ b }}"]);
    await settle();
    expect(subs[0].stop).toHaveBeenCalledTimes(1);
    expect(subs[1].stop).not.toHaveBeenCalled();
    watcher.stop();
    await settle();
    expect(subs[1].stop).toHaveBeenCalledTimes(1);
    expect(watcher.value("{{ b }}")).toBeUndefined();
  });

  it("ignores a result that arrives after the template was let go, and ends a subscription that was still being made", async () => {
    const { hass, subs } = connection();
    const changed = vi.fn();
    const watcher = new TemplateWatcher(changed);
    watcher.sync(hass, ["{{ a }}"]);
    watcher.sync(hass, []); // before the subscription is even there
    await settle();
    expect(subs[0].stop).toHaveBeenCalledTimes(1);
    subs[0].send({ result: 1 });
    expect(changed).not.toHaveBeenCalled();
  });

  it("copes with a connection that cannot subscribe, and with none", async () => {
    const failing = { connection: { subscribeMessage: vi.fn(async () => Promise.reject(new Error("no"))) } } as unknown as Hass;
    const a = new TemplateWatcher(() => undefined);
    a.sync(failing, ["{{ a }}"]);
    await settle();
    expect(a.value("{{ a }}")).toBeUndefined();
    const b = new TemplateWatcher(() => undefined);
    b.sync({} as Hass, ["{{ a }}"]);
    await settle();
    expect(b.value("{{ a }}")).toBeUndefined();
  });
});
