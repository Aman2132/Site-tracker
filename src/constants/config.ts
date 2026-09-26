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

export const ACTIVITY_THRESHOLDS = {
  /** Above this speed (m/s), classify as "vehicle". */
  vehicleSpeedMps: 2.5,
  /** Above this speed (m/s), classify as "walk". */
  walkSpeedMps: 0.3,
};

/**
 * Android's activity recognition, which beats the speed thresholds above
 * whenever it has a fresh, confident reading (see utils/activity.ts).
 */
export const ACTIVITY_RECOGNITION = {
  /** How often the OS is asked for a reading. It may deliver less often when the phone is still. */
  updateIntervalMs: 30_000,
  /** Readings below this confidence (0–100) are ignored in favour of GPS speed. */
  minConfidence: 60,
  /** A reading older than this no longer describes what the worker is doing now. */
  maxAgeMs: 3 * 60_000,
};

/** Profile tab: the person's own name and photo. */
export const PROFILE = {
  /**
   * Avatars are stored inline on the person's Firestore profile (no file
   * storage needed), so they're shrunk to a small square JPEG first — about
   * 10 KB, cheap to send with every crew-list update.
   */
  avatarSizePx: 160,
  avatarJpegQuality: 0.7,
  maxNameChars: 60,
};

/** Forms that must stay usable with the on-screen keyboard open. */
export const KEYBOARD = {
  /**
   * Room kept between the focused field and the top of the keyboard, so the
   * form's submit button and the link under it stay visible, not just the field.
   */
  formBottomOffset: 150,
};

/** Phone battery reporting for the owner's crew view. */
export const BATTERY = {
  /** At or below this level (0–1), the owner's Activity feed gets a low-battery entry. */
  lowLevel: 0.2,
};

export const GEOTAG_ACCURACY = {
  /** At/under this, a photo's GPS reading is precise enough not to flag. */
  goodMeters: 20,
  /** How often the Camera screen's high-accuracy GPS watch is allowed to push an update. */
  watchIntervalMs: 500,
  /** If the watch delivers nothing for this long, it is considered stalled and is restarted. */
  staleAfterMs: 8000,
  watchdogIntervalMs: 3000,
  /** How long to wait before re-subscribing after the watch failed (e.g. permission not granted yet). */
  retryIntervalMs: 2500,
  /**
   * The badge follows a smoothed accuracy (exponential average) so it does
   * not flicker between 4 m and 19 m on every raw sample. 0-1: higher reacts faster.
   */
  displaySmoothing: 0.35,
};

/** Camera screen tunables. */
export const CAMERA = {
  /**
   * The sharpest photo we ask the sensor for: ~12 MP, 4:3. Deliberately not
   * 'max' — 50-200 MP sensors would produce JPEGs far too large for the
   * JS-side EXIF rewrite (and for the upload) to handle on a phone.
   */
  photoTarget: { width: 4032, height: 3024 },
  videoTarget: { width: 1920, height: 1080 },
  videoFps: 30,
  /** A touch counts as a tap-to-focus only if it stays within this many px and lifts within this many ms. */
  tapSlopPx: 12,
  tapMaxMs: 350,
  /** How long the focus ring stays on screen. */
  focusIndicatorMs: 1100,
  /**
   * Videos are uploaded by reading the whole file into JS memory, so they are
   * kept short until uploads can stream.
   */
  maxVideoSeconds: 30,
  /** Zoom is capped here even if the lens can go further — past this it is just noise. */
  maxZoom: 10,
  /** Times we quietly retry when Android reports the camera busy/restricted before showing a Try again button. */
  maxAutoRetries: 3,
  /** Wait before retry n is retryDelayMs * n, so a slow-to-release camera gets longer each time. */
  retryDelayMs: 700,
};

/**
 * Where captures live on the phone. The app's own copy sits in private
 * storage (survives sign-out and restarts, not an uninstall); the gallery copy
 * goes into one named album, which does survive an uninstall and is what the
 * Photos list is rebuilt from after a reinstall.
 */
export const LOCAL_MEDIA = {
  /** Folder under the app's document directory, one subfolder per person. */
  captureDir: 'captures',
  /** Gallery album every capture is saved into. */
  galleryAlbum: 'Site Tracker',
  /** Assets fetched per page when scanning the album on sign-in. */
  galleryPageSize: 200,
  /** Longest task label kept in a capture's file name. */
  maxTaskChars: 60,
};

/** Simulated network latency for the mock api/ layer, so loading states are real. */
export const MOCK_NETWORK_DELAY_MS = 400;

export const DEFAULT_COORDS: { lat: number; lng: number } = { lat: 27.7172, lng: 85.324 };

/** Google Maps SDK key, inlined at build time — see .env.example. Without it the owner map falls back to a static schematic. */
export const GOOGLE_MAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ?? '';
export const HAS_GOOGLE_MAPS_KEY = GOOGLE_MAPS_API_KEY.length > 0;

/** Owner live map tunables. */
export const LIVE_MAP = {
  /** Camera tilt for the 3D view, in degrees (Google Maps caps this at ~67.5 depending on zoom). */
  pitch3d: 60,
  /** Close enough that 3D buildings are drawn (they only render from about zoom 17). */
  zoom3d: 17.5,
  /** Zoom used when jumping to the owner's own location. */
  zoomMyLocation: 17,
  /** How long a "couldn't find your location" message stays on the map. */
  noticeMs: 3500,
  /** Flat, top-down overview zoom. */
  zoomOverview: 15.5,
  /** How many past positions each crew member's trail keeps. */
  trailLength: 30,
  /** Positions closer than this to the previous trail point are noise, not movement. */
  trailMinStepMeters: 2,
  /** Sensor sample interval for compass/tilt. */
  sensorIntervalMs: 100,
  /** Ignore compass changes smaller than this, so the map is not constantly nudged. */
  headingDeadbandDeg: 2,
  /** Exponential smoothing for sensor readings (0-1, higher reacts faster). */
  sensorSmoothing: 0.2,
  /** Phone held flat -> top-down; held upright -> max tilt. Pitch range the phone maps onto. */
  minPitch: 0,
  maxPitch: 67,
  /** Duration of camera animations for button-driven moves. */
  cameraAnimationMs: 600,
  /** Duration a crew marker glides from its old to its new position. */
  markerGlideMs: 900,
};

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
