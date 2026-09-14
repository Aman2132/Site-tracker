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

export const GEOTAG_ACCURACY = {
  /** At/under this, a photo's GPS reading is precise enough not to flag. */
  goodMeters: 20,
  /** How often the Camera screen's high-accuracy GPS watch is allowed to push an update. */
  watchIntervalMs: 500,
};

/** Simulated network latency for the mock api/ layer, so loading states are real. */
export const MOCK_NETWORK_DELAY_MS = 400;

export const DEFAULT_COORDS: { lat: number; lng: number } = { lat: 27.7172, lng: 85.324 };

/** Public Mapbox token, inlined at build time — see .env.example. */
export const MAPBOX_PUBLIC_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_TOKEN ?? '';

/** Firebase project config, inlined at build time — see .env.example. */
export const FIREBASE_CONFIG = {
  // initializeAuth() asserts apiKey is a non-empty, colon-free string
  // synchronously (before any network call) — an empty string throws
  // auth/invalid-api-key at import time and crashes the whole app before it
  // can even render LoginScreen. A placeholder keeps that failure lazy, same
  // reasoning as databaseURL below.
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY ?? 'placeholder-api-key',
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ?? '',
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? '',
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? '',
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID ?? '',
  // getDatabase() parses this synchronously at app startup and crashes on an
  // empty string — a syntactically-valid placeholder keeps that lazy like
  // every other Firebase call here, failing only once actually used.
  databaseURL: process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL ?? 'https://placeholder.firebaseio.com',
} as const;

// apiKey always has a non-empty placeholder fallback (see above, needed to
// keep initializeAuth() from crashing at import time), so it can't signal
// "no real config." projectId has no such placeholder — it stays '' until a
// real value is set — making it the reliable check here.
export const HAS_FIREBASE_CONFIG = FIREBASE_CONFIG.projectId.length > 0;

/**
 * Supabase config — used only for Storage (photo files), see
 * api/supabaseClient.ts. Firebase Storage started requiring a billing
 * account (Blaze) for every project, including free-tier usage, as of
 * Feb 2026; everything else (Auth, Firestore, Realtime Database) stays on
 * Firebase, which is still free with no card required.
 */
export const SUPABASE_CONFIG = {
  url: process.env.EXPO_PUBLIC_SUPABASE_URL ?? '',
  publishableKey: process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '',
} as const;

export const HAS_SUPABASE_CONFIG = SUPABASE_CONFIG.url.length > 0;
