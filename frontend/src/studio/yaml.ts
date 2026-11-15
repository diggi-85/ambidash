// A small YAML reader for card configurations pasted from Home Assistant: the part of YAML its own editors write
// (block maps and lists, flow lists and maps, quoted and plain scalars, | and > blocks, comments, a leading ---).
// Anything else (anchors, aliases, tags, multi-line plain or quoted scalars, tabs) is an error with its line, never a guess.
// Scalars follow YAML 1.2: only true/false/null/~ and plain numbers are not strings (so `on` and `yes` stay strings).

export class YamlError extends Error {}

const fail = (message: string, n: number): never => {
  throw new YamlError(`line ${n}: ${message}`);
};

/** The text without a trailing comment: a # at the start or after a space, outside quotes */
const stripComment = (s: string): string => {
  let quote = "";
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (quote) {
      if (c === "\\" && quote === '"') i++;
      else if (c === quote) {
        if (quote === "'" && s[i + 1] === "'") i++;
        else quote = "";
      }
    } else if ((c === '"' || c === "'") && (i === 0 || /[\s[{,]/.test(s[i - 1]))) quote = c;
    else if (c === "#" && (i === 0 || /\s/.test(s[i - 1]))) return s.slice(0, i).trimEnd();
  }
  return s.trimEnd();
};

const NUMBER = /^-?(0|[1-9]\d*)(\.\d+)?([eE][+-]?\d+)?$/;
const typed = (s: string): unknown => {
  if (s === "" || s === "~" || /^(null|Null|NULL)$/.test(s)) return null;
  if (/^(true|True|TRUE)$/.test(s)) return true;
  if (/^(false|False|FALSE)$/.test(s)) return false;
  return NUMBER.test(s) ? Number(s) : s;
};

const ESCAPES: Record<string, string> = { n: "\n", t: "\t", r: "\r", "0": "\0", '"': '"', "\\": "\\", "/": "/", " ": " ", e: "\x1b", a: "\x07", b: "\b", f: "\f", v: "\v" };

/** Reads one line of flow style: [a, b], {a: 1}, quoted and plain scalars */
class Flow {
  i = 0;
  constructor(
    private s: string,
    private n: number,
  ) {}

  private ws(): void {
    while (this.s[this.i] === " ") this.i++;
  }

  value(): unknown {
    this.ws();
    const c = this.s[this.i];
    if (c === "[") return this.seq();
    if (c === "{") return this.map();
    if (c === '"' || c === "'") return this.quoted();
    return this.plain();
  }

  end(): void {
    this.ws();
    if (this.i < this.s.length) fail("unexpected text after the value", this.n);
  }

  quoted(): string {
    const q = this.s[this.i++];
    let out = "";
    for (;;) {
      if (this.i >= this.s.length) return fail("unterminated string (strings cannot span lines)", this.n);
      const c = this.s[this.i++];
      if (q === "'") {
        if (c !== "'") out += c;
        else if (this.s[this.i] === "'") (out += "'", this.i++);
        else return out;
      } else if (c === '"') return out;
      else if (c !== "\\") out += c;
      else {
        const e = this.s[this.i++];
        const hex = { x: 2, u: 4, U: 8 }[e];
        if (hex) {
          const digits = this.s.slice(this.i, this.i + hex);
          if (!new RegExp(`^[0-9a-fA-F]{${hex}}$`).test(digits)) fail("bad escape in string", this.n);
          out += String.fromCodePoint(parseInt(digits, 16));
          this.i += hex;
        } else if (e in ESCAPES) out += ESCAPES[e];
        else fail(`unknown escape \\${e}`, this.n);
      }
    }
  }

  private plain(): unknown {
    const start = this.i;
    while (this.i < this.s.length && !",]}".includes(this.s[this.i])) this.i++;
    const text = this.s.slice(start, this.i).trim();
    if (/^[&*!]/.test(text)) fail("anchors, aliases and tags are not supported", this.n);
    return typed(text);
  }

  private seq(): unknown[] {
    this.i++;
    const out: unknown[] = [];
    for (;;) {
      this.ws();
      if (this.s[this.i] === "]") return (this.i++, out);
      out.push(this.value());
      this.ws();
      if (this.s[this.i] === ",") this.i++;
      else if (this.s[this.i] === "]") return (this.i++, out);
      else fail("expected , or ]", this.n);
    }
  }

  private map(): Record<string, unknown> {
    this.i++;
    const out: Record<string, unknown> = {};
    for (;;) {
      this.ws();
      if (this.s[this.i] === "}") return (this.i++, out);
      let key: string;
      if (this.s[this.i] === '"' || this.s[this.i] === "'") key = this.quoted();
      else {
        const start = this.i;
        while (this.i < this.s.length && !(this.s[this.i] === ":" && (this.s[this.i + 1] === " " || this.i + 1 >= this.s.length))) {
          if (",}".includes(this.s[this.i])) fail("expected : after a key", this.n);
          this.i++;
        }
        key = this.s.slice(start, this.i).trim();
      }
      this.ws();
      if (this.s[this.i] !== ":") fail("expected : after a key", this.n);
      this.i++;
      if (key === "__proto__") fail("this key is not allowed", this.n);
      out[key] = this.value();
      this.ws();
      if (this.s[this.i] === ",") this.i++;
      else if (this.s[this.i] === "}") return (this.i++, out);
      else fail("expected , or }", this.n);
    }
  }
}

interface Line {
  n: number;
  indent: number;
  raw: string;
}

/** The YAML text as a value (object, list, string, number, boolean or null); throws a YamlError that names the line */
export const parseYaml = (source: string): unknown => {
  const lines: Line[] = source.split(/\r?\n/).map((raw, i) => {
    if (/^ *\t/.test(raw)) fail("tabs cannot be used to indent", i + 1);
    return { n: i + 1, indent: raw.length - raw.trimStart().length, raw };
  });
  let pos = 0;

  const text = (l: Line): string => stripComment(l.raw.slice(l.indent));
  const skip = (): void => {
    while (pos < lines.length && text(lines[pos]) === "") pos++;
  };
  const isSeq = (t: string): boolean => t === "-" || t.startsWith("- ");

  const splitKey = (t: string, n: number): [string, string] | undefined => {
    if (t[0] === '"' || t[0] === "'") {
      const f = new Flow(t, n);
      const key = f.quoted();
      return t[f.i] === ":" && (t[f.i + 1] === undefined || t[f.i + 1] === " ") ? [key, t.slice(f.i + 1).trim()] : undefined;
    }
    if (t[0] === "[" || t[0] === "{") return undefined;
    const at = t.includes(": ") ? t.indexOf(": ") : t.endsWith(":") ? t.length - 1 : -1;
    return at < 0 ? undefined : [t.slice(0, at).trim(), t.slice(at + 1).trim()];
  };

  const inline = (t: string, n: number): unknown => {
    if (/^[&*!]/.test(t)) fail("anchors, aliases and tags are not supported", n);
    if (t[0] === "[" || t[0] === "{" || t[0] === '"' || t[0] === "'") {
      const f = new Flow(t, n);
      const v = f.value();
      f.end();
      return v;
    }
    return typed(t);
  };

  /** A | or > block: the lines indented deeper than `parent`, from the position after the header */
  const block = (header: string, parent: number, n: number): string => {
    if (/\d/.test(header)) fail("an indentation indicator after | or > is not supported", n);
    const body: string[] = [];
    let width = -1;
    while (pos < lines.length) {
      const l = lines[pos];
      const empty = l.raw.trim() === "";
      if (!empty) {
        if (width < 0) {
          if (l.indent <= parent) break;
          width = l.indent;
        } else if (l.indent < width) break;
      }
      body.push(empty ? "" : l.raw.slice(width));
      pos++;
    }
    let end = body.length;
    while (end > 0 && body[end - 1] === "") end--;
    const kept = body.length - end;
    const rows = body.slice(0, end);
    let out = rows[0] ?? "";
    for (let i = 1; i < rows.length; i++) {
      if (header[0] === "|") out += "\n" + rows[i];
      else if (rows[i] === "") out += "\n";
      else if (rows[i - 1] === "") out += rows[i];
      else out += rows[i].startsWith(" ") || rows[i - 1].startsWith(" ") ? "\n" + rows[i] : " " + rows[i];
    }
    if (!rows.length) return "";
    return header.endsWith("-") ? out : header.endsWith("+") ? out + "\n" + "\n".repeat(kept) : out + "\n";
  };

  const value = (rest: string, line: Line, indent: number): unknown => {
    if (rest === "") {
      skip();
      const next = lines[pos];
      return next && (next.indent > indent || (next.indent === indent && isSeq(text(next)))) ? node() : null;
    }
    if (/^[|>][+-]?\d?$/.test(rest)) return block(rest, indent, line.n);
    return inline(rest, line.n);
  };

  const map = (indent: number): Record<string, unknown> => {
    const out: Record<string, unknown> = {};
    for (;;) {
      skip();
      if (pos >= lines.length || lines[pos].indent < indent) return out;
      const line = lines[pos];
      if (line.indent > indent) fail("unexpected indentation", line.n);
      const kv = splitKey(text(line), line.n);
      if (!kv) return fail(isSeq(text(line)) ? "a list item where a key was expected" : "expected key: value", line.n);
      const [key, rest] = kv;
      if (!key) fail("a key is empty", line.n);
      if (key === "__proto__") fail("this key is not allowed", line.n);
      if (key in out) fail(`the key "${key}" appears twice`, line.n);
      pos++;
      out[key] = value(rest, line, indent);
    }
  };

  const seq = (indent: number): unknown[] => {
    const out: unknown[] = [];
    for (;;) {
      skip();
      if (pos >= lines.length) return out;
      const line = lines[pos];
      if (line.indent > indent) fail("unexpected indentation", line.n);
      if (line.indent < indent || !isSeq(text(line))) return out;
      const after = text(line).slice(1);
      const rest = after.trimStart();
      if (rest === "") {
        pos++;
        skip();
        const next = lines[pos];
        out.push(next && next.indent > indent ? node() : null);
      } else if (/^[|>][+-]?\d?$/.test(rest)) {
        pos++;
        out.push(block(rest, indent, line.n));
      } else {
        // the item starts on the dash line: treat what follows the dash as a line of its own
        const col = indent + 1 + (after.length - rest.length);
        lines[pos] = { n: line.n, indent: col, raw: " ".repeat(col) + rest };
        out.push(node());
      }
    }
  };

  const node = (): unknown => {
    const line = lines[pos];
    const t = text(line);
    if (isSeq(t)) return seq(line.indent);
    if (splitKey(t, line.n)) return map(line.indent);
    pos++;
    return inline(t, line.n);
  };

  skip();
  if (pos < lines.length && text(lines[pos]) === "---") (pos++, skip());
  if (pos >= lines.length) return null;
  const result = node();
  skip();
  if (pos < lines.length) fail("unexpected content or indentation", lines[pos].n);
  return result;
};
