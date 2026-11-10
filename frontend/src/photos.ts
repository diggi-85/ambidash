// Pictures that take turns behind the tiles: a media-source folder and/or free placeholder photos Home Assistant fetches.
import type { LitElement, ReactiveController } from "lit";
import { browseFolder, placeholderPhotos, resolveImage } from "./adapter";
import type { Background, Hass } from "./types";

export interface Picture {
  url: string;
  credit: string;
}
interface Item {
  url?: string;
  mediaId?: string;
  credit: string;
}

export const PLACEHOLDER_SOURCES = ["wikimedia", "art", "nasa", "picsum", "bing"];
const RELOAD_MS = 6 * 3600e3;
const RETRY_MS = 60e3;
const DEFAULT_MINUTES = 10;

/** Does this background change its picture? Needs a folder or a known placeholder source. */
export const slideshowOn = (bg?: Background): boolean => !!bg?.folder || PLACEHOLDER_SOURCES.includes(bg?.placeholder ?? "");

export const intervalMs = (bg?: Background): number => Math.min(1440, Math.max(1, Number(bg?.interval) || DEFAULT_MINUTES)) * 60e3;

export const shuffle = <T>(list: T[], random: () => number = Math.random): T[] => {
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
};

/** The shuffled pictures of a folder and/or placeholder source, one after the other; the list is fetched again every six hours. */
export class PhotoProvider {
  private items: Item[] = [];
  private index = -1;
  private loading?: Promise<void>;
  private loadedAt = 0;

  constructor(
    private readonly getHass: () => Hass | undefined,
    private readonly getBackground: () => Background | undefined,
    private readonly random: () => number = Math.random,
  ) {}

  private async load(): Promise<void> {
    const hass = this.getHass();
    const bg = this.getBackground();
    if (!hass || !bg) return;
    let items: Item[] = [];
    if (bg.folder) {
      try {
        items = (await browseFolder(hass, bg.folder)).map((mediaId) => ({ mediaId, credit: "" }));
      } catch {
        // a folder that does not exist (yet) is no reason to stop: placeholders or the fallback picture still work
      }
    }
    if (PLACEHOLDER_SOURCES.includes(bg.placeholder ?? "") && (!items.length || bg.mix)) {
      try {
        items = [...items, ...(await placeholderPhotos(hass, bg.placeholder!, hass.language))];
      } catch {
        // the integration's internet switch is off or the source is down: carry on with what there is
      }
    }
    this.items = shuffle(items, this.random);
    this.index = -1;
    this.loadedAt = Date.now();
  }

  /** The next picture, or null when there is none (the list is asked for again on the next call). */
  async next(): Promise<Picture | null> {
    if (!this.loading || Date.now() - this.loadedAt > RELOAD_MS) this.loading = this.load();
    await this.loading;
    if (!this.items.length) {
      this.loading = undefined;
      return null;
    }
    this.index = (this.index + 1) % this.items.length;
    const item = this.items[this.index];
    const credit = this.getBackground()?.credit === false ? "" : item.credit;
    if (item.url) return { url: item.url, credit };
    const hass = this.getHass();
    if (!hass || !item.mediaId) return null;
    try {
      return { url: await resolveImage(hass, item.mediaId), credit };
    } catch {
      return null;
    }
  }
}

/** Loads a picture into the browser cache so a fade never shows an empty layer. Replaceable in tests. */
export const imageLoader = {
  load: (url: string): Promise<boolean> =>
    new Promise((resolve) => {
      const img = new Image();
      const done = (ok: boolean) => {
        clearTimeout(timer);
        resolve(ok);
      };
      const timer = setTimeout(() => done(false), 20e3);
      img.onload = () => done(true);
      img.onerror = () => done(false);
      img.src = url;
    }),
};

/**
 * Drives the two background layers of a slideshow: the hidden one gets the next picture, then it fades in.
 * Pauses while the page is hidden and starts over when the options change.
 */
export class SlideshowController implements ReactiveController {
  /** The addresses of the two layers; `front` is the visible one */
  urls: [string | undefined, string | undefined] = [undefined, undefined];
  front: 0 | 1 = 0;
  credit = "";
  private bg?: Background;
  private key = "";
  private provider?: PhotoProvider;
  private timer?: number;
  private shown = false;
  /** Increases whenever the slideshow stops or restarts, so answers that arrive late are dropped */
  private generation = 0;
  private waiting = false;

  constructor(
    private readonly host: LitElement,
    private readonly getHass: () => Hass | undefined,
  ) {
    host.addController(this);
  }

  get active(): boolean {
    return this.key !== "";
  }

  hostConnected(): void {
    document.addEventListener("visibilitychange", this.onVisibility);
    if (this.active && this.timer === undefined && !this.waiting) this.start();
  }

  hostDisconnected(): void {
    document.removeEventListener("visibilitychange", this.onVisibility);
    this.stop();
  }

  /** Call with the configured background whenever the options may have changed. */
  configure(bg?: Background): void {
    this.bg = bg;
    const key = slideshowOn(bg) ? [bg?.folder, bg?.placeholder, bg?.mix].join("|") : "";
    if (key === this.key) return;
    this.key = key;
    this.stop();
    this.urls = [undefined, undefined];
    this.front = 0;
    this.shown = false;
    this.credit = "";
    if (key && this.host.isConnected) this.start();
  }

  private start(): void {
    this.stop();
    this.provider = new PhotoProvider(this.getHass, () => this.bg);
    void this.advance(this.generation);
  }

  private stop(): void {
    this.generation++;
    this.waiting = false;
    clearTimeout(this.timer);
    this.timer = undefined;
  }

  private onVisibility = (): void => {
    if (!document.hidden && this.waiting) {
      this.waiting = false;
      void this.advance(this.generation);
    }
  };

  private schedule(ms: number): void {
    const generation = this.generation;
    this.timer = window.setTimeout(() => {
      this.timer = undefined;
      if (generation !== this.generation) return;
      // Nothing changes behind a page nobody sees; carry on when it is shown again
      if (document.hidden) this.waiting = true;
      else void this.advance(generation);
    }, ms);
  }

  private async advance(generation: number): Promise<void> {
    let picture: Picture | null = null;
    // A picture that does not load is skipped; after three in a row the next try comes in a minute
    for (let tries = 0; tries < 3 && !picture; tries++) {
      const candidate = await this.provider?.next();
      if (generation !== this.generation) return;
      if (!candidate) break;
      const ok = await imageLoader.load(candidate.url);
      if (generation !== this.generation) return;
      if (ok) picture = candidate;
    }
    if (picture) this.show(picture);
    // Nothing to show: ask for a fresh list next time (after a restart of Home Assistant the old addresses are gone)
    else this.provider = new PhotoProvider(this.getHass, () => this.bg);
    this.schedule(picture ? intervalMs(this.bg) : RETRY_MS);
  }

  private show(picture: Picture): void {
    const hidden = this.shown ? ((1 - this.front) as 0 | 1) : this.front;
    this.urls[hidden] = picture.url;
    this.front = hidden;
    this.shown = true;
    this.credit = picture.credit;
    this.host.requestUpdate();
  }
}
