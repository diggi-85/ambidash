import { describe, expect, it } from "vitest";
import { createI18n } from "../src";

const i18n = () => createI18n({ de: { "Hello {name}": "Hallo {name}", Off: "Aus" } });

describe("i18n", () => {
  it("shows the English source in English and when a translation is missing", () => {
    const { t, setLang } = i18n();
    expect(t("Hello {name}", { name: "Ben" })).toBe("Hello Ben");
    setLang("de");
    expect(t("Not translated")).toBe("Not translated");
  });

  it("translates and fills placeholders", () => {
    const { t, setLang, lang, locale } = i18n();
    setLang("de");
    expect(lang()).toBe("de");
    expect(locale()).toBe("de-DE");
    expect(t("Hello {name}", { name: "Ben" })).toBe("Hallo Ben");
    expect(t("Off")).toBe("Aus");
  });

  it("takes texts that are added later, for the languages they are given in, and lets the later text win", () => {
    const { t, setLang, extend } = i18n();
    setLang("de");
    expect(t("Studio")).toBe("Studio");
    extend({ de: { Studio: "Atelier", Off: "Weg" }, fr: { Studio: "Atelier" } });
    expect(t("Studio")).toBe("Atelier");
    expect(t("Hello {name}", { name: "Ben" })).toBe("Hallo Ben");
    expect(t("Off")).toBe("Weg");
    setLang("fr");
    expect(t("Studio")).toBe("Atelier");
    setLang("nl");
    expect(t("Studio")).toBe("Studio");
  });

  it("resolves the language: setting before HA user, unknown becomes English", () => {
    const { resolveLang } = i18n();
    expect(resolveLang("fr", "de")).toBe("fr");
    expect(resolveLang("auto", "de-AT")).toBe("de");
    expect(resolveLang(undefined, "nl-BE")).toBe("nl");
    expect(resolveLang(undefined, "es")).toBe("en");
  });
});
