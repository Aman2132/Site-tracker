import * as Location from 'expo-location';

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
