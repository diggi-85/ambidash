// Every text shown to users needs a German, Dutch and French version, with its placeholders intact.
// The texts are split in two files so the script every dashboard loads stays small: what the dashboard shows is in
// src/i18n-dicts.ts, what only the Studio shows is in src/studio/dicts.ts (the Studio bundle registers those).
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { DE, FR, NL } from "../src/i18n-dicts";
import { DE_STUDIO, FR_STUDIO, NL_STUDIO } from "../src/studio/dicts";

const SRC = join(__dirname, "..", "src");
const unescape = (s: string) => s.replace(/\\n/g, "\n").replace(/\\"/g, '"').replace(/\\\\/g, "\\");

/** Files only the Studio bundle contains */
const isStudio = (file: string) => file.startsWith("studio/") || file === "generate.ts";
const sources = () => (readdirSync(SRC, { recursive: true }) as string[]).filter((f) => f.endsWith(".ts") && f !== "i18n-dicts.ts" && f !== "studio/dicts.ts");

/** The texts passed to t("…") in the files that match */
const keysOf = (studio: boolean): Set<string> => {
  const keys = new Set<string>();
  for (const file of sources().filter((f) => isStudio(f) === studio)) {
    for (const m of readFileSync(join(SRC, file), "utf8").matchAll(/\bt\(\s*"((?:[^"\\\n]|\\.)*)"/g)) keys.add(unescape(m[1]));
  }
  return keys;
};
const dashboardKeys = keysOf(false);
/** What only the Studio shows; a text both use is a dashboard text */
const studioKeys = new Set([...keysOf(true)].filter((k) => !dashboardKeys.has(k)));

const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(",");
const missing = (keys: Set<string>, dict: Record<string, string>) => [...keys].filter((k) => !(k in dict)).sort();

describe.each([
  ["German", DE, DE_STUDIO],
  ["Dutch", NL, NL_STUDIO],
  ["French", FR, FR_STUDIO],
])("%s", (_name, dict, studio) => {
  it("translates every text of the dashboard", () => {
    const gone = missing(dashboardKeys, dict);
    expect(gone, `Missing translations in src/i18n-dicts.ts:\n${gone.map((k) => JSON.stringify(k)).join(",\n")}`).toEqual([]);
  });

  it("translates every text only the Studio shows", () => {
    const gone = missing(studioKeys, studio);
    expect(gone, `Missing translations in src/studio/dicts.ts:\n${gone.map((k) => JSON.stringify(k)).join(",\n")}`).toEqual([]);
  });

  it("keeps each text in the right file and has none the code no longer uses", () => {
    expect(Object.keys(dict).filter((k) => !dashboardKeys.has(k)), "in src/i18n-dicts.ts but not used by the dashboard").toEqual([]);
    expect(Object.keys(studio).filter((k) => !studioKeys.has(k)), "in src/studio/dicts.ts but used by the dashboard or by nobody").toEqual([]);
  });

  it("keeps the placeholders", () => {
    expect(Object.entries({ ...dict, ...studio }).filter(([en, text]) => placeholders(en) !== placeholders(text))).toEqual([]);
  });
});

it("finds the texts in the sources at all", () => {
  expect(dashboardKeys.size).toBeGreaterThan(15);
  expect(studioKeys.size).toBeGreaterThan(50);
});

it("keeps the dashboard's script free of the Studio: no file outside the Studio imports it", () => {
  const leaks = sources()
    .filter((f) => !isStudio(f))
    .filter((f) => /from "(\.\/|\.\.\/)studio[/"]|import "(\.\/|\.\.\/)studio[/"]/.test(readFileSync(join(SRC, f), "utf8")));
  expect(leaks).toEqual([]);
});
