import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

import { THUMBNAIL } from '@/constants/config';

/**
 * A small JPEG preview of a photo, written to the cache folder. Done on the
 * phone so no server has to resize anything: the admin dashboard loads these
 * and only fetches the full-size original when a photo is opened.
 * Resolves null if it can't be made — the upload then just goes without one.
 */
export async function createThumbnail(uri: string): Promise<string | null> {
  try {
    const context = ImageManipulator.manipulate(uri);
    context.resize({ width: THUMBNAIL.widthPx });
    const image = await context.renderAsync();
    const saved = await image.saveAsync({ format: SaveFormat.JPEG, compress: THUMBNAIL.jpegQuality });
    return saved.uri;
  } catch (error) {
    console.warn('[thumbnail] could not make a preview —', error);
    return null;
  }
}
