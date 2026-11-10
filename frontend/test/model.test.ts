// Model, tile logic and the HA adapter: pure functions, no DOM
import { describe, expect, it } from "vitest";
import { entityName, stripArea } from "../src/adapter";
import { tileView } from "../src/describe";
import { buildModel, summarize } from "../src/model";
import type { AmbidashConfig, Hass, HassEntity } from "../src/types";

const ent = (entity_id: string, state: string, attributes: Record<string, unknown> = {}): HassEntity => ({
  entity_id,
  state,
  attributes,
  last_changed: "2026-11-07T10:00:00Z",
});

const hassWith = (over: Partial<Hass> = {}): Hass => ({
  states: {},
  entities: {},
  devices: {},
  areas: {},
  floors: {},
  language: "en",
  callService: async () => undefined,
  ...over,
});

/** Ground floor (Living room, Kitchen), Upstairs (Hall), a loose scene, plus entities that must stay out */
const home = (): Hass => {
  const list = [
    ent("light.lamp", "on", { friendly_name: "Living room Lamp", brightness: 128 }),
    ent("switch.plug", "off", { friendly_name: "Plug" }),
    ent("cover.blind", "open", { friendly_name: "Kitchen Blind" }),
    ent("light.hall", "off", { friendly_name: "Hall light" }),
    ent("scene.movie", "unknown", { friendly_name: "Movie" }),
    ent("light.loose", "off", { friendly_name: "Loose Lamp" }),
    ent("sensor.temp", "20"),
    ent("light.hidden", "on"),
    ent("light.diag", "on"),
  ];
  return hassWith({
    states: Object.fromEntries(list.map((s) => [s.entity_id, s])),
    floors: { up: { floor_id: "up", name: "Upstairs", level: 1 }, ground: { floor_id: "ground", name: "Ground floor", level: 0 } },
    areas: {
      living: { area_id: "living", name: "Living room", floor_id: "ground" },
      kitchen: { area_id: "kitchen", name: "Kitchen", floor_id: "ground" },
      hall: { area_id: "hall", name: "Hall", floor_id: "up" },
      shed: { area_id: "shed", name: "Shed" },
    },
    devices: { d1: { area_id: "kitchen" } },
    entities: {
      "light.lamp": { entity_id: "light.lamp", area_id: "living" },
      "switch.plug": { entity_id: "switch.plug", area_id: "living" },
      "cover.blind": { entity_id: "cover.blind", device_id: "d1" },
      "light.hall": { entity_id: "light.hall", area_id: "hall" },
      "scene.movie": { entity_id: "scene.movie" },
      "light.loose": { entity_id: "light.loose" },
      "sensor.temp": { entity_id: "sensor.temp", area_id: "living" },
      "light.hidden": { entity_id: "light.hidden", area_id: "living", hidden: true },
      "light.diag": { entity_id: "light.diag", area_id: "living", entity_category: "diagnostic" },
      "light.nostate": { entity_id: "light.nostate", area_id: "living" },
    },
  });
};

/** Every entity id in the model, scenes included, sorted */
const allIds = (model: ReturnType<typeof buildModel>): string[] =>
  [...model.scenes, ...model.floors.flatMap((f) => f.areas.flatMap((a) => a.items))].map((i) => i.id).sort();

describe("buildModel", () => {
  it("orders floors by level, areas by name, tiles by domain, and puts the unassigned last", () => {
    const { floors } = buildModel(home(), "Unassigned");
    expect(floors.map((f) => f.name)).toEqual(["Ground floor", "Upstairs", ""]);
    expect(floors[0].areas.map((a) => a.name)).toEqual(["Kitchen", "Living room"]);
    expect(floors[0].areas[1].items.map((i) => i.id)).toEqual(["light.lamp", "switch.plug"]);
    expect(floors[2].areas.map((a) => [a.name, a.items.map((i) => i.id)])).toEqual([["Unassigned", ["light.loose"]]]);
  });

  it("puts scenes in a section of their own, whatever area they belong to", () => {
    const hass = home();
    hass.entities["scene.movie"].area_id = "living";
    expect(buildModel(hass, "Unassigned").scenes).toEqual([{ id: "scene.movie", name: "Movie", domain: "scene" }]);
    expect(buildModel(hass, "Unassigned").floors[0].areas[1].items.map((i) => i.id)).toEqual(["light.lamp", "switch.plug"]);
  });

  it("leaves out hidden, diagnostic, stateless and unsupported entities, and empty areas", () => {
    expect(allIds(buildModel(home(), "Unassigned"))).toEqual(["cover.blind", "light.hall", "light.lamp", "light.loose", "scene.movie", "switch.plug"]);
  });

  it("takes the area from the device and names tiles without the area", () => {
    const kitchen = buildModel(home(), "Unassigned").floors[0].areas[0];
    expect(kitchen.items).toEqual([{ id: "cover.blind", name: "Blind", domain: "cover" }]);
  });

  it("sorts floors without a level after those with one", () => {
    const hass = home();
    hass.floors.up.level = null;
    expect(buildModel(hass, "Unassigned").floors.map((f) => f.name)).toEqual(["Ground floor", "Upstairs", ""]);
  });

  it("hides domains, areas (by id or name), single entities and the unassigned, but never scenes by area", () => {
    const ids = (options: AmbidashConfig) => allIds(buildModel(home(), "Unassigned", options));
    expect(ids({ hide_domains: ["Light"] })).toEqual(["cover.blind", "scene.movie", "switch.plug"]);
    expect(ids({ hide_areas: ["living", "Kitchen"] })).toEqual(["light.hall", "light.loose", "scene.movie"]);
    expect(ids({ hide_entities: ["switch.plug", "scene.movie"] })).toEqual(["cover.blind", "light.hall", "light.lamp", "light.loose"]);
    expect(ids({ hide_unassigned: true })).toEqual(["cover.blind", "light.hall", "light.lamp", "scene.movie", "switch.plug"]);
    expect(ids({ hide_domains: ["scene"] })).not.toContain("scene.movie");
  });

  it("ignores options that are not lists", () => {
    const wrong = { hide_domains: "light", hide_areas: 5, hide_entities: {} } as unknown as AmbidashConfig;
    expect(allIds(buildModel(home(), "Unassigned", wrong))).toEqual(allIds(buildModel(home(), "Unassigned")));
  });
});

describe("summarize", () => {
  it("counts lights on, covers open and players playing", () => {
    const hass = home();
    hass.states["media_player.tv"] = ent("media_player.tv", "playing");
    hass.entities["media_player.tv"] = { entity_id: "media_player.tv", area_id: "living" };
    expect(summarize(hass, buildModel(hass, "Unassigned").floors)).toEqual({ lights: 1, covers: 1, playing: 1 });
  });
});

describe("tileView", () => {
  it("shows light brightness in percent and switches with light.toggle", () => {
    const v = tileView(ent("light.a", "on", { brightness: 128 }));
    expect(v).toMatchObject({ on: true, status: "On · 50%", action: "toggle", service: ["light", "toggle"] });
    expect(tileView(ent("light.a", "off")).status).toBe("Off");
  });

  it("marks unavailable entities and opens their details", () => {
    expect(tileView(ent("light.a", "unavailable"))).toMatchObject({ unavailable: true, on: false, action: "info", status: "Unavailable" });
  });

  it("colours climate by what it does and shows current and target temperature", () => {
    const v = tileView(ent("climate.a", "heat", { hvac_action: "heating", current_temperature: 20.5, temperature: 22 }));
    expect(v).toMatchObject({ on: true, status: "20.5° · target 22°", color: "var(--ambi-c-heat)", action: "info" });
    expect(tileView(ent("climate.a", "off")).on).toBe(false);
  });

  it("toggles covers but sends gates and garage doors to the detail dialog", () => {
    expect(tileView(ent("cover.a", "open", { current_position: 40 }))).toMatchObject({ status: "Open · 40%", action: "toggle", service: ["cover", "toggle"] });
    const garage = tileView(ent("cover.g", "closed", { device_class: "garage" }));
    expect(garage).toMatchObject({ status: "Closed", action: "info" });
    expect(garage.service).toBeUndefined();
  });

  it("plays and pauses media, shows the title, and opens details when nothing plays", () => {
    expect(tileView(ent("media_player.a", "playing", { media_title: "Song" }))).toMatchObject({ on: true, status: "Song", action: "playpause", service: ["media_player", "media_play_pause"] });
    expect(tileView(ent("media_player.a", "off"))).toMatchObject({ on: false, status: "Off", action: "info" });
  });

  it("activates scenes", () => {
    expect(tileView(ent("scene.a", "unknown"))).toMatchObject({ on: false, action: "activate", service: ["scene", "turn_on"] });
  });
});

describe("adapter", () => {
  it("strips the area prefix but keeps names that would end up empty", () => {
    expect(stripArea("Living room Lamp", "Living room")).toBe("Lamp");
    expect(stripArea("living room lamp", "Living room")).toBe("Lamp");
    expect(stripArea("Living room", "Living room")).toBe("Living room");
    expect(stripArea("Lamp", undefined)).toBe("Lamp");
  });

  it("prefers HA's own name, survives an HA change, and falls back to the entity id", () => {
    const s = ent("light.a", "on", { friendly_name: "Friendly" });
    expect(entityName(hassWith({ formatEntityName: () => "Device Name" }), s)).toBe("Device Name");
    expect(entityName(hassWith({ formatEntityName: () => { throw new Error("changed"); } }), s)).toBe("Friendly");
    expect(entityName(hassWith(), ent("light.b", "on"))).toBe("light.b");
  });
});
