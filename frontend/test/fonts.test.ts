// @vitest-environment happy-dom
// @vitest-environment-options {"url": "http://localhost:8123/ambidash"}
// The fonts the designs name must exist as files and be declared, so a design never falls back by accident
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { DESIGNS, resolveTokens } from "@ambi/core";
import { afterEach, describe, expect, it } from "vitest";
import { FONTS, family, registerFonts } from "../src/fonts";

afterEach(() => document.getElementById("ambidash-fonts")?.remove());

/** The families a design names for its text, headings and numbers (system fonts and var() references are left out) */
const named = (value = ""): string[] => [...value.matchAll(/"(Ambidash [^"]+)"/g)].map((m) => m[1]);

describe("fonts", () => {
  it("are shipped as files next to the integration's bundles", () => {
    for (const f of FONTS) expect(existsSync(resolve(__dirname, "../../custom_components/ambidash/frontend/fonts", f.file)), f.file).toBe(true);
  });

  it("are all named by a design, and every font a design names is one of them", () => {
    const families = new Set(FONTS.map(family));
    const used = new Set<string>();
    for (const d of DESIGNS) for (const mode of ["dark", "light"] as const) for (const key of ["font", "display", "label-font", "num-font"]) for (const name of named(resolveTokens(d.id, mode)[key])) used.add(name);
    for (const name of used) expect(families.has(name), name).toBe(true);
    for (const name of families) expect(used.has(name), `${name} is not used by any design`).toBe(true);
  });

  it("gives the hand-made designs Ambiframe's fonts: Calm sets its numbers in Fraunces and its text in Inter", () => {
    const calm = resolveTokens("calm", "dark");
    expect(calm.display).toContain("Ambidash Fraunces");
    expect(calm.font).toContain("Ambidash Inter");
    expect(resolveTokens("ruhig", "dark").display).toBe(calm.display);
  });

  it("are declared once in the document, as variable or fixed-weight files, and download nothing by themselves", () => {
    registerFonts();
    registerFonts();
    const styles = document.querySelectorAll("#ambidash-fonts");
    expect(styles).toHaveLength(1);
    const css = styles[0].textContent ?? "";
    expect(css.match(/@font-face/g)).toHaveLength(FONTS.length);
    expect(css).toContain('font-family: "Ambidash Doto"');
    expect(css).toContain('format("woff2-variations")');
    expect(css).toContain('format("woff2")');
    expect(css).toContain("/fonts/fraunces-latin-full-normal.woff2");
  });
});
