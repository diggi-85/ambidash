// Twelve of Ambiframe's styles and its seasons design as Ambidash designs. Colours, card shapes and background art are
// Ambiframe's (scaled to the smaller tiles); fonts are system stacks of similar character, bundled fonts come later.
// Where a colour did not reach the contrast the tiles need it is adjusted, noted at the line.
import { CALM_DARK, CALM_LIGHT, SANS, SERIF } from "./base";
import type { Design } from "./designs";
import { withActive } from "./palettes";
import type { Tokens } from "./tokens";

const BOOK = '"Iowan Old Style", "Palatino Linotype", Palatino, ui-serif, Georgia, serif';
const GEO = '"Avenir Next", Avenir, Futura, "Century Gothic", system-ui, sans-serif';
const GROTESK = '"Helvetica Neue", Helvetica, Arial, system-ui, sans-serif';
const ROUNDED = 'ui-rounded, "SF Pro Rounded", Nunito, system-ui, sans-serif';

/** Three soft colour clouds as page art */
const blobs = (a: string, b: string, c: string): string =>
  `radial-gradient(60% 70% at 12% 18%, ${a}, transparent 62%), radial-gradient(55% 65% at 88% 26%, ${b}, transparent 62%), radial-gradient(75% 70% at 58% 100%, ${c}, transparent 64%)`;

const withoutActive = (t: Tokens): Tokens => Object.fromEntries(Object.entries(t).filter(([key]) => !key.startsWith("on-")));
const dark = (t: Tokens): Tokens => withActive({ ...withoutActive(CALM_DARK), ...t });
const light = (t: Tokens): Tokens => withActive({ ...withoutActive(CALM_LIGHT), ...t });

/** Tiles without a fill, only a rule on top (Editorial, Minimal, Swiss Grid) */
const RULED: Tokens = { "card-bg": "transparent", "card-border": "0 solid transparent", radius: "0" };

export const AMBIFRAME_DESIGNS: Design[] = [
  {
    id: "gold",
    name: "Gold",
    shared: { font: SANS, display: SERIF, radius: "22px" },
    dark: dark({ bg: "#09090a", ink: "#ffffff", "ink-2": "rgba(255, 255, 255, 0.68)", line: "rgba(255, 255, 255, 0.1)", surface: "rgba(255, 255, 255, 0.045)", accent: "#d9b45f", cold: "#a9c4dc" }),
    light: light({ bg: "#f6f3ec", ink: "#16130f", "ink-2": "rgba(22, 19, 15, 0.64)", line: "rgba(22, 19, 15, 0.11)", surface: "rgba(255, 255, 255, 0.7)", accent: "#a8803a", cold: "#3f6f9c" }),
  },
  {
    id: "glass",
    name: "Glass",
    shared: { font: SANS, display: SANS, radius: "26px" },
    dark: dark({
      bg: "#0b1020",
      "bg-art": blobs("rgba(90, 120, 255, 0.4)", "rgba(255, 120, 175, 0.3)", "rgba(60, 210, 195, 0.3)"),
      ink: "#ffffff",
      "ink-2": "rgba(255, 255, 255, 0.84)",
      line: "rgba(255, 255, 255, 0.16)",
      surface: "rgba(255, 255, 255, 0.08)",
      accent: "#9fd4ff",
      cold: "#a8c8ff",
      good: "#8fe3b0",
      alert: "#ff9f7a",
      "card-bg": "linear-gradient(140deg, rgba(255, 255, 255, 0.18), rgba(255, 255, 255, 0.05) 55%, rgba(255, 255, 255, 0.1))",
      "card-border": "1px solid rgba(255, 255, 255, 0.24)",
      "card-filter": "blur(24px) saturate(1.8)",
      "card-shadow": "inset 0 1px 0 rgba(255, 255, 255, 0.4), inset 0 -1px 0 rgba(255, 255, 255, 0.08), 0 12px 32px rgba(0, 0, 30, 0.3)",
    }),
    light: light({
      bg: "#e9edf7",
      "bg-art": blobs("rgba(150, 140, 255, 0.5)", "rgba(255, 175, 150, 0.5)", "rgba(120, 215, 205, 0.45)"),
      ink: "#0f1320",
      "ink-2": "rgba(15, 19, 32, 0.66)",
      line: "rgba(15, 19, 32, 0.09)",
      surface: "rgba(255, 255, 255, 0.5)",
      accent: "#2f6fe0",
      cold: "#2f6fe0",
      good: "#2f8a5b",
      alert: "#d0552f",
      "card-bg": "linear-gradient(140deg, rgba(255, 255, 255, 0.78), rgba(255, 255, 255, 0.4) 55%, rgba(255, 255, 255, 0.58))",
      "card-border": "1px solid rgba(255, 255, 255, 0.85)",
      "card-filter": "blur(24px) saturate(1.6)",
      "card-shadow": "inset 0 1px 0 rgba(255, 255, 255, 0.95), 0 12px 30px rgba(40, 50, 100, 0.14)",
    }),
  },
  {
    id: "aurora",
    name: "Aurora",
    shared: { font: SANS, display: GEO, radius: "22px" },
    dark: dark({
      bg: "#060a14",
      "bg-art": blobs("rgba(60, 220, 170, 0.3)", "rgba(130, 90, 255, 0.3)", "rgba(40, 120, 255, 0.26)"),
      ink: "#eef3f7",
      "ink-2": "rgba(238, 243, 247, 0.8)",
      line: "rgba(238, 243, 247, 0.12)",
      surface: "rgba(238, 243, 247, 0.06)",
      accent: "#7fe0c4",
      cold: "#8fb8ff",
      "card-bg": "rgba(255, 255, 255, 0.06)",
      "card-border": "1px solid rgba(255, 255, 255, 0.1)",
      "card-filter": "blur(18px) saturate(1.4)",
    }),
    light: light({
      bg: "#f7f3ef",
      "bg-art": blobs("rgba(255, 185, 140, 0.5)", "rgba(200, 165, 255, 0.45)", "rgba(140, 225, 205, 0.42)"),
      ink: "#1b1820",
      "ink-2": "rgba(27, 24, 32, 0.64)",
      line: "rgba(27, 24, 32, 0.09)",
      surface: "rgba(255, 255, 255, 0.45)",
      accent: "#7457d6",
      cold: "#4a7fd6",
      "card-bg": "rgba(255, 255, 255, 0.45)",
      "card-border": "1px solid rgba(255, 255, 255, 0.75)",
      "card-filter": "blur(18px) saturate(1.3)",
    }),
  },
  {
    id: "editorial",
    name: "Editorial",
    shared: { font: SANS, display: BOOK, ...RULED, "card-rule": "1.5px solid currentColor" },
    dark: dark({ bg: "#141311", ink: "#ece5d8", "ink-2": "rgba(236, 229, 216, 0.68)", line: "rgba(236, 229, 216, 0.16)", surface: "rgba(236, 229, 216, 0.05)", accent: "#e08d63" }),
    light: light({ bg: "#f3eee4", ink: "#1c1915", "ink-2": "rgba(28, 25, 21, 0.7)", line: "rgba(28, 25, 21, 0.16)", surface: "rgba(28, 25, 21, 0.05)", accent: "#a8432a", cold: "#2f5d8a", alert: "#b8401f", good: "#3f7a4b", shadow: "none" }),
  },
  {
    id: "minimal",
    name: "Minimal",
    shared: { font: GROTESK, display: GROTESK, ...RULED, "card-rule": "1px solid color-mix(in srgb, currentColor 22%, transparent)" },
    dark: dark({ bg: "#000000", ink: "#ffffff", "ink-2": "rgba(255, 255, 255, 0.6)", line: "rgba(255, 255, 255, 0.14)", surface: "rgba(255, 255, 255, 0.06)", accent: "#ff5a36", cold: "#7fb2ff" }),
    light: light({ bg: "#f6f6f4", ink: "#0b0b0b", "ink-2": "rgba(11, 11, 11, 0.6)", line: "rgba(11, 11, 11, 0.12)", surface: "rgba(11, 11, 11, 0.05)", accent: "#e8401c", cold: "#2f6fe0", shadow: "none" }),
  },
  {
    id: "cleartext",
    name: "Clear text",
    shared: { font: SANS, display: SANS, radius: "16px", "label-case": "none", "label-track": "0", "label-weight": "700", fs: "1.2" },
    dark: dark({
      bg: "#000000",
      ink: "#ffffff",
      "ink-2": "rgba(255, 255, 255, 0.9)",
      line: "rgba(255, 255, 255, 0.35)",
      surface: "rgba(255, 255, 255, 0.08)",
      accent: "#ffd60a",
      cold: "#64d2ff",
      good: "#32d74b",
      alert: "#ff453a",
      "card-bg": "#111111",
      "card-border": "2px solid rgba(255, 255, 255, 0.35)",
    }),
    light: light({
      bg: "#ffffff",
      ink: "#000000",
      "ink-2": "rgba(0, 0, 0, 0.88)",
      line: "rgba(0, 0, 0, 0.35)",
      surface: "rgba(0, 0, 0, 0.05)",
      accent: "#0040dd",
      cold: "#0071a4",
      good: "#007d2a",
      alert: "#c1001a",
      "card-bg": "#f2f2f2",
      "card-border": "2px solid rgba(0, 0, 0, 0.3)",
      shadow: "none",
    }),
  },
  {
    id: "paper",
    name: "Paper",
    shared: { font: SANS, display: BOOK, radius: "0", "label-weight": "700", "label-track": "0.14em" },
    dark: dark({
      bg: "#000000",
      ink: "#ffffff",
      "ink-2": "rgba(255, 255, 255, 0.82)",
      line: "rgba(255, 255, 255, 0.45)",
      surface: "transparent",
      accent: "#ffffff",
      cold: "#ffffff",
      alert: "#ffffff",
      good: "#ffffff",
      "card-bg": "transparent",
      "card-border": "2px solid #ffffff",
      "card-shadow": "none",
    }),
    light: light({
      bg: "#ffffff",
      ink: "#000000",
      "ink-2": "rgba(0, 0, 0, 0.78)",
      line: "rgba(0, 0, 0, 0.4)",
      surface: "transparent",
      accent: "#000000",
      cold: "#000000",
      alert: "#000000",
      good: "#000000",
      "card-bg": "transparent",
      "card-border": "2px solid #000000",
      "card-shadow": "none",
      shadow: "none",
    }),
  },
  {
    id: "eink",
    name: "E-Ink",
    shared: { font: SANS, display: SANS, radius: "6px", "label-weight": "700", "label-track": "0.12em", dur: "0s", press: "1" },
    dark: dark({
      bg: "#000000",
      ink: "#ffffff",
      "ink-2": "#cccccc",
      line: "#666666",
      surface: "#000000",
      accent: "#ffffff",
      cold: "#ffffff",
      alert: "#ffffff",
      good: "#ffffff",
      "card-bg": "#000000",
      "card-border": "2px solid #ffffff",
      "card-shadow": "none",
      shadow: "none",
    }),
    light: light({
      bg: "#ffffff",
      ink: "#000000",
      "ink-2": "#333333",
      line: "#999999",
      surface: "#ffffff",
      accent: "#000000",
      cold: "#000000",
      alert: "#000000",
      good: "#000000",
      "card-bg": "#ffffff",
      "card-border": "2px solid #000000",
      "card-shadow": "none",
      shadow: "none",
    }),
  },
  {
    id: "bauhaus",
    name: "Bauhaus",
    shared: { font: GEO, display: GEO, radius: "0", "label-weight": "800", "label-track": "0.14em" },
    dark: dark({
      bg: "#161616",
      "bg-art":
        // Ambiframe's circles are solid; here they are translucent so page text stays readable where it crosses them
        "radial-gradient(circle at 90% 12%, rgba(201, 162, 39, 0.4) 0 9%, transparent 9.2%), radial-gradient(circle at 6% 94%, rgba(181, 58, 40, 0.7) 0 13%, transparent 13.2%), linear-gradient(90deg, transparent 74%, rgba(40, 80, 160, 0.55) 74% 77%, transparent 77%)",
      ink: "#f2ead8",
      "ink-2": "rgba(242, 234, 216, 0.86)",
      line: "rgba(242, 234, 216, 0.2)",
      surface: "rgba(242, 234, 216, 0.06)",
      accent: "#e04a35",
      cold: "#4f7fd6",
      good: "#e9b931",
      "card-bg": "#202020",
      "card-border": "3px solid #f2ead8",
      "card-shadow": "5px 5px 0 #e04a35",
    }),
    light: light({
      bg: "#efe7d6",
      "bg-art":
        "radial-gradient(circle at 90% 12%, #f0b323 0 9%, transparent 9.2%), radial-gradient(circle at 6% 94%, rgba(211, 63, 43, 0.6) 0 13%, transparent 13.2%), linear-gradient(90deg, transparent 74%, rgba(29, 78, 158, 0.35) 74% 77%, transparent 77%)",
      ink: "#111111",
      "ink-2": "rgba(17, 17, 17, 0.86)",
      line: "rgba(17, 17, 17, 0.25)",
      surface: "rgba(255, 255, 255, 0.6)",
      accent: "#d33f2b",
      cold: "#1d4e9e",
      good: "#9a6b00", // Ambiframe's #c48a00 is too light for 3:1 on this background
      "card-bg": "#ffffff",
      "card-border": "3px solid #111111",
      "card-shadow": "5px 5px 0 #111111",
      shadow: "none",
    }),
  },
  {
    id: "softui",
    name: "Soft UI",
    shared: { font: ROUNDED, display: ROUNDED, radius: "24px", "label-case": "none", "label-track": "0", "label-weight": "700" },
    dark: dark({
      bg: "#2b2e35",
      ink: "#e3e6ec",
      "ink-2": "rgba(227, 230, 236, 0.7)",
      line: "rgba(255, 255, 255, 0.07)",
      surface: "rgba(255, 255, 255, 0.04)",
      accent: "#8f9bff",
      "card-bg": "#2b2e35",
      "card-border": "0 solid transparent",
      "card-shadow": "7px 7px 14px #1e2025, -7px -7px 14px #383c45",
    }),
    light: light({
      bg: "#e6e9ef",
      ink: "#3b4252",
      "ink-2": "rgba(59, 66, 82, 0.72)",
      line: "rgba(59, 66, 82, 0.08)",
      surface: "rgba(255, 255, 255, 0.4)",
      accent: "#5b6cff",
      "card-bg": "#e6e9ef",
      "card-border": "0 solid transparent",
      "card-shadow": "8px 8px 16px #c3c8d1, -8px -8px 16px #ffffff",
      shadow: "none",
    }),
  },
  {
    id: "swiss",
    name: "Swiss Grid",
    shared: { font: GROTESK, display: GROTESK, ...RULED, "card-rule": "4px solid currentColor", "label-case": "none", "label-weight": "700", "label-track": "0", "label-color": "var(--ambi-accent)", "bg-size": "calc(100% / 12) 100%" },
    dark: dark({
      bg: "#0f0f0f",
      "bg-art": "linear-gradient(90deg, rgba(255, 255, 255, 0.05) 1px, transparent 1px)",
      ink: "#f4f3ef",
      "ink-2": "rgba(244, 243, 239, 0.74)",
      line: "rgba(244, 243, 239, 0.18)",
      surface: "transparent",
      accent: "#ff3321",
      cold: "#f4f3ef",
      good: "#f4f3ef",
      alert: "#ff3321",
    }),
    light: light({
      bg: "#f4f3ef",
      "bg-art": "linear-gradient(90deg, rgba(0, 0, 0, 0.06) 1px, transparent 1px)",
      ink: "#111111",
      "ink-2": "rgba(17, 17, 17, 0.74)",
      line: "rgba(17, 17, 17, 0.16)",
      surface: "transparent",
      accent: "#c7000d", // Ambiframe's #e30613 does not reach 4.5:1 as label text, not even on the grid lines
      cold: "#111111",
      good: "#111111",
      alert: "#c7000d",
      shadow: "none",
    }),
  },
  {
    id: "rams",
    name: "Rams",
    shared: { font: SANS, display: SANS, radius: "14px", "label-weight": "600", "label-track": "0.12em", "bg-size": "14px 14px" },
    dark: dark({
      bg: "#1e1e1c",
      "bg-art": "radial-gradient(circle, rgba(255, 255, 255, 0.06) 1.3px, transparent 1.7px)",
      ink: "#eae8e2",
      "ink-2": "rgba(234, 232, 226, 0.7)",
      line: "rgba(234, 232, 226, 0.12)",
      surface: "rgba(234, 232, 226, 0.05)",
      accent: "#ff6a13",
      cold: "#8fb3c9",
      good: "#9cbf7a",
      alert: "#ff6a13",
      "card-bg": "#2a2a27",
      "card-border": "1px solid rgba(234, 232, 226, 0.08)",
      "card-shadow": "0 2px 0 rgba(0, 0, 0, 0.35)",
    }),
    light: light({
      bg: "#d9d7d0",
      "bg-art": "radial-gradient(circle, rgba(0, 0, 0, 0.06) 1.3px, transparent 1.7px)",
      ink: "#2b2a27",
      "ink-2": "rgba(43, 42, 39, 0.8)",
      line: "rgba(43, 42, 39, 0.12)",
      surface: "rgba(255, 255, 255, 0.4)",
      accent: "#c24400", // Ambiframe's #e85a0c is too light for 3:1 on this grey
      cold: "#4f7c96",
      good: "#4a7a2e",
      alert: "#c24400",
      "card-bg": "#eceae4",
      "card-border": "1px solid rgba(255, 255, 255, 0.7)",
      "card-shadow": "0 2px 0 rgba(43, 42, 39, 0.12)",
      shadow: "none",
    }),
  },
];

/* ───────── Seasons: changes by itself ───────── */

const inkOf = (rgb: string): Tokens => ({ ink: `rgb(${rgb})`, "ink-2": `rgba(${rgb}, 0.72)`, line: `rgba(${rgb}, 0.12)` });

const season = (id: string, name: string, dk: Tokens, lt: Tokens): Design => ({
  id,
  name,
  shared: { font: SANS, display: SERIF, radius: "22px" },
  dark: dark(dk),
  light: light(lt),
});

export const SEASONS: Design[] = [
  season(
    "christmas",
    "Christmas",
    { bg: "#0f1d17", "bg-art": blobs("rgba(168, 50, 42, 0.32)", "rgba(212, 169, 79, 0.2)", "rgba(40, 110, 70, 0.32)"), ...inkOf("245, 239, 228"), accent: "#d4a94f", alert: "#d0574a" },
    { bg: "#f6f1e7", "bg-art": blobs("rgba(190, 60, 50, 0.16)", "rgba(212, 169, 79, 0.2)", "rgba(60, 120, 80, 0.16)"), ...inkOf("35, 52, 43"), accent: "#a8322a" },
  ),
  season(
    "newyear",
    "New Year's Eve",
    { bg: "#08090f", "bg-art": blobs("rgba(120, 80, 200, 0.26)", "rgba(232, 198, 107, 0.18)", "rgba(40, 80, 180, 0.26)"), ...inkOf("244, 240, 230"), accent: "#e8c66b" },
    { bg: "#f5f0e6", "bg-art": blobs("rgba(168, 129, 47, 0.18)", "rgba(120, 90, 180, 0.12)", "rgba(80, 110, 190, 0.12)"), ...inkOf("30, 28, 40"), accent: "#a8812f" },
  ),
  season(
    "valentine",
    "Valentine's Day",
    { bg: "#1f0f16", "bg-art": blobs("rgba(255, 107, 139, 0.3)", "rgba(180, 60, 120, 0.24)", "rgba(255, 160, 140, 0.18)"), ...inkOf("255, 236, 240"), accent: "#ff6b8b" },
    { bg: "#fff1f3", "bg-art": blobs("rgba(255, 150, 170, 0.35)", "rgba(240, 120, 160, 0.22)", "rgba(255, 200, 180, 0.3)"), ...inkOf("70, 30, 45"), accent: "#d94a6a" },
  ),
  season(
    "easter",
    "Easter",
    { bg: "#1b1d26", "bg-art": blobs("rgba(201, 182, 255, 0.24)", "rgba(250, 220, 120, 0.18)", "rgba(140, 220, 180, 0.2)"), ...inkOf("243, 241, 250"), accent: "#c9b6ff" },
    { bg: "#f7f5ec", "bg-art": blobs("rgba(250, 225, 120, 0.4)", "rgba(170, 225, 190, 0.38)", "rgba(205, 185, 245, 0.4)"), ...inkOf("50, 45, 70"), accent: "#8a6fd1" },
  ),
  season(
    "halloween",
    "Halloween",
    { bg: "#120d14", "bg-art": blobs("rgba(255, 138, 42, 0.26)", "rgba(110, 50, 140, 0.3)", "rgba(80, 140, 60, 0.14)"), ...inkOf("243, 231, 214"), accent: "#ff8a2a" },
    { bg: "#f6ece0", "bg-art": blobs("rgba(240, 140, 60, 0.26)", "rgba(140, 90, 170, 0.18)", "rgba(200, 160, 90, 0.2)"), ...inkOf("45, 30, 40"), accent: "#d4641c" },
  ),
  season(
    "spring",
    "Spring",
    { bg: "#13181a", "bg-art": blobs("rgba(244, 166, 192, 0.24)", "rgba(140, 200, 130, 0.22)", "rgba(250, 230, 150, 0.14)"), ...inkOf("240, 244, 236"), accent: "#f4a6c0" },
    { bg: "#f4f6ee", "bg-art": blobs("rgba(244, 180, 200, 0.35)", "rgba(160, 210, 150, 0.35)", "rgba(250, 235, 160, 0.3)"), ...inkOf("38, 50, 36"), accent: "#4f9a5c" },
  ),
  season(
    "summer",
    "Summer",
    { bg: "#1a1410", "bg-art": blobs("rgba(255, 170, 70, 0.28)", "rgba(255, 220, 110, 0.2)", "rgba(60, 170, 180, 0.2)"), ...inkOf("252, 242, 226"), accent: "#ffb54d" },
    { bg: "#fdf6e8", "bg-art": blobs("rgba(255, 190, 110, 0.38)", "rgba(255, 230, 140, 0.4)", "rgba(110, 200, 210, 0.3)"), ...inkOf("55, 40, 25"), accent: "#c25f12" }, // Ambiframe's #e07a2f is only 2.8:1 on this background
  ),
  season(
    "autumn",
    "Autumn",
    { bg: "#1a120c", "bg-art": blobs("rgba(200, 90, 40, 0.3)", "rgba(220, 160, 60, 0.2)", "rgba(120, 70, 40, 0.28)"), ...inkOf("245, 234, 220"), accent: "#e0913a" },
    { bg: "#f5ece0", "bg-art": blobs("rgba(210, 120, 60, 0.28)", "rgba(230, 180, 90, 0.3)", "rgba(160, 100, 60, 0.2)"), ...inkOf("58, 38, 24"), accent: "#b45a24" },
  ),
  season(
    "winter",
    "Winter",
    { bg: "#0d131c", "bg-art": blobs("rgba(120, 170, 220, 0.24)", "rgba(200, 220, 240, 0.12)", "rgba(80, 110, 170, 0.24)"), ...inkOf("236, 242, 248"), accent: "#9cc9f0" },
    { bg: "#eef3f7", "bg-art": blobs("rgba(150, 190, 230, 0.35)", "rgba(220, 230, 245, 0.5)", "rgba(130, 160, 210, 0.25)"), ...inkOf("30, 42, 56"), accent: "#3f7bb3" },
  ),
];

/** Easter Sunday (Gregorian; Meeus/Jones/Butcher) */
export const easter = (year: number): Date => {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  return new Date(year, month - 1, ((h + l - 7 * m + 114) % 31) + 1);
};

/** Which season's design applies on a day: occasions first, otherwise the meteorological season. */
export const seasonOf = (date: Date): string => {
  const m = date.getMonth() + 1;
  const d = date.getDate();
  if ((m === 12 && d === 31) || (m === 1 && d === 1)) return "newyear";
  if (m === 12 && d <= 26) return "christmas";
  if (m === 2 && d === 14) return "valentine";
  if (m === 10 && d >= 24) return "halloween";
  const day = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const sunday = easter(date.getFullYear()).getTime();
  if (day >= sunday - 7 * 864e5 && day <= sunday + 864e5) return "easter";
  if (m >= 3 && m <= 5) return "spring";
  if (m >= 6 && m <= 8) return "summer";
  if (m >= 9 && m <= 11) return "autumn";
  return "winter";
};
