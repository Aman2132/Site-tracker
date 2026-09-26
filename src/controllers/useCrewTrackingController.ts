import { useEffect } from 'react';

import { subscribeToCrew } from '@/api/peopleApi';
import { HAS_FIREBASE_CONFIG, LIVE_MAP } from '@/constants/config';
import { SEED_PEOPLE } from '@/constants/mockData';
import { useCrewStore } from '@/store/useCrewStore';
import { Person } from '@/types/domain';
import { nextTrails } from '@/utils/geo';

/**
 * Live crew roster for the owner-side screens. Safe to call from multiple
 * screens — the crew subscription is wired once per app run (see
 * wireCrewSubscriptionOnce) and every screen just reads store state.
 *
 * Without a real Firebase project (see HAS_FIREBASE_CONFIG), Firestore/RTDB
 * reads never resolve, so `loaded` would stay false forever and every
 * owner screen would hang on its loading spinner — this falls back to the
 * static demo dataset instead, same spirit as useAuthController's bypass.
 */
let crewSubscriptionWired = false;
let unsubscribeCrew: (() => void) | null = null;

/** Stores a roster snapshot and extends everyone's motion trail with it. */
function receiveCrew(people: Person[]) {
  const { trails, setPeople, setTrails } = useCrewStore.getState();
  setPeople(people);
  const next = nextTrails(trails, people, LIVE_MAP.trailLength, LIVE_MAP.trailMinStepMeters);
  if (next !== trails) setTrails(next);
}

function wireCrewSubscriptionOnce() {
  if (crewSubscriptionWired) return;
  crewSubscriptionWired = true;
  if (!HAS_FIREBASE_CONFIG) {
    receiveCrew(SEED_PEOPLE);
    return;
  }
  unsubscribeCrew = subscribeToCrew(receiveCrew, error => {
    // The server ended the listener (e.g. signed out underneath it). Let the
    // next owner screen that mounts subscribe again rather than stay frozen.
    console.warn('[crew] live roster stopped —', error.message);
    unsubscribeCrew = null;
    crewSubscriptionWired = false;
  });
}

/**
 * Closes the live roster before sign-out — otherwise Firestore rejects the
 * still-open listener the moment nobody is signed in. The next owner to sign
 * in gets a fresh subscription.
 */
export function stopCrewSubscription(): void {
  unsubscribeCrew?.();
  unsubscribeCrew = null;
  crewSubscriptionWired = false;
}

export function useCrewTrackingController() {
  const people = useCrewStore(state => state.people);
  const trails = useCrewStore(state => state.trails);
  const loaded = useCrewStore(state => state.loaded);

  useEffect(() => {
    wireCrewSubscriptionOnce();
  }, []);

  return { people, trails, loaded };
}
