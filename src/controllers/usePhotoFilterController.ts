import { useEffect, useMemo, useState } from 'react';

import { fetchSitesByIds } from '@/api/sitesApi';
import { HAS_FIREBASE_CONFIG } from '@/constants/config';
import { Photo } from '@/types/domain';
import {
  ALL_SITES,
  DateRange,
  dateOptions,
  filterPhotos,
  siteIdsIn,
  siteOptions,
  startOfDay,
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

  // Ranges only depend on the calendar day, so the day's start keeps these memos stable all day.
  const now = startOfDay(Date.now());
  // Each row's counts follow the other row's choice: site chips count within the date window,
  // date chips count within the chosen site, so a chip always says what picking it shows.
  const inRange = useMemo(() => filterPhotos(photos, ALL_SITES, range, now), [photos, range, now]);
  const options = useMemo(() => siteOptions(photos, siteNames, inRange), [photos, siteNames, inRange]);
  // A chosen site with no photos left in the list (e.g. after picking another person) falls back to all sites.
  const selectedSite = options.some(option => option.id === siteFilter) ? siteFilter : ALL_SITES;
  const atSite = useMemo(() => filterPhotos(photos, selectedSite, 'all', now), [photos, selectedSite, now]);
  const dates = useMemo(() => dateOptions(atSite, now), [atSite, now]);
  const visiblePhotos = useMemo(() => filterPhotos(atSite, ALL_SITES, range, now), [atSite, range, now]);

  return {
    siteOptions: options,
    siteFilter: selectedSite,
    setSiteFilter,
    dateOptions: dates,
    range,
    setRange: (id: string) => setRange(id as DateRange),
    visiblePhotos,
    /** Site id -> name, for anything that names the chosen site outside the chips. */
    siteNames,
    /** True when a filter is narrowing the list, so an empty list reads as "nothing matches" rather than "no photos". */
    filtering: selectedSite !== ALL_SITES || range !== 'all',
  };
}
