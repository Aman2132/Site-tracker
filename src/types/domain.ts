/**
 * Domain models shared across the app. Screens, controllers, services and
 * the mock api/ layer all speak these shapes — when a real backend is wired
 * in, only src/api/* should need to change.
 */

export type Role = 'owner' | 'worker' | 'superadmin';

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
  /** Sites this person is assigned to (`sites/{id}`); set by an owner from the admin dashboard. Missing means none. */
  siteIds?: string[];
  /** Contact + grouping details the admin dashboard records when it invites someone. */
  email?: string;
  phone?: string;
  team?: string;
}

/** A project. Has a name and crew, deliberately no location. Created and edited from the admin dashboard. */
export interface Site {
  id: string;
  name: string;
  code?: string;
}

/**
 * One continuous stretch of checked-in time (`sessions/{id}`). Check-in opens
 * it, check-out or a pause closes it; `end` is absent while it is open. A
 * session that never closes (dead phone) is judged by the dashboard from the
 * person's last position fix.
 */
export interface PresenceSession {
  id: string;
  personId: string;
  siteId: string;
  start: number;
  end?: number;
  endReason?: SessionEndReason;
}

export type SessionEndReason = 'signed-off' | 'paused';

/**
 * The person's current check-in as the phone remembers it, so it survives an
 * app restart (see services/shiftStorage.ts).
 */
export interface ActiveShift {
  siteId: string;
  siteName: string;
  checkedInAt: number;
  /** Id of the open `sessions` doc. Null while paused (a pause closes it; resume opens a new one). */
  sessionId: string | null;
  paused: boolean;
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
  /** Stamped at capture time so attribution survives a rename/deactivation. Absent on photos taken before this field existed. */
  personName?: string;
  task: string;
  /** Optional free-text note ("what I am doing"), trimmed, max PHOTO_NOTE.maxChars. Absent when empty. Written to Firestore as `note`. */
  note?: string;
  /** The person's own inventory entry this photo is proof for (`inventory/{id}`). Set before upload only. */
  inventoryId?: string;
  synced: boolean;
  /** Site the person was checked in at when this was captured. Absent when not checked in. */
  siteId?: string;
  /** Pixel size of the original, for the dashboard's gallery layout. Absent on older captures. */
  width?: number;
  height?: number;
  /** Small preview in Supabase, made on the phone at sync. Absent for videos and older uploads. */
  thumbUrl?: string;
}

export type EventKind = 'info' | 'warn';

/** What happened, for the dashboard's filters and icons. Missing on events written before this existed. */
export type EventType = 'checkin' | 'checkout' | 'pause' | 'resume' | 'upload' | 'battery' | 'crew' | 'site';

export interface AppEvent {
  id: string;
  at: number;
  text: string;
  kind: EventKind;
  type?: EventType;
  personId?: string;
  siteId?: string;
}

export interface LocationPermissionState {
  granted: boolean;
  background: boolean;
}

/** One logged use of a received item — only the entry's own creator may add one. */
export interface UsageLogEntry {
  quantity: number;
  at: number;
  note?: string;
}

/**
 * One delivery of one item received at a site (`inventory/{id}`). Any crew
 * assigned to the site may read every entry for it and may create one; only
 * the person who created an entry may log usage against it (consumption is
 * tracked here, not as a separate doc, so it stays next to what it drew
 * down). An owner can edit or delete any entry from the admin dashboard,
 * which stamps `editedAt`; who did it (and their note) is in the
 * superadmin-only adminAudit trail, not here.
 */
export interface InventoryEntry {
  id: string;
  personId: string;
  /** Stamped at entry time, like Photo.personName. */
  personName: string;
  siteId: string;
  /** Item name as typed, e.g. "Cement (OPC 53)". */
  name: string;
  /** Total in `unit` — for packs, packCount × packSize (5 pieces of 5 m wire = 25 m). Usage is logged in this unit. */
  quantity: number;
  /** One of INVENTORY.units or a custom one typed under "Other". */
  unit: string;
  /** Set when it arrived as equal pieces/packs: how many, and how much `unit` each holds. Absent for a plain total. */
  packCount?: number;
  packSize?: number;
  note?: string;
  /** When it was received (entry time on the phone), epoch ms. */
  receivedAt: number;
  /** Sum of usage[].quantity; kept alongside the log so "remaining" is a plain subtraction. Absent means 0. */
  usedQuantity?: number;
  /** Each time the creator logged how much was used, oldest first. */
  usage?: UsageLogEntry[];
  /** Set by the admin dashboard when an owner changes the entry. */
  editedAt?: number;
  /** True while the phone has saved it but the server hasn't confirmed it yet. Never stored. */
  pending?: boolean;
}

/** What the crew fill in; the rest is stamped by the controller. */
export type InventoryDraft = Pick<
  InventoryEntry,
  'siteId' | 'name' | 'quantity' | 'unit' | 'note' | 'packCount' | 'packSize'
>;
