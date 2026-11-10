// Every text shown to users needs a German, Dutch and French version, with its placeholders intact
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { DE, FR, NL } from "../src/i18n-dicts";

const SRC = join(__dirname, "..", "src");
const unescape = (s: string) => s.replace(/\\n/g, "\n").replace(/\\"/g, '"').replace(/\\\\/g, "\\");

/** All texts passed to t("…") in the sources */
const sourceKeys = (): Set<string> => {
  const keys = new Set<string>();
  for (const file of (readdirSync(SRC, { recursive: true }) as string[]).filter((f) => f.endsWith(".ts") && f !== "i18n-dicts.ts")) {
    for (const m of readFileSync(join(SRC, file), "utf8").matchAll(/\bt\(\s*"((?:[^"\\\n]|\\.)*)"/g)) keys.add(unescape(m[1]));
  }
  return keys;
};

const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(",");

describe.each([
  ["German", DE],
  ["Dutch", NL],
  ["French", FR],
])("%s", (_name, dict) => {
  it("translates every text", () => {
    const missing = [...sourceKeys()].filter((k) => !(k in dict)).sort();
    expect(missing, `Missing translations:\n${missing.map((k) => JSON.stringify(k)).join(",\n")}`).toEqual([]);
  });

  it("has no text the code no longer uses", () => {
    const keys = sourceKeys();
    expect(Object.keys(dict).filter((k) => !keys.has(k))).toEqual([]);
  });

  it("keeps the placeholders", () => {
    expect(Object.entries(dict).filter(([en, text]) => placeholders(en) !== placeholders(text))).toEqual([]);
  });
});

it("finds the texts in the sources at all", () => {
  expect(sourceKeys().size).toBeGreaterThan(15);
});
