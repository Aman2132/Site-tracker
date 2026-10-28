import { Directory, File, Paths } from 'expo-file-system';

import { LOCAL_MEDIA } from '@/constants/config';

/**
 * Moves a fresh capture out of the camera's cache folder — which Android may
 * empty whenever it's short on space — into the app's document directory,
 * under one folder per person. Returns the new file's URI.
 *
 * Throws if the move fails; the caller keeps the original URI then, so a
 * failed move never costs the worker the shot.
 */
export async function keepCaptureFile(uri: string, personId: string, fileName: string): Promise<string> {
  const folder = new Directory(Paths.document, LOCAL_MEDIA.captureDir, personId);
  folder.create({ intermediates: true, idempotent: true });
  const file = new File(uri);
  await file.move(new File(folder, fileName), { overwrite: true });
  return file.uri;
}

/**
 * Deletes files from the phone for good. Only files on the phone (`file://`)
 * are touched: a web address is skipped. A file that is already gone, or one
 * that can't be deleted, is skipped — never throws — so one bad path can't stop
 * the rest. Returns how many files were actually removed.
 */
export function deleteLocalFiles(uris: (string | undefined)[]): number {
  let removed = 0;
  for (const uri of new Set(uris)) {
    if (!uri?.startsWith('file:')) continue;
    try {
      const file = new File(uri);
      if (!file.exists) continue;
      file.delete();
      removed += 1;
    } catch (error) {
      console.warn('[files] could not delete', uri, '—', error);
    }
  }
  return removed;
}
