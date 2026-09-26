import { onValue, ref, serverTimestamp, update } from 'firebase/database';
import { collection, doc, getDoc, onSnapshot, setDoc, updateDoc } from 'firebase/firestore';

import { firestore, rtdb } from './firebaseClient';

import {
  ActivityKind,
  OwnProfileChanges,
  Person,
  PersonProfile,
  PersonProfileChanges,
  TrackedFix,
} from '@/types/domain';

/**
 * Crew roster (Firestore `people/{uid}`, static: name/role/color/appRole)
 * merged with live positions (Realtime Database `positions/{uid}`). Two
 * stores because Firestore bills per-read and RTDB bills per-bandwidth —
 * frequent small position writes fit RTDB's free tier far better.
 */

/** Partial on purpose — RTDB writes use update(), so a brand-new worker's first
 *  position may only have lat/lng/accuracy/lastFixAt for a while. */
interface LivePosition {
  lat?: number;
  lng?: number;
  accuracy?: number;
  lastFixAt?: number;
  battery?: number;
  paused?: boolean;
  kind?: ActivityKind;
}

const STALE_AFTER_MS = 3 * 60_000;

function mergePersonProfile(profile: PersonProfile, live: LivePosition | undefined): Person {
  const lastFixAt = live?.lastFixAt ?? 0;
  const isStale = lastFixAt === 0 || Date.now() - lastFixAt > STALE_AFTER_MS;
  return {
    ...profile,
    lat: live?.lat ?? 0,
    lng: live?.lng ?? 0,
    accuracy: live?.accuracy ?? 9999,
    lastFixAt,
    battery: live?.battery,
    paused: live?.paused ?? false,
    kind: isStale ? 'stale' : (live?.kind ?? 'still'),
  };
}

/** Fetches one person's static profile — used right after sign-in to resolve appRole. */
export async function fetchPersonProfile(uid: string): Promise<PersonProfile | null> {
  const snap = await getDoc(doc(firestore, 'people', uid));
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as Omit<PersonProfile, 'id'>) };
}

/** A small rotating palette for self-registered workers, since they don't pick a color at signup. */
const SELF_SIGNUP_COLORS = ['#1a73e8', '#188038', '#a142f4', '#f29900', '#d93025', '#12b5cb'];

function colorForNewWorker(uid: string): string {
  let hash = 0;
  for (let i = 0; i < uid.length; i++) hash = (hash * 31 + uid.charCodeAt(i)) >>> 0;
  return SELF_SIGNUP_COLORS[hash % SELF_SIGNUP_COLORS.length];
}

/**
 * Creates the Firestore profile for a self-registered worker, right after
 * their Firebase Auth account is made. appRole is always 'worker' here —
 * firestore.rules rejects a create with any other appRole, so owner
 * accounts stay seed-script-only regardless of what a client sends.
 */
export async function createPersonProfile(uid: string, name: string): Promise<void> {
  await setDoc(doc(firestore, 'people', uid), {
    name,
    role: 'Worker',
    appRole: 'worker',
    color: colorForNewWorker(uid),
  });
}

/**
 * Someone editing their own name and photo from the Profile tab.
 * firestore.rules allows a person to change exactly these two fields on
 * their own profile, and nothing else.
 */
export async function updateOwnProfile(uid: string, changes: OwnProfileChanges): Promise<void> {
  await updateDoc(doc(firestore, 'people', uid), changes);
}

/**
 * Owner-only edit of someone's job title, app role or active flag.
 * firestore.rules allows exactly these fields, only for an owner, and never
 * an owner's own appRole/active — so an owner can't lock themselves out.
 */
export async function updatePersonProfile(uid: string, changes: PersonProfileChanges): Promise<void> {
  await updateDoc(doc(firestore, 'people', uid), changes);
}

/**
 * Live crew feed for the owner's Map/Crew screens. Subscribes to the
 * roster once and to positions continuously, re-merging on every change.
 * Call the returned function to unsubscribe (e.g. on sign-out). `onError`
 * fires if either listener is ended by the server (e.g. permission denied);
 * both are torn down then, and the caller must re-subscribe.
 */
export function subscribeToCrew(
  onChange: (people: Person[]) => void,
  onError: (error: Error) => void
): () => void {
  let profiles: PersonProfile[] = [];
  let positions: Record<string, LivePosition> = {};

  const emit = () => onChange(profiles.map(profile => mergePersonProfile(profile, positions[profile.id])));

  let unsubProfiles = () => {};
  let unsubPositions = () => {};
  const unsubscribe = () => {
    unsubProfiles();
    unsubPositions();
  };
  const fail = (error: Error) => {
    unsubscribe();
    onError(error);
  };

  unsubProfiles = onSnapshot(
    collection(firestore, 'people'),
    snapshot => {
      profiles = snapshot.docs.map(d => ({ id: d.id, ...(d.data() as Omit<PersonProfile, 'id'>) }));
      emit();
    },
    fail
  );

  unsubPositions = onValue(
    ref(rtdb, 'positions'),
    snapshot => {
      positions = (snapshot.val() as Record<string, LivePosition>) ?? {};
      emit();
    },
    fail
  );

  return unsubscribe;
}

/** Reports the signed-in worker's own position. Fire-and-forget from the caller's side. */
export async function reportPosition(personId: string, fix: TrackedFix): Promise<void> {
  await update(ref(rtdb, `positions/${personId}`), {
    lat: fix.lat,
    lng: fix.lng,
    accuracy: fix.accuracy,
    kind: fix.kind,
    // Left as-is when unknown, rather than overwritten with a guess.
    ...(fix.battery != null ? { battery: fix.battery } : {}),
    lastFixAt: serverTimestamp(),
  });
}

/** Marks the worker paused/resumed without waiting for the next GPS fix. */
export async function reportPauseState(personId: string, paused: boolean): Promise<void> {
  await update(ref(rtdb, `positions/${personId}`), { paused });
}

/** Saves this device's Expo push token so a future server-side notifier can reach it. */
export async function savePushToken(personId: string, expoPushToken: string): Promise<void> {
  await setDoc(doc(firestore, 'pushTokens', personId), { expoPushToken, updatedAt: Date.now() });
}
