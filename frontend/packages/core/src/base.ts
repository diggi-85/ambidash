// Building blocks the designs share: system font stacks and Calm's colours, which other designs start from.
import { GLYPH, type Tokens } from "./tokens";

export const SANS = 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", sans-serif';
export const SERIF = 'ui-serif, "New York", Georgia, "Times New Roman", serif';

export const CALM_DARK: Tokens = {
  bg: "#0a0d0b",
  surface: "rgba(237, 231, 219, 0.045)",
  "on-bg": "rgba(237, 231, 219, 0.11)",
  "on-ink": "#ede7db",
  "on-ink-2": "rgba(237, 231, 219, 0.66)",
  ink: "#ede7db",
  "ink-2": "rgba(237, 231, 219, 0.66)",
  line: "rgba(237, 231, 219, 0.1)",
  accent: "#d6a865",
  "on-accent": GLYPH,
  good: "#9cc5a1",
  alert: "#ef8b63",
  cold: "#9dbad6",
  shadow: "none",
};

export const CALM_LIGHT: Tokens = {
  bg: "#f2ede3",
  surface: "rgba(255, 255, 255, 0.55)",
  "on-bg": "rgba(255, 255, 255, 0.95)",
  "on-ink": "#1e1b16",
  "on-ink-2": "rgba(30, 27, 22, 0.64)",
  ink: "#1e1b16",
  "ink-2": "rgba(30, 27, 22, 0.64)",
  line: "rgba(30, 27, 22, 0.11)",
  accent: "#9a7334",
  "on-accent": "#ffffff",
  good: "#4f8a5b",
  alert: "#c0552f",
  cold: "#3d6a8f",
  shadow: "0 8px 24px rgba(60, 45, 20, 0.12)",
};
