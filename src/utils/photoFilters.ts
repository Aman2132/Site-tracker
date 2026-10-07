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
 * One chip per site that appears in `photos` (sorted by name, with its photo
 * count), led by "All sites" and closed by "No site" when some captures were
 * taken while not checked in. Unknown site ids (deleted, or names not loaded
 * yet) read as "Unknown site".
 */
export function siteOptions(photos: Photo[], siteNames: Record<string, string>): SiteOption[] {
  const counts = new Map<string, number>();
  let withoutSite = 0;
  for (const photo of photos) {
    if (photo.siteId) counts.set(photo.siteId, (counts.get(photo.siteId) ?? 0) + 1);
    else withoutSite++;
  }
  const sites = Array.from(counts, ([id, count]) => ({
    id,
    name: siteNames[id] ?? 'Unknown site',
    count,
  })).sort((a, b) => a.name.localeCompare(b.name));
  return [
    { id: ALL_SITES, label: `All sites · ${photos.length}` },
    ...sites.map(site => ({ id: site.id, label: `${site.name} · ${site.count}` })),
    ...(withoutSite > 0 ? [{ id: NO_SITE, label: `No site · ${withoutSite}` }] : []),
  ];
}

/** The distinct site ids in a photo list, sorted, so it can be used as a stable effect key. */
export function siteIdsIn(photos: Photo[]): string[] {
  return Array.from(new Set(photos.map(photo => photo.siteId).filter((id): id is string => !!id))).sort();
}
