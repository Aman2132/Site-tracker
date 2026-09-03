/**
 * App-wide tunables that aren't visual. Kept separate from theme.ts so
 * behavioral changes (tracking cadence, geofence bounds) don't get lost
 * among color/spacing edits.
 */

export const LOCATION_TASK_NAME = 'site-tracker-location-task';

export const LOCATION_TRACKING = {
  /** How often the OS is asked to wake the background task, in ms. */
  timeIntervalMs: 15_000,
  /** Minimum movement before a new fix is emitted, in meters. */
  distanceIntervalMeters: 20,
};

export const GEOFENCE = {
  minRadiusMeters: 40,
  maxRadiusMeters: 400,
  stepMeters: 10,
  /** Below this, normal GPS drift causes false arrive/leave events. */
  driftSafeRadiusMeters: 80,
};

export const ACTIVITY_THRESHOLDS = {
  /** Above this speed (m/s), classify as "vehicle". */
  vehicleSpeedMps: 2.5,
  /** Above this speed (m/s), classify as "walk". */
  walkSpeedMps: 0.3,
};

/** Simulated network latency for the mock api/ layer, so loading states are real. */
export const MOCK_NETWORK_DELAY_MS = 400;

export const DEFAULT_COORDS: { lat: number; lng: number } = { lat: 28.6139, lng: 77.209 };

/** Public Mapbox token, inlined at build time — see .env.example. */
export const MAPBOX_PUBLIC_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_TOKEN ?? '';
