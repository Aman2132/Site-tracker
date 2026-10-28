import { LOCAL_MEDIA } from '@/constants/config';
import { DeletedPhoto, Photo } from '@/types/domain';

/**
 * Local capture ids carry their capture time plus a random suffix — two
 * captures inside the same millisecond would otherwise collide and overwrite
 * each other's file and Supabase Storage path.
 */
export function newLocalPhotoId(
  takenAt: number,
  suffix: string = Math.random().toString(36).slice(2, 8)
): string {
  return `local-${takenAt}-${suffix}`;
}

/**
 * The size a photo is shown at. The sensor is landscape, so VisionCamera reports
 * an upright phone photo as e.g. 4032x3024 with a landscape-* orientation (an
 * EXIF rotation, not rotated pixels) — swap those, so portrait shots read as portrait.
 */
export function displaySize(
  width: number,
  height: number,
  orientation: string
): { width: number; height: number } {
  return orientation.startsWith('landscape') ? { width: height, height: width } : { width, height };
}

/**
 * How many of these captures belong to each site, in first-seen order. The
 * key is the site id, or undefined for captures made while not checked in.
 */
export function countBySite(photos: Photo[]): Map<string | undefined, number> {
  const counts = new Map<string | undefined, number>();
  for (const photo of photos) counts.set(photo.siteId, (counts.get(photo.siteId) ?? 0) + 1);
  return counts;
}

/** A note as stored: trimmed and capped. Empty means "no note". */
export function cleanNote(input: string, maxChars: number): string {
  return input.trim().slice(0, maxChars).trim();
}

/**
 * What background sync should upload now: this person's unsynced captures,
 * minus the one whose note is being typed (its record can't be edited once uploaded).
 */
export function autoSyncable(photos: Photo[], personId: string, heldIds: string[]): Photo[] {
  const held = new Set(heldIds);
  return photos.filter(photo => !photo.synced && photo.personId === personId && !held.has(photo.id));
}

const LOCAL_ID = /^local-(\d+)-([a-z0-9]+)$/;

/** True for a capture made on this phone (its id comes from newLocalPhotoId); false for a backend record's id. */
export const isLocalPhotoId = (id: string): boolean => LOCAL_ID.test(id);

/** Characters Android/iOS file systems reject, plus `_`, which separates the name's fields. */
const UNSAFE_TASK_CHARS = /[\\/:*?"<>|_\u0000-\u001f]/g;

function taskForFileName(task: string): string {
  return task
    .replace(UNSAFE_TASK_CHARS, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, LOCAL_MEDIA.maxTaskChars)
    .trim();
}

/**
 * The file name a capture is stored under in the app's private folder. The
 * details are in the name too, which makes a stray file easy to identify:
 *
 *   ST_<personId>_<takenAt>_<suffix>_<lat>_<lng>_<accuracy>_<task>.jpg
 */
export function captureFileName(photo: Photo): string {
  const match = LOCAL_ID.exec(photo.id);
  const suffix = match ? match[2] : photo.id.replace(/[^a-z0-9]/gi, '').toLowerCase() || 'x';
  const ext = photo.mediaType === 'video' ? 'mp4' : 'jpg';
  return (
    [
      'ST',
      photo.personId,
      String(photo.takenAt),
      suffix,
      photo.lat.toFixed(6),
      photo.lng.toFixed(6),
      photo.accuracy.toFixed(1),
      taskForFileName(photo.task),
    ].join('_') + `.${ext}`
  );
}

/** The name for a capture's saved preview: the capture's own name with `_thumb` before the extension. */
export function thumbFileName(captureFile: string): string {
  return captureFile.replace(/(\.[a-z0-9]+)$/i, '_thumb$1');
}

/** Same capture, whichever list it came from: the backend gives uploads a new id, so match on who and when. */
export const captureKey = (photo: Photo) => `${photo.personId}|${photo.takenAt}`;

/**
 * Adds `extra` to `base`, skipping ids `base` already has. `base` wins, so an
 * entry the app already knows about is never replaced by a recovered copy.
 */
export function mergeById(base: Photo[], extra: Photo[]): Photo[] {
  const ids = new Set(base.map(photo => photo.id));
  return [...base, ...extra.filter(photo => !ids.has(photo.id))];
}

/**
 * One list for the Photos screen: every local capture, plus backend photos
 * that aren't already on the phone. A local capture the backend also has is
 * shown once, from the local file (it opens offline), marked synced.
 * Newest first.
 */
export function mergePhotoLists(local: Photo[], remote: Photo[]): Photo[] {
  const remoteKeys = new Set(remote.map(captureKey));
  const localKeys = new Set(local.map(captureKey));
  const localShown = local.map(photo =>
    !photo.synced && remoteKeys.has(captureKey(photo)) ? { ...photo, synced: true } : photo
  );
  const remoteOnly = remote.filter(photo => !localKeys.has(captureKey(photo)));
  return [...localShown, ...remoteOnly].sort((a, b) => b.takenAt - a.takenAt);
}

/** The value when every item has the same one, else '' (a batch with mixed notes starts blank). */
export function sharedValue(values: (string | undefined)[]): string {
  const first = values[0] ?? '';
  return values.every(value => (value ?? '') === first) ? first : '';
}

/**
 * Splits a photo list into what stays and what an admin deleted. A photo is
 * deleted when a deletion note names its backend id, or the same person and
 * capture time (a phone's own copy has a different id from the uploaded record).
 * A capture that hasn't synced is never deleted: the backend has never had it,
 * so no note can be about it.
 */
export function splitDeleted(photos: Photo[], deleted: DeletedPhoto[]): { keep: Photo[]; gone: Photo[] } {
  if (deleted.length === 0) return { keep: photos, gone: [] };
  const ids = new Set(deleted.map(note => note.id));
  const keys = new Set(deleted.map(note => `${note.personId}|${note.takenAt}`));
  const keep: Photo[] = [];
  const gone: Photo[] = [];
  for (const photo of photos) {
    const isGone = photo.synced && (ids.has(photo.id) || keys.has(captureKey(photo)));
    (isGone ? gone : keep).push(photo);
  }
  return { keep, gone };
}
