import { loadShift, saveShift } from '@/services/shiftStorage';
import { ActiveShift } from '@/types/domain';

const mockDisk = new Map<string, string>();
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(async (key: string) => mockDisk.get(key) ?? null),
  setItem: jest.fn(async (key: string, value: string) => {
    mockDisk.set(key, value);
  }),
  removeItem: jest.fn(async (key: string) => {
    mockDisk.delete(key);
  }),
}));

const shift: ActiveShift = { siteId: 's1', siteName: 'Tower B', checkedInAt: 5, sessionId: 'x', paused: false };

describe('shiftStorage', () => {
  beforeEach(() => mockDisk.clear());

  it('keeps each person shift separate', async () => {
    await saveShift('a', shift);
    await saveShift('b', { ...shift, siteId: 's2' });

    expect((await loadShift('a'))?.siteId).toBe('s1');
    expect((await loadShift('b'))?.siteId).toBe('s2');
  });

  it('clears the shift when saved as null', async () => {
    await saveShift('a', shift);
    await saveShift('a', null);

    expect(await loadShift('a')).toBeNull();
  });

  it('reads a corrupt or malformed value as not checked in', async () => {
    mockDisk.set('shift:a', '{not json');
    expect(await loadShift('a')).toBeNull();

    mockDisk.set('shift:a', JSON.stringify({ hello: 1 }));
    expect(await loadShift('a')).toBeNull();
  });
});
