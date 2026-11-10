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

  it("resolves the language: setting before HA user, unknown becomes English", () => {
    const { resolveLang } = i18n();
    expect(resolveLang("fr", "de")).toBe("fr");
    expect(resolveLang("auto", "de-AT")).toBe("de");
    expect(resolveLang(undefined, "nl-BE")).toBe("nl");
    expect(resolveLang(undefined, "es")).toBe("en");
  });
});
