import AsyncStorage from '@react-native-async-storage/async-storage';
import { SQLiteDatabase } from 'expo-sqlite';

import { getPhotoDatabase, PhotoRow, photosFromRows } from '@/services/photoDatabase';
import { Photo } from '@/types/domain';

/**
 * Each person's local captures, in the on-phone SQLite database (see
 * photoDatabase.ts). Every capture is kept here — synced or not — so the
 * Photos screen never depends on the backend to show what was shot on this
 * phone. Rows are filed under the person, so on a shared handset one sign-in
 * can never see or overwrite another person's list.
 *
 * Nothing here rejects: a storage failure reads as "nothing stored" and a
 * failed write is logged, because losing the screen to a storage error is worse
 * than losing one update.
 */

/** Before SQLite, each person's list was one AsyncStorage key. Read once per person, then removed. */
const OLD_KEY_PREFIX = 'photoQueue:';
/** Older still: one list for everyone on the device. */
const OLD_SHARED_KEY = 'photoQueue';

const KEEP_ROWS = `origin = 'local'`;

/**
 * Changes run one after another. Each one reads a row, changes it and writes it
 * back, so two overlapping changes (two quick shots, or a shot landing mid-sync)
 * would otherwise drop one of them.
 */
let pending: Promise<unknown> = Promise.resolve();
function serialized<T>(work: () => Promise<T>): Promise<T> {
  const next = pending.then(work, work);
  // Not a swallowed error: `next` (returned below) still carries the
  // rejection to this call's own caller. This second, discarded branch only
  // keeps `pending` itself from staying rejected forever, which would
  // otherwise jam every future call through this queue.
  pending = next.catch(() => {});
  return next;
}

async function readOldList(key: string): Promise<Photo[]> {
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

async function insertLocal(db: SQLiteDatabase, photos: Photo[]): Promise<void> {
  await db.withTransactionAsync(async () => {
    for (const photo of photos) {
      await db.runAsync(
        `INSERT OR IGNORE INTO photos (viewer_id, id, origin, taken_at, data) VALUES (?, ?, 'local', ?, ?)`,
        photo.personId,
        photo.id,
        photo.takenAt,
        JSON.stringify(photo)
      );
    }
  });
}

/**
 * Moves this person's captures from the old AsyncStorage lists into SQLite.
 * An old list is removed only after its photos are safely inserted, so a crash
 * half-way leaves them where they were and the next launch tries again.
 */
const migrations = new Map<string, Promise<void>>();
function migrateOldLists(personId: string): Promise<void> {
  let done = migrations.get(personId);
  if (!done) {
    done = (async () => {
      const db = await getPhotoDatabase();
      const ownKey = `${OLD_KEY_PREFIX}${personId}`;
      const own = await readOldList(ownKey);
      if (own.length > 0) await insertLocal(db, own);
      if ((await AsyncStorage.getItem(ownKey).catch(() => null)) !== null) await AsyncStorage.removeItem(ownKey);

      const shared = await readOldList(OLD_SHARED_KEY);
      const mine = shared.filter(photo => photo.personId === personId);
      if (mine.length > 0) {
        await insertLocal(db, mine);
        const others = shared.filter(photo => photo.personId !== personId);
        if (others.length > 0) await AsyncStorage.setItem(OLD_SHARED_KEY, JSON.stringify(others));
        else await AsyncStorage.removeItem(OLD_SHARED_KEY);
      }
    })().catch(error => {
      migrations.delete(personId); // try again next time
      throw error;
    });
    migrations.set(personId, done);
  }
  return done;
}

/** This person's captures, newest first. Never rejects — a storage failure reads as "nothing stored". */
export function loadLocalPhotos(personId: string): Promise<Photo[]> {
  return serialized(async () => {
    try {
      await migrateOldLists(personId);
      const db = await getPhotoDatabase();
      const rows = await db.getAllAsync<PhotoRow>(
        `SELECT data FROM photos WHERE viewer_id = ? AND ${KEEP_ROWS} ORDER BY taken_at DESC`,
        personId
      );
      return photosFromRows(rows);
    } catch (error) {
      console.warn('[storage] read failed —', error);
      return [];
    }
  });
}

/** Adds one capture to its owner's list. Never rejects. */
export function addLocalPhoto(photo: Photo): Promise<void> {
  return serialized(async () => {
    try {
      await insertLocal(await getPhotoDatabase(), [photo]);
    } catch (error) {
      console.warn('[storage] write failed —', error);
    }
  });
}

/** Reads one capture, applies `change`, and writes it back. A missing capture is left alone. */
function updateLocalPhoto(personId: string, id: string, change: (photo: Photo) => Photo): Promise<void> {
  return serialized(async () => {
    try {
      const db = await getPhotoDatabase();
      const row = await db.getFirstAsync<PhotoRow>(
        `SELECT data FROM photos WHERE viewer_id = ? AND id = ? AND ${KEEP_ROWS}`,
        personId,
        id
      );
      const [photo] = row ? photosFromRows([row]) : [];
      if (!photo) return;
      const next = change(photo);
      await db.runAsync(
        `UPDATE photos SET data = ? WHERE viewer_id = ? AND id = ? AND ${KEEP_ROWS}`,
        JSON.stringify(next),
        personId,
        id
      );
    } catch (error) {
      console.warn('[storage] write failed —', error);
    }
  });
}

/** Sets (or, when empty, removes) one capture's note in its owner's list. Never rejects. */
export function setLocalPhotoNote(personId: string, id: string, note: string): Promise<void> {
  return updateLocalPhoto(personId, id, photo => {
    const { note: _old, ...rest } = photo;
    return note ? { ...rest, note } : rest;
  });
}

/** Links (or with null, unlinks) a saved capture to an inventory entry. Never rejects. */
export function setLocalPhotoInventory(
  personId: string,
  id: string,
  inventoryId: string | null
): Promise<void> {
  return updateLocalPhoto(personId, id, photo => {
    const { inventoryId: _old, ...rest } = photo;
    return inventoryId ? { ...rest, inventoryId } : rest;
  });
}

/** Saves where a capture's small preview lives on the phone. Never rejects. */
export function setLocalPhotoThumb(personId: string, id: string, localThumbUri: string): Promise<void> {
  return updateLocalPhoto(personId, id, photo => ({ ...photo, localThumbUri }));
}

/** Marks the given captures synced in their owner's list. Never rejects. */
export async function markLocalPhotosSynced(personId: string, ids: string[]): Promise<void> {
  for (const id of ids) await updateLocalPhoto(personId, id, photo => ({ ...photo, synced: true }));
}

/** Removes these captures from their owner's list (the files are the caller's to delete). Never rejects. */
export function deleteLocalPhotos(personId: string, ids: string[]): Promise<void> {
  return serialized(async () => {
    if (ids.length === 0) return;
    try {
      const db = await getPhotoDatabase();
      await db.withTransactionAsync(async () => {
        for (const id of ids) {
          await db.runAsync(
            `DELETE FROM photos WHERE viewer_id = ? AND id = ? AND ${KEEP_ROWS}`,
            personId,
            id
          );
        }
      });
    } catch (error) {
      console.warn('[storage] delete failed —', error);
    }
  });
}
