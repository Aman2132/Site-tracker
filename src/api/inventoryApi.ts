import {
  arrayUnion,
  collection,
  doc,
  getDoc,
  increment,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';

import { firestore } from './firebaseClient';

import { InventoryEntry, UsageLogEntry } from '@/types/domain';

const INVENTORY_COLLECTION = 'inventory';
/** Firestore caps a field `in` query at this many values, same as sitesApi's documentId one. */
const IN_QUERY_LIMIT = 30;

/** A fresh id made on the phone, so an entry saved offline keeps the same id when it reaches the server. */
export function newInventoryId(): string {
  return doc(collection(firestore, INVENTORY_COLLECTION)).id;
}

function toEntry(id: string, data: Record<string, unknown>, pending: boolean): InventoryEntry {
  return {
    id,
    personId: String(data.personId ?? ''),
    personName: String(data.personName ?? ''),
    siteId: String(data.siteId ?? ''),
    name: String(data.name ?? ''),
    quantity: Number(data.quantity ?? 0),
    unit: String(data.unit ?? ''),
    receivedAt: Number(data.receivedAt ?? 0),
    ...(typeof data.note === 'string' && data.note ? { note: data.note } : {}),
    ...(typeof data.usedQuantity === 'number' ? { usedQuantity: data.usedQuantity } : {}),
    ...(typeof data.packCount === 'number' && typeof data.packSize === 'number'
      ? { packCount: data.packCount, packSize: data.packSize }
      : {}),
    ...(Array.isArray(data.usage) ? { usage: data.usage as UsageLogEntry[] } : {}),
    ...(typeof data.editedAt === 'number' ? { editedAt: data.editedAt } : {}),
    ...(pending ? { pending } : {}),
  };
}

/**
 * Every entry for the given sites, live — what everyone assigned there
 * received and used, including an owner's later edits. The rules let a
 * worker read any entry whose siteId is in their own siteIds, so the query
 * must filter the same way. Returns the unsubscribe function.
 * ponytail: unbounded and sorted on the phone; add orderBy+limit with a composite index once a site has thousands.
 */
export function subscribeToSiteInventory(
  siteIds: string[],
  onChange: (entries: InventoryEntry[]) => void,
  onError: (error: Error) => void
): () => void {
  const ids = siteIds.slice(0, IN_QUERY_LIMIT);
  if (ids.length === 0) {
    onChange([]);
    return () => {};
  }
  return onSnapshot(
    query(collection(firestore, INVENTORY_COLLECTION), where('siteId', 'in', ids)),
    snapshot => onChange(snapshot.docs.map(d => toEntry(d.id, d.data(), d.metadata.hasPendingWrites))),
    onError
  );
}

/**
 * Creates the entry under its phone-made id. Resolves once the server has it
 * (stays pending while offline). The crew can never edit or delete it after.
 */
export async function createInventoryEntry(entry: InventoryEntry): Promise<void> {
  const { id, pending: _pending, ...fields } = entry;
  await setDoc(doc(firestore, INVENTORY_COLLECTION, id), { ...fields, createdAt: serverTimestamp() });
}

/** Whether the server already has this entry (an earlier send got through before the app closed). */
export async function inventoryEntryExists(id: string): Promise<boolean> {
  return (await getDoc(doc(firestore, INVENTORY_COLLECTION, id))).exists();
}

/**
 * Appends one usage entry and bumps the running total. firestore.rules only
 * lets the entry's own creator do this, and only this (every other field is
 * locked once created).
 */
export async function logInventoryUsage(id: string, quantity: number, note: string): Promise<void> {
  const trimmed = note.trim();
  const usage: UsageLogEntry = { quantity, at: Date.now(), ...(trimmed ? { note: trimmed } : {}) };
  await updateDoc(doc(firestore, INVENTORY_COLLECTION, id), {
    usage: arrayUnion(usage),
    usedQuantity: increment(quantity),
  });
}
