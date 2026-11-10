// @vitest-environment happy-dom
// @vitest-environment-options {"url": "http://localhost:8123/ambidash"}
// The Studio panel: overview, editing with undo, saving, the sidebar link
import { DESIGNS } from "@ambi/core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { setLang } from "../src/i18n";
import { slug, type AmbidashStudio } from "../src/studio/studio";
import type { AmbidashConfig, Hass, StoredConfig, StoredDashboard } from "../src/types";

const KITCHEN: StoredDashboard = { id: "kueche", name: "Küche", options: { design: "glass", mode: "dark" } };
const HALL: StoredDashboard = { id: "flur", name: "Flur", options: { design: "paper" } };
const stored = (...dashboards: StoredDashboard[]): StoredConfig => ({ version: 1, dashboards });

type Call = Record<string, unknown>;

/** A Home Assistant that holds `initial`, answers like the Studio's backend and remembers every call */
const setup = (initial: StoredConfig, handlers: Record<string, (msg: Call) => unknown> = {}) => {
  const calls: Call[] = [];
  const callWS = vi.fn(async (msg: Call) => {
    calls.push(msg);
    const custom = handlers[String(msg.type)];
    if (custom) return custom(msg);
    switch (msg.type) {
      case "ambidash/config/get":
        return { config: initial, has_previous: false };
      case "ambidash/config/save":
        return { config: msg.config, has_previous: true };
      case "lovelace/dashboards/list":
        return [{ url_path: "ambidash-kueche" }];
      default:
        return {};
    }
  });
  const hass = { states: {}, entities: {}, devices: {}, areas: {}, floors: {}, language: "en", callService: vi.fn(), callWS } as unknown as Hass;
  return { hass, calls, callWS };
};

const settle = async (el: AmbidashStudio) => {
  for (let i = 0; i < 5; i++) {
    await el.updateComplete;
    await Promise.resolve();
  }
};

const mount = async (hass: Hass): Promise<AmbidashStudio> => {
  const el = document.createElement("ambidash-studio") as AmbidashStudio;
  el.hass = hass;
  document.body.append(el);
  await settle(el);
  return el;
};

const $ = (el: AmbidashStudio, selector: string) => el.shadowRoot!.querySelector<HTMLElement>(selector);
const all = (el: AmbidashStudio, selector: string) => [...el.shadowRoot!.querySelectorAll<HTMLElement>(selector)];
const button = (el: AmbidashStudio, text: string) => all(el, "button").find((b) => b.textContent?.trim() === text) as HTMLButtonElement | undefined;
const click = async (el: AmbidashStudio, text: string) => {
  const b = button(el, text);
  if (!b) throw new Error(`no button “${text}” in: ${all(el, "button").map((x) => x.textContent?.trim()).join(" | ")}`);
  b.click();
  await settle(el);
};
const step = async (el: AmbidashStudio, name: string) => {
  ($(el, `nav [data-step=${name}]`) as HTMLElement).click();
  await settle(el);
};
const type = async (el: AmbidashStudio, selector: string, value: string) => {
  const input = $(el, selector) as HTMLInputElement;
  input.value = value;
  input.dispatchEvent(new Event("input", { bubbles: true }));
  await settle(el);
};
const pickDesign = async (el: AmbidashStudio, id: string) => {
  ($(el, `.dcard[data-design=${id}]`) as HTMLElement).click();
  await settle(el);
};
const choose = async (el: AmbidashStudio, selector: string, value: string) => {
  const select = $(el, selector) as HTMLSelectElement;
  select.value = value;
  select.dispatchEvent(new Event("change", { bubbles: true }));
  await settle(el);
};
const previewOptions = (el: AmbidashStudio): AmbidashConfig => ($(el, "ambidash-root") as unknown as { config: AmbidashConfig }).config;
const text = (el: AmbidashStudio) => el.shadowRoot!.textContent!.replace(/\s+/g, " ");

beforeEach(() => {
  vi.stubGlobal("confirm", vi.fn(() => true));
});

afterEach(() => {
  vi.unstubAllGlobals();
  document.body.innerHTML = "";
  setLang("en");
});

describe("slug", () => {
  it("makes a short id from letters and digits that is not taken yet", () => {
    expect(slug("Küche & Esszimmer", new Set())).toBe("kueche-esszimmer");
    expect(slug("Große Straße 12", new Set())).toBe("grosse-strasse-12");
    expect(slug("Café Crème", new Set())).toBe("cafe-creme");
    expect(slug("!!!", new Set())).toBe("dashboard");
    expect(slug("Flur", new Set(["flur", "flur-2"]))).toBe("flur-3");
    expect(slug("x".repeat(80), new Set()).length).toBe(30);
  });
});

describe("overview", () => {
  it("lists the saved dashboards with their design and offers the sidebar where it is missing", async () => {
    const { hass } = setup(stored(KITCHEN, HALL));
    const el = await mount(hass);
    expect(all(el, ".card .name").map((n) => n.textContent)).toEqual(["Küche", "Flur"]);
    expect(all(el, ".card .meta").map((n) => n.textContent)).toEqual(["Glass", "Paper"]);
    const kitchen = all(el, ".card")[0];
    const hall = all(el, ".card")[1];
    expect(kitchen.textContent).toContain("Open dashboard");
    expect(hall.textContent).toContain("Add to sidebar");
  });

  it("invites to create the first dashboard when there is none", async () => {
    const el = await mount(setup(stored()).hass);
    expect(text(el)).toContain("No dashboards yet");
  });

  it("says so when the saved dashboards cannot be loaded", async () => {
    const { hass } = setup(stored(), {
      "ambidash/config/get": () => {
        throw { code: "unknown_command", message: "Unknown command." };
      },
    });
    const el = await mount(hass);
    expect($(el, ".alert")?.textContent).toContain("Could not load the saved dashboards: Unknown command.");
  });

  it("speaks the language of the HA user", async () => {
    const { hass } = setup(stored(KITCHEN));
    (hass as { language: string }).language = "de";
    const el = await mount(hass);
    expect(text(el)).toContain("Deine Dashboards");
    expect(text(el)).toContain("Neues Dashboard");
  });

  it("puts a saved dashboard into the sidebar as a dashboard that follows the Studio", async () => {
    const { hass, calls } = setup(stored(KITCHEN, HALL));
    const el = await mount(hass);
    await click(el, "Add to sidebar");
    expect(calls).toContainEqual({ type: "lovelace/dashboards/create", url_path: "ambidash-flur", title: "Flur", icon: "mdi:view-dashboard", show_in_sidebar: true, require_admin: false, mode: "storage" });
    expect(calls).toContainEqual({ type: "lovelace/config/save", url_path: "ambidash-flur", config: { strategy: { type: "custom:ambidash", dashboard: "flur" } } });
    expect(all(el, ".card")[1].textContent).toContain("Open dashboard");
  });

  it("does not offer the sidebar for a dashboard that is not saved yet", async () => {
    const el = await mount(setup(stored()).hass);
    await click(el, "New dashboard");
    await type(el, "input", "Wohnzimmer");
    await click(el, "Create");
    $(el, 'button[aria-label="Back"]')!.click();
    await settle(el);
    expect((button(el, "Add to sidebar") as HTMLButtonElement).disabled).toBe(true);
  });

  it("deletes a dashboard after asking, and saves without it", async () => {
    const { hass, calls } = setup(stored(KITCHEN, HALL));
    const el = await mount(hass);
    await click(el, "Delete");
    expect(confirm).toHaveBeenCalledWith("Delete “Küche”? It is gone for good once you save.");
    expect(all(el, ".card .name").map((n) => n.textContent)).toEqual(["Flur"]);
    await click(el, "Save");
    expect(calls.filter((c) => c.type === "ambidash/config/save")[0].config).toEqual(stored(HALL));
  });
});

describe("editing", () => {
  it("creates a dashboard, opens it and saves it with the id made from its name", async () => {
    const { hass, calls } = setup(stored());
    const el = await mount(hass);
    expect(button(el, "Save")?.disabled).toBe(true);
    await click(el, "New dashboard");
    await type(el, "input", "Wohnzimmer");
    await click(el, "Create");
    expect($(el, ".bar .title")?.textContent).toBe("Wohnzimmer");
    expect(text(el)).toContain("Unsaved changes");
    await click(el, "Save");
    expect(calls.filter((c) => c.type === "ambidash/config/save")[0].config).toEqual(stored({ id: "wohnzimmer", name: "Wohnzimmer", options: { design: "home" } }));
    expect(text(el)).not.toContain("Unsaved changes");
    expect(button(el, "Save")?.disabled).toBe(true);
  });

  it("opens a new dashboard on its first step and walks through the four steps", async () => {
    const el = await mount(setup(stored()).hass);
    await click(el, "New dashboard");
    await type(el, "input", "Flur");
    await click(el, "Create");
    const current = () => $(el, 'nav [aria-current="step"]')?.getAttribute("data-step");
    expect(current()).toBe("name");
    expect(button(el, "Back")).toBeUndefined();
    for (const next of ["contents", "look", "technical"]) {
      await click(el, "Next");
      expect(current()).toBe(next);
    }
    expect(button(el, "Next")).toBeUndefined();
    await click(el, "Back");
    expect(current()).toBe("look");
    await step(el, "name");
    expect(current()).toBe("name");
  });

  it("says where it runs: inside Home Assistant, or filling a wall tablet's screen", async () => {
    const el = await mount(setup(stored(KITCHEN)).hass);
    await click(el, "Edit");
    await step(el, "name");
    await click(el, "Wall tablet or kiosk");
    expect(previewOptions(el).fullscreen).toBe(true);
    expect(text(el)).toContain("Fills the whole screen");
    await click(el, "Phone or computer");
    expect(previewOptions(el).fullscreen).toBeUndefined();
  });

  it("chooses areas and kinds of devices to show", async () => {
    const hass = setup(stored(KITCHEN)).hass;
    const light = { entity_id: "light.lamp", state: "on", attributes: { friendly_name: "Lamp" }, last_changed: "" };
    const cover = { entity_id: "cover.blind", state: "open", attributes: { friendly_name: "Blind" }, last_changed: "" };
    Object.assign(hass, {
      states: { "light.lamp": light, "cover.blind": cover },
      entities: { "light.lamp": { entity_id: "light.lamp", area_id: "living" }, "cover.blind": { entity_id: "cover.blind", area_id: "kitchen" } },
      areas: { living: { area_id: "living", name: "Living room", floor_id: "ground" }, kitchen: { area_id: "kitchen", name: "Kitchen", floor_id: "ground" } },
      floors: { ground: { floor_id: "ground", name: "Ground floor", level: 0 } },
    });
    const el = await mount(hass);
    await click(el, "Edit");
    await step(el, "contents");
    const boxes = () => all(el, "main .check").map((l) => [l.textContent?.replace(/\s+/g, " ").trim(), (l.querySelector("input") as HTMLInputElement).checked]);
    expect(boxes().slice(0, 2)).toEqual([["Kitchen 1", true], ["Living room 1", true]]);
    const toggle = async (label: string) => {
      const input = all(el, "main .check").find((l) => l.textContent?.includes(label))!.querySelector("input")!;
      input.checked = !input.checked;
      input.dispatchEvent(new Event("change", { bubbles: true }));
      await settle(el);
    };
    await toggle("Kitchen");
    expect(previewOptions(el).hide_areas).toEqual(["kitchen"]);
    await toggle("Kitchen");
    expect(previewOptions(el).hide_areas).toBeUndefined();
    await toggle("Covers");
    expect(previewOptions(el).hide_domains).toEqual(["cover"]);
    await toggle("Covers");
    expect(previewOptions(el).hide_domains).toBeUndefined();
  });

  it("sets the title and the language", async () => {
    const el = await mount(setup(stored(KITCHEN)).hass);
    await click(el, "Edit");
    await step(el, "technical");
    await type(el, "#tt", "Küche");
    expect(previewOptions(el).title).toBe("Küche");
    await choose(el, "#lg", "nl");
    expect(previewOptions(el).language).toBe("nl");
    await choose(el, "#lg", "");
    expect(previewOptions(el).language).toBeUndefined();
  });

  it("offers advanced mode: options as text that can be applied, and as YAML; it is remembered", async () => {
    const memory = new Map<string, string>();
    vi.stubGlobal("localStorage", { getItem: (k: string) => memory.get(k) ?? null, setItem: (k: string, v: string) => void memory.set(k, v), removeItem: (k: string) => void memory.delete(k) });
    const el = await mount(setup(stored(KITCHEN)).hass);
    await click(el, "Edit");
    expect($(el, "nav [data-step=advanced]")).toBeNull();
    const switchOn = async () => {
      const box = $(el, "nav .check input") as HTMLInputElement;
      box.checked = !box.checked;
      box.dispatchEvent(new Event("change", { bubbles: true }));
      await settle(el);
    };
    await switchOn();
    expect(localStorage.getItem("ambidash.advanced")).toBe("1");
    await step(el, "advanced");
    expect(($(el, "#adv") as HTMLTextAreaElement).value).toBe(JSON.stringify(KITCHEN.options, null, 2));
    expect($(el, "pre")?.textContent).toBe(['strategy:', '  type: "custom:ambidash"', '  design: "glass"', '  mode: "dark"'].join("\n"));
    expect(button(el, "Apply")?.disabled).toBe(true);

    await type(el, "#adv", "{ nope");
    expect(text(el)).toContain("Not valid JSON");
    expect(button(el, "Apply")?.disabled).toBe(true);
    await type(el, "#adv", "[1]");
    expect(text(el)).toContain("The options have to be an object.");

    await type(el, "#adv", '{"design":"paper","hide_domains":["scene"]}');
    await click(el, "Apply");
    expect(previewOptions(el)).toEqual({ design: "paper", hide_domains: ["scene"] });
    expect(($(el, "#adv") as HTMLTextAreaElement).value).toBe(JSON.stringify({ design: "paper", hide_domains: ["scene"] }, null, 2));

    await switchOn(); // off again: the step is gone and the editor moves to the look page
    expect(localStorage.getItem("ambidash.advanced")).toBe("0");
    expect($(el, "nav [data-step=advanced]")).toBeNull();
    expect($(el, 'nav [aria-current="step"]')?.getAttribute("data-step")).toBe("look");
  });

  it("shows every design as a card in its own colours, marks the chosen one and follows light or dark", async () => {
    const el = await mount(setup(stored(KITCHEN)).hass);
    await click(el, "Edit");
    const cards = all(el, ".dcard");
    expect(cards).toHaveLength(DESIGNS.length + 1); // the seasons design comes on top
    expect($(el, ".gallery")?.getAttribute("role")).toBe("radiogroup");
    expect(cards.filter((c) => c.getAttribute("aria-checked") === "true").map((c) => c.dataset.design)).toEqual(["glass"]);
    expect($(el, ".dcard[data-design=calm]")?.getAttribute("style")).toContain("--ambi-bg: #0a0d0b;"); // KITCHEN is dark
    await click(el, "Light");
    expect($(el, ".dcard[data-design=calm]")?.getAttribute("style")).toContain("--ambi-bg: #f2ede3;");
    await pickDesign(el, "xmas");
    expect(previewOptions(el).design).toBe("xmas");
    expect(all(el, ".dcard").filter((c) => c.getAttribute("aria-checked") === "true").map((c) => c.dataset.design)).toEqual(["xmas"]);
    expect(all(el, ".dname").map((n) => n.textContent)).toContain("Newspaper");
  });

  it("sets and resets the accent colour", async () => {
    const el = await mount(setup(stored(KITCHEN)).hass);
    await click(el, "Edit");
    await type(el, "#ac", "#336699");
    expect(previewOptions(el).accent).toBe("#336699");
    await click(el, "Reset");
    expect(previewOptions(el).accent).toBeUndefined();
  });

  it("chooses a background: none, colour, gradient, picture, photos", async () => {
    const el = await mount(setup(stored(KITCHEN)).hass);
    await click(el, "Edit");
    expect($(el, "#bc")).toBeNull();

    await click(el, "Colour");
    expect(previewOptions(el).background).toEqual({ color: "#1e2a3a" });
    await type(el, "#bc", "#112233");
    expect(previewOptions(el).background).toEqual({ color: "#112233" });

    await click(el, "Gradient");
    expect(previewOptions(el).background).toEqual({ gradient: ["#1e3a5f", "#0e0f12"], angle: 160 });
    await type(el, "#g2", "#000000");
    await type(el, "#ga", "90");
    expect(previewOptions(el).background).toEqual({ gradient: ["#1e3a5f", "#000000"], angle: 90 });

    // a picture without an address has no data yet, but its fields are there
    await click(el, "Picture");
    expect(previewOptions(el).background).toBeUndefined();
    expect($(el, "#bi")).not.toBeNull();
    await choose(el, "#bi", "/local/wall.jpg");
    await choose(el, "#bs", "strong");
    await type(el, "#bb", "12");
    expect(previewOptions(el).background).toEqual({ image: "/local/wall.jpg", shade: "strong", blur: 12 });

    await click(el, "None");
    expect(previewOptions(el).background).toBeUndefined();
    expect($(el, "#bi")).toBeNull();
  });

  it("sets up photos: a folder, free photos with their credit, the interval", async () => {
    const el = await mount(setup(stored(KITCHEN)).hass);
    await click(el, "Edit");
    await click(el, "Photos");
    expect(previewOptions(el).background).toEqual({ placeholder: "wikimedia" });
    expect(text(el)).not.toContain("Mix with the folder");
    await choose(el, "#bf", "media-source://media_source/local/wallpaper");
    expect(text(el)).toContain("Mix with the folder");
    await choose(el, "#bm", "30");
    const credit = all(el, "main .check input")[1] as HTMLInputElement;
    credit.checked = false;
    credit.dispatchEvent(new Event("change", { bubbles: true }));
    await settle(el);
    expect(previewOptions(el).background).toEqual({ placeholder: "wikimedia", folder: "media-source://media_source/local/wallpaper", interval: 30, credit: false });
    await choose(el, "#bp", "");
    expect(previewOptions(el).background).toEqual({ folder: "media-source://media_source/local/wallpaper", interval: 30, credit: false });
  });

  it("shows every change in the preview at once, with undo, redo and discard", async () => {
    const el = await mount(setup(stored(KITCHEN)).hass);
    await click(el, "Edit");
    expect(previewOptions(el)).toEqual({ design: "glass", mode: "dark" });

    await pickDesign(el, "paper");
    expect(previewOptions(el).design).toBe("paper");
    expect(text(el)).toContain("Unsaved changes");

    await click(el, "Light");
    expect(previewOptions(el).mode).toBe("light");
    await choose(el, "#p", "nordic");
    expect(previewOptions(el).palette).toBe("nordic");

    el.shadowRoot!.querySelector<HTMLButtonElement>('button[aria-label="Undo"]')!.click();
    await settle(el);
    expect(previewOptions(el).palette).toBeUndefined();
    el.shadowRoot!.querySelector<HTMLButtonElement>('button[aria-label="Redo"]')!.click();
    await settle(el);
    expect(previewOptions(el).palette).toBe("nordic");

    await click(el, "Discard");
    expect(previewOptions(el)).toEqual({ design: "glass", mode: "dark" });
    expect(text(el)).not.toContain("Unsaved changes");
  });

  it("removes an option instead of saving an empty value, and a typed name is one undo step", async () => {
    const { hass, calls } = setup(stored(KITCHEN));
    const el = await mount(hass);
    await click(el, "Edit");
    await click(el, "Like Home Assistant");
    expect(previewOptions(el)).toEqual({ design: "glass" });
    await step(el, "name");
    await type(el, "#n", "K");
    await type(el, "#n", "Kü");
    await type(el, "#n", "Küche 2");
    el.shadowRoot!.querySelector<HTMLButtonElement>('button[aria-label="Undo"]')!.click();
    await settle(el);
    expect(($(el, "#n") as HTMLInputElement).value).toBe("Küche");
    await click(el, "Save");
    expect(calls.filter((c) => c.type === "ambidash/config/save")[0].config).toEqual(stored({ id: "kueche", name: "Küche", options: { design: "glass" } }));
  });

  it("shows why a save was refused and keeps the changes", async () => {
    const { hass } = setup(stored(KITCHEN), {
      "ambidash/config/save": () => {
        throw { code: "invalid_config", message: "dashboards → 0 → options → accent: does not match" };
      },
    });
    const el = await mount(hass);
    await click(el, "Edit");
    await pickDesign(el, "paper");
    await click(el, "Save");
    expect($(el, ".alert")?.textContent).toContain("Could not save: dashboards → 0 → options → accent: does not match");
    expect(text(el)).toContain("Unsaved changes");
  });

  it("saves with Ctrl+S, goes back to the version before the last save and leaves undo to the field when typing", async () => {
    const { hass, calls } = setup(stored(KITCHEN), { "ambidash/config/get": () => ({ config: stored(KITCHEN), has_previous: true }), "ambidash/config/restore_previous": () => ({ config: stored(HALL), has_previous: false }) });
    const el = await mount(hass);
    await click(el, "Edit");
    await pickDesign(el, "paper");
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "s", ctrlKey: true, cancelable: true }));
    await settle(el);
    expect(calls.some((c) => c.type === "ambidash/config/save")).toBe(true);
    await click(el, "Last version");
    expect(calls.some((c) => c.type === "ambidash/config/restore_previous")).toBe(true);
    expect(all(el, ".card .name").map((n) => n.textContent)).toEqual(["Flur"]);
  });

  it("creates a layout from the areas, shows it in the preview, saves it and goes back to automatic", async () => {
    const { hass, calls } = setup(stored(KITCHEN));
    Object.assign(hass, {
      floors: { g: { floor_id: "g", name: "Ground floor", level: 0 } },
      areas: { k: { area_id: "k", name: "Kitchen", floor_id: "g" } },
      entities: { "light.lamp": { entity_id: "light.lamp", area_id: "k" }, "scene.movie": { entity_id: "scene.movie" } },
      states: { "light.lamp": { entity_id: "light.lamp", state: "on", attributes: {}, last_changed: "" }, "scene.movie": { entity_id: "scene.movie", state: "unknown", attributes: {}, last_changed: "" } },
    });
    const el = await mount(hass);
    await click(el, "Edit");
    await step(el, "contents");
    expect(text(el)).toContain("Automatic: all devices, area by area.");
    expect(button(el, "Back to automatic")).toBeUndefined();

    await click(el, "Create from areas");
    const pages = previewOptions(el).pages!;
    expect(pages).toHaveLength(1);
    expect(pages[0].name).toBe("Ground floor");
    expect(pages[0].items.map((i) => i.type)).toEqual(["summary", "heading", "tile", "heading", "tile"]);
    expect(text(el)).toContain("Own layout: pages on a grid");
    expect(($(el, "ambidash-root") as HTMLElement).shadowRoot!.querySelector(".canvas")).not.toBeNull();

    await click(el, "Save");
    expect((calls.filter((c) => c.type === "ambidash/config/save")[0].config as StoredConfig).dashboards[0].options.pages).toEqual(pages);

    await click(el, "Create from areas");
    expect(confirm).toHaveBeenCalledWith("Replace your layout with a new one made from your areas?");

    await click(el, "Back to automatic");
    expect(previewOptions(el).pages).toBeUndefined();
    expect(text(el)).toContain("Automatic: all devices, area by area.");
  });

  it("opens the layout editor, takes its changes into the working copy and lets undo take them back", async () => {
    const { hass, calls } = setup(stored({ ...KITCHEN, options: { design: "home", pages: [{ id: "p1", name: "Home", items: [{ id: "h1", type: "heading", text: "Kitchen" }], layouts: {} }] } }));
    const el = await mount(hass);
    await click(el, "Edit");
    await step(el, "contents");
    expect(text(el)).toContain("Own layout: pages on a grid");
    await click(el, "Edit layout");
    const editor = $(el, "ambidash-layout-editor") as HTMLElement;
    expect(editor).not.toBeNull();
    expect(editor.shadowRoot!.querySelectorAll(".item")).toHaveLength(1);

    [...editor.shadowRoot!.querySelectorAll<HTMLButtonElement>("button")].find((b) => b.textContent?.trim() === "Heading")!.click();
    await settle(el);
    expect(editor.shadowRoot!.querySelectorAll(".item")).toHaveLength(2);
    expect(text(el)).toContain("Unsaved changes");

    el.shadowRoot!.querySelector<HTMLButtonElement>('button[aria-label="Undo"]')!.click();
    await settle(el);
    expect(editor.shadowRoot!.querySelectorAll(".item")).toHaveLength(1);
    el.shadowRoot!.querySelector<HTMLButtonElement>('button[aria-label="Redo"]')!.click();
    await settle(el);

    el.shadowRoot!.querySelector<HTMLButtonElement>('button[aria-label="Back"]')!.click();
    await settle(el);
    expect($(el, "ambidash-layout-editor")).toBeNull();
    expect(previewOptions(el).pages?.[0].items).toHaveLength(2);
    await click(el, "Save");
    expect(((calls.filter((c) => c.type === "ambidash/config/save")[0].config as StoredConfig).dashboards[0].options.pages ?? [])[0].items).toHaveLength(2);
  });

  it("says so when there is nothing to put on a page", async () => {
    const el = await mount(setup(stored(KITCHEN)).hass);
    await click(el, "Edit");
    await step(el, "contents");
    await click(el, "Create from areas");
    expect($(el, ".alert")?.textContent).toContain("Nothing to put on a page yet");
    expect(previewOptions(el).pages).toBeUndefined();
  });

  it("warns before the page is left with unsaved changes", async () => {
    const el = await mount(setup(stored(KITCHEN)).hass);
    const clean = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(clean);
    expect(clean.defaultPrevented).toBe(false);
    await click(el, "Edit");
    await pickDesign(el, "paper");
    const dirty = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(dirty);
    expect(dirty.defaultPrevented).toBe(true);
  });
});
