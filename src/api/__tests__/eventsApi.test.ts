import { addDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';

import { logEvent, subscribeToEvents } from '@/api/eventsApi';
import { AppEvent } from '@/types/domain';

jest.mock('@/api/firebaseClient', () => ({ firestore: {}, rtdb: {}, auth: {} }));

jest.mock('firebase/firestore', () => ({
  collection: jest.fn((_db: unknown, name: string) => ({ name })),
  query: jest.fn((coll: unknown, ...constraints: unknown[]) => ({ coll, constraints })),
  orderBy: jest.fn((field: string, dir: string) => ({ kind: 'orderBy', field, dir })),
  limit: jest.fn((n: number) => ({ kind: 'limit', n })),
  onSnapshot: jest.fn(() => jest.fn()),
  addDoc: jest.fn(async () => ({ id: 'e1' })),
  serverTimestamp: jest.fn(() => ({ '.sv': 'timestamp' })),
}));

/** Feeds one snapshot through subscribeToEvents and returns what it emitted. */
function emitEvents(docs: { id: string; data: () => unknown }[]): AppEvent[] {
  const onChange = jest.fn();
  subscribeToEvents(onChange, jest.fn());
  const callback = (onSnapshot as jest.Mock).mock.calls[0][1];
  callback({ docs });
  return onChange.mock.calls[0][0];
}

describe('subscribeToEvents timestamp handling', () => {
  beforeEach(() => jest.clearAllMocks());

  it('passes a plain millisecond number straight through', () => {
    const [event] = emitEvents([
      { id: 'e1', data: () => ({ text: 'Ramesh paused sharing', kind: 'warn', at: 1_700_000_000_000 }) },
    ]);

    expect(event.at).toBe(1_700_000_000_000);
    expect(event.text).toBe('Ramesh paused sharing');
  });

  it('converts a Firestore Timestamp to milliseconds', () => {
    const [event] = emitEvents([
      { id: 'e1', data: () => ({ text: 'x', kind: 'info', at: { toMillis: () => 1_700_000_000_000 } }) },
    ]);

    expect(event.at).toBe(1_700_000_000_000);
  });

  it('falls back to now for a server timestamp that has not resolved yet', () => {
    // A locally-written doc surfaces with at === null until the server
    // round-trips. Sorting on undefined would throw the feed out of order.
    const before = Date.now();
    const [event] = emitEvents([{ id: 'e1', data: () => ({ text: 'x', kind: 'info', at: null }) }]);

    expect(event.at).toBeGreaterThanOrEqual(before);
  });

  it('preserves the document id as the event id', () => {
    const [event] = emitEvents([{ id: 'abc123', data: () => ({ text: 'x', kind: 'info', at: 1 }) }]);

    expect(event.id).toBe('abc123');
  });

  it('emits an empty feed rather than failing when there are no events', () => {
    expect(emitEvents([])).toEqual([]);
  });
});

describe('logEvent', () => {
  beforeEach(() => jest.clearAllMocks());

  it('appends with a server timestamp so every device agrees on ordering', async () => {
    await logEvent('2 photos uploaded from Ramesh', 'info');

    expect(serverTimestamp).toHaveBeenCalled();
    expect(addDoc).toHaveBeenCalledWith(
      { name: 'events' },
      { text: '2 photos uploaded from Ramesh', kind: 'info', at: { '.sv': 'timestamp' } }
    );
  });
});
