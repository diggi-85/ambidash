// Entry point: defines the strategy, the root card, the tile and the widgets as cards of their own, and offers Ambidash in the "Add dashboard" dialog.
import "./root";
import "./single";
import "./tile";
import { AmbidashStrategy } from "./strategy";

if (!customElements.get("ll-strategy-dashboard-ambidash")) customElements.define("ll-strategy-dashboard-ambidash", AmbidashStrategy);

// Settings → Dashboards → Add dashboard → Community dashboards
const w = window as unknown as { customStrategies?: { type: string; strategyType: string; name: string; description: string }[] };
w.customStrategies = w.customStrategies ?? [];
if (!w.customStrategies.some((s) => s.type === "ambidash")) {
  w.customStrategies.push({ type: "ambidash", strategyType: "dashboard", name: "Ambidash", description: "A dashboard built from your floors, areas and devices" });
}
