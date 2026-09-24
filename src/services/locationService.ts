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

TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
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

/**
 * Continuous high-accuracy GPS stream for the Camera screen's live accuracy
 * readout — deliberately separate from the battery-conscious background
 * task above (Balanced accuracy, 15s interval) so all-day tracking power
 * use is unaffected. Callers start this on screen focus and stop it on
 * blur/unmount.
 *
 * It is self-healing, because a one-shot subscription is what used to leave
 * the badge stuck until the camera was closed and reopened:
 *  - if the subscription fails (permission not granted yet on first launch,
 *    location services off), it retries every few seconds until it works;
 *  - if the stream goes quiet (the OS stalls GPS after a screen change), a
 *    watchdog tears it down and resubscribes.
 *
 * (A cached "last known" position is deliberately NOT used to seed it: it can
 * be minutes old, and a photo must never be geotagged with a stale location.)
 */
export function watchPreciseFix(onUpdate: (fix: GeoFix) => void): () => void {
  let subscription: Location.LocationSubscription | undefined;
  let cancelled = false;
  let lastUpdateAt = 0;
  let retryTimer: ReturnType<typeof setTimeout> | undefined;
  let watchdogTimer: ReturnType<typeof setTimeout> | undefined;

  const emit = (loc: Location.LocationObject) => {
    lastUpdateAt = Date.now();
    onUpdate({ lat: loc.coords.latitude, lng: loc.coords.longitude, accuracy: loc.coords.accuracy ?? 9999 });
  };

  const stopSubscription = () => {
    subscription?.remove();
    subscription = undefined;
  };

  const scheduleWatchdog = () => {
    watchdogTimer = setTimeout(() => {
      if (cancelled) return;
      if (Date.now() - lastUpdateAt > GEOTAG_ACCURACY.staleAfterMs) {
        console.warn('[gps] no fix for a while — restarting the location watch');
        stopSubscription();
        start();
        return;
      }
      scheduleWatchdog();
    }, GEOTAG_ACCURACY.watchdogIntervalMs);
  };

  const start = () => {
    lastUpdateAt = Date.now();
    Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.BestForNavigation,
        timeInterval: GEOTAG_ACCURACY.watchIntervalMs,
        distanceInterval: 0,
      },
      emit
    )
      .then(sub => {
        if (cancelled) {
          sub.remove();
          return;
        }
        subscription = sub;
        console.log('[gps] high-accuracy watch running');
        if (watchdogTimer) clearTimeout(watchdogTimer);
        scheduleWatchdog();
      })
      .catch(e => {
        if (cancelled) return;
        console.warn('[gps] watch failed, will retry —', e instanceof Error ? e.message : e);
        retryTimer = setTimeout(start, GEOTAG_ACCURACY.retryIntervalMs);
      });
  };

  start();

  return () => {
    cancelled = true;
    if (retryTimer) clearTimeout(retryTimer);
    if (watchdogTimer) clearTimeout(watchdogTimer);
    stopSubscription();
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
