import AsyncStorage from '@react-native-async-storage/async-storage';

import { InventoryEntry } from '@/types/domain';

/**
 * Entries saved on the phone but not yet confirmed by the server. Firestore's
 * own offline queue lives in memory only on React Native, so without this an
 * entry typed with no signal would be lost if the app is closed. One key per
 * person, like the photo queue.
 */

const keyFor = (personId: string) => `inventoryOutbox:${personId}`;

/** Never rejects: a storage failure or corrupt value reads as empty. */
export async function loadOutbox(personId: string): Promise<InventoryEntry[]> {
  const raw = await AsyncStorage.getItem(keyFor(personId)).catch(() => null);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as InventoryEntry[]) : [];
  } catch {
    return [];
  }
}

/** Never rejects. */
export async function saveOutbox(personId: string, entries: InventoryEntry[]): Promise<void> {
  await AsyncStorage.setItem(keyFor(personId), JSON.stringify(entries)).catch(error =>
    console.warn('[inventory] outbox write failed —', error)
  );
}
