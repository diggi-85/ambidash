// The Studio's view of a background: kinds, starting values, changing a field
import { describe, expect, it } from "vitest";
import { KINDS, kindOf, startOf, withBackground } from "../src/studio/background";

describe("background kinds", () => {
  it("names the kind of a background, picture and photos before gradient before colour", () => {
    expect(kindOf(undefined)).toBe("none");
    expect(kindOf({})).toBe("none");
    expect(kindOf({ color: "#000" })).toBe("color");
    expect(kindOf({ color: "#000", gradient: ["#000", "#fff"] })).toBe("gradient");
    expect(kindOf({ gradient: ["#000", "#fff"], image: "/local/a.jpg" })).toBe("image");
    expect(kindOf({ image: "/local/a.jpg", folder: "media-source://x" })).toBe("photos");
    expect(kindOf({ placeholder: "nasa" })).toBe("photos");
  });

  it("starts every kind with something that shows, and a start is its own kind", () => {
    expect(startOf("none")).toBeUndefined();
    expect(startOf("image")).toBeUndefined();
    for (const kind of KINDS.filter((k) => k !== "none" && k !== "image")) expect(kindOf(startOf(kind))).toBe(kind);
  });

  it("changes fields, drops empty ones and the background itself when nothing is left", () => {
    expect(withBackground(undefined, { color: "#123456" })).toEqual({ color: "#123456" });
    expect(withBackground({ color: "#123456", blur: 5 }, { blur: 9 })).toEqual({ color: "#123456", blur: 9 });
    expect(withBackground({ image: "/a.jpg", shade: "strong" }, { shade: "" })).toEqual({ image: "/a.jpg" });
    expect(withBackground({ image: "/a.jpg" }, { image: "" })).toBeUndefined();
    expect(withBackground({ credit: false }, { credit: undefined })).toBeUndefined();
    const before = { color: "#000" };
    withBackground(before, { color: "#fff" });
    expect(before).toEqual({ color: "#000" });
  });
});
