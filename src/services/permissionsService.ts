import * as Location from 'expo-location';
import * as MediaLibrary from 'expo-media-library/legacy';

import { LocationPermissionState } from '@/types/domain';

/**
 * Device permission requests. Pure I/O against the OS — no app state lives
 * here, so it can be unit-tested or swapped without touching controllers.
 */
export async function requestLocationPermissions(): Promise<LocationPermissionState> {
  const foreground = await Location.requestForegroundPermissionsAsync();
  if (foreground.status !== 'granted') return { granted: false, background: false };

  const background = await Location.requestBackgroundPermissionsAsync();
  return { granted: true, background: background.status === 'granted' };
}

/**
 * Gallery access, so a capture can be added to the device's photos.
 */
export async function requestGallerySavePermission(): Promise<boolean> {
  // writeOnly must stay false: on Android 13+ a write-only request asks for
  // nothing but ACCESS_MEDIA_LOCATION, which never shows a dialog and is just
  // denied — the gallery save then silently never happens.
  // Photos + videos only. Without this, Android 13+ also asks for audio files,
  // which we never touch and which makes the prompt confusing or refused.
  const result = await MediaLibrary.requestPermissionsAsync(false, ['photo', 'video']).catch(e => {
    console.warn('[permissions] media-library request threw —', e);
    return null;
  });
  console.log(
    `[permissions] media-library: status=${result?.status} granted=${result?.granted} canAskAgain=${result?.canAskAgain}`
  );
  return result?.granted ?? false;
}
