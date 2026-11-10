/** Design tokens: a flat map of name → CSS value, emitted as `--ambi-<name>` custom properties. */
export type Tokens = Record<string, string>;
export type Mode = "light" | "dark";

/** Glyph colour on the coloured icon bubbles; dark enough for every domain colour (checked in the tests). */
export const GLYPH = "#1c1c1e";

/** Prefix of every custom property. Ambiframe's old `--af-` names get aliases onto these when it adopts the core. */
export const PREFIX = "ambi";

/** Tokens every design must define for light and dark; the tests enforce it. */
export const REQUIRED_TOKENS = ["bg", "surface", "on-bg", "on-ink", "on-ink-2", "ink", "ink-2", "line", "accent", "on-accent", "good", "alert", "cold"] as const;

export const cssVars = (tokens: Tokens): string =>
  Object.entries(tokens)
    .map(([name, value]) => `--${PREFIX}-${name}: ${value};`)
    .join(" ");
