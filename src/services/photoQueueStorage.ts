import AsyncStorage from '@react-native-async-storage/async-storage';

import { Photo } from '@/types/domain';

/**
 * Typed AsyncStorage wrapper for each person's local captures. One key per
 * person, so on a shared handset one sign-in can never overwrite another
 * person's list. Every capture is kept here — synced or not — so the Photos
 * screen never depends on the backend to show what was shot on this phone.
 */

/** Pre-per-person key: one list for everyone on the device. Read once per person to carry their photos over. */
const LEGACY_KEY = 'photoQueue';
const keyFor = (personId: string) => `photoQueue:${personId}`;

async function readList(key: string): Promise<Photo[]> {
  const raw = await AsyncStorage.getItem(key).catch(() => null);
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Photo[]) : [];
  } catch {
    // A half-written value after a crash mid-save. Losing it is bad; crashing
    // on every launch is worse.
    return [];
  }
}

async function writeList(personId: string, photos: Photo[]): Promise<void> {
  await AsyncStorage.setItem(keyFor(personId), JSON.stringify(photos)).catch(() => {});
}

/**
 * Writes run one after another. Each one reads the list, changes it and
 * writes it back, so two overlapping writes (two quick shots, or a shot
 * landing mid-sync) would otherwise drop one of them.
 */
let pending: Promise<unknown> = Promise.resolve();
function serialized<T>(work: () => Promise<T>): Promise<T> {
  const next = pending.then(work, work);
  pending = next.catch(() => {});
  return next;
}

/**
 * This person's captures, including any still sitting in the old shared list.
 * Never rejects — a storage failure reads as "nothing stored".
 */
export function loadLocalPhotos(personId: string): Promise<Photo[]> {
  return serialized(async () => {
    const own = await readList(keyFor(personId));
    const ids = new Set(own.map(photo => photo.id));
    const carried = (await readList(LEGACY_KEY)).filter(
      photo => photo.personId === personId && !ids.has(photo.id)
    );
    if (carried.length === 0) return own;
    const merged = [...own, ...carried];
    await writeList(personId, merged);
    return merged;
  });
}

/** Replaces this person's stored list. Never rejects. */
export function saveLocalPhotos(personId: string, photos: Photo[]): Promise<void> {
  return serialized(() => writeList(personId, photos));
}

/** Adds one capture to the front of its owner's list. Never rejects. */
export function addLocalPhoto(photo: Photo): Promise<void> {
  return serialized(async () => {
    const own = await readList(keyFor(photo.personId));
    if (own.some(existing => existing.id === photo.id)) return;
    await writeList(photo.personId, [photo, ...own]);
  });
}

/** Marks the given captures synced in their owner's list. Never rejects. */
export function markLocalPhotosSynced(personId: string, ids: string[]): Promise<void> {
  const synced = new Set(ids);
  return serialized(async () => {
    const own = await readList(keyFor(personId));
    await writeList(
      personId,
      own.map(photo => (synced.has(photo.id) ? { ...photo, synced: true } : photo))
    );
  });
}
