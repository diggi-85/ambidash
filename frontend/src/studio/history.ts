/** Undo and redo for the Studio: snapshots of the state before each change. */
const LIMIT = 100;
/** Changes with the same key this close together count as one step (typing in a field). */
const COALESCE_MS = 1000;

export class History<T> {
  private past: T[] = [];
  private future: T[] = [];
  private lastKey?: string;
  private lastAt = 0;

  constructor(private readonly now: () => number = Date.now) {}

  get canUndo(): boolean {
    return this.past.length > 0;
  }

  get canRedo(): boolean {
    return this.future.length > 0;
  }

  reset(): void {
    this.past = [];
    this.future = [];
    this.lastKey = undefined;
  }

  /** Call with the state as it was before a change. */
  record(before: T, key?: string): void {
    const at = this.now();
    const same = key !== undefined && key === this.lastKey && at - this.lastAt < COALESCE_MS;
    this.lastKey = key;
    this.lastAt = at;
    this.future = [];
    if (same) return;
    this.past.push(before);
    if (this.past.length > LIMIT) this.past.shift();
  }

  /** The state one step back, or undefined when there is none; `current` can be brought back with redo. */
  undo(current: T): T | undefined {
    const before = this.past.pop();
    if (before === undefined) return undefined;
    this.future.push(current);
    this.lastKey = undefined;
    return before;
  }

  redo(current: T): T | undefined {
    const next = this.future.pop();
    if (next === undefined) return undefined;
    this.past.push(current);
    this.lastKey = undefined;
    return next;
  }
}
