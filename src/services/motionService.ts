import * as Location from 'expo-location';
import { DeviceMotion } from 'expo-sensors';

/**
 * Phone orientation for the live map. Two sources, because each is the right
 * tool for one job:
 *  - heading: expo-location's compass. It fuses magnetometer + accelerometer
 *    with tilt compensation, and corrects to true north when it has a location
 *    fix — far steadier than raw magnetometer maths.
 *  - tilt: expo-sensors DeviceMotion (gyroscope + accelerometer), which gives
 *    how far the phone is raised from lying flat.
 * Pure device I/O: no smoothing, no app state (that is the controller's job).
 * Every watcher returns an unsubscribe and silently no-ops if the sensor is
 * missing or refused.
 */

/** Degrees clockwise from north. True north when available, magnetic otherwise. */
export function watchCompassHeading(onHeading: (degrees: number) => void): () => void {
  let subscription: Location.LocationSubscription | undefined;
  let cancelled = false;

  // expo-location's compass needs location permission. Without it the watch
  // half-starts and later rejects on removal ("Not authorized to use location
  // services"), so ask first — motion mode is switched on by a tap, a fair
  // moment to ask — and skip the compass if refused.
  Location.requestForegroundPermissionsAsync()
    .then(({ granted }) => {
      if (cancelled) return undefined;
      if (!granted) {
        console.warn('[motion] location permission refused — compass rotation off');
        return undefined;
      }
      return Location.watchHeadingAsync(heading => {
        // trueHeading is -1 until the phone has a location to correct against.
        const degrees = heading.trueHeading >= 0 ? heading.trueHeading : heading.magHeading;
        if (Number.isFinite(degrees)) onHeading(degrees);
      });
    })
    .then(sub => {
      if (!sub) return;
      if (cancelled) sub.remove();
      else subscription = sub;
    })
    .catch(e => console.warn('[motion] compass unavailable —', e instanceof Error ? e.message : e));

  return () => {
    cancelled = true;
    subscription?.remove();
  };
}

/** Front-to-back tilt in radians: 0 lying flat, about PI/2 held upright. */
export function watchTilt(onTilt: (betaRadians: number) => void, intervalMs: number): () => void {
  let subscription: { remove: () => void } | undefined;
  let cancelled = false;

  DeviceMotion.isAvailableAsync()
    .then(available => {
      if (cancelled) return;
      if (!available) {
        console.warn('[motion] DeviceMotion not available on this device');
        return;
      }
      DeviceMotion.setUpdateInterval(intervalMs);
      subscription = DeviceMotion.addListener(reading => {
        const beta = reading.rotation?.beta;
        if (typeof beta === 'number' && Number.isFinite(beta)) onTilt(beta);
      });
    })
    .catch(e => console.warn('[motion] tilt unavailable —', e instanceof Error ? e.message : e));

  return () => {
    cancelled = true;
    subscription?.remove();
  };
}
