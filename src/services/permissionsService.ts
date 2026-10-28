import * as Location from 'expo-location';
import { Linking } from 'react-native';

import { LocationAccess, LocationPermissionState } from '@/types/domain';

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
 * Opens this app's page in the phone's Settings. The only way forward once a
 * permission has been refused for good: Android then stops showing the prompt,
 * and a request returns "denied" without asking.
 */
export async function openAppSettings(): Promise<void> {
  await Linking.openSettings().catch(error => console.warn('[permissions] opening Settings failed —', error));
}

/**
 * Foreground location only — enough for the owner's "my location" map
 * button, without asking an owner for background tracking they don't need.
 */
export async function requestForegroundLocationPermission(): Promise<boolean> {
  const result = await Location.requestForegroundPermissionsAsync().catch(() => null);
  return result?.status === 'granted';
}

/** Checks (never prompts) whether foreground location is already granted. */
export async function hasForegroundLocationPermission(): Promise<boolean> {
  const result = await Location.getForegroundPermissionsAsync().catch(() => null);
  return result?.status === 'granted';
}

/**
 * Checks (never prompts) how much location access the app has. 'blocked'
 * means Android will no longer show the prompt, so only Settings can fix it.
 */
export async function getLocationAccess(): Promise<LocationAccess> {
  const foreground = await Location.getForegroundPermissionsAsync();
  if (foreground.status !== 'granted') return foreground.canAskAgain ? 'ask' : 'blocked';
  const background = await Location.getBackgroundPermissionsAsync().catch(() => null);
  return background?.status === 'granted' ? 'always' : 'whileUsing';
}
