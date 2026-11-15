// @vitest-environment happy-dom
// @vitest-environment-options {"url": "http://localhost:8123/ambidash"}
// The clock widget: the time and the date in the language, a tick on the minute (second), nothing left running when it is gone
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { setLang } from "../src/i18n";
import "../src/clock";
import type { AmbidashClock } from "../src/clock";

const mount = async (props: Partial<Pick<AmbidashClock, "format" | "seconds" | "date">> = {}): Promise<AmbidashClock> => {
  const el = document.createElement("ambidash-clock") as AmbidashClock;
  Object.assign(el, props);
  document.body.append(el);
  await el.updateComplete;
  return el;
};
const time = (el: AmbidashClock) => el.shadowRoot!.querySelector(".time")!.textContent!.replace(/\s+/g, " ").trim();
const date = (el: AmbidashClock) => el.shadowRoot!.querySelector(".date")?.textContent?.trim();

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 10, 12, 21, 5, 9)); // Thursday, local time
});

afterEach(() => {
  vi.useRealTimers();
  document.body.innerHTML = "";
  setLang("en");
});

describe("clock", () => {
  it("shows the time and the date, with a colon of its own to colour", async () => {
    const el = await mount();
    expect(time(el)).toBe("21:05");
    expect(el.shadowRoot!.querySelectorAll(".colon")).toHaveLength(1);
    expect(date(el)).toMatch(/Thursday.*12.*November/);
    expect(el.shadowRoot!.querySelector("time")!.getAttribute("datetime")).toBe(new Date(2026, 10, 12, 21, 5, 9).toISOString());
  });

  it("shows seconds when asked, and no date when switched off", async () => {
    const el = await mount({ seconds: true, date: false });
    expect(time(el)).toBe("21:05:09");
    expect(el.shadowRoot!.querySelectorAll(".colon")).toHaveLength(2);
    expect(date(el)).toBeUndefined();
  });

  it("writes 12 hours with the period, and 24 hours with two digits", async () => {
    const twelve = await mount({ format: "12" });
    expect(time(twelve)).toMatch(/^9:05\s?pm$/i);
    expect(twelve.shadowRoot!.querySelector(".period")?.textContent?.toLowerCase()).toBe("pm");
    vi.setSystemTime(new Date(2026, 10, 12, 0, 7, 0));
    const midnight = await mount({ format: "24" });
    expect(time(midnight)).toBe("00:07");
  });

  it("follows the language: German writes the date in German", async () => {
    setLang("de");
    const el = await mount();
    expect(date(el)).toMatch(/Donnerstag.*12.*November/);
    expect(time(el)).toBe("21:05");
  });

  it("changes on the minute, not before", async () => {
    const el = await mount();
    await vi.advanceTimersByTimeAsync(40_000);
    await el.updateComplete;
    expect(time(el)).toBe("21:05");
    await vi.advanceTimersByTimeAsync(12_000);
    await el.updateComplete;
    expect(time(el)).toBe("21:06");
  });

  it("changes every second when it shows seconds, and goes back to the minute when they are switched off", async () => {
    const el = await mount({ seconds: true });
    await vi.advanceTimersByTimeAsync(1_100);
    await el.updateComplete;
    expect(time(el)).toBe("21:05:10");
    el.seconds = false;
    await el.updateComplete;
    await vi.advanceTimersByTimeAsync(2_000);
    await el.updateComplete;
    expect(time(el)).toBe("21:05");
  });

  it("catches up when the page is shown again, and leaves no timer behind when it is removed", async () => {
    const el = await mount();
    vi.setSystemTime(new Date(2026, 10, 12, 22, 30, 0));
    document.dispatchEvent(new Event("visibilitychange"));
    await el.updateComplete;
    expect(time(el)).toBe("22:30");
    el.remove();
    expect(vi.getTimerCount()).toBe(0);
    document.dispatchEvent(new Event("visibilitychange"));
    expect(vi.getTimerCount()).toBe(0);
  });
});
