import { LOCAL_MEDIA } from '@/constants/config';
import { MediaKind, Photo } from '@/types/domain';
import { plusCodeFor } from '@/utils/geo';

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

const LOCAL_ID = /^local-(\d+)-([a-z0-9]+)$/;

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
 * The file name a capture is stored and saved to the gallery under. Everything
 * needed to list it again is in the name itself, so after a reinstall the
 * Photos list can be rebuilt from the gallery album alone — without reading
 * EXIF, which Android redacts GPS from and videos don't have at all.
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

const CAPTURE_FILE_NAME =
  /^ST_(.+)_(\d+)_([a-z0-9]+)_(-?\d+(?:\.\d+)?)_(-?\d+(?:\.\d+)?)_(\d+(?:\.\d+)?)_([^_]*)\.(jpg|mp4)$/i;

interface GalleryFile {
  filename: string;
  uri: string;
  durationMs?: number;
}

/**
 * Turns a gallery file back into a Photo, or null if the name wasn't written
 * by captureFileName (someone else's picture that ended up in the album).
 * Recovered captures start unsynced; mergePhotoLists flips any the backend
 * already has.
 */
export function photoFromCaptureFileName({ filename, uri, durationMs }: GalleryFile): Photo | null {
  const match = CAPTURE_FILE_NAME.exec(filename);
  if (!match) return null;
  const [, personId, takenAtText, suffix, latText, lngText, accuracyText, task, ext] = match;
  const takenAt = Number(takenAtText);
  const lat = Number(latText);
  const lng = Number(lngText);
  const mediaType: MediaKind = ext.toLowerCase() === 'mp4' ? 'video' : 'photo';
  return {
    id: newLocalPhotoId(takenAt, suffix.toLowerCase()),
    uri,
    mediaType,
    ...(mediaType === 'video' && durationMs != null ? { durationMs } : {}),
    lat,
    lng,
    accuracy: Number(accuracyText),
    plusCode: plusCodeFor({ lat, lng }),
    takenAt,
    personId,
    task,
    synced: false,
  };
}

/** Same capture, whichever list it came from: the backend gives uploads a new id, so match on who and when. */
const captureKey = (photo: Photo) => `${photo.personId}|${photo.takenAt}`;

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
