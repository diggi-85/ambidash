// Rules for every design: complete tokens in light and dark, WCAG AA for text, 3:1 for icons and status colours
import { describe, expect, it } from "vitest";
import { CARD_STYLES, DESIGNS, DOMAIN_COLORS, GLYPH, PALETTES, REQUIRED_TOKENS, SEASONS, SHADES, backdropTone, contrast, designCss, easter, onColor, parseColor, resolveDesign, resolvePalette, resolveTokens, seasonOf } from "../src";

const MODES = ["dark", "light"] as const;
/** The designs you can pick plus the nine the "seasons" design switches between */
const ALL = [...DESIGNS, ...SEASONS];

describe.each(ALL.map((d) => [d.id, d] as const))("design %s", (_id, design) => {
  it.each(MODES)("defines every required token in %s", (mode) => {
    for (const key of REQUIRED_TOKENS) expect(design[mode][key], key).toBeTruthy();
  });

  it.each(MODES)("meets WCAG AA for text in %s", (mode) => {
    const t = design[mode];
    expect(contrast(t.ink, t.bg), "ink on bg").toBeGreaterThanOrEqual(4.5);
    expect(contrast(t["ink-2"], t.bg), "ink-2 on bg").toBeGreaterThanOrEqual(4.5);
    expect(contrast(t.ink, t.surface, t.bg), "ink on tile").toBeGreaterThanOrEqual(4.5);
    expect(contrast(t["ink-2"], t.surface, t.bg), "ink-2 on tile").toBeGreaterThanOrEqual(4.5);
    expect(contrast(t["on-ink"], t["on-bg"], t.bg), "on-ink on active tile").toBeGreaterThanOrEqual(4.5);
    expect(contrast(t["on-ink-2"], t["on-bg"], t.bg), "on-ink-2 on active tile").toBeGreaterThanOrEqual(4.5);
  });

  it.each(MODES)("keeps icons and status colours at 3:1 in %s", (mode) => {
    const t = design[mode];
    for (const key of ["accent", "good", "alert"]) expect(contrast(t[key], t.bg), key).toBeGreaterThanOrEqual(3);
    expect(contrast(t["on-accent"], t.accent), "glyph on accent").toBeGreaterThanOrEqual(3);
  });
});

describe("designs overall", () => {
  it("have unique ids", () => {
    expect(new Set(ALL.map((d) => d.id)).size).toBe(ALL.length);
  });

  it("keep the glyph readable on every domain colour", () => {
    for (const [name, color] of Object.entries(DOMAIN_COLORS)) expect(contrast(GLYPH, color), name).toBeGreaterThanOrEqual(4.5);
  });

  it("fall back to the first design for an unknown id", () => {
    expect(resolveDesign("nope")).toBe(DESIGNS[0]);
    expect(resolveDesign(undefined)).toBe(DESIGNS[0]);
  });

  it("emit prefixed custom properties for the chosen mode", () => {
    const css = designCss("home", "dark");
    expect(css).toContain("--ambi-bg: #0e0f12;");
    expect(css).toContain("--ambi-c-light:");
    expect(designCss("home", "light")).toContain("--ambi-bg: #f2f2f7;");
  });
});

describe("card styles and backdrops", () => {
  /** Text on a tile and on an active tile, over `ground` */
  const readable = (t: Record<string, string>, ground: string) => {
    expect(contrast(t.ink, t.surface, ground), "ink on tile").toBeGreaterThanOrEqual(4.5);
    expect(contrast(t["ink-2"], t.surface, ground), "ink-2 on tile").toBeGreaterThanOrEqual(4.5);
    expect(contrast(t["on-ink"], t["on-bg"], ground), "on-ink on active tile").toBeGreaterThanOrEqual(4.5);
    expect(contrast(t["on-ink-2"], t["on-bg"], ground), "on-ink-2 on active tile").toBeGreaterThanOrEqual(4.5);
  };

  it.each(ALL.flatMap((d) => MODES.flatMap((m) => CARD_STYLES.map((s) => [d.id, m, s] as const))))("keeps text readable: design %s, %s, card style %s", (id, mode, style) => {
    const t = resolveTokens(id, mode, { cardStyle: style });
    readable(t, t.bg);
  });

  it("keeps text readable on a picture, even a white one, under the light and strong shade", () => {
    for (const shade of ["light", "strong"] as const) {
      const grey = Math.round(255 * (1 - SHADES[shade]));
      readable(resolveTokens("home", "light", { backdrop: { tone: "dark", color: "#0b0d10" } }), `rgb(${grey}, ${grey}, ${grey})`);
    }
  });

  it("keeps text readable on light, mid and dark colours with the tone chosen for them", () => {
    for (const color of ["#000000", "#303030", "#767676", "#a0a0a0", "#f5f0e6", "#ffffff", "#1a237e", "#ffd54f"]) {
      readable(resolveTokens("calm", "dark", { backdrop: { tone: backdropTone([color]), color } }), color);
    }
  });

  it("picks the tone that reads on every colour of a gradient, and treats colours it cannot judge as dark", () => {
    expect(backdropTone(["#ffffff", "#eeeeee"])).toBe("light");
    expect(backdropTone(["#101010", "#202040"])).toBe("dark");
    expect(backdropTone(["red"])).toBe("dark");
  });

  it("gives glass on a backdrop by default, lets the card style override, and ignores unknown styles", () => {
    const backdrop = { tone: "dark" as const, color: "#000000" };
    expect(resolveTokens("calm", "dark", { backdrop })["card-filter"]).toContain("blur");
    expect(resolveTokens("calm", "dark", { backdrop, cardStyle: "none" }).surface).toBe("transparent");
    expect(resolveTokens("calm", "dark", { backdrop, cardStyle: "outline" }).line).toBe("rgba(255, 255, 255, 0.82)");
    expect(resolveTokens("calm", "dark")["card-filter"]).toBeUndefined();
    expect(resolveTokens("calm", "dark", { cardStyle: "glass" })["card-filter"]).toContain("blur");
    expect(resolveTokens("calm", "dark", { cardStyle: "bogus" }).surface).toBe(DESIGNS[0].dark.surface);
  });
});

describe("palettes", () => {
  const readableOn = (t: Record<string, string>) => {
    expect(contrast(t.ink, t.surface, t.bg), "ink on tile").toBeGreaterThanOrEqual(4.5);
    expect(contrast(t["ink-2"], t.surface, t.bg), "ink-2 on tile").toBeGreaterThanOrEqual(4.5);
    expect(contrast(t["on-ink"], t["on-bg"], t.bg), "on-ink on active tile").toBeGreaterThanOrEqual(4.5);
    expect(contrast(t["on-ink-2"], t["on-bg"], t.bg), "on-ink-2 on active tile").toBeGreaterThanOrEqual(4.5);
  };

  it.each(PALETTES.flatMap((p) => MODES.map((m) => [p.id, m] as const)))("palette %s in %s has every token and meets WCAG AA", (id, mode) => {
    const t = resolveTokens("calm", mode, { palette: id });
    for (const key of REQUIRED_TOKENS) expect(t[key], key).toBeTruthy();
    expect(contrast(t.ink, t.bg), "ink on bg").toBeGreaterThanOrEqual(4.5);
    expect(contrast(t["ink-2"], t.bg), "ink-2 on bg").toBeGreaterThanOrEqual(4.5);
    readableOn(t);
    for (const key of ["accent", "good", "alert"]) expect(contrast(t[key], t.bg), key).toBeGreaterThanOrEqual(3);
    expect(contrast(t["on-accent"], t.accent), "glyph on accent").toBeGreaterThanOrEqual(3);
  });

  it.each(PALETTES.flatMap((p) => MODES.flatMap((m) => CARD_STYLES.map((s) => [p.id, m, s] as const))))("palette %s, %s, card style %s stays readable", (id, mode, style) => {
    readableOn(resolveTokens("home", mode, { palette: id, cardStyle: style }));
  });

  it.each(ALL.flatMap((d) => PALETTES.flatMap((p) => MODES.flatMap((m) => CARD_STYLES.map((s) => [d.id, p.id, m, s] as const)))))("design %s with palette %s, %s, card style %s stays readable", (design, palette, mode, style) => {
    readableOn(resolveTokens(design, mode, { palette, cardStyle: style }));
  });

  it("replaces the design's own fills, shadows and page art but keeps its shapes", () => {
    const plain = resolveTokens("swiss", "dark");
    const nordic = resolveTokens("swiss", "dark", { palette: "nordic" });
    expect(plain["bg-art"]).toBeTruthy();
    expect(nordic["bg-art"]).toBeUndefined();
    expect(nordic["card-rule"]).toBe(plain["card-rule"]);
    expect(nordic.radius).toBe("0");
    for (const key of ["card-bg", "card-border", "card-shadow", "card-filter"]) expect(resolveTokens("glass", "dark", { palette: "nordic" })[key], key).toBeUndefined();
  });

  it("changes colours only: the design keeps its fonts and shapes", () => {
    const plain = resolveTokens("calm", "dark");
    const nordic = resolveTokens("calm", "dark", { palette: "nordic" });
    expect(nordic.bg).toBe("#2e3440");
    expect(nordic.display).toBe(plain.display);
    expect(nordic.radius).toBe(plain.radius);
  });

  it("understands Ambiframe's German ids and ignores unknown palettes", () => {
    expect(resolvePalette("nordisch")?.id).toBe("nordic");
    expect(resolvePalette("nachtstadt")?.id).toBe("nightcity");
    expect(resolvePalette("nope")).toBeUndefined();
    expect(resolveTokens("calm", "dark", { palette: "nope" }).bg).toBe(DESIGNS[0].dark.bg);
  });

  it("lets your own accent win over palette and backdrop, with a readable text colour on it, and ignores what it cannot judge", () => {
    expect(resolveTokens("calm", "dark", { palette: "nordic", accent: "#ff6b35" }).accent).toBe("#ff6b35");
    const onImage = resolveTokens("calm", "dark", { accent: "#ff6b35", backdrop: { tone: "dark", color: "#000000" } });
    expect(onImage.accent).toBe("#ff6b35");
    expect(contrast(onImage["on-accent"], onImage.accent)).toBeGreaterThanOrEqual(4.5);
    expect(resolveTokens("calm", "dark", { accent: "#ffff00" })["on-accent"]).toBe(GLYPH);
    expect(resolveTokens("calm", "dark", { accent: "#000080" })["on-accent"]).toBe("#ffffff");
    expect(resolveTokens("calm", "dark", { accent: "red" }).accent).toBe(DESIGNS[0].dark.accent);
  });

  it("picks the more readable of white and the dark glyph colour", () => {
    expect(onColor("#ffffff")).toBe(GLYPH);
    expect(onColor("#000000")).toBe("#ffffff");
  });
});

describe("tile fills and page art", () => {
  type T = Record<string, string>;
  /** The colours written in a CSS value (a gradient has several); transparent ones are left out */
  const colorsIn = (css = ""): string[] =>
    (css.match(/#[0-9a-f]{3,8}\b|rgba?\([^)]*\)/gi) ?? []).filter((c) => {
      try {
        return parseColor(c)[3] > 0;
      } catch {
        return false;
      }
    });
  /** `top` laid over the opaque colour `bottom` */
  const over = (top: string, bottom: string): string => {
    const [r, g, b, a] = parseColor(top);
    const [R, G, B] = parseColor(bottom);
    const mix = (x: number, y: number) => Math.round(x * a + y * (1 - a));
    return `rgb(${mix(r, R)}, ${mix(g, G)}, ${mix(b, B)})`;
  };
  /** What page text can sit on: the background and each colour of the page art laid over it */
  const pageGrounds = (t: T) => [t.bg, ...colorsIn(t["bg-art"]).map((c) => over(c, t.bg))];
  /** What a tile looks like over `ground`: each colour of its fill (a gradient has several), or the surface */
  const tileGrounds = (t: T, ground: string) => {
    if (!t["card-bg"]) return [over(t.surface, ground)];
    const fills = colorsIn(t["card-bg"]);
    return fills.length ? fills.map((c) => over(c, ground)) : [ground];
  };

  it.each(ALL.flatMap((d) => MODES.map((m) => [d.id, m] as const)))("%s in %s keeps text readable on its page art and tile fills", (id, mode) => {
    const t = resolveTokens(id, mode);
    for (const page of pageGrounds(t)) {
      expect(contrast(t.ink, page), `ink on page ${page}`).toBeGreaterThanOrEqual(4.5);
      expect(contrast(t["ink-2"], page), `ink-2 on page ${page}`).toBeGreaterThanOrEqual(4.5);
      if (t["label-color"] === "var(--ambi-accent)") expect(contrast(t.accent, page), `label on page ${page}`).toBeGreaterThanOrEqual(4.5);
      for (const tile of tileGrounds(t, page)) {
        expect(contrast(t.ink, tile), `ink on tile ${tile}`).toBeGreaterThanOrEqual(4.5);
        expect(contrast(t["ink-2"], tile), `ink-2 on tile ${tile}`).toBeGreaterThanOrEqual(4.5);
      }
      const active = over(t["on-bg"], page);
      expect(contrast(t["on-ink"], active), `on-ink on active tile ${active}`).toBeGreaterThanOrEqual(4.5);
      expect(contrast(t["on-ink-2"], active), `on-ink-2 on active tile ${active}`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it.each(ALL.flatMap((d) => MODES.map((m) => [d.id, m] as const)))("%s in %s keeps icons and status colours at 3:1 on its tiles", (id, mode) => {
    const t = resolveTokens(id, mode);
    for (const tile of tileGrounds(t, t.bg)) for (const key of ["accent", "good", "alert"]) expect(contrast(t[key], tile), `${key} on tile ${tile}`).toBeGreaterThanOrEqual(3);
  });

  it("keeps a design's tile look in the solid style and replaces it in the others", () => {
    expect(resolveTokens("bauhaus", "light")["card-shadow"]).toContain("5px 5px");
    expect(resolveTokens("editorial", "dark")["card-rule"]).toBeTruthy();
    for (const cardStyle of ["glass", "outline", "none"]) {
      const t = resolveTokens("bauhaus", "light", { cardStyle });
      expect(t["card-bg"], cardStyle).toBeUndefined();
      expect(t["card-border"], cardStyle).toBeUndefined();
      expect(t["card-shadow"] ?? "", cardStyle).not.toContain("5px 5px");
      expect(resolveTokens("editorial", "dark", { cardStyle })["card-rule"], cardStyle).toBeUndefined();
    }
  });

  it("drops the page art and tile fill behind a picture, but keeps the shapes", () => {
    const t = resolveTokens("bauhaus", "dark", { backdrop: { tone: "dark", color: "#0b0d10" } });
    expect(t["bg-art"]).toBeUndefined();
    expect(t["card-bg"]).toBeUndefined();
    expect(t.radius).toBe("0");
  });

  it("makes E-Ink still", () => {
    const t = resolveTokens("eink", "light");
    expect(t.dur).toBe("0s");
    expect(t.press).toBe("1");
  });
});

describe("seasons", () => {
  it("knows the date of Easter", () => {
    expect(easter(2024)).toEqual(new Date(2024, 2, 31));
    expect(easter(2025)).toEqual(new Date(2025, 3, 20));
    expect(easter(2026)).toEqual(new Date(2026, 3, 5));
  });

  it.each([
    [new Date(2026, 11, 1), "christmas"],
    [new Date(2026, 11, 24), "christmas"],
    [new Date(2026, 11, 26), "christmas"],
    [new Date(2026, 11, 27), "winter"],
    [new Date(2026, 11, 31), "newyear"],
    [new Date(2027, 0, 1), "newyear"],
    [new Date(2027, 0, 2), "winter"],
    [new Date(2026, 1, 14), "valentine"],
    [new Date(2026, 2, 28), "spring"],
    [new Date(2026, 2, 29), "easter"],
    [new Date(2026, 3, 5), "easter"],
    [new Date(2026, 3, 6), "easter"],
    [new Date(2026, 3, 7), "spring"],
    [new Date(2026, 5, 1), "summer"],
    [new Date(2026, 8, 1), "autumn"],
    [new Date(2026, 9, 23), "autumn"],
    [new Date(2026, 9, 24), "halloween"],
    [new Date(2026, 10, 8), "autumn"],
  ])("picks the design for %s", (date, id) => {
    expect(seasonOf(date)).toBe(id);
  });

  it("has a design for every day of the year", () => {
    const ids = new Set(SEASONS.map((d) => d.id));
    for (let day = new Date(2028, 0, 1); day.getFullYear() === 2028; day.setDate(day.getDate() + 1)) expect(ids.has(seasonOf(day)), day.toDateString()).toBe(true);
  });

  it("resolves 'seasons' by the date, and a single season by its id", () => {
    expect(resolveDesign("seasons", new Date(2026, 9, 31)).id).toBe("halloween");
    expect(resolveDesign("winter").id).toBe("winter");
    expect(resolveTokens("seasons", "dark", { date: new Date(2026, 11, 24) }).bg).toBe(SEASONS.find((d) => d.id === "christmas")?.dark.bg);
    expect(resolveTokens("seasons", "dark", { date: new Date(2026, 6, 1) }).bg).toBe(SEASONS.find((d) => d.id === "summer")?.dark.bg);
  });
});

describe("contrast helpers", () => {
  it("parse hex and rgba and reject anything else", () => {
    expect(parseColor("#fff")).toEqual([255, 255, 255, 1]);
    expect(parseColor("rgba(10, 20, 30, 0.5)")).toEqual([10, 20, 30, 0.5]);
    expect(() => parseColor("hsl(0, 0%, 0%)")).toThrow();
  });

  it("give 21:1 for black on white and 1:1 for equal colours", () => {
    expect(contrast("#000000", "#ffffff")).toBeCloseTo(21, 5);
    expect(contrast("#777777", "#777777")).toBeCloseTo(1, 5);
  });
});
