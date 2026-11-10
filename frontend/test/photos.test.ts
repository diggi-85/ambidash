// Which pictures a slideshow shows and in which order: folder, placeholder source, mix, failures
import { describe, expect, it, vi } from "vitest";
import { PhotoProvider, intervalMs, shuffle, slideshowOn } from "../src/photos";
import type { Background, Hass } from "../src/types";

const FOLDER = "media-source://media_source/local/wallpaper";
const child = (name: string) => ({ media_content_id: `${FOLDER}/${name}`, media_class: name.endsWith(".txt") ? "document" : "image", title: name });

const hassWith = (answers: Record<string, unknown>, language = "de"): { hass: Hass; callWS: ReturnType<typeof vi.fn> } => {
  const callWS = vi.fn(async (msg: Record<string, unknown>) => {
    const answer = answers[String(msg.type)];
    if (answer instanceof Error) throw answer;
    if (typeof answer === "function") return answer(msg);
    return answer;
  });
  return { hass: { states: {}, entities: {}, devices: {}, areas: {}, floors: {}, language, callService: vi.fn(), callWS } as unknown as Hass, callWS };
};

const browse = { children: [child("a.jpg"), child("b.png"), child("notes.txt")] };
const resolve = (msg: Record<string, unknown>) => ({ url: `/signed/${String(msg.media_content_id).split("/").pop()}` });
const placeholder = [{ url: "/ambidash_photos/p1", credit: "Nebula · NASA" }, { url: "/ambidash_photos/p2", credit: "Galaxy · NASA" }];

const provider = (hass: Hass, bg: Background) => new PhotoProvider(() => hass, () => bg, () => 0.5);
const take = async (p: PhotoProvider, n: number) => {
  const urls: (string | undefined)[] = [];
  for (let i = 0; i < n; i++) urls.push((await p.next())?.url);
  return urls;
};

describe("slideshow options", () => {
  it("is on with a folder or a known placeholder source, and off otherwise", () => {
    expect(slideshowOn({ folder: FOLDER })).toBe(true);
    expect(slideshowOn({ placeholder: "nasa" })).toBe(true);
    expect(slideshowOn({ placeholder: "flickr" })).toBe(false);
    expect(slideshowOn({ image: "/local/a.jpg" })).toBe(false);
    expect(slideshowOn(undefined)).toBe(false);
  });

  it("changes the picture every ten minutes by default, within one minute and one day", () => {
    expect(intervalMs({})).toBe(10 * 60e3);
    expect(intervalMs({ interval: 5 })).toBe(5 * 60e3);
    expect(intervalMs({ interval: 0.2 })).toBe(60e3);
    expect(intervalMs({ interval: 99999 })).toBe(1440 * 60e3);
    expect(intervalMs({ interval: "soon" as unknown as number })).toBe(10 * 60e3);
  });

  it("shuffles without losing or doubling anything", () => {
    const list = [1, 2, 3, 4, 5, 6];
    expect([...shuffle([...list], Math.random)].sort()).toEqual(list);
    expect(shuffle([...list], () => 0)).not.toEqual(list);
  });
});

describe("photo provider", () => {
  it("goes through the pictures of a folder, leaves out files that are none, and starts over", async () => {
    const { hass, callWS } = hassWith({ "media_source/browse_media": browse, "media_source/resolve_media": resolve });
    const urls = await take(provider(hass, { folder: FOLDER }), 5);
    expect(urls.slice(0, 2).sort()).toEqual(["/signed/a.jpg", "/signed/b.png"]);
    expect(urls.slice(2, 4)).toEqual(urls.slice(0, 2));
    expect(callWS).toHaveBeenCalledWith({ type: "media_source/browse_media", media_content_id: FOLDER });
    expect(callWS.mock.calls.filter(([m]) => m.type === "media_source/browse_media")).toHaveLength(1);
  });

  it("uses placeholder photos only when the folder has none, unless they are mixed in", async () => {
    const answers = { "media_source/browse_media": browse, "media_source/resolve_media": resolve, "ambidash/photos/placeholder": placeholder };
    const own = hassWith(answers);
    expect((await take(provider(own.hass, { folder: FOLDER, placeholder: "nasa" }), 4)).filter((u) => u?.startsWith("/ambidash"))).toEqual([]);
    expect(own.callWS.mock.calls.some(([m]) => m.type === "ambidash/photos/placeholder")).toBe(false);

    const empty = hassWith({ ...answers, "media_source/browse_media": { children: [] } });
    expect((await take(provider(empty.hass, { folder: FOLDER, placeholder: "nasa" }), 2)).sort()).toEqual(["/ambidash_photos/p1", "/ambidash_photos/p2"]);

    const mixed = hassWith(answers);
    expect(new Set(await take(provider(mixed.hass, { folder: FOLDER, placeholder: "nasa", mix: true }), 4))).toEqual(new Set(["/signed/a.jpg", "/signed/b.png", "/ambidash_photos/p1", "/ambidash_photos/p2"]));
  });

  it("asks for the placeholder source in the language of the HA user, and never for an unknown source", async () => {
    const { hass, callWS } = hassWith({ "ambidash/photos/placeholder": placeholder }, "fr");
    await provider(hass, { placeholder: "wikimedia" }).next();
    expect(callWS).toHaveBeenCalledWith({ type: "ambidash/photos/placeholder", source: "wikimedia", language: "fr" });
    const other = hassWith({ "ambidash/photos/placeholder": placeholder });
    expect(await provider(other.hass, { placeholder: "flickr" }).next()).toBeNull();
    expect(other.callWS).not.toHaveBeenCalled();
  });

  it("hands over the credit of placeholder photos unless it is switched off", async () => {
    const { hass } = hassWith({ "ambidash/photos/placeholder": placeholder });
    expect((await provider(hass, { placeholder: "nasa" }).next())?.credit).toMatch(/NASA$/);
    expect((await provider(hass, { placeholder: "nasa", credit: false }).next())?.credit).toBe("");
  });

  it("returns null when nothing can be read, and asks again the next time", async () => {
    const { hass, callWS } = hassWith({ "media_source/browse_media": new Error("no such folder"), "ambidash/photos/placeholder": new Error("external_disabled") });
    const p = provider(hass, { folder: FOLDER, placeholder: "nasa" });
    expect(await p.next()).toBeNull();
    expect(await p.next()).toBeNull();
    expect(callWS.mock.calls.filter(([m]) => m.type === "media_source/browse_media")).toHaveLength(2);
  });

  it("skips a media-source picture Home Assistant cannot sign", async () => {
    const { hass } = hassWith({ "media_source/browse_media": { children: [child("a.jpg")] }, "media_source/resolve_media": new Error("gone") });
    expect(await provider(hass, { folder: FOLDER }).next()).toBeNull();
  });

  it("reads the folder again after six hours", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    try {
      const { hass, callWS } = hassWith({ "media_source/browse_media": browse, "media_source/resolve_media": resolve });
      const p = provider(hass, { folder: FOLDER });
      await p.next();
      vi.setSystemTime(Date.now() + 5 * 3600e3);
      await p.next();
      expect(callWS.mock.calls.filter(([m]) => m.type === "media_source/browse_media")).toHaveLength(1);
      vi.setSystemTime(Date.now() + 2 * 3600e3);
      await p.next();
      expect(callWS.mock.calls.filter(([m]) => m.type === "media_source/browse_media")).toHaveLength(2);
    } finally {
      vi.useRealTimers();
    }
  });
});
