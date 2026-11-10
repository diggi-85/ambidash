// The Studio's view of a background: which kind it is, what choosing a kind starts with, and how a field changes.
import type { Background } from "../types";

export type BackgroundKind = "none" | "color" | "gradient" | "image" | "photos";
export const KINDS: BackgroundKind[] = ["none", "color", "gradient", "image", "photos"];

/** The kind that is shown for a background (a picture or photos win over a gradient, a gradient over a colour) */
export const kindOf = (bg?: Background): BackgroundKind => (bg?.folder || bg?.placeholder ? "photos" : bg?.image ? "image" : bg?.gradient ? "gradient" : bg?.color ? "color" : "none");

/** What choosing a kind starts with; the address of a picture is typed in afterwards */
export const startOf = (kind: BackgroundKind): Background | undefined =>
  ({ none: undefined, color: { color: "#1e2a3a" }, gradient: { gradient: ["#1e3a5f", "#0e0f12"], angle: 160 }, image: undefined, photos: { placeholder: "wikimedia" } })[kind];

/** Changes fields of a background; an empty value is removed, and a background with nothing left is gone */
export const withBackground = (bg: Background | undefined, patch: Partial<Record<keyof Background, unknown>>): Background | undefined => {
  const next: Record<string, unknown> = { ...bg, ...patch };
  for (const key of Object.keys(next)) if (next[key] === undefined || next[key] === "") delete next[key];
  return Object.keys(next).length ? (next as Background) : undefined;
};
