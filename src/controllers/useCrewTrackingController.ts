import { useEffect } from 'react';

import { subscribeToCrew } from '@/api/peopleApi';
import { fetchSite } from '@/api/siteApi';
import { HAS_FIREBASE_CONFIG, LIVE_MAP } from '@/constants/config';
import { SEED_PEOPLE, SEED_SITE } from '@/constants/mockData';
import { useCrewStore } from '@/store/useCrewStore';
import { useSiteStore } from '@/store/useSiteStore';
import { Person } from '@/types/domain';
import { nextTrails } from '@/utils/geo';

/**
 * Live crew roster + site for the owner-side screens. Safe to call from
 * multiple screens — the crew subscription is wired once per app run
 * (see wireCrewSubscriptionOnce) and every screen just reads store state;
 * the site is a plain one-shot fetch since it rarely changes.
 *
 * Without a real Firebase project (see HAS_FIREBASE_CONFIG), Firestore/RTDB
 * reads never resolve, so `loaded` would stay false forever and every
 * owner screen would hang on its loading spinner — this falls back to the
 * static demo dataset instead, same spirit as useAuthController's bypass.
 */
let crewSubscriptionWired = false;

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
  subscribeToCrew(receiveCrew);
}

export function useCrewTrackingController() {
  const people = useCrewStore(state => state.people);
  const trails = useCrewStore(state => state.trails);
  const crewLoaded = useCrewStore(state => state.loaded);

  const site = useSiteStore(state => state.site);
  const siteLoaded = useSiteStore(state => state.loaded);
  const setSite = useSiteStore(state => state.setSite);

  useEffect(() => {
    wireCrewSubscriptionOnce();
  }, []);

  useEffect(() => {
    if (siteLoaded) return;
    if (!HAS_FIREBASE_CONFIG) {
      setSite(SEED_SITE);
      return;
    }
    fetchSite().then(setSite);
  }, [siteLoaded, setSite]);

  return { people, trails, site, loaded: crewLoaded && siteLoaded };
}
