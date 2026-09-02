import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';

import { ACTIVITY_THRESHOLDS, LOCATION_TASK_NAME, LOCATION_TRACKING } from '@/constants/config';
import { ActivityKind, GeoFix } from '@/types/domain';

/**
 * Wraps expo-location + expo-task-manager. Registers one background task at
 * module load (required by TaskManager, since the OS can relaunch this file
 * headless) and exposes a single update handler that controllers subscribe to.
 */

type LocationUpdateHandler = (fix: GeoFix) => void;

let onUpdate: LocationUpdateHandler | null = null;

export function setLocationUpdateHandler(handler: LocationUpdateHandler | null): void {
  onUpdate = handler;
}

TaskManager.defineTask(LOCATION_TASK_NAME, ({ data, error }) => {
  if (error) return;
  const locations = (data as { locations?: Location.LocationObject[] } | undefined)?.locations;
  const fix = locations?.[0];
  if (fix && onUpdate) {
    onUpdate({ lat: fix.coords.latitude, lng: fix.coords.longitude, accuracy: fix.coords.accuracy ?? 9999 });
  }
});

export async function startBackgroundTracking(): Promise<void> {
  const alreadyStarted = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME).catch(() => false);
  if (alreadyStarted) return;

  await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
    accuracy: Location.Accuracy.Balanced,
    timeInterval: LOCATION_TRACKING.timeIntervalMs,
    distanceInterval: LOCATION_TRACKING.distanceIntervalMeters,
    showsBackgroundLocationIndicator: true,
    foregroundService: {
      notificationTitle: 'Site Tracker is sharing your location',
      notificationBody: 'Tap to pause from the app',
    },
  });
}

export async function stopBackgroundTracking(): Promise<void> {
  const started = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME).catch(() => false);
  if (started) await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
}

export async function getCurrentFix(): Promise<GeoFix> {
  const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.BestForNavigation });
  return { lat: loc.coords.latitude, lng: loc.coords.longitude, accuracy: loc.coords.accuracy ?? 9999 };
}

/**
 * Rough activity classification from recent speed. A production build should
 * feed this from expo-sensors / Android ActivityRecognition instead.
 */
export function classifyActivity(speedMetersPerSecond: number | null | undefined): ActivityKind {
  if (speedMetersPerSecond == null) return 'still';
  if (speedMetersPerSecond > ACTIVITY_THRESHOLDS.vehicleSpeedMps) return 'vehicle';
  if (speedMetersPerSecond > ACTIVITY_THRESHOLDS.walkSpeedMps) return 'walk';
  return 'still';
}
