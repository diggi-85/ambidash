import { createI18n } from "@ambi/core";
import { DE, FR, NL } from "./i18n-dicts";

/** `extend` adds the texts of a part that loads later (the Studio, see studio/i18n-studio.ts) */
export const { t, lang, setLang, resolveLang, extend, locale } =createI18n({ de: DE, nl: NL, fr: FR });
