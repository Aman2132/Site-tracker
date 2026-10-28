import { getPhotoDatabase, PhotoRow, photosFromRows } from '@/services/photoDatabase';
import { Photo } from '@/types/domain';

/**
 * The backend's photo list as it was the last time a fetch succeeded, kept in
 * SQLite so the Photos screen still shows other people's photos offline. These
 * rows are only a copy — the backend is the truth — so a successful fetch
 * replaces them wholesale (which also drops anything an admin has since deleted).
 *
 * Nothing here rejects: a storage failure reads as "nothing cached".
 */

const REMOTE_ROWS = `origin = 'remote'`;

/** What the backend last returned for this person's view of the world, newest first. */
export async function loadCachedRemotePhotos(viewerId: string): Promise<Photo[]> {
  try {
    const db = await getPhotoDatabase();
    const rows = await db.getAllAsync<PhotoRow>(
      `SELECT data FROM photos WHERE viewer_id = ? AND ${REMOTE_ROWS} ORDER BY taken_at DESC`,
      viewerId
    );
    return photosFromRows(rows);
  } catch (error) {
    console.warn('[remote cache] read failed —', error);
    return [];
  }
}

/**
 * Makes the cache match this fetch. A photo already cached keeps its saved
 * preview if its backend preview hasn't changed. Resolves with the on-phone
 * previews no longer needed (their photos left the list) so the caller can
 * delete those files.
 */
export async function replaceCachedRemotePhotos(viewerId: string, photos: Photo[]): Promise<string[]> {
  try {
    const db = await getPhotoDatabase();
    const before = new Map((await loadCachedRemotePhotos(viewerId)).map(photo => [photo.id, photo]));
    const stillThere = new Set(photos.map(photo => photo.id));
    const unneeded = [...before.values()]
      .filter(photo => !stillThere.has(photo.id) && photo.localThumbUri)
      .map(photo => photo.localThumbUri as string);

    await db.withTransactionAsync(async () => {
      await db.runAsync(`DELETE FROM photos WHERE viewer_id = ? AND ${REMOTE_ROWS}`, viewerId);
      for (const photo of photos) {
        const old = before.get(photo.id);
        const keepThumb = old?.localThumbUri && old.thumbUrl === photo.thumbUrl ? old.localThumbUri : undefined;
        await db.runAsync(
          `INSERT OR REPLACE INTO photos (viewer_id, id, origin, taken_at, data) VALUES (?, ?, 'remote', ?, ?)`,
          viewerId,
          photo.id,
          photo.takenAt,
          JSON.stringify(keepThumb ? { ...photo, localThumbUri: keepThumb } : photo)
        );
      }
    });
    return unneeded;
  } catch (error) {
    console.warn('[remote cache] write failed —', error);
    return [];
  }
}

/** Records where each downloaded preview lives on the phone (photo id → file URI). */
export async function setCachedRemoteThumbs(viewerId: string, thumbs: Record<string, string>): Promise<void> {
  try {
    const db = await getPhotoDatabase();
    const cached = await loadCachedRemotePhotos(viewerId);
    await db.withTransactionAsync(async () => {
      for (const photo of cached) {
        const uri = thumbs[photo.id];
        if (!uri) continue;
        await db.runAsync(
          `UPDATE photos SET data = ? WHERE viewer_id = ? AND id = ? AND ${REMOTE_ROWS}`,
          JSON.stringify({ ...photo, localThumbUri: uri }),
          viewerId,
          photo.id
        );
      }
    });
  } catch (error) {
    console.warn('[remote cache] write failed —', error);
  }
}

/** Drops these photos from the cache (an admin deleted them). Never rejects. */
export async function deleteCachedRemotePhotos(viewerId: string, ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  try {
    const db = await getPhotoDatabase();
    await db.withTransactionAsync(async () => {
      for (const id of ids) {
        await db.runAsync(`DELETE FROM photos WHERE viewer_id = ? AND id = ? AND ${REMOTE_ROWS}`, viewerId, id);
      }
    });
  } catch (error) {
    console.warn('[remote cache] delete failed —', error);
  }
}
