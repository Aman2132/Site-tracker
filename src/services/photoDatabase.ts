import { openDatabaseAsync, SQLiteDatabase } from 'expo-sqlite';

import { PHOTO_DATABASE } from '@/constants/config';
import { Photo } from '@/types/domain';

/**
 * The one on-phone SQLite database. Opens it on first use and makes sure the
 * photos table exists; every service that stores photos goes through here.
 *
 * `photos` holds two kinds of row, told apart by `origin`:
 *  - 'local'  — a capture taken on this phone by `viewer_id`. The only copy of
 *               it until it syncs, so these rows are never cleared on their own.
 *  - 'remote' — a photo the backend returned for `viewer_id`, kept so the list
 *               shows offline. Replaced wholesale on every successful fetch.
 * `data` is the whole Photo as JSON; the other columns are only what queries need.
 */
let opening: Promise<SQLiteDatabase> | null = null;

async function open(): Promise<SQLiteDatabase> {
  const db = await openDatabaseAsync(PHOTO_DATABASE.fileName);
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS photos (
      viewer_id TEXT NOT NULL,
      id TEXT NOT NULL,
      origin TEXT NOT NULL CHECK (origin IN ('local', 'remote')),
      taken_at INTEGER NOT NULL,
      data TEXT NOT NULL,
      PRIMARY KEY (viewer_id, id)
    );
    CREATE INDEX IF NOT EXISTS photos_by_viewer ON photos (viewer_id, origin, taken_at DESC);
  `);
  return db;
}

export function getPhotoDatabase(): Promise<SQLiteDatabase> {
  if (!opening) {
    opening = open().catch(error => {
      // Not cached: the next call tries again instead of failing for good.
      opening = null;
      throw error;
    });
  }
  return opening;
}

/** A row as the queries return it: just the JSON column. */
export interface PhotoRow {
  data: string;
}

/** The photos in these rows. A row whose JSON is damaged is skipped rather than failing the whole list. */
export function photosFromRows(rows: PhotoRow[]): Photo[] {
  const photos: Photo[] = [];
  for (const row of rows) {
    try {
      photos.push(JSON.parse(row.data) as Photo);
    } catch {
      console.warn('[photos] skipped an unreadable row');
    }
  }
  return photos;
}
