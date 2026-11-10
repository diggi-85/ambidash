// "Create from areas": a starting layout made from the floors and areas Home Assistant knows, to be moved around afterwards.
import { t } from "./i18n";
import type { Model } from "./model";
import type { LayoutItem, Page } from "./types";

/** One page per floor, the first with the summary and the scenes on top; every area is a heading followed by its tiles. */
export const generatePages = (model: Model): Page[] => {
  let n = 0;
  const id = (prefix: string): string => `${prefix}${++n}`;
  const pages: Page[] = [];
  for (const floor of model.floors) {
    const items: LayoutItem[] = [];
    for (const area of floor.areas) {
      items.push({ id: id("h"), type: "heading", text: area.name });
      for (const tile of area.items) items.push({ id: id("t"), type: "tile", entity: tile.id });
    }
    pages.push({ id: `page-${pages.length + 1}`, name: floor.name || t("Home"), items });
  }
  const top: LayoutItem[] = [{ id: id("s"), type: "summary" }];
  if (model.scenes.length) {
    top.push({ id: id("h"), type: "heading", text: t("Scenes") });
    for (const scene of model.scenes) top.push({ id: id("t"), type: "tile", entity: scene.id });
  }
  if (!pages.length) return model.scenes.length ? [{ id: "page-1", name: t("Home"), items: top }] : [];
  pages[0].items.unshift(...top);
  return pages;
};
