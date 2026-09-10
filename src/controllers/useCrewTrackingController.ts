import { useEffect } from 'react';

import { subscribeToCrew } from '@/api/peopleApi';
import { fetchSite } from '@/api/siteApi';
import { HAS_FIREBASE_CONFIG } from '@/constants/config';
import { SEED_PEOPLE, SEED_SITE } from '@/constants/mockData';
import { useCrewStore } from '@/store/useCrewStore';
import { useSiteStore } from '@/store/useSiteStore';

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

function wireCrewSubscriptionOnce(
  setPeople: (people: ReturnType<typeof useCrewStore.getState>['people']) => void
) {
  if (crewSubscriptionWired) return;
  crewSubscriptionWired = true;
  if (!HAS_FIREBASE_CONFIG) {
    setPeople(SEED_PEOPLE);
    return;
  }
  subscribeToCrew(setPeople);
}

export function useCrewTrackingController() {
  const people = useCrewStore(state => state.people);
  const crewLoaded = useCrewStore(state => state.loaded);
  const setPeople = useCrewStore(state => state.setPeople);

  const site = useSiteStore(state => state.site);
  const siteLoaded = useSiteStore(state => state.loaded);
  const setSite = useSiteStore(state => state.setSite);

  useEffect(() => {
    wireCrewSubscriptionOnce(setPeople);
  }, [setPeople]);

  useEffect(() => {
    if (siteLoaded) return;
    if (!HAS_FIREBASE_CONFIG) {
      setSite(SEED_SITE);
      return;
    }
    fetchSite().then(setSite);
  }, [siteLoaded, setSite]);

  return { people, site, loaded: crewLoaded && siteLoaded };
}
