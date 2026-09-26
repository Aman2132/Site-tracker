/**
 * Domain models shared across the app. Screens, controllers, services and
 * the mock api/ layer all speak these shapes — when a real backend is wired
 * in, only src/api/* should need to change.
 */

export type Role = 'owner' | 'worker';

/**
 * Coarse activity signal: from Android's activity recognition when it has a
 * confident, recent reading, otherwise from GPS speed — see utils/activity.ts.
 */
export type ActivityKind = 'vehicle' | 'walk' | 'still' | 'stale';

/** One reading from the OS activity recognizer (Android only). */
export interface RecognizedActivity {
  kind: Exclude<ActivityKind, 'stale'>;
  /** 0–100, as reported by the OS. */
  confidence: number;
  /** When the OS reported it, epoch ms. */
  at: number;
}

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface GeoFix extends GeoPoint {
  accuracy: number;
}

/** A background-tracking fix — adds the activity signal a one-shot GeoFix doesn't need. */
export interface TrackedFix extends GeoFix {
  kind: ActivityKind;
  /** Phone battery 0–1 at the time of the fix; absent when the OS can't say. */
  battery?: number;
}

/**
 * Static roster fields — this is exactly the shape of a Firestore
 * `people/{uid}` document, keyed by the person's Firebase Auth uid.
 */
export interface PersonProfile {
  id: string;
  name: string;
  /** Job title, e.g. "Mason" — not to be confused with appRole. */
  role: string;
  color: string;
  /** Owner vs worker — decides which app experience they get after sign-in. */
  appRole: Role;
  /**
   * False once an owner deactivates this person: they're signed out and
   * can't sign back in, and they drop off the live map. Missing means active
   * (every profile created before this field existed).
   */
  active?: boolean;
  /**
   * The person's photo as a small JPEG data URI (see PROFILE in config.ts),
   * set from their Profile tab. Missing means "show initials instead".
   */
  avatar?: string;
}

/** What someone can change about themselves on their Profile tab. */
export type OwnProfileChanges = Partial<Pick<PersonProfile, 'name' | 'avatar'>>;

/** What an owner can change about someone from the Crew screen. */
export type PersonProfileChanges = Partial<Pick<PersonProfile, 'role' | 'appRole' | 'active'>>;

/**
 * Full crew-map shape: static profile + live tracking fields. The live
 * fields come from Realtime Database `positions/{uid}`, merged onto the
 * Firestore profile client-side — see api/peopleApi.ts.
 */
export interface Person extends PersonProfile {
  kind: ActivityKind;
  lat: number;
  lng: number;
  accuracy: number;
  lastFixAt: number;
  /** 0–1; undefined until the phone reports one (older app builds never do). */
  battery?: number;
  paused: boolean;
}

/** What a capture is. Records saved before video existed have no `mediaType` — treat those as photos. */
export type MediaKind = 'photo' | 'video';

/** Photo/video switch on the Camera screen. */
export type CaptureMode = MediaKind;

/**
 * One captured item. Still named Photo because that is what the whole app
 * (queue, sync, Firestore `photos` collection) already calls it; videos ride
 * the same pipeline, distinguished by `mediaType`.
 */
export interface Photo {
  id: string;
  uri: string;
  mediaType?: MediaKind;
  /** Clip length in ms. Only set when mediaType === 'video'. */
  durationMs?: number;
  lat: number;
  lng: number;
  accuracy: number;
  /** Short shareable pin (e.g. "7JJVXR9R+2X") — see utils/geo.ts plusCodeFor. */
  plusCode: string;
  takenAt: number;
  personId: string;
  task: string;
  synced: boolean;
}

export type EventKind = 'info' | 'warn';

export interface AppEvent {
  id: string;
  at: number;
  text: string;
  kind: EventKind;
}

export interface LocationPermissionState {
  granted: boolean;
  background: boolean;
}
