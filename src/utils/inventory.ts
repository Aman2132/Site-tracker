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
  if (draft.packCount != null || draft.packSize != null) {
    if (!(draft.packCount! > 0) || !(draft.packSize! > 0))
      return 'Enter how many pieces and how much each is.';
    if (Math.abs(packTotal(draft.packCount!, draft.packSize!) - draft.quantity) > 1e-6)
      return 'Total does not match the pieces.';
  }
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

/** Count × size, rounded like formatQuantity so 3 × 0.1 is 0.3, not 0.30000000000000004. */
export function packTotal(count: number, size: number): number {
  return Math.round(count * size * 1000) / 1000;
}

/** "5 × 5 m" for a pack entry, else null. */
export function formatPack(entry: Pick<InventoryEntry, 'packCount' | 'packSize' | 'unit'>): string | null {
  if (!entry.packCount || !entry.packSize) return null;
  return `${formatQuantity(entry.packCount)} × ${formatQuantity(entry.packSize)} ${entry.unit}`;
}

/** Everything received has been logged as used (allowing for rounding). */
export function isUsedUp(entry: InventoryEntry): boolean {
  return (entry.usedQuantity ?? 0) >= entry.quantity - 1e-9;
}

/** 0–1 share used, for the progress bar. */
export function usedShare(entry: InventoryEntry): number {
  return entry.quantity > 0 ? Math.min(1, (entry.usedQuantity ?? 0) / entry.quantity) : 0;
}

/** What's left of a delivery (never negative, even if more was logged used than received). */
export function remainingQuantity(entry: InventoryEntry): number {
  return Math.max(0, entry.quantity - (entry.usedQuantity ?? 0));
}

/** What's wrong with a usage amount for this entry, or null when it can be logged. */
export function usageProblem(
  entry: InventoryEntry,
  quantity: number,
  note: string,
  maxNoteChars: number
): string | null {
  if (!(quantity > 0)) return 'Enter how much was used (a number above 0).';
  if (quantity > remainingQuantity(entry))
    return `Only ${formatQuantity(remainingQuantity(entry))} ${entry.unit} left to log.`;
  if (note.trim().length > maxNoteChars) return 'Note is too long.';
  return null;
}

/**
 * Entries a photo may be attached to as proof: the person's own, already on
 * the server (a link to a never-synced id would dangle), not yet used up, at the photo's site
 * when it has one. Newest first, at most `limit`.
 */
export function linkableEntries(
  entries: InventoryEntry[],
  personId: string,
  siteId: string | undefined,
  limit = 8
): InventoryEntry[] {
  return entries
    // Used-up deliveries are finished: nothing left to photograph being used.
    .filter(e => e.personId === personId && !e.pending && !isUsedUp(e) && (!siteId || e.siteId === siteId))
    .sort((a, b) => b.receivedAt - a.receivedAt)
    .slice(0, limit);
}
