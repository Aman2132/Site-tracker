/** Trims and caps a typed task label; blank falls back to `fallback`. */
export function cleanTask(input: string, maxChars: number, fallback: string): string {
  const task = input.replace(/\s+/g, ' ').trim().slice(0, maxChars).trim();
  return task || fallback;
}

/** `task` goes to the front of the recent list (no repeats, case-insensitive), capped at `count`. */
export function rememberTask(recent: string[], task: string, count: number): string[] {
  const rest = recent.filter(item => item.toLowerCase() !== task.toLowerCase());
  return [task, ...rest].slice(0, count);
}
