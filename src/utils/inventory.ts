import { InventoryDraft, InventoryEntry } from '@/types/domain';

/** Trims and collapses inner whitespace, so "  Cement   bag " and "Cement bag" are the same item. */
export function cleanText(text: string): string {
  return text.trim().replace(/\s+/g, ' ');
}

/** Case-insensitive identity of an item name, for grouping and suggestions. */
export const itemKey = (name: string) => cleanText(name).toLowerCase();

/** Reads a typed quantity; accepts a decimal comma ("2,5"). Null when it isn't a positive number. */
export function parseQuantity(text: string): number | null {
  const normalized = text.trim().replace(',', '.');
  if (!/^\d*\.?\d+$/.test(normalized)) return null;
  const value = Number(normalized);
  return value > 0 ? value : null;
}

/** "12", "2.5" — never "2.5000000001". */
export function formatQuantity(quantity: number): string {
  return String(Math.round(quantity * 1000) / 1000);
}

export interface DraftLimits {
  maxNameChars: number;
  maxUnitChars: number;
  maxNoteChars: number;
  maxQuantity: number;
}

/** What's wrong with a draft, in words the crew understand, or null when it can be saved. */
export function draftProblem(draft: InventoryDraft, limits: DraftLimits): string | null {
  if (!draft.siteId) return 'Pick the site.';
  if (!cleanText(draft.name)) return 'Type what was received.';
  if (cleanText(draft.name).length > limits.maxNameChars) return 'Item name is too long.';
  if (!(draft.quantity > 0)) return 'Enter how many (a number above 0).';
  if (draft.quantity > limits.maxQuantity) return 'That quantity looks too large.';
  if (!cleanText(draft.unit)) return 'Pick a unit.';
  if (cleanText(draft.unit).length > limits.maxUnitChars) return 'Unit is too long.';
  if ((draft.note ?? '').trim().length > limits.maxNoteChars) return 'Note is too long.';
  return null;
}

export interface ItemSuggestion {
  name: string;
  unit: string;
}

/**
 * Past item names that start with (or contain) what's typed, most recent
 * first, each with the unit last used for it, so "Cem" offers "Cement · bags".
 */
export function itemSuggestions(entries: InventoryEntry[], typed: string, count: number): ItemSuggestion[] {
  const query = itemKey(typed);
  const seen = new Set<string>();
  const byRecent = [...entries].sort((a, b) => b.receivedAt - a.receivedAt);
  const all: ItemSuggestion[] = [];
  for (const entry of byRecent) {
    const key = itemKey(entry.name);
    if (seen.has(key)) continue;
    seen.add(key);
    all.push({ name: entry.name, unit: entry.unit });
  }
  if (!query) return all.slice(0, count);
  const starts = all.filter(s => itemKey(s.name).startsWith(query));
  const contains = all.filter(s => !itemKey(s.name).startsWith(query) && itemKey(s.name).includes(query));
  // An exact match is already typed out; offering it again is noise.
  return [...starts, ...contains].filter(s => itemKey(s.name) !== query).slice(0, count);
}

/** The unit last used for this item name, if it was entered before. */
export function lastUnitFor(entries: InventoryEntry[], name: string): string | undefined {
  const key = itemKey(name);
  if (!key) return undefined;
  let best: InventoryEntry | undefined;
  for (const entry of entries) {
    if (itemKey(entry.name) === key && (!best || entry.receivedAt > best.receivedAt)) best = entry;
  }
  return best?.unit;
}

/**
 * The server's copy wins; entries still only on the phone (waiting to sync)
 * are added as pending. Newest first.
 */
export function mergeInventory(server: InventoryEntry[], outbox: InventoryEntry[]): InventoryEntry[] {
  const onServer = new Set(server.map(e => e.id));
  const waiting = outbox.filter(e => !onServer.has(e.id)).map(e => ({ ...e, pending: true }));
  return [...server, ...waiting].sort((a, b) => b.receivedAt - a.receivedAt);
}
