// Minimal i18n: the source text (English for Ambidash) is the key, dictionaries hold the other languages.
export const LANGS = ["en", "de", "nl", "fr"] as const;
export type Lang = (typeof LANGS)[number];
export type Dict = Record<string, string>;

const LOCALES: Record<Lang, string> = { en: "en-GB", de: "de-DE", nl: "nl-NL", fr: "fr-FR" };
const isLang = (l?: string): l is Lang => !!l && (LANGS as readonly string[]).includes(l);

export const createI18n = (dicts: Partial<Record<Lang, Dict>>) => {
  let current: Lang = "en";
  return {
    lang: (): Lang => current,
    setLang: (l: Lang): void => {
      current = l;
    },
    /** An explicit setting wins; "auto" or empty follows the HA user's language; unknown languages become English. */
    resolveLang: (setting?: string, hassLanguage?: string): Lang => {
      if (isLang(setting)) return setting;
      const l = (hassLanguage || (typeof navigator !== "undefined" ? navigator.language : "") || "en").toLowerCase().split("-")[0];
      return isLang(l) ? l : "en";
    },
    /** Locale for dates and numbers */
    locale: (): string => LOCALES[current],
    /** Translate; `{name}` is replaced by `vars.name`. A missing translation shows the English source. */
    t: (text: string, vars?: Record<string, string | number>): string => {
      const s = dicts[current]?.[text] ?? text;
      return vars ? s.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? "")) : s;
    },
  };
};
