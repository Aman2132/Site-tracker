import * as MediaLibrary from 'expo-media-library';

/**
 * Copies a finished photo into the device's own gallery (DCIM), so it shows
 * up in Photos/Gallery alongside every other picture on the phone and its
 * baked-in GPS EXIF is readable by any app that inspects image metadata.
 *
 * This is deliberately a *second* copy: the app's own queue in
 * usePhotoStore/AsyncStorage stays the source of truth for syncing, and the
 * gallery copy is a convenience for the worker. Failing to save here must
 * never cost them the capture, so callers treat it as best-effort.
 */
export async function saveToDeviceGallery(uri: string): Promise<void> {
  await MediaLibrary.saveToLibraryAsync(uri);
}
