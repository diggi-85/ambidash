// Ambidash and Ambiframe show the same designs: this checks Ambidash's values against Ambiframe's own export
// (data/ambiframe-designs.json). Where Ambidash differs on purpose, the difference is named here.
import { describe, expect, it } from "vitest";
import data from "../data/ambiframe-designs.json";
import { DEVIATIONS, TILE_RADIUS } from "../src/ambiframe";
import { DESIGN_ALIASES, DESIGNS, SEASONS, resolveDesign, resolveTokens, resolvePalette, PALETTES } from "../src";

interface Theme {
  id: string;
  shared: Record<string, string>;
  dark: Record<string, string>;
  light: Record<string, string>;
}
const themes = (data as unknown as { themes: Theme[] }).themes;
const af = (id: string): Theme => themes.find((t) => t.id === id)!;

/** Ambidash's id for each Ambiframe style it has */
const OURS = (afId: string): string => DESIGN_ALIASES[afId] ?? afId;
const STYLES = themes.filter((t) => !t.id.startsWith("saison-") && t.id !== "saisonal");

/** Colours the hand-made designs moved for contrast on tiles: `design/mode` → tokens */
const MOVED: Record<string, string[]> = {
  "glass/dark": ["ink-2"],
  "aurora/dark": ["ink-2"],
  "bauhaus/dark": ["ink-2"],
  "bauhaus/light": ["ink-2", "good"],
  "softui/light": ["ink-2"],
  "swiss/light": ["accent", "alert"],
  "rams/light": ["ink-2", "accent", "good", "alert"],
};

describe("the same designs as Ambiframe", () => {
  it("has every Ambiframe style, under its Ambidash id and under Ambiframe's own", () => {
    for (const t of STYLES) {
      const design = resolveDesign(t.id);
      expect(design.id, t.id).toBe(OURS(t.id));
      expect(DESIGNS.some((d) => d.id === design.id), t.id).toBe(true);
    }
    expect(DESIGNS.length).toBeGreaterThanOrEqual(STYLES.length);
  });

  it("has every seasonal variant", () => {
    for (const t of themes.filter((x) => x.id.startsWith("saison-"))) expect(SEASONS.some((s) => s.id === OURS(t.id)), t.id).toBe(true);
  });

  it.each(STYLES.map((t) => [t.id] as const))("%s: page, text and accent colours are Ambiframe's, apart from named contrast fixes", (afId) => {
    const theme = af(afId);
    const design = resolveDesign(afId);
    for (const mode of ["dark", "light"] as const) {
      const mine = resolveTokens(design.id, mode);
      const moved = new Set([...(MOVED[`${design.id}/${mode}`] ?? []), ...DEVIATIONS.filter((d) => d.startsWith(`${design.id} ${mode} `)).map((d) => d.split(" ")[2].replace(":", ""))]);
      for (const key of ["bg", "ink", "ink-2", "line", "surface", "accent", "good", "alert", "cold"]) {
        const theirs = theme[mode][key];
        if (theirs && !moved.has(key)) expect(mine[key], `${design.id} ${mode} ${key}`).toBe(theirs);
      }
    }
  });

  it.each(STYLES.map((t) => [t.id] as const))("%s: tiles have about 0.8 of Ambiframe's corner radius", (afId) => {
    const radius = af(afId).shared["card-radius"];
    const design = resolveDesign(afId);
    if (radius?.endsWith("px")) expect(Math.abs(parseFloat(resolveTokens(design.id, "dark").radius) - parseFloat(radius) * TILE_RADIUS), design.id).toBeLessThanOrEqual(2);
    else if (radius === "0") expect(resolveTokens(design.id, "dark").radius).toBe("0");
  });

  it("knows every Ambiframe palette", () => {
    const palettes = (data as unknown as { palettes: Record<string, { dark: { bg: string; accent: string }; light: { bg: string } }> }).palettes;
    for (const [id, p] of Object.entries(palettes)) {
      const mine = resolvePalette(id);
      expect(mine, id).toBeDefined();
      expect(PALETTES.includes(mine!)).toBe(true);
      expect(mine!.dark.bg, id).toBe(p.dark.bg);
      expect(mine!.dark.accent, id).toBe(p.dark.accent);
      expect(mine!.light.bg, id).toBe(p.light.bg);
    }
  });

  it("writes its fonts the way Ambiframe names them, as Ambidash's own families", () => {
    for (const d of DESIGNS) expect(resolveTokens(d.id, "dark").display, d.id).not.toContain("Ambiframe");
  });
});
