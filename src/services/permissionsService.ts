import * as Location from 'expo-location';
import * as MediaLibrary from 'expo-media-library';

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
 * Write-only gallery access — enough to add a capture to the device's
 * photos, without asking to read everything already on it.
 */
export async function requestGallerySavePermission(): Promise<boolean> {
  const result = await MediaLibrary.requestPermissionsAsync(true).catch(() => null);
  return result?.granted ?? false;
}
