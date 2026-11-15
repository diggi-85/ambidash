// Small pure helpers of the Studio's steps: lists of hidden things, and values written as YAML.

/** Adds a value to a list or takes it out; an empty list is no list (the option is then left out) */
export const toggleIn = (list: string[] | undefined, value: string, on: boolean): string[] | undefined => {
  const rest = (list ?? []).filter((v) => v !== value);
  const next = on ? [...rest, value] : rest;
  return next.length ? next : undefined;
};

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

const PLAIN_KEY = /^[A-Za-z_][\w.-]*$/;
const key = (k: string): string => (PLAIN_KEY.test(k) ? k : JSON.stringify(k));

/** A multi-line string as a | block with its lines at `pad`, when that reads back the same; otherwise undefined */
const block = (s: string, pad: string): string | undefined => {
  if (!s.includes("\n") || s.includes("\r") || /^\s/.test(s) || s.split("\n").some((l) => l !== "" && l.trim() === "")) return undefined;
  const header = s.endsWith("\n\n") ? "|+" : s.endsWith("\n") ? "|" : "|-";
  const body = s.endsWith("\n") ? s.slice(0, -1) : s;
  return `${header}\n${body
    .split("\n")
    .map((l) => (l ? pad + l : l))
    .join("\n")}`;
};

// A JSON string is a valid YAML string, so quoting every other string with JSON.stringify is always safe
const scalar = (v: unknown, pad: string): string => (typeof v === "string" ? (block(v, pad) ?? JSON.stringify(v)) : String(v));

/** The value as YAML (objects, lists, strings, numbers, booleans); multi-line strings become | blocks */
export const toYaml = (value: unknown, indent = 0): string => {
  const pad = "  ".repeat(indent);
  if (Array.isArray(value)) {
    if (!value.length) return `${pad}[]`;
    return value.map((v) => `${pad}- ${isObject(v) || Array.isArray(v) ? toYaml(v, indent + 1).trimStart() : scalar(v, pad + "  ")}`).join("\n");
  }
  if (isObject(value)) {
    const keys = Object.keys(value).filter((k) => value[k] !== undefined);
    if (!keys.length) return `${pad}{}`;
    return keys
      .map((k) => {
        const v = value[k];
        const nested = (isObject(v) && Object.keys(v).length) || (Array.isArray(v) && v.length);
        return nested ? `${pad}${key(k)}:\n${toYaml(v, indent + 1)}` : `${pad}${key(k)}: ${isObject(v) ? "{}" : Array.isArray(v) ? "[]" : scalar(v, pad + "  ")}`;
      })
      .join("\n");
  }
  return `${pad}${scalar(value, pad + "  ")}`;
};
