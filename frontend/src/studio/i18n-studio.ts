// Registers the Studio's texts. Every module of the Studio imports this, so the texts are there whichever module is loaded first;
// the script that dashboards load never imports it and stays small.
import { extend } from "../i18n";
import { DE_STUDIO, FR_STUDIO, NL_STUDIO } from "./dicts";

extend({ de: DE_STUDIO, nl: NL_STUDIO, fr: FR_STUDIO });
