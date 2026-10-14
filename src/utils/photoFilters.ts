import { Photo } from '@/types/domain';

/** Date windows for the Photos screens, counted in whole days on the phone's own calendar. */
export type DateRange = 'all' | 'today' | 'week' | 'month';

export const DATE_RANGES: { id: DateRange; label: string }[] = [
  { id: 'all', label: 'All time' },
  { id: 'today', label: 'Today' },
  { id: 'week', label: 'Last 7 days' },
  { id: 'month', label: 'Last 30 days' },
];

/** Site filter values that aren't a site id. */
export const ALL_SITES = '__all__';
export const NO_SITE = '__none__';

const DAYS_BACK: Record<Exclude<DateRange, 'all'>, number> = { today: 0, week: 6, month: 29 };

/** Midnight (device time) of the day `daysBack` days before the one containing `now`. */
export function startOfDay(now: number, daysBack = 0): number {
  const date = new Date(now);
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - daysBack);
  return date.getTime();
}

/** Earliest `takenAt` a range lets through, or null for no limit. */
export function rangeStart(range: DateRange, now: number): number | null {
  return range === 'all' ? null : startOfDay(now, DAYS_BACK[range]);
}

/** Photos matching a site filter (an id, ALL_SITES, or NO_SITE) and a date range. */
export function filterPhotos(photos: Photo[], siteFilter: string, range: DateRange, now: number): Photo[] {
  const from = rangeStart(range, now);
  return photos.filter(
    photo =>
      (from === null || photo.takenAt >= from) &&
      (siteFilter === ALL_SITES || (siteFilter === NO_SITE ? !photo.siteId : photo.siteId === siteFilter))
  );
}

export interface SiteOption {
  id: string;
  label: string;
}

/**
 * One chip per site that appears in `photos` (sorted by name), led by "All
 * sites" and closed by "No site" when some captures were taken while not
 * checked in. Counts come from `counted` — the photos inside the chosen date
 * window — so a chip says how many photos picking it will show; a site with
 * none in that window stays (with 0) instead of jumping away. Unknown site ids
 * (deleted, or names not loaded yet) read as "Unknown site".
 */
export function siteOptions(
  photos: Photo[],
  siteNames: Record<string, string>,
  counted: Photo[] = photos
): SiteOption[] {
  const ids = new Set<string>();
  let anyWithoutSite = false;
  for (const photo of photos) {
    if (photo.siteId) ids.add(photo.siteId);
    else anyWithoutSite = true;
  }
  const countOf = (match: (photo: Photo) => boolean) => counted.filter(match).length;
  const sites = Array.from(ids, id => ({ id, name: siteNames[id] ?? 'Unknown site' })).sort((a, b) =>
    a.name.localeCompare(b.name)
  );
  return [
    { id: ALL_SITES, label: `All sites · ${counted.length}` },
    ...sites.map(site => ({ id: site.id, label: `${site.name} · ${countOf(p => p.siteId === site.id)}` })),
    ...(anyWithoutSite ? [{ id: NO_SITE, label: `No site · ${countOf(p => !p.siteId)}` }] : []),
  ];
}

/** The date chips, each with how many of `photos` (already narrowed to the chosen site) it would show. */
export function dateOptions(photos: Photo[], now: number): { id: DateRange; label: string }[] {
  return DATE_RANGES.map(range => {
    const from = rangeStart(range.id, now);
    const count = from === null ? photos.length : photos.filter(photo => photo.takenAt >= from).length;
    return { id: range.id, label: `${range.label} · ${count}` };
  });
}

/** The distinct site ids in a photo list, sorted, so it can be used as a stable effect key. */
export function siteIdsIn(photos: Photo[]): string[] {
  return Array.from(new Set(photos.map(photo => photo.siteId).filter((id): id is string => !!id))).sort();
}
