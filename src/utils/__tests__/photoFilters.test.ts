import { Photo } from '@/types/domain';
import {
  ALL_SITES,
  NO_SITE,
  filterPhotos,
  rangeStart,
  siteIdsIn,
  siteOptions,
  startOfDay,
} from '@/utils/photoFilters';

const DAY = 24 * 60 * 60 * 1000;
// A fixed afternoon, read in the test machine's own time zone like the app does.
const NOW = new Date(2026, 9, 7, 15, 30).getTime();

function photo(overrides: Partial<Photo>): Photo {
  return {
    id: 'p',
    uri: 'file:///a.jpg',
    lat: 27.7,
    lng: 85.3,
    accuracy: 5,
    plusCode: 'X',
    takenAt: NOW,
    personId: 'w1',
    task: 'Task',
    synced: true,
    ...overrides,
  };
}

describe('date ranges', () => {
  it('today starts at local midnight', () => {
    expect(rangeStart('today', NOW)).toBe(new Date(2026, 9, 7).getTime());
  });

  it('last 7 days includes today and the six days before it', () => {
    expect(rangeStart('week', NOW)).toBe(new Date(2026, 9, 1).getTime());
  });

  it('all time has no limit', () => {
    expect(rangeStart('all', NOW)).toBeNull();
  });

  it('counts back across a month boundary', () => {
    expect(startOfDay(new Date(2026, 9, 2, 10).getTime(), 3)).toBe(new Date(2026, 8, 29).getTime());
  });
});

describe('filterPhotos', () => {
  const photos = [
    photo({ id: 'today-a', siteId: 'a', takenAt: NOW - 60_000 }),
    photo({ id: 'old-a', siteId: 'a', takenAt: NOW - 10 * DAY }),
    photo({ id: 'today-b', siteId: 'b', takenAt: NOW - 120_000 }),
    photo({ id: 'today-none', takenAt: NOW - 180_000 }),
  ];
  const ids = (list: Photo[]) => list.map(p => p.id);

  it('filters by site', () => {
    expect(ids(filterPhotos(photos, 'a', 'all', NOW))).toEqual(['today-a', 'old-a']);
  });

  it('keeps captures without a site under "No site"', () => {
    expect(ids(filterPhotos(photos, NO_SITE, 'all', NOW))).toEqual(['today-none']);
  });

  it('combines site and date', () => {
    expect(ids(filterPhotos(photos, 'a', 'today', NOW))).toEqual(['today-a']);
  });

  it('shows everything with no filters', () => {
    expect(filterPhotos(photos, ALL_SITES, 'all', NOW)).toHaveLength(4);
  });
});

describe('siteOptions', () => {
  it('lists each site by name with its count, then the photos without a site', () => {
    const photos = [photo({ siteId: 'b' }), photo({ siteId: 'a' }), photo({ siteId: 'b' }), photo({})];

    expect(siteOptions(photos, { a: 'Alpha', b: 'Bravo' })).toEqual([
      { id: ALL_SITES, label: 'All sites · 4' },
      { id: 'a', label: 'Alpha · 1' },
      { id: 'b', label: 'Bravo · 2' },
      { id: NO_SITE, label: 'No site · 1' },
    ]);
  });

  it('names a site it cannot resolve "Unknown site"', () => {
    expect(siteOptions([photo({ siteId: 'gone' })], {})[1].label).toBe('Unknown site · 1');
  });
});

describe('siteIdsIn', () => {
  it('returns each site once, sorted', () => {
    expect(
      siteIdsIn([photo({ siteId: 'b' }), photo({ siteId: 'a' }), photo({ siteId: 'b' }), photo({})])
    ).toEqual(['a', 'b']);
  });
});
