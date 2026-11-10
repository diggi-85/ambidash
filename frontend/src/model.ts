// Floors → areas → tiles, built from Home Assistant's registries.
import { entityName } from "./adapter";
import type { AmbidashConfig, Hass } from "./types";

/** Domains with tiles, in display order. */
export const DOMAINS = ["light", "switch", "climate", "cover", "media_player", "scene"] as const;
export type Domain = (typeof DOMAINS)[number];

export interface Item {
  id: string;
  name: string;
  domain: Domain;
}
export interface AreaGroup {
  id: string;
  name: string;
  items: Item[];
}
export interface FloorGroup {
  id: string;
  name: string;
  areas: AreaGroup[];
}
/** Scenes sit in a section of their own at the top, whatever area they belong to. */
export interface Model {
  scenes: Item[];
  floors: FloorGroup[];
}

/** The name of the area an entity belongs to (its own, or its device's). */
export const areaNameOf = (hass: Hass, entityId: string): string | undefined => {
  const entry = hass.entities[entityId];
  const areaId = entry?.area_id ?? (entry?.device_id ? hass.devices[entry.device_id]?.area_id : undefined);
  return areaId ? hass.areas[areaId]?.name : undefined;
};

/** Option lists as lower-case strings; anything that is not a list counts as empty. */
const list = (value: unknown): string[] => (Array.isArray(value) ? value.map((v) => String(v).toLowerCase()) : []);

const domainOf = (entityId: string): Domain | undefined => {
  const domain = entityId.slice(0, entityId.indexOf("."));
  return (DOMAINS as readonly string[]).includes(domain) ? (domain as Domain) : undefined;
};

/**
 * Hidden and configuration/diagnostic entities stay out, and so does whatever the options hide (`hide_*`).
 * Scenes go to their own section; hiding an area does not hide its scenes. Entities without an area land in
 * a last group named `unassigned`; areas without a floor sit in a last, nameless floor group.
 */
export const buildModel = (hass: Hass, unassigned: string, options: AmbidashConfig = {}): Model => {
  const hideDomains = list(options.hide_domains);
  const hideAreas = list(options.hide_areas);
  const hideEntities = list(options.hide_entities);
  const byName = (a: string, b: string) => a.localeCompare(b, hass.language);
  const areas = new Map<string, AreaGroup & { floor: string }>();
  const scenes: Item[] = [];

  for (const entry of Object.values(hass.entities)) {
    const domain = domainOf(entry.entity_id);
    const state = hass.states[entry.entity_id];
    if (!domain || !state || entry.hidden || entry.entity_category) continue;
    if (hideDomains.includes(domain) || hideEntities.includes(entry.entity_id)) continue;
    if (domain === "scene") {
      scenes.push({ id: entry.entity_id, name: entityName(hass, state), domain });
      continue;
    }
    const areaId = entry.area_id ?? (entry.device_id ? hass.devices[entry.device_id]?.area_id : undefined);
    const area = areaId ? hass.areas[areaId] : undefined;
    const hiddenArea = area ? hideAreas.includes(area.area_id.toLowerCase()) || hideAreas.includes(area.name.toLowerCase()) : options.hide_unassigned;
    if (hiddenArea) continue;
    const key = area ? area.area_id : "";
    let group = areas.get(key);
    if (!group) {
      const floor = area?.floor_id && hass.floors[area.floor_id] ? area.floor_id : "";
      group = { id: key, name: area?.name ?? unassigned, items: [], floor };
      areas.set(key, group);
    }
    group.items.push({ id: entry.entity_id, name: entityName(hass, state, area?.name), domain });
  }

  const floors = new Map<string, FloorGroup>();
  const sortedAreas = [...areas.values()].sort((a, b) => Number(!a.id) - Number(!b.id) || byName(a.name, b.name));
  for (const { floor, ...area } of sortedAreas) {
    area.items.sort((a, b) => DOMAINS.indexOf(a.domain) - DOMAINS.indexOf(b.domain) || byName(a.name, b.name));
    const group = floors.get(floor) ?? { id: floor, name: hass.floors[floor]?.name ?? "", areas: [] };
    group.areas.push(area);
    floors.set(floor, group);
  }

  const level = (f: FloorGroup) => hass.floors[f.id]?.level ?? Number.POSITIVE_INFINITY;
  return {
    scenes: scenes.sort((a, b) => byName(a.name, b.name)),
    floors: [...floors.values()].sort((a, b) => Number(!a.id) - Number(!b.id) || level(a) - level(b) || byName(a.name, b.name)),
  };
};

export interface Summary {
  lights: number;
  covers: number;
  playing: number;
}

/** What is on right now: the chips at the top. */
export const summarize = (hass: Hass, model: FloorGroup[]): Summary => {
  const sum: Summary = { lights: 0, covers: 0, playing: 0 };
  for (const floor of model)
    for (const area of floor.areas)
      for (const { id, domain } of area.items) {
        const state = hass.states[id]?.state;
        if (domain === "light" && state === "on") sum.lights++;
        else if (domain === "cover" && (state === "open" || state === "opening")) sum.covers++;
        else if (domain === "media_player" && state === "playing") sum.playing++;
      }
  return sum;
};
