// "Create from areas": the starting layout made from the floors and areas
import { describe, expect, it } from "vitest";
import { generatePages } from "../src/generate";
import { resolveLayout } from "../src/layout";
import type { Model } from "../src/model";

const item = (id: string) => ({ id, name: id, domain: id.split(".")[0] as "light" });
const model = (over: Partial<Model> = {}): Model => ({
  scenes: [item("scene.movie")],
  floors: [
    { id: "g", name: "Ground floor", areas: [{ id: "k", name: "Kitchen", items: [item("light.a"), item("light.b")] }, { id: "l", name: "Living room", items: [item("cover.c")] }] },
    { id: "u", name: "Upstairs", areas: [{ id: "b", name: "Bedroom", items: [item("light.d")] }] },
  ],
  ...over,
});

describe("generatePages", () => {
  it("makes a page per floor, with the summary and the scenes on top of the first", () => {
    const pages = generatePages(model());
    expect(pages.map((p) => [p.id, p.name])).toEqual([["page-1", "Ground floor"], ["page-2", "Upstairs"]]);
    expect(pages[0].items.map((i) => [i.type, i.entity ?? i.text])).toEqual([
      ["summary", undefined],
      ["heading", "Scenes"],
      ["tile", "scene.movie"],
      ["heading", "Kitchen"],
      ["tile", "light.a"],
      ["tile", "light.b"],
      ["heading", "Living room"],
      ["tile", "cover.c"],
    ]);
    expect(pages[1].items.map((i) => [i.type, i.entity ?? i.text])).toEqual([["heading", "Bedroom"], ["tile", "light.d"]]);
  });

  it("gives every item an id of its own across the pages, and the pages valid ids", () => {
    const pages = generatePages(model());
    const ids = pages.flatMap((p) => p.items.map((i) => i.id));
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of [...ids, ...pages.map((p) => p.id)]) expect(id).toMatch(/^[a-z0-9][a-z0-9_-]{0,30}$/);
  });

  it("lays the result out without gaps on every device", () => {
    const [first] = generatePages(model());
    const rows = (device: "phone" | "tablet" | "wall") => resolveLayout(first, device).map((p) => [p.item.type, p.x, p.y, p.w, p.h]);
    expect(rows("tablet")[0]).toEqual(["summary", 0, 0, 8, 1]);
    expect(rows("phone")[0]).toEqual(["summary", 0, 0, 4, 1]);
    expect(rows("wall")[0]).toEqual(["summary", 0, 0, 12, 1]);
    // tiles of the same row sit side by side, and nothing overlaps
    const boxes = resolveLayout(first, "tablet");
    for (const a of boxes) for (const b of boxes) if (a !== b) expect(a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y).toBe(false);
  });

  it("names a floor without a name Home, and puts scenes on a page of their own when there are no floors", () => {
    expect(generatePages(model({ floors: [{ id: "", name: "", areas: [{ id: "k", name: "Kitchen", items: [item("light.a")] }] }] }))[0].name).toBe("Home");
    const onlyScenes = generatePages(model({ floors: [] }));
    expect(onlyScenes).toHaveLength(1);
    expect(onlyScenes[0].name).toBe("Home");
    expect(onlyScenes[0].items.map((i) => i.type)).toEqual(["summary", "heading", "tile"]);
  });

  it("makes nothing when there is nothing to show, and no scene row without scenes", () => {
    expect(generatePages(model({ scenes: [], floors: [] }))).toEqual([]);
    expect(generatePages(model({ scenes: [] }))[0].items.map((i) => i.type)).toEqual(["summary", "heading", "tile", "tile", "heading", "tile"]);
  });
});
