import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';

import {
  ACTIVITY_THRESHOLDS,
  GEOTAG_ACCURACY,
  LOCATION_TASK_NAME,
  LOCATION_TRACKING,
} from '@/constants/config';
import { ActivityKind, GeoFix, TrackedFix } from '@/types/domain';

/**
 * Wraps expo-location + expo-task-manager. Registers one background task at
 * module load (required by TaskManager, since the OS can relaunch this file
 * headless) and exposes a single update handler that controllers subscribe to.
 */

type LocationUpdateHandler = (fix: TrackedFix) => void;

let onUpdate: LocationUpdateHandler | null = null;

export function setLocationUpdateHandler(handler: LocationUpdateHandler | null): void {
  onUpdate = handler;
}

TaskManager.defineTask(LOCATION_TASK_NAME, ({ data, error }) => {
  if (error) return;
  const locations = (data as { locations?: Location.LocationObject[] } | undefined)?.locations;
  const fix = locations?.[0];
  if (fix && onUpdate) {
    onUpdate({
      lat: fix.coords.latitude,
      lng: fix.coords.longitude,
      accuracy: fix.coords.accuracy ?? 9999,
      kind: classifyActivity(fix.coords.speed),
    });
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
 * Continuous high-accuracy GPS stream for the Camera screen's live accuracy
 * readout — deliberately separate from the battery-conscious background
 * task above (Balanced accuracy, 15s interval) so all-day tracking power
 * use is unaffected. Callers start this on screen focus and stop it on
 * blur/unmount; the GPS radio being already "warm" from the background task
 * means this converges faster than a cold high-accuracy request would.
 * Silently no-ops if location permission isn't granted.
 */
export function watchPreciseFix(onUpdate: (fix: GeoFix) => void): () => void {
  let subscription: Location.LocationSubscription | undefined;
  let cancelled = false;

  Location.watchPositionAsync(
    {
      accuracy: Location.Accuracy.BestForNavigation,
      timeInterval: GEOTAG_ACCURACY.watchIntervalMs,
      distanceInterval: 0,
    },
    loc =>
      onUpdate({ lat: loc.coords.latitude, lng: loc.coords.longitude, accuracy: loc.coords.accuracy ?? 9999 })
  )
    .then(sub => {
      if (cancelled) sub.remove();
      else subscription = sub;
    })
    .catch(() => {});

  return () => {
    cancelled = true;
    subscription?.remove();
  };
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
