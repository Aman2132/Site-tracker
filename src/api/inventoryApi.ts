import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore';

import { firestore } from './firebaseClient';

import { InventoryEntry } from '@/types/domain';

const INVENTORY_COLLECTION = 'inventory';

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
    ...(typeof data.editedAt === 'number' ? { editedAt: data.editedAt } : {}),
    ...(pending ? { pending } : {}),
  };
}

/**
 * This person's own entries, live — including an owner's later edits. The
 * rules only allow a worker to read their own, so the query must filter on
 * personId. Returns the unsubscribe function.
 * ponytail: unbounded and sorted on the phone; add orderBy+limit with a composite index once a person has thousands.
 */
export function subscribeToMyInventory(
  personId: string,
  onChange: (entries: InventoryEntry[]) => void,
  onError: (error: Error) => void
): () => void {
  return onSnapshot(
    query(collection(firestore, INVENTORY_COLLECTION), where('personId', '==', personId)),
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
