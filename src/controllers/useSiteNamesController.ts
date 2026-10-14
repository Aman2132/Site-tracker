import { useEffect, useState } from 'react';

import { fetchSitesByIds } from '@/api/sitesApi';
import { HAS_FIREBASE_CONFIG } from '@/constants/config';

/**
 * Site names for a set of site ids, fetched once per id. Ids that no longer
 * exist are remembered as "Unknown site" so they are not fetched again.
 */
export function useSiteNamesController(siteIds: (string | undefined)[]): Record<string, string> {
  const [names, setNames] = useState<Record<string, string>>({});
  const key = Array.from(new Set(siteIds.filter((id): id is string => !!id)))
    .sort()
    .join(',');

  useEffect(() => {
    const missing = (key ? key.split(',') : []).filter(id => !(id in names));
    if (!HAS_FIREBASE_CONFIG || missing.length === 0) return;
    let cancelled = false;
    fetchSitesByIds(missing)
      .then(sites => {
        if (cancelled) return;
        const found = Object.fromEntries(sites.map(site => [site.id, site.name]));
        setNames(previous => ({
          ...previous,
          ...Object.fromEntries(missing.map(id => [id, found[id] ?? 'Unknown site'])),
        }));
      })
      .catch(error => console.warn('[sites] could not load site names —', error));
    return () => {
      cancelled = true;
    };
    // names is read only to skip ids already known; refetching whenever it changes would loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return names;
}
