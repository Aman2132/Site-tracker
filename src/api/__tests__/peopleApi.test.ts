import { onValue, update } from 'firebase/database';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';

import { createPersonProfile, reportPauseState, reportPosition, subscribeToCrew } from '@/api/peopleApi';
import { Person } from '@/types/domain';

jest.mock('@/api/firebaseClient', () => ({ firestore: {}, rtdb: {}, auth: {} }));

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  doc: jest.fn((_db: unknown, collection: string, id: string) => ({ collection, id })),
  getDoc: jest.fn(),
  setDoc: jest.fn(async () => undefined),
  onSnapshot: jest.fn(() => jest.fn()),
}));

jest.mock('firebase/database', () => ({
  ref: jest.fn((_db: unknown, path: string) => ({ path })),
  onValue: jest.fn(() => jest.fn()),
  update: jest.fn(async () => undefined),
  serverTimestamp: jest.fn(() => ({ '.sv': 'timestamp' })),
}));

const profileDoc = {
  id: 'worker-1',
  data: () => ({ name: 'Ramesh Kumar', role: 'Driver', appRole: 'worker', color: '#1a73e8' }),
};

/** Drives one subscribeToCrew cycle and returns the merged crew it emitted. */
function emitCrew(positions: Record<string, unknown>): Person[] {
  const onChange = jest.fn();
  subscribeToCrew(onChange);

  const profilesCb = (onSnapshot as jest.Mock).mock.calls[0][1];
  const positionsCb = (onValue as jest.Mock).mock.calls[0][1];

  profilesCb({ docs: [profileDoc] });
  positionsCb({ val: () => positions });

  return onChange.mock.calls[onChange.mock.calls.length - 1][0];
}

describe('subscribeToCrew staleness', () => {
  beforeEach(() => jest.clearAllMocks());

  it('reports a recent fix with its live activity', () => {
    const [person] = emitCrew({
      'worker-1': { lat: 27.7, lng: 85.3, accuracy: 8, kind: 'walk', lastFixAt: Date.now() - 5_000 },
    });

    expect(person.kind).toBe('walk');
    expect(person.lat).toBe(27.7);
    expect(person.accuracy).toBe(8);
  });

  it('marks a fix older than the staleness window as stale, whatever it last reported', () => {
    // A phone that died mid-shift keeps its last "vehicle" reading forever —
    // the owner must not see it as still driving.
    const [person] = emitCrew({
      'worker-1': { lat: 27.7, lng: 85.3, accuracy: 8, kind: 'vehicle', lastFixAt: Date.now() - 4 * 60_000 },
    });

    expect(person.kind).toBe('stale');
  });

  it('keeps a fix just inside the staleness window live', () => {
    // 2 min old against a 3 min window — still trusted.
    const [person] = emitCrew({
      'worker-1': { lat: 27.7, lng: 85.3, accuracy: 8, kind: 'walk', lastFixAt: Date.now() - 2 * 60_000 },
    });

    expect(person.kind).toBe('walk');
  });

  it('marks a worker who has never reported as stale rather than placing them at null island', () => {
    const [person] = emitCrew({});

    expect(person.kind).toBe('stale');
    expect(person.lastFixAt).toBe(0);
    expect(person.accuracy).toBe(9999);
  });

  it('keeps the static profile fields even with no live position', () => {
    const [person] = emitCrew({});

    expect(person.name).toBe('Ramesh Kumar');
    expect(person.appRole).toBe('worker');
    expect(person.paused).toBe(false);
  });

  it('survives a partial position that only has coordinates', () => {
    // RTDB writes are update(), so a brand-new worker's first record may have
    // no kind/battery/paused at all.
    const [person] = emitCrew({ 'worker-1': { lat: 27.7, lng: 85.3, lastFixAt: Date.now() } });

    expect(person.kind).toBe('still');
    expect(person.accuracy).toBe(9999);
    expect(person.battery).toBe(1);
  });

  it('tears down both subscriptions on unsubscribe', () => {
    const unsubProfiles = jest.fn();
    const unsubPositions = jest.fn();
    (onSnapshot as jest.Mock).mockReturnValue(unsubProfiles);
    (onValue as jest.Mock).mockReturnValue(unsubPositions);

    subscribeToCrew(jest.fn())();

    expect(unsubProfiles).toHaveBeenCalledTimes(1);
    expect(unsubPositions).toHaveBeenCalledTimes(1);
  });
});

describe('position writes', () => {
  beforeEach(() => jest.clearAllMocks());

  it('writes a fix under the reporting worker own path', async () => {
    await reportPosition('worker-1', { lat: 27.7, lng: 85.3, accuracy: 6, kind: 'walk' });

    const [target, payload] = (update as jest.Mock).mock.calls[0];
    expect(target).toEqual({ path: 'positions/worker-1' });
    expect(payload).toMatchObject({ lat: 27.7, lng: 85.3, accuracy: 6, kind: 'walk' });
  });

  it('stamps the fix with a server timestamp, not the device clock', () => {
    // Staleness is judged against this, so a wrong device clock must not be
    // able to make a dead phone look fresh.
    reportPosition('worker-1', { lat: 27.7, lng: 85.3, accuracy: 6, kind: 'walk' });

    const [, payload] = (update as jest.Mock).mock.calls[0];
    expect(payload.lastFixAt).toEqual({ '.sv': 'timestamp' });
  });

  it('writes a pause flag without waiting for the next GPS fix', async () => {
    await reportPauseState('worker-1', true);

    expect(update).toHaveBeenCalledWith({ path: 'positions/worker-1' }, { paused: true });
  });
});

describe('createPersonProfile', () => {
  beforeEach(() => jest.clearAllMocks());

  it('pins appRole to worker regardless of anything else', async () => {
    await createPersonProfile('worker-9', 'Pooja Devi');

    expect(doc).toHaveBeenCalledWith(expect.anything(), 'people', 'worker-9');
    const [, payload] = (setDoc as jest.Mock).mock.calls[0];
    expect(payload.appRole).toBe('worker');
    expect(payload.name).toBe('Pooja Devi');
  });

  it('gives two different uids two different colors from the palette', async () => {
    await createPersonProfile('worker-a', 'A');
    await createPersonProfile('worker-b', 'B');

    const [, payloadA] = (setDoc as jest.Mock).mock.calls[0];
    const [, payloadB] = (setDoc as jest.Mock).mock.calls[1];
    // Not guaranteed to differ for every pair (small palette), but these two
    // specific ids are chosen to land on different buckets.
    expect(payloadA.color).not.toBe(payloadB.color);
  });

  it('assigns the same worker the same color every time, deterministically', async () => {
    await createPersonProfile('worker-a', 'A');
    await createPersonProfile('worker-a', 'A again');

    const [, first] = (setDoc as jest.Mock).mock.calls[0];
    const [, second] = (setDoc as jest.Mock).mock.calls[1];
    expect(first.color).toBe(second.color);
  });

  it('never writes an id field — the document id is the uid, not a payload field', async () => {
    await createPersonProfile('worker-9', 'Pooja Devi');

    const [, payload] = (setDoc as jest.Mock).mock.calls[0];
    expect(payload.id).toBeUndefined();
  });
});
