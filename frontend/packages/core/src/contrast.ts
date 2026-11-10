// WCAG contrast helpers. Colours may be #rgb, #rrggbb, rgb() or rgba(); translucent colours are
// composited over what lies behind them. Used by the tests today, by the Studio for custom designs later.
export type Rgba = [number, number, number, number];

export const parseColor = (value: string): Rgba => {
  const v = value.trim().toLowerCase();
  if (v === "transparent") return [0, 0, 0, 0];
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/.exec(v);
  if (hex) {
    const h = hex[1].length === 3 ? [...hex[1]].map((c) => c + c).join("") : hex[1];
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16), 1];
  }
  const fn = /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+)\s*)?\)$/.exec(v);
  if (fn) return [Number(fn[1]), Number(fn[2]), Number(fn[3]), fn[4] === undefined ? 1 : Number(fn[4])];
  throw new Error(`Unsupported colour: ${value}`);
};

/** `fg` laid over an opaque `bg`; the result is opaque. */
const over = (fg: Rgba, bg: Rgba): Rgba => [0, 1, 2].map((i) => fg[i] * fg[3] + bg[i] * (1 - fg[3])).concat(1) as Rgba;

const linear = (c: number): number => {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};

export const luminance = ([r, g, b]: Rgba): number => 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);

/** Contrast ratio of `fg` on `bg`. A translucent `bg` needs the opaque colour behind it as `base`. */
export const contrast = (fg: string, bg: string, base: string = bg): number => {
  const ground = over(parseColor(bg), parseColor(base));
  const text = over(parseColor(fg), ground);
  const [hi, lo] = [luminance(text), luminance(ground)].sort((a, b) => b - a);
  return (hi + 0.05) / (lo + 0.05);
};
