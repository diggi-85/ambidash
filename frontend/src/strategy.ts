// Dashboard strategy `custom:ambidash`: one panel view holding the root card; the card builds everything itself.
import type { AmbidashConfig } from "./types";

export type StrategyConfig = AmbidashConfig & { type: string };

export class AmbidashStrategy extends HTMLElement {
  /** The card builds its own model from the registries, so registry changes must not regenerate the dashboard. */
  static registryDependencies: string[] = [];

  static async generate(config: StrategyConfig): Promise<{ title: string; views: object[] }> {
    const { type: _type, ...options } = config;
    const title = options.title ?? "Ambidash";
    return { title, views: [{ type: "panel", path: "home", title, cards: [{ type: "custom:ambidash-root", ...options }] }] };
  }
}
