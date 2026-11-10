// Ambidash spike – throwaway. Proves: strategy `custom:ambidash` -> one full-screen tile with live state.
//   strategy: { type: custom:ambidash, entity: sun.sun, fit: overlay | inline }
// fit=overlay: tile covers the whole window (position:fixed, like Ambiframe's panel) – works without any kiosk plugin.
// fit=inline : tile fills the panel view only – HA header (and sidebar) stay visible.

const css = {
  overlay: "position:fixed;inset:0;z-index:100;",
  inline: "display:block;height:100%;",
};

class AmbidashTile extends HTMLElement {
  setConfig(config) {
    this._config = config;
    this._render();
  }

  set hass(hass) {
    this._hass = hass;
    this._render();
  }

  getCardSize() {
    return 8;
  }

  // Layout is only known after attach; re-measure on resize (the diagnostics line shows the real size)
  connectedCallback() {
    this._ro = new ResizeObserver(() => this._render());
    this._ro.observe(document.documentElement);
  }

  disconnectedCallback() {
    this._ro?.disconnect();
  }

  _render() {
    if (!this._config || !this._hass) return;
    const { entity, fit = "overlay" } = this._config;
    const state = this._hass.states[entity];
    const r = this.getBoundingClientRect();
    const device = [
      "fully" in window ? "Fully" : "",
      /Home Assistant\//.test(navigator.userAgent) ? "HA app" : "",
      matchMedia("(display-mode: standalone)").matches ? "standalone" : "",
    ]
      .filter(Boolean)
      .join(" + ") || "browser";
    this.style.cssText = `${css[fit] ?? css.overlay}background:#0a0d0b;color:#ede7db;font-family:system-ui,sans-serif;`;
    this.innerHTML = `
      <div style="height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1rem">
        <div style="opacity:.5;letter-spacing:.16em;text-transform:uppercase">${state?.attributes.friendly_name ?? entity}</div>
        <div id="state" style="font-size:12vmin;font-weight:300">${state?.state ?? "–"}</div>
        <div style="opacity:.4;font:14px ui-monospace,monospace">
          fit=${fit} · tile ${Math.round(r.width)}×${Math.round(r.height)} at ${Math.round(r.left)},${Math.round(r.top)}
          · window ${innerWidth}×${innerHeight} · ${device} · user ${this._hass.user?.name}
        </div>
      </div>`;
  }
}

class AmbidashStrategy extends HTMLElement {
  static async generate(config) {
    const card = { type: "custom:ambidash-tile", entity: config.entity ?? "sun.sun", fit: config.fit };
    return { title: "Ambidash", views: [{ type: "panel", path: "home", title: "Home", cards: [card] }] };
  }
}

if (!customElements.get("ambidash-tile")) customElements.define("ambidash-tile", AmbidashTile);
if (!customElements.get("ll-strategy-dashboard-ambidash")) customElements.define("ll-strategy-dashboard-ambidash", AmbidashStrategy);

window.customStrategies = window.customStrategies || [];
window.customStrategies.push({
  type: "ambidash",
  strategyType: "dashboard",
  name: "Ambidash (spike)",
  description: "One full-screen tile with live state.",
});
