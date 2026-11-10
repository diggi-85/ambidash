// What a tile shows and does for an entity: pure logic, no DOM.
import { t } from "./i18n";
import type { HassEntity } from "./types";

export type Action = "toggle" | "activate" | "playpause" | "info";

export interface TileView {
  on: boolean;
  unavailable: boolean;
  status: string;
  /** Icon bubble colour while on, and the glyph colour on it (CSS values) */
  color: string;
  glyph: string;
  action: Action;
  /** [domain, service] a tap calls; absent when a tap opens the detail dialog */
  service?: [string, string];
}

const BY_DOMAIN = { light: "var(--ambi-c-light)", cover: "var(--ambi-c-cover)", media_player: "var(--ambi-c-media)" } as const;
const GLYPH = "var(--ambi-glyph)";
const ACCENT = { color: "var(--ambi-accent)", glyph: "var(--ambi-on-accent)" };
// Gates and doors open only through the detail dialog, never from a single tap.
// shortcut: the dialog is the confirmation; a real confirm step comes with the detail sheets (M1)
const CRITICAL_COVERS = new Set(["garage", "gate", "door"]);

const round = (n: number): string => String(Math.round(n * 10) / 10);
const onOff = (on: boolean): string => (on ? t("On") : t("Off"));

export const tileView = (s: HassEntity): TileView => {
  const a = s.attributes;
  const domain = s.entity_id.slice(0, s.entity_id.indexOf("."));
  const base = { unavailable: false, ...ACCENT };

  if (s.state === "unavailable") return { ...base, on: false, unavailable: true, status: t("Unavailable"), action: "info" };

  switch (domain) {
    case "light": {
      const on = s.state === "on";
      const pct = typeof a.brightness === "number" ? Math.round((a.brightness / 255) * 100) : undefined;
      const status = on && pct !== undefined ? t("On · {pct}%", { pct }) : onOff(on);
      return { ...base, on, status, color: BY_DOMAIN.light, glyph: GLYPH, action: "toggle", service: ["light", "toggle"] };
    }
    case "switch": {
      const on = s.state === "on";
      return { ...base, on, status: onOff(on), action: "toggle", service: ["switch", "toggle"] };
    }
    case "climate": {
      const on = s.state !== "off";
      const heating = a.hvac_action === "heating";
      const cooling = a.hvac_action === "cooling";
      const current = typeof a.current_temperature === "number" ? a.current_temperature : undefined;
      const target = typeof a.temperature === "number" ? a.temperature : undefined;
      let status = onOff(on);
      if (on && current !== undefined) status = target !== undefined ? t("{current}° · target {target}°", { current: round(current), target: round(target) }) : `${round(current)}°`;
      if (heating) return { ...base, on, status, color: "var(--ambi-c-heat)", glyph: GLYPH, action: "info" };
      if (cooling) return { ...base, on, status, color: "var(--ambi-c-cool)", glyph: GLYPH, action: "info" };
      return { ...base, on, status, action: "info" };
    }
    case "cover": {
      const status: Record<string, string> = { closed: t("Closed"), opening: t("Opening"), closing: t("Closing") };
      const pct = typeof a.current_position === "number" && a.current_position < 100 ? a.current_position : undefined;
      const text = status[s.state] ?? (pct !== undefined ? t("Open · {pct}%", { pct }) : t("Open"));
      const critical = CRITICAL_COVERS.has(a.device_class);
      return { ...base, on: s.state !== "closed", status: text, color: BY_DOMAIN.cover, glyph: GLYPH, action: critical ? "info" : "toggle", ...(critical ? {} : { service: ["cover", "toggle"] as [string, string] }) };
    }
    case "media_player": {
      const playing = s.state === "playing";
      const labels: Record<string, string> = { paused: t("Paused"), idle: t("Idle"), off: t("Off") };
      const status = playing ? ((a.media_title as string | undefined) || t("Playing")) : (labels[s.state] ?? s.state);
      const controllable = playing || s.state === "paused";
      return { ...base, on: playing, status, color: BY_DOMAIN.media_player, glyph: GLYPH, action: controllable ? "playpause" : "info", ...(controllable ? { service: ["media_player", "media_play_pause"] as [string, string] } : {}) };
    }
    case "scene":
      return { ...base, on: false, status: t("Scene"), action: "activate", service: ["scene", "turn_on"] };
    default:
      return { ...base, on: s.state === "on", status: s.state, action: "info" };
  }
};
