// Colour palettes: an option over any design (shapes and fonts stay the design's).
import { contrast, parseColor } from "./contrast";
import { GLYPH, type Mode, type Tokens } from "./tokens";

interface Colors {
  bg: string;
  ink: string;
  accent: string;
  /** Tile colour */
  card: string;
  good: string;
  alert: string;
  cold: string;
}
export interface Palette {
  id: string;
  name: string;
  dark: Colors;
  light: Colors;
}

// Values from Ambiframe's palettes; good and alert are darkened where the light variants did not reach 3:1 on the background
export const PALETTES: Palette[] = [
  {
    id: "nordic",
    name: "Nordic",
    dark: { bg: "#2e3440", ink: "#eceff4", accent: "#88c0d0", card: "#3b4252", good: "#a3be8c", alert: "#bf616a", cold: "#81a1c1" },
    light: { bg: "#eceff4", ink: "#2e3440", accent: "#5e81ac", card: "#e5e9f0", good: "#55733f", alert: "#bf616a", cold: "#5e81ac" },
  },
  {
    id: "vampire",
    name: "Vampire",
    dark: { bg: "#282a36", ink: "#f8f8f2", accent: "#bd93f9", card: "#343746", good: "#50fa7b", alert: "#ff5555", cold: "#8be9fd" },
    light: { bg: "#f8f8f2", ink: "#282a36", accent: "#7c5cc4", card: "#ffffff", good: "#2e9e4f", alert: "#d73a49", cold: "#2a8fb0" },
  },
  {
    id: "mocha",
    name: "Mocha",
    dark: { bg: "#1e1e2e", ink: "#cdd6f4", accent: "#cba6f7", card: "#313244", good: "#a6e3a1", alert: "#f38ba8", cold: "#89b4fa" },
    light: { bg: "#eff1f5", ink: "#4c4f69", accent: "#8839ef", card: "#e6e9ef", good: "#34871f", alert: "#d20f39", cold: "#1e66f5" },
  },
  {
    id: "retro",
    name: "Retro",
    dark: { bg: "#282828", ink: "#ebdbb2", accent: "#fabd2f", card: "#3c3836", good: "#b8bb26", alert: "#fb4934", cold: "#83a598" },
    light: { bg: "#fbf1c7", ink: "#3c3836", accent: "#b57614", card: "#f2e5bc", good: "#79740e", alert: "#9d0006", cold: "#076678" },
  },
  {
    id: "nightcity",
    name: "Night city",
    dark: { bg: "#1a1b26", ink: "#c0caf5", accent: "#7aa2f7", card: "#24283b", good: "#9ece6a", alert: "#f7768e", cold: "#7dcfff" },
    light: { bg: "#e1e2e7", ink: "#2c4d99", accent: "#2e7de9", card: "#d5d6db", good: "#587539", alert: "#f52a65", cold: "#007197" },
  },
];

/** Ambiframe's German palette ids keep working */
const LEGACY: Record<string, string> = { nordisch: "nordic", vampir: "vampire", nachtstadt: "nightcity" };

export const resolvePalette = (id?: string): Palette | undefined => {
  const key = LEGACY[id ?? ""] ?? id;
  return PALETTES.find((p) => p.id === key);
};

const rgba = (color: string, alpha: number): string => {
  const [r, g, b] = parseColor(color);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

/** Secondary text: `text` as translucent as it can be (from 78 %) while it still reads at 4.6:1 on every ground given. */
export const soften = (text: string, ...grounds: string[]): string => {
  for (let alpha = 0.78; alpha < 1; alpha += 0.02) {
    const soft = rgba(text, Math.round(alpha * 100) / 100);
    if (grounds.every((ground) => contrast(soft, ground) >= 4.6)) return soft;
  }
  return text;
};

/** The text colour that reads on a colour: the dark glyph colour or white, whichever contrasts more. */
export const onColor = (color: string): string => (contrast(GLYPH, color) >= contrast("#ffffff", color) ? GLYPH : "#ffffff");

const isOpaque = (color?: string): color is string => {
  if (!color) return false;
  try {
    return parseColor(color)[3] === 1;
  } catch {
    return false; // gradients and named colours
  }
};

/**
 * Completes a design that has no active-tile colours: an active tile is the inverse of the page. Secondary text is
 * made stronger where the given one does not read at 4.5:1 on the page and on an opaque tile fill. Tokens the design sets win.
 */
export const withActive = (t: Tokens): Tokens => {
  const grounds = [t.bg, ...(isOpaque(t["card-bg"]) ? [t["card-bg"]] : [])];
  const ink2 = t["ink-2"] && grounds.every((g) => contrast(t["ink-2"], g) >= 4.5) ? t["ink-2"] : soften(t.ink, ...grounds);
  return { "on-bg": t.ink, "on-ink": t.bg, "on-ink-2": soften(t.bg, t.ink), "on-accent": onColor(t.accent), ...t, "ink-2": ink2 };
};

/** A palette as design tokens: secondary text and lines are the ink made translucent, an active tile is the inverse of the page. */
export const paletteTokens = (palette: Palette, mode: Mode): Tokens => {
  const c = palette[mode];
  return {
    bg: c.bg,
    surface: c.card,
    ink: c.ink,
    "ink-2": soften(c.ink, c.bg, c.card),
    line: rgba(c.ink, 0.14),
    "on-bg": c.ink,
    "on-ink": c.bg,
    "on-ink-2": soften(c.bg, c.ink),
    accent: c.accent,
    "on-accent": onColor(c.accent),
    good: c.good,
    alert: c.alert,
    cold: c.cold,
  };
};
