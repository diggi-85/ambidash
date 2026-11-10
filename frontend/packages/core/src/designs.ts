// Designs: colours and shapes as tokens. Calm and Clear are Ambiframe's "Ruhig" and "Klar" (values copied),
// Home is new (bright tiles, Apple-Home style), twelve more come from Ambiframe (designs-more.ts) and "seasons"
// picks one of nine by the date. System fonts only for now; bundled fonts come later.
import { AMBIFRAME_NEW, DESIGN_ALIASES, ambiframeFonts } from "./ambiframe";
import { CALM_DARK, CALM_LIGHT, SANS, SERIF } from "./base";
import { contrast, parseColor } from "./contrast";
import { AMBIFRAME_DESIGNS, SEASONS, seasonOf } from "./designs-more";
import { onColor, paletteTokens, resolvePalette } from "./palettes";
import { GLYPH, cssVars, type Mode, type Tokens } from "./tokens";

export interface Design {
  id: string;
  name: string;
  /** Other ids for the same design (Ambiframe's name for it) */
  aliases?: string[];
  /** Fonts and shapes, the same in light and dark */
  shared: Tokens;
  dark: Tokens;
  light: Tokens;
}

/** Icon bubble colours per domain; the same in every design. */
export const DOMAIN_COLORS: Tokens = {
  "c-light": "#f5b73b",
  "c-heat": "#ff8a5c",
  "c-cool": "#6cb4ff",
  "c-cover": "#5fd1b8",
  "c-media": "#c58bff",
};

/** Tokens no design changes: domain colours, glyph, touch size and motion. */
const COMMON: Tokens = {
  ...DOMAIN_COLORS,
  glyph: GLYPH,
  touch: "44px",
  ease: "cubic-bezier(0.22, 0.8, 0.24, 1)",
  dur: "0.25s",
};

export const DESIGNS: Design[] = [
  {
    id: "calm",
    name: "Calm",
    shared: { font: SANS, display: SERIF, radius: "22px" },
    dark: CALM_DARK,
    light: CALM_LIGHT,
  },
  {
    id: "clear",
    name: "Clear",
    shared: { font: SANS, display: SANS, radius: "18px" },
    dark: { ...CALM_DARK, accent: "#a8cab5" },
    light: {
      ...CALM_LIGHT,
      bg: "#f3f4f1",
      surface: "rgba(255, 255, 255, 0.7)",
      "on-bg": "#ffffff",
      "on-ink": "#141714",
      "on-ink-2": "rgba(20, 23, 20, 0.64)",
      ink: "#141714",
      "ink-2": "rgba(20, 23, 20, 0.64)",
      line: "rgba(20, 23, 20, 0.1)",
      accent: "#4f7d63",
    },
  },
  {
    id: "home",
    name: "Home",
    shared: { font: SANS, display: SANS, radius: "20px" },
    dark: {
      bg: "#0e0f12",
      surface: "rgba(255, 255, 255, 0.09)",
      "on-bg": "#f2f2f4",
      "on-ink": "#1c1c1e",
      "on-ink-2": "rgba(28, 28, 30, 0.66)",
      ink: "#f5f5f7",
      "ink-2": "rgba(245, 245, 247, 0.7)",
      line: "rgba(255, 255, 255, 0.1)",
      accent: "#0a84ff",
      "on-accent": "#ffffff",
      good: "#30d158",
      alert: "#ff6b5e",
      cold: "#64d2ff",
      shadow: "0 10px 30px rgba(0, 0, 0, 0.4)",
    },
    light: {
      bg: "#f2f2f7",
      surface: "rgba(255, 255, 255, 0.7)",
      "on-bg": "#ffffff",
      "on-ink": "#1c1c1e",
      "on-ink-2": "rgba(28, 28, 30, 0.66)",
      ink: "#1c1c1e",
      "ink-2": "rgba(60, 60, 67, 0.78)",
      line: "rgba(60, 60, 67, 0.12)",
      accent: "#0a63c9",
      "on-accent": "#ffffff",
      good: "#1f8a3c",
      alert: "#c4382b",
      cold: "#007aa3",
      shadow: "0 8px 24px rgba(0, 0, 0, 0.08)",
    },
  },
  ...AMBIFRAME_DESIGNS,
].map(ambiframeFonts).concat(AMBIFRAME_NEW);

const SEASON_DESIGNS = SEASONS.map(ambiframeFonts);

/**
 * The design for an id; unknown or missing ids give the first design. "seasons" gives the design of the season `date`
 * falls in (today by default); a single season's id (winter, halloween …) also works.
 */
export const resolveDesign = (id?: string, date: Date = new Date()): Design => {
  const named = DESIGN_ALIASES[id ?? ""] ?? id;
  const key = named === "seasons" ? seasonOf(date) : named;
  return DESIGNS.find((d) => d.id === key) ?? SEASON_DESIGNS.find((d) => d.id === key) ?? DESIGNS[0];
};

export type Tone = "light" | "dark";
export const CARD_STYLES = ["solid", "glass", "outline", "none"] as const;
export type CardStyle = (typeof CARD_STYLES)[number];

/** How much a background picture is darkened: the alpha of black laid over it. */
export const SHADES = { none: 0, light: 0.35, strong: 0.55 } as const;
export type Shade = keyof typeof SHADES;

const DARK_INK = "#141416";

/** Hex and rgb()/rgba() colours can be judged; named or hsl() colours cannot. */
const isColor = (color: string): boolean => {
  try {
    parseColor(color);
    return true;
  } catch {
    return false;
  }
};

/** Which tone a background has: "dark" (needs light text) or "light", judged on all of its colours. */
export const backdropTone = (colors: string[]): Tone => {
  const valid = colors.filter(isColor);
  if (!valid.length) return "dark";
  const worst = (ink: string) => Math.min(...valid.map((c) => contrast(ink, c)));
  return worst("#ffffff") >= worst(DARK_INK) ? "dark" : "light";
};

/** Text, active tiles and accent while a picture, colour or gradient sits behind the tiles. */
const BACKDROP: Record<Tone, Tokens> = {
  dark: {
    ink: "#ffffff",
    "ink-2": "rgba(255, 255, 255, 0.82)",
    line: "rgba(255, 255, 255, 0.2)",
    "on-bg": "rgba(255, 255, 255, 0.9)",
    "on-ink": GLYPH,
    "on-ink-2": "rgba(28, 28, 30, 0.66)",
    accent: "#9fd4ff",
    "on-accent": GLYPH,
  },
  light: {
    ink: DARK_INK,
    "ink-2": "rgba(20, 20, 22, 0.72)",
    line: "rgba(0, 0, 0, 0.14)",
    "on-bg": "rgba(20, 20, 22, 0.88)",
    "on-ink": "#ffffff",
    "on-ink-2": "rgba(255, 255, 255, 0.78)",
    accent: "#0a63c9",
    "on-accent": "#ffffff",
  },
};

/** Glass: blurred, tinted tiles. On a backdrop the tint follows its tone, otherwise the mode. */
const GLASS: Tokens = { "card-filter": "blur(20px) saturate(1.5)", "card-shadow": "inset 0 1px 0 rgba(255, 255, 255, 0.2)" };
const GLASS_TINT = { dark: "rgba(14, 16, 22, 0.5)", light: "rgba(255, 255, 255, 0.5)" } as const;

export interface TokenOptions {
  /** A colour palette over the design (nordic, vampire, mocha, retro, nightcity); unknown ids are ignored */
  palette?: string;
  /** Your own accent colour (hex or rgb()); wins over the palette and the backdrop */
  accent?: string;
  /** solid (the design's own), glass, outline or none; glass is the default on a backdrop */
  cardStyle?: string;
  /** What sits behind the tiles: text and glass follow its tone, `color` replaces the design background */
  backdrop?: { tone: Tone; color?: string };
  /** Which day "seasons" is judged on (today by default) */
  date?: Date;
}

/** Page art and the tile fill, border, shadow and blur a design brings itself: a palette or a backdrop replaces them. */
const OWN_PAINT = ["bg-art", "card-bg", "card-border", "card-shadow", "card-filter"];
/** A card style other than solid replaces the design's own tile look, including its top rule. */
const OWN_TILE = ["card-bg", "card-border", "card-shadow", "card-filter", "card-rule"];
const drop = (t: Tokens, keys: string[]): void => {
  for (const key of keys) delete t[key];
};

/** Everything a design says for one mode, changed by the card style and the backdrop. */
export const resolveTokens = (id: string | undefined, mode: Mode, options: TokenOptions = {}): Tokens => {
  const design = resolveDesign(id, options.date);
  const t: Tokens = { ...COMMON, ...design.shared, ...design[mode] };
  const palette = resolvePalette(options.palette);
  const { backdrop } = options;
  if (palette || backdrop) drop(t, OWN_PAINT);
  if (palette) Object.assign(t, paletteTokens(palette, mode));
  if (backdrop) Object.assign(t, BACKDROP[backdrop.tone], backdrop.color ? { bg: backdrop.color } : {});
  if (options.accent && isColor(options.accent)) Object.assign(t, { accent: options.accent, "on-accent": onColor(options.accent) });
  const style = (CARD_STYLES as readonly string[]).includes(options.cardStyle ?? "") ? options.cardStyle : backdrop ? "glass" : "solid";
  if (style !== "solid") drop(t, OWN_TILE);
  if (style === "glass") Object.assign(t, GLASS, { surface: backdrop ? GLASS_TINT[backdrop.tone] : mode === "dark" ? "rgba(255, 255, 255, 0.1)" : "rgba(255, 255, 255, 0.55)" });
  else if (style === "outline") Object.assign(t, { surface: "transparent", line: t["ink-2"] });
  else if (style === "none") Object.assign(t, { surface: "transparent", line: "transparent" });
  return t;
};

/** Custom-property declarations for a design in one mode, ready for a `style` attribute. */
export const designCss = (id: string | undefined, mode: Mode, options?: TokenOptions): string => cssVars(resolveTokens(id, mode, options));
