import { AppEvent } from '@/types/domain';
import { eventCategory, eventTarget, filterEvents, mergeRepeats } from '@/utils/activityFeed';

const event = (id: string, at: number, text: string, extra: Partial<AppEvent> = {}): AppEvent => ({
  id,
  at,
  text,
  kind: 'info',
  ...extra,
});
const MIN = 60_000;

describe('eventCategory', () => {
  it('uses the stored type when there is one', () => {
    expect(eventCategory(event('1', 0, 'anything', { type: 'upload' }))).toBe('upload');
  });

  it('reads older, untyped events from their text', () => {
    expect(eventCategory(event('1', 0, 'Ram checked in at Alpha'))).toBe('checkin');
    expect(eventCategory(event('1', 0, 'Ram checked out of Alpha'))).toBe('checkout');
    expect(eventCategory(event('1', 0, 'Ram paused sharing'))).toBe('pause');
    expect(eventCategory(event('1', 0, '3 photos uploaded from Ram'))).toBe('upload');
    expect(eventCategory(event('1', 0, 'Owner made Ram a worker'))).toBe('other');
  });
});

describe('mergeRepeats', () => {
  it('folds back-to-back repeats within the window into one entry with a count', () => {
    const entries = mergeRepeats(
      [event('a', 10 * MIN, 'Ram paused sharing'), event('b', 9 * MIN, 'Ram paused sharing')],
      5 * MIN
    );
    expect(entries).toEqual([{ event: expect.objectContaining({ id: 'a' }), count: 2 }]);
  });

  it('keeps repeats apart when something else happened in between, or they are too far apart', () => {
    const entries = mergeRepeats(
      [
        event('a', 60 * MIN, 'Ram paused sharing'),
        event('b', 59 * MIN, 'Ram resumed sharing'),
        event('c', 58 * MIN, 'Ram paused sharing'),
        event('d', 10 * MIN, 'Ram paused sharing'),
      ],
      5 * MIN
    );
    expect(entries.map(entry => [entry.event.id, entry.count])).toEqual([
      ['a', 1],
      ['b', 1],
      ['c', 1],
      ['d', 1],
    ]);
  });

  it('chains a run where each repeat is close to the previous one', () => {
    const entries = mergeRepeats(
      [event('a', 12 * MIN, 'x'), event('b', 8 * MIN, 'x'), event('c', 4 * MIN, 'x')],
      5 * MIN
    );
    expect(entries).toHaveLength(1);
    expect(entries[0].count).toBe(3);
  });
});

describe('filterEvents', () => {
  const events = [
    event('1', 0, 'Ram checked in', { type: 'checkin', personId: 'ram', siteId: 'alpha' }),
    event('2', 0, 'Sita checked in', { type: 'checkin', personId: 'sita', siteId: 'beta' }),
    event('3', 0, '2 photos uploaded from Ram', { type: 'upload', personId: 'ram', siteId: 'beta' }),
  ];

  it('narrows by person, site and type together', () => {
    expect(filterEvents(events, { personId: 'ram', siteId: null, category: null }).map(e => e.id)).toEqual([
      '1',
      '3',
    ]);
    expect(
      filterEvents(events, { personId: null, siteId: 'beta', category: 'checkin' }).map(e => e.id)
    ).toEqual(['2']);
  });

  it('lets everything through with no filter', () => {
    expect(filterEvents(events, { personId: null, siteId: null, category: null })).toHaveLength(3);
  });
});

describe('eventTarget', () => {
  it('opens photos for an upload and the person for anything else', () => {
    expect(eventTarget(event('1', 0, 'x', { type: 'upload', personId: 'ram' }))).toEqual({
      tab: 'Photos',
      personId: 'ram',
    });
    expect(eventTarget(event('1', 0, 'x', { type: 'pause', personId: 'ram' }))).toEqual({
      tab: 'Crew',
      personId: 'ram',
    });
  });

  it('goes nowhere for an event about no one', () => {
    expect(eventTarget(event('1', 0, 'x'))).toBeNull();
  });
});
