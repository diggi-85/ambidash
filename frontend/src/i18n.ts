import { createI18n } from "@ambi/core";
import { DE, FR, NL } from "./i18n-dicts";

export const { t, setLang, resolveLang } = createI18n({ de: DE, nl: NL, fr: FR });
