// Ambiframe's styles as Ambidash designs. The data comes from Ambiframe's own export (see tools/import-ambiframe.mjs);
// this file maps its tokens onto the tile tokens and lists the ids both projects use for the same design.
import { AF_FONTS, AF_THEMES, type AfTheme } from "./ambiframe.generated";
import { contrast, parseColor, type Rgba } from "./contrast";
import { CALM_DARK, CALM_LIGHT } from "./base";
import type { Design } from "./designs";
import { withActive } from "./palettes";
import type { Mode, Tokens } from "./tokens";

/** Ambiframe's id → Ambidash's id, for the designs Ambidash made by hand; the others are in the generated data. */
const HAND_MADE: Record<string, string> = {
  ruhig: "calm",
  klar: "clear",
  klartext: "cleartext",
  papier: "paper",
  saisonal: "seasons",
  "saison-weihnachten": "christmas",
  "saison-silvester": "newyear",
  "saison-valentin": "valentine",
  "saison-ostern": "easter",
  "saison-halloween": "halloween",
  "saison-fruehling": "spring",
  "saison-sommer": "summer",
  "saison-herbst": "autumn",
  "saison-winter": "winter",
};

/** Ambiframe's cards are big; Ambidash's tiles are smaller, so their corners are this much of Ambiframe's (the hand-made designs follow the same rule) */
export const TILE_RADIUS = 0.8;
const tileRadius = (radius: string | undefined): string => (radius ?? "22px").replace(/(\d+(?:\.\d+)?)px/g, (_, px: string) => `${Math.round(Number(px) * TILE_RADIUS)}px`);

/** `design: ruhig` means the same as `design: calm`: one design, two names. */
export const DESIGN_ALIASES: Record<string, string> = { ...HAND_MADE, ...Object.fromEntries(AF_THEMES.filter((t) => t.af !== t.id).map((t) => [t.af, t.id])) };

/** Where an Ambiframe colour was moved to keep Ambidash's tiles readable (`style mode token: before → after`) */
export const DEVIATIONS: string[] = [];

/** Ambiframe's custom properties and font names, in Ambidash's words */
const words = (value: string): string => value.replace(/--af-sans/g, "--ambi-font").replace(/--af-/g, "--ambi-").replace(/Ambiframe /g, "Ambidash ");

const toward = (from: Rgba, to: Rgba, amount: number): string => `rgb(${[0, 1, 2].map((i) => Math.round(from[i] + (to[i] - from[i]) * amount)).join(", ")})`;

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
const flatten = (top: string, bottom: string): string => {
  const [r, g, b, a] = parseColor(top);
  const [R, G, B] = parseColor(bottom);
  const mix = (x: number, y: number) => Math.round(x * a + y * (1 - a));
  return `rgb(${mix(r, R)}, ${mix(g, G)}, ${mix(b, B)})`;
};

/** What page text can sit on: the background and each colour of the page art laid over it */
const pageGrounds = (t: Tokens): string[] => [t.bg, ...colorsIn(t["bg-art"]).map((c) => flatten(c, t.bg))];
/** What a tile looks like over `page`: each colour of its fill, or its surface */
const tileGrounds = (t: Tokens, page: string): string[] => {
  if (!t["card-bg"]) return [flatten(t.surface, page)];
  const fills = colorsIn(t["card-bg"]);
  return fills.length ? fills.map((c) => flatten(c, page)) : [page];
};

/** Whether text reads (4.5:1) on every page colour, tile fill and active tile of the tokens */
const readable = (t: Tokens, what: "page" | "tile"): boolean => {
  const ok = (fg: string, bg: string): boolean => contrast(fg, bg) >= 4.5;
  return pageGrounds(t).every((page) => {
    if (what === "page") return ok(t.ink, page) && ok(t["ink-2"], page);
    return tileGrounds(t, page).every((tile) => ok(t.ink, tile) && ok(t["ink-2"], tile)) && ok(t["on-ink"], flatten(t["on-bg"], page)) && ok(t["on-ink-2"], flatten(t["on-bg"], page));
  });
};

/** `color` moved toward `ink` until it reaches `min`:1 on every ground; undefined when it cannot be judged or never gets there */
const legible = (color: string, ink: string, grounds: string[], min: number): string | undefined => {
  try {
    const from = parseColor(color);
    for (let step = 0; step <= 10; step++) {
      const moved = step ? toward(from, parseColor(ink), step / 10) : color;
      if (grounds.every((g) => contrast(moved, g) >= min)) return moved;
    }
  } catch {
    // a colour that cannot be judged (var(), hsl()) stays as it is
  }
  return undefined;
};

const modeTokens = (theme: AfTheme, mode: Mode): Tokens => {
  const base = Object.fromEntries(Object.entries(mode === "dark" ? CALM_DARK : CALM_LIGHT).filter(([key]) => !key.startsWith("on-")));
  const source = theme[mode];
  const raw: Tokens = { ...base };
  for (const [key, value] of Object.entries(source)) {
    if (key === "card") raw["card-bg"] = source["card-tint"] ? `linear-gradient(${words(source["card-tint"])}, ${words(source["card-tint"])}), ${words(value)}` : words(value);
    else if (key !== "card-tint") raw[key] = words(value);
  }
  const note = (key: string, before: string | undefined, after: string): void => void DEVIATIONS.push(`${theme.id} ${mode} ${key}: ${before} → ${after}`);

  // Icons and status colours must stand out (3:1) on the page and its art
  for (const key of ["accent", "good", "alert"]) {
    const moved = raw[key] && legible(raw[key], raw.ink, pageGrounds(raw), 3);
    if (moved && moved !== raw[key]) (note(key, raw[key], moved), (raw[key] = moved));
  }
  // The heading colour is text: 4.5:1
  if ((raw["label-color"] ?? words(theme.shared["label-color"] ?? "")) === "var(--ambi-accent)") {
    const label = legible(raw.accent, raw.ink, pageGrounds(raw), 4.5);
    if (label && label !== raw.accent) (note("label-color", raw.accent, label), (raw["label-color"] = label));
  }
  // Ambidash's tiles sit on the page art and need readable text there: where Ambiframe's art or fill does not allow it, it is dropped
  let t = withActive(raw);
  const surfaceReads = (): boolean => [t.ink, t["ink-2"]].every((ink) => contrast(ink, flatten(t.surface, t.bg)) >= 4.5);
  if (!surfaceReads()) {
    note("surface", raw.surface, "transparent");
    raw.surface = "transparent";
    t = withActive(raw);
  }
  if (!readable(t, "page") && raw["bg-art"]) {
    note("bg-art", "page art", "none");
    delete raw["bg-art"];
    delete raw["bg-size"];
    t = withActive(raw);
  }
  if (!readable(t, "tile") && raw["card-bg"]) {
    note("card-bg", "tile fill", "surface");
    delete raw["card-bg"];
    delete raw["card-filter"];
    t = withActive(raw);
  }
  // The glass card style lays a light veil over the page: text has to read on that too
  const glass = flatten(mode === "dark" ? "rgba(255, 255, 255, 0.1)" : "rgba(255, 255, 255, 0.55)", t.bg);
  for (const key of ["ink", "ink-2"]) {
    const moved = legible(t[key], mode === "dark" ? "#ffffff" : "#000000", [t.bg, glass], 4.5);
    if (moved && moved !== t[key]) (note(key, t[key], moved), (raw[key] = moved));
  }
  t = withActive(raw);
  // withActive softens ink-2 where it would not read on the tile fill
  if (source["ink-2"] && t["ink-2"] !== raw["ink-2"]) note("ink-2", raw["ink-2"], t["ink-2"]);
  return t;
};

/** Fonts and shapes of a style, the same in light and dark */
const sharedTokens = (theme: AfTheme): Tokens => {
  const { sans, display, "card-radius": radius, ...rest } = theme.shared;
  return { font: words(sans), display: words(display), radius: tileRadius(radius), ...Object.fromEntries(Object.entries(rest).map(([key, value]) => [key, words(value)])) };
};

/** The styles Ambidash has not made by hand, as designs */
export const AMBIFRAME_NEW: Design[] = AF_THEMES.map((theme) => ({ id: theme.id, name: theme.name, aliases: [theme.af], shared: sharedTokens(theme), dark: modeTokens(theme, "dark"), light: modeTokens(theme, "light") }));

/** Ambiframe's id of a design Ambidash made by hand (the seasons all follow Ambiframe's "saisonal") */
const AF_ID: Record<string, string> = Object.fromEntries(Object.entries(HAND_MADE).map(([af, id]) => [id, af.startsWith("saison-") ? "saisonal" : af]));

/** A hand-made design with Ambiframe's fonts instead of system ones, so both projects set the same type */
export const ambiframeFonts = (design: Design): Design => {
  const af = AF_ID[design.id] ?? design.id;
  const fonts = AF_FONTS[af];
  if (!fonts) return design;
  const { sans, display, ...rest } = fonts;
  const shared: Tokens = { ...design.shared, ...Object.fromEntries(Object.entries(rest).map(([key, value]) => [key, words(value)])) };
  if (sans) shared.font = words(sans);
  if (display) shared.display = words(display);
  return { ...design, aliases: af === design.id ? design.aliases : [af], shared };
};
