import { Directory, File, Paths } from 'expo-file-system';
import { Asset, requestPermissionsAsync } from 'expo-media-library';
import * as Sharing from 'expo-sharing';

import { Photo } from '@/types/domain';

const EXPORT_DIRECTORY = 'photo-exports';

/** Gets a local, shareable copy. Remote originals are downloaded only on demand. */
async function localExportUri(photo: Photo): Promise<string> {
  if (photo.uri.startsWith('file:')) return photo.uri;

  const folder = new Directory(Paths.cache, EXPORT_DIRECTORY);
  folder.create({ intermediates: true, idempotent: true });
  const extension = photo.mediaType === 'video' ? 'mp4' : 'jpg';
  const file = await File.downloadFileAsync(photo.uri, new File(folder, `${photo.id}.${extension}`), {
    idempotent: true,
  });
  return file.uri;
}

/** Saves a full-resolution capture to the device gallery after a user action. */
export async function savePhotoToGallery(photo: Photo): Promise<void> {
  const permission = await requestPermissionsAsync(true, ['photo']);
  if (!permission.granted) throw new Error('Gallery permission was not granted.');
  await Asset.create(await localExportUri(photo));
}

/** Opens Android's native share drawer with the original full-resolution capture. */
export async function sharePhoto(photo: Photo): Promise<void> {
  if (!(await Sharing.isAvailableAsync())) throw new Error('Sharing is not available on this device.');
  await Sharing.shareAsync(await localExportUri(photo), {
    mimeType: photo.mediaType === 'video' ? 'video/mp4' : 'image/jpeg',
    dialogTitle: 'Share photo',
  });
}
