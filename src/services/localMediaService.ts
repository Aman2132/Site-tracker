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
