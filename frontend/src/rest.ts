// The Ruhemodus: after some minutes without a touch the dashboard shows a calm clock instead of its page. This controller keeps the
// time and the state; the root card draws the layer. See RestConfig in types.ts for the options.
import type { ReactiveController, ReactiveControllerHost } from "lit";
import type { Device, RestConfig } from "./types";

/** Minutes without a touch before it starts, and how much the background is darkened (percent), when the options do not say */
export const REST_AFTER = 5;
export const REST_DIM = 40;
const DEFAULT_DEVICES: Device[] = ["tablet", "wall"];
/** How far the clock may drift from the middle, in px, so that no pixel stays lit all night */
const SHIFT = 14;
/** What counts as using the dashboard (not the pointer moving: that would be too many events) */
const ACTIVITY = ["pointerdown", "wheel", "scroll"] as const;

export class RestController implements ReactiveController {
  /** The Ruhemodus is on */
  resting = false;
  /** Where the clock sits against burn-in, in px from the middle; a new place every minute while resting */
  shift: [number, number] = [0, 0];
  private config?: RestConfig;
  private device: Device = "tablet";
  private auto = true;
  /** It was started by "try it" and not by the time without a touch */
  private tried = false;
  private timer?: number;
  private shiftTimer?: number;
  private last = 0;

  /** `canRest` says whether it may run now: no pop-up is open and the conditions of the options hold */
  constructor(
    private host: ReactiveControllerHost,
    private canRest: () => boolean,
  ) {
    host.addController(this);
  }

  hostConnected(): void {
    for (const type of ACTIVITY) document.addEventListener(type, this.activity, { capture: true, passive: true });
    document.addEventListener("keydown", this.key, { capture: true });
    this.arm();
  }

  hostDisconnected(): void {
    for (const type of ACTIVITY) document.removeEventListener(type, this.activity, { capture: true });
    document.removeEventListener("keydown", this.key, { capture: true });
    clearTimeout(this.timer);
    clearTimeout(this.shiftTimer);
    this.timer = this.shiftTimer = undefined;
    this.resting = false;
  }

  /** It is on for this dashboard and this device class */
  private get applies(): boolean {
    return !!this.config && (this.config.devices ?? DEFAULT_DEVICES).includes(this.device);
  }

  /** Called with every update of the card: what the options say, which device class it is, and whether it may start by itself (the Studio's preview may not) */
  configure(config: RestConfig | undefined, device: Device, auto: boolean): void {
    if (config === this.config && device === this.device && auto === this.auto) return;
    this.config = config;
    this.device = device;
    this.auto = auto;
    if (!config && this.resting) this.wake();
    else this.arm();
  }

  /** Starts it now. `tried` is the Studio's "try it": whatever the device class and the conditions say, it stays until somebody wakes it */
  start(tried = false): void {
    if (this.resting) return;
    clearTimeout(this.timer);
    this.resting = true;
    this.tried = tried;
    this.drift();
    this.host.requestUpdate();
  }

  /** Called with every update of the card: one that started by itself ends as soon as it may not run any more (its conditions stopped holding) */
  check(): void {
    if (this.resting && !this.tried && !this.canRest()) this.wake();
  }

  wake(): void {
    if (!this.resting) return;
    this.resting = false;
    this.tried = false;
    clearTimeout(this.shiftTimer);
    this.shiftTimer = undefined;
    this.arm();
    this.host.requestUpdate();
  }

  /** Waits for the time without a touch to pass, counted anew; when it may not start then (a pop-up is open, the conditions do not hold) it asks again every minute at the latest */
  private arm(delay = (this.config?.after ?? REST_AFTER) * 60_000): void {
    clearTimeout(this.timer);
    this.timer = undefined;
    if (this.resting || !this.auto || !this.applies) return;
    this.timer = window.setTimeout(() => (this.canRest() ? this.start() : this.arm(Math.min(delay, 60_000))), delay);
  }

  /** A new place for the clock now, and again every minute */
  private drift(): void {
    const minute = Math.floor(Date.now() / 60_000);
    const span = 2 * SHIFT + 1;
    this.shift = [((minute * 7) % span) - SHIFT, ((minute * 11) % span) - SHIFT];
    this.shiftTimer = window.setTimeout(() => {
      this.drift();
      this.host.requestUpdate();
    }, 60_000 - (Date.now() % 60_000) + 50);
  }

  /** Somebody touched, scrolled or turned the wheel somewhere: the time without a touch starts again (at most once a second) */
  private activity = (): void => {
    const now = Date.now();
    if (this.resting || now - this.last < 1000) return;
    this.last = now;
    this.arm();
  };

  /** Any key wakes it and does nothing else; otherwise a key counts like a touch */
  private key = (event: KeyboardEvent): void => {
    if (this.resting) {
      event.preventDefault();
      event.stopPropagation();
      this.wake();
    } else this.activity();
  };
}
