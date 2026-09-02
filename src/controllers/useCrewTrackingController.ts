import { useEffect } from 'react';

import { fetchCrew } from '@/api/peopleApi';
import { fetchSite } from '@/api/siteApi';
import { useCrewStore } from '@/store/useCrewStore';
import { useSiteStore } from '@/store/useSiteStore';

/**
 * Loads the crew roster and site once (owner-side screens). Safe to call
 * from multiple screens — each guards on the store's `loaded` flag, so
 * whichever tab mounts first does the fetch and the rest just read state.
 */
export function useCrewTrackingController() {
  const people = useCrewStore(state => state.people);
  const crewLoaded = useCrewStore(state => state.loaded);
  const setPeople = useCrewStore(state => state.setPeople);

  const site = useSiteStore(state => state.site);
  const siteLoaded = useSiteStore(state => state.loaded);
  const setSite = useSiteStore(state => state.setSite);

  useEffect(() => {
    if (!crewLoaded) fetchCrew().then(setPeople);
  }, [crewLoaded, setPeople]);

  useEffect(() => {
    if (!siteLoaded) fetchSite().then(setSite);
  }, [siteLoaded, setSite]);

  return { people, site, loaded: crewLoaded && siteLoaded };
}
