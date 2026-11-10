// Undo and redo of the Studio
import { describe, expect, it } from "vitest";
import { History } from "../src/studio/history";

describe("history", () => {
  it("goes back and forth through the recorded states", () => {
    const h = new History<string>();
    expect([h.canUndo, h.canRedo]).toEqual([false, false]);
    h.record("a");
    h.record("b");
    expect(h.undo("c")).toBe("b");
    expect(h.undo("b")).toBe("a");
    expect(h.undo("a")).toBeUndefined();
    expect([h.canUndo, h.canRedo]).toEqual([false, true]);
    expect(h.redo("a")).toBe("b");
    expect(h.redo("b")).toBe("c");
    expect(h.redo("c")).toBeUndefined();
  });

  it("forgets the steps ahead when something new is recorded", () => {
    const h = new History<string>();
    h.record("a");
    h.undo("b");
    h.record("a");
    expect(h.canRedo).toBe(false);
  });

  it("counts quick changes of one field as one step, but not slow ones or other fields", () => {
    let now = 0;
    const h = new History<string>(() => now);
    h.record("a", "name");
    now = 400;
    h.record("ab", "name");
    now = 800;
    h.record("abc", "name");
    expect(h.undo("abcd")).toBe("a");
    expect(h.undo("a")).toBeUndefined();

    now = 5000;
    h.record("x", "name");
    now = 7000;
    h.record("xy", "name");
    now = 7100;
    h.record("xyz", "design");
    expect(h.undo("xyzz")).toBe("xyz");
    expect(h.undo("xyz")).toBe("xy");
    expect(h.undo("xy")).toBe("x");
  });

  it("keeps the last hundred steps and can be cleared", () => {
    const h = new History<number>();
    for (let i = 0; i < 150; i++) h.record(i);
    let steps = 0;
    while (h.undo(0) !== undefined) steps++;
    expect(steps).toBe(100);
    h.record(1);
    h.reset();
    expect([h.canUndo, h.canRedo]).toEqual([false, false]);
  });
});
