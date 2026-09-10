import { onValue, ref, serverTimestamp, update } from 'firebase/database';
import { collection, doc, getDoc, onSnapshot, setDoc } from 'firebase/firestore';

import { firestore, rtdb } from './firebaseClient';

import { ActivityKind, Person, PersonProfile, TrackedFix } from '@/types/domain';

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
    battery: live?.battery ?? 1,
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

/**
 * Live crew feed for the owner's Map/Crew screens. Subscribes to the
 * roster once and to positions continuously, re-merging on every change.
 * Call the returned function to unsubscribe (e.g. on screen unmount).
 */
export function subscribeToCrew(onChange: (people: Person[]) => void): () => void {
  let profiles: PersonProfile[] = [];
  let positions: Record<string, LivePosition> = {};

  const emit = () => onChange(profiles.map(profile => mergePersonProfile(profile, positions[profile.id])));

  const unsubProfiles = onSnapshot(collection(firestore, 'people'), snapshot => {
    profiles = snapshot.docs.map(d => ({ id: d.id, ...(d.data() as Omit<PersonProfile, 'id'>) }));
    emit();
  });

  const unsubPositions = onValue(ref(rtdb, 'positions'), snapshot => {
    positions = (snapshot.val() as Record<string, LivePosition>) ?? {};
    emit();
  });

  return () => {
    unsubProfiles();
    unsubPositions();
  };
}

/** Reports the signed-in worker's own position. Fire-and-forget from the caller's side. */
export async function reportPosition(personId: string, fix: TrackedFix): Promise<void> {
  await update(ref(rtdb, `positions/${personId}`), {
    lat: fix.lat,
    lng: fix.lng,
    accuracy: fix.accuracy,
    kind: fix.kind,
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
