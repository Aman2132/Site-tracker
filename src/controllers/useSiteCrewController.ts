import { useEffect, useMemo, useState } from 'react';

import { fetchSiteCrew, SitePresence, subscribeToSitePresence } from '@/api/peopleApi';
import { HAS_FIREBASE_CONFIG, SITE_CREW } from '@/constants/config';
import { useAuthStore } from '@/store/useAuthStore';
import { PersonProfile } from '@/types/domain';
import { buildSiteCrew, hereCount } from '@/utils/siteCrew';

/**
 * Worker Home screen: who else works at the site I'm checked in at, and who
 * of them is on site right now. Reads only that site's crew (one small query)
 * and only that site's live check-ins, never everyone's positions, and shows
 * names and status only, not anyone's location.
 */
export function useSiteCrewController(siteId: string | undefined) {
  const myId = useAuthStore(state => state.profile?.id);
  // Tagged with the site they belong to, so switching sites never shows the old site's crew.
  const [assigned, setAssigned] = useState<{ siteId: string; people: PersonProfile[] } | null>(null);
  const [presence, setPresence] = useState<{ siteId: string; bySite: Record<string, SitePresence> } | null>(
    null
  );
  const [now, setNow] = useState(() => Date.now());

  // A phone that goes silent sends nothing, so "no signal" is noticed by re-checking on a timer.
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), SITE_CREW.refreshMs);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!siteId || !HAS_FIREBASE_CONFIG) return;
    let cancelled = false;
    fetchSiteCrew(siteId)
      .then(people => !cancelled && setAssigned({ siteId, people }))
      .catch(error => console.warn('[crew] could not load the site crew —', error));
    const unsubscribe = subscribeToSitePresence(
      siteId,
      bySite => setPresence({ siteId, bySite }),
      error => console.warn('[crew] live check-ins stopped —', error)
    );
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [siteId]);

  const crew = useMemo(() => {
    if (!siteId || assigned?.siteId !== siteId) return [];
    const live = presence?.siteId === siteId ? presence.bySite : {};
    return buildSiteCrew(assigned.people, live, myId ?? '', now, SITE_CREW.signalLostAfterMs);
  }, [siteId, assigned, presence, myId, now]);

  return {
    crew,
    hereCount: hereCount(crew),
    loading: !!siteId && HAS_FIREBASE_CONFIG && assigned?.siteId !== siteId,
  };
}
