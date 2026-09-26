import * as MediaLibrary from 'expo-media-library/legacy';

import { LOCAL_MEDIA } from '@/constants/config';

/**
 * Copies a finished capture into the device gallery, inside the
 * LOCAL_MEDIA.galleryAlbum album, so it shows up in Photos/Gallery and its
 * baked-in GPS EXIF is readable by any app that inspects image metadata.
 *
 * Unlike the app's own copy, this one survives an uninstall — it's what the
 * Photos list is rebuilt from after a reinstall (see listGalleryCaptures).
 * Callers still treat it as best-effort: failing here must never cost the
 * worker the capture.
 */
export async function saveToDeviceGallery(uri: string): Promise<void> {
  const album = await MediaLibrary.getAlbumAsync(LOCAL_MEDIA.galleryAlbum);
  if (album) {
    await MediaLibrary.createAssetAsync(uri, album);
    return;
  }
  // Android can't create an empty album, so the first capture creates it —
  // straight from the file. Creating the asset first and then moving it in
  // made Android 11+ ask "Allow Site Tracker to modify this photo?".
  await MediaLibrary.createAlbumAsync(LOCAL_MEDIA.galleryAlbum, undefined, undefined, uri);
}

export interface GalleryCapture {
  filename: string;
  uri: string;
  /** Only set for videos. */
  durationMs?: number;
}

/** Every photo and video in the app's gallery album. Empty if the album doesn't exist yet. */
export async function listGalleryCaptures(): Promise<GalleryCapture[]> {
  const album = await MediaLibrary.getAlbumAsync(LOCAL_MEDIA.galleryAlbum);
  if (!album) return [];

  const captures: GalleryCapture[] = [];
  let after: string | undefined;
  for (;;) {
    const page = await MediaLibrary.getAssetsAsync({
      album,
      mediaType: [MediaLibrary.MediaType.photo, MediaLibrary.MediaType.video],
      first: LOCAL_MEDIA.galleryPageSize,
      after,
    });
    for (const asset of page.assets) {
      captures.push({
        filename: asset.filename,
        uri: asset.uri,
        ...(asset.mediaType === MediaLibrary.MediaType.video
          ? { durationMs: Math.round(asset.duration * 1000) }
          : {}),
      });
    }
    if (!page.hasNextPage) return captures;
    after = page.endCursor;
  }
}
