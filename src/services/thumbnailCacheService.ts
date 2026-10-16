import { Directory, File, Paths } from 'expo-file-system';

import { THUMBNAIL_CACHE } from '@/constants/config';

/**
 * Saves a backend photo's small preview on the phone so the list works offline.
 * Resolves with the saved file's URI, or null if the download failed (no
 * connection, file gone) — the photo then just keeps showing from its URL.
 */
export async function downloadThumbnail(photoId: string, url: string): Promise<string | null> {
  try {
    const folder = new Directory(Paths.document, THUMBNAIL_CACHE.dir);
    folder.create({ intermediates: true, idempotent: true });
    const file = await File.downloadFileAsync(url, new File(folder, `${photoId}.jpg`), { idempotent: true });
    return file.uri;
  } catch (error) {
    console.warn('[thumbnail cache] download failed —', error);
    return null;
  }
}
