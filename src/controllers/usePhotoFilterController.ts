import { useEffect, useMemo, useState } from 'react';

import { fetchSitesByIds } from '@/api/sitesApi';
import { HAS_FIREBASE_CONFIG } from '@/constants/config';
import { Photo } from '@/types/domain';
import {
  ALL_SITES,
  DATE_RANGES,
  DateRange,
  filterPhotos,
  siteIdsIn,
  siteOptions,
} from '@/utils/photoFilters';

/** Shown for a site id that no longer exists (deleted from the dashboard). */
const UNKNOWN_SITE = 'Unknown site';

/**
 * Photos screens (owner and worker): narrows a photo list to one site and a
 * date window. Site names are looked up only for the sites that actually appear
 * in the list, so the chips read "Tower B · 12" rather than raw ids.
 */
export function usePhotoFilterController(photos: Photo[]) {
  const [siteFilter, setSiteFilter] = useState<string>(ALL_SITES);
  const [range, setRange] = useState<DateRange>('all');
  const [siteNames, setSiteNames] = useState<Record<string, string>>({});

  const siteIdsKey = siteIdsIn(photos).join(',');

  useEffect(() => {
    const missing = (siteIdsKey ? siteIdsKey.split(',') : []).filter(id => !(id in siteNames));
    if (!HAS_FIREBASE_CONFIG || missing.length === 0) return;
    let cancelled = false;
    fetchSitesByIds(missing)
      .then(sites => {
        if (cancelled) return;
        const found = Object.fromEntries(sites.map(site => [site.id, site.name]));
        // Ids that came back empty are remembered as unknown, so they aren't fetched again.
        const resolved = Object.fromEntries(missing.map(id => [id, found[id] ?? UNKNOWN_SITE]));
        setSiteNames(previous => ({ ...previous, ...resolved }));
      })
      .catch(error => console.warn('[photos] could not load site names —', error));
    return () => {
      cancelled = true;
    };
    // siteNames is read only to skip ids already known; refetching whenever it changes would loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteIdsKey]);

  const options = useMemo(() => siteOptions(photos, siteNames), [photos, siteNames]);
  // A chosen site with no photos left in the list (e.g. after picking another person) falls back to all sites.
  const selectedSite = options.some(option => option.id === siteFilter) ? siteFilter : ALL_SITES;
  const visiblePhotos = useMemo(
    () => filterPhotos(photos, selectedSite, range, Date.now()),
    [photos, selectedSite, range]
  );

  return {
    siteOptions: options,
    siteFilter: selectedSite,
    setSiteFilter,
    dateOptions: DATE_RANGES,
    range,
    setRange: (id: string) => setRange(id as DateRange),
    visiblePhotos,
    /** True when a filter is narrowing the list, so an empty list reads as "nothing matches" rather than "no photos". */
    filtering: selectedSite !== ALL_SITES || range !== 'all',
  };
}
