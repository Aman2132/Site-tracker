import { requireOptionalNativeModule } from 'expo';

import { PHOTO_STAMP } from '@/constants/config';
import { deleteLocalFiles, keepCaptureFile } from '@/services/localMediaService';
import { createThumbnail } from '@/services/thumbnailService';
import { Photo } from '@/types/domain';
import { needsPhotoStamp, photoStampText } from '@/utils/photoStamp';
import { captureFileName, thumbFileName } from '@/utils/photos';

interface StampResult {
  uri: string;
  width: number;
  height: number;
}

const native = requireOptionalNativeModule<{
  renderAsync(uri: string, text: string, options: typeof PHOTO_STAMP): Promise<StampResult>;
}>('PhotoStamp');

/** Device work only. Returns new files; the controller persists them before removing old derivatives. */
export async function renderPhotoStamp(photo: Photo): Promise<Photo> {
  if (!needsPhotoStamp(photo) || !photo.localStamp) return photo;
  if (!native) throw new Error('Photo stamping requires the updated Android build.');
  const created: string[] = [];
  try {
    const result = await native.renderAsync(photo.localStamp.sourceUri, photoStampText(photo), PHOTO_STAMP);
    created.push(result.uri);
    const suffix = result.uri
      .split('/')
      .pop()
      ?.replace(/^photo-stamp-/, '')
      .replace(/\.jpg$/, '');
    const name = captureFileName(photo).replace(/\.jpg$/, `_stamped-${suffix}.jpg`);
    const uri = await keepCaptureFile(result.uri, photo.personId, name);
    created.push(uri);
    const small = await createThumbnail(uri);
    if (!small) throw new Error('Could not create the stamped preview.');
    created.push(small);
    const localThumbUri = await keepCaptureFile(small, photo.personId, thumbFileName(name));
    created.push(localThumbUri);
    return {
      ...photo,
      uri,
      width: result.width,
      height: result.height,
      localThumbUri,
      localStamp: { ...photo.localStamp, renderedNote: photo.note ?? '' },
    };
  } catch (error) {
    deleteLocalFiles(created);
    throw error;
  }
}
