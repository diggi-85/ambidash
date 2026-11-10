// The fonts the designs use, the same ones Ambiframe ships (local files, no Google request). The list is in fonts.json.
import list from "./fonts.json";

export interface FontInfo {
  id: string;
  name: string;
  kind: "serif" | "sans";
  file: string;
  weight: string;
}

export const FONTS = list as FontInfo[];

/** The family name designs use for a font: "Ambidash Fraunces" (Ambiframe's is "Ambiframe Fraunces") */
export const family = (font: FontInfo): string => `Ambidash ${font.name.replace(/ \(.*\)$/, "")}`;

/** The declarations must be in the document, not in a shadow root, to work inside the cards' shadow DOMs. Nothing downloads until a design uses a font. */
export const registerFonts = (): void => {
  if (typeof document === "undefined" || document.getElementById("ambidash-fonts")) return;
  const style = document.createElement("style");
  style.id = "ambidash-fonts";
  // The folder this bundle was loaded from (plain string work: bundlers rewrite `new URL(…, import.meta.url)` into something else)
  const base = import.meta.url.replace(/[^/]*$/, "");
  style.textContent = FONTS.map((f) => {
    const url = `${base}fonts/${f.file}`;
    const format = f.weight.includes(" ") ? "woff2-variations" : "woff2";
    return `@font-face { font-family: "${family(f)}"; font-style: normal; font-display: swap; font-weight: ${f.weight}; src: url("${url}") format("${format}"); }`;
  }).join("\n");
  document.head.appendChild(style);
};
