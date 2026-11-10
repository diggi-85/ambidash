// Small pure helpers of the Studio's steps: lists of hidden things, and the options written as YAML.

/** Adds a value to a list or takes it out; an empty list is no list (the option is then left out) */
export const toggleIn = (list: string[] | undefined, value: string, on: boolean): string[] | undefined => {
  const rest = (list ?? []).filter((v) => v !== value);
  const next = on ? [...rest, value] : rest;
  return next.length ? next : undefined;
};

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
// JSON strings are valid YAML strings, so quoting everything with JSON.stringify is always safe
const scalar = (v: unknown): string => (typeof v === "string" ? JSON.stringify(v) : String(v));

/** The value as YAML (objects, lists, strings, numbers, booleans); keys are taken as they are, they are plain words here */
export const toYaml = (value: unknown, indent = 0): string => {
  const pad = "  ".repeat(indent);
  if (Array.isArray(value)) {
    if (!value.length) return `${pad}[]`;
    return value.map((v) => `${pad}- ${isObject(v) || Array.isArray(v) ? toYaml(v, indent + 1).trimStart() : scalar(v)}`).join("\n");
  }
  if (isObject(value)) {
    const keys = Object.keys(value).filter((k) => value[k] !== undefined);
    if (!keys.length) return `${pad}{}`;
    return keys
      .map((k) => {
        const v = value[k];
        const nested = (isObject(v) && Object.keys(v).length) || (Array.isArray(v) && v.length);
        return nested ? `${pad}${k}:\n${toYaml(v, indent + 1)}` : `${pad}${k}: ${isObject(v) ? "{}" : Array.isArray(v) ? "[]" : scalar(v)}`;
      })
      .join("\n");
  }
  return `${pad}${scalar(value)}`;
};
