import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  addLocalPhoto,
  loadLocalPhotos,
  markLocalPhotosSynced,
  saveLocalPhotos,
} from '@/services/photoQueueStorage';
import { Photo } from '@/types/domain';

// An in-memory AsyncStorage, so the tests can check what ends up under which key.
const mockDisk = new Map<string, string>();
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(async (key: string) => mockDisk.get(key) ?? null),
  setItem: jest.fn(async (key: string, value: string) => {
    mockDisk.set(key, value);
  }),
}));

function photo(overrides: Partial<Photo>): Photo {
  return {
    id: 'local-1',
    uri: 'file:///docs/a.jpg',
    lat: 27.7,
    lng: 85.3,
    accuracy: 6,
    plusCode: '7JJVXR9R+2X',
    takenAt: 1,
    personId: 'worker-1',
    task: 'Task',
    synced: false,
    ...overrides,
  };
}

const ids = (photos: Photo[]) => photos.map(p => p.id);

describe('photoQueueStorage', () => {
  beforeEach(() => {
    mockDisk.clear();
    jest.clearAllMocks();
  });

  it('reads as empty on a fresh install', async () => {
    expect(await loadLocalPhotos('worker-1')).toEqual([]);
  });

  it('reads a corrupt stored list as empty rather than throwing', async () => {
    // A half-written value after a crash mid-save would look like this.
    mockDisk.set('photoQueue:worker-1', '[{"id":"oh no');

    expect(await loadLocalPhotos('worker-1')).toEqual([]);
  });

  it("keeps each person's captures apart on a shared phone", async () => {
    await addLocalPhoto(photo({ id: 'a', personId: 'worker-1' }));
    await addLocalPhoto(photo({ id: 'b', personId: 'worker-2' }));

    expect(ids(await loadLocalPhotos('worker-1'))).toEqual(['a']);
    expect(ids(await loadLocalPhotos('worker-2'))).toEqual(['b']);
  });

  it("never lets one person's save touch another person's list", async () => {
    // The old bug: the admin signing in replaced the one shared list with theirs.
    await addLocalPhoto(photo({ id: 'mine', personId: 'worker-1' }));

    await saveLocalPhotos('owner-1', []);

    expect(ids(await loadLocalPhotos('worker-1'))).toEqual(['mine']);
  });

  it('keeps every capture when several land at once', async () => {
    await Promise.all([
      addLocalPhoto(photo({ id: 'a' })),
      addLocalPhoto(photo({ id: 'b' })),
      addLocalPhoto(photo({ id: 'c' })),
    ]);

    expect(ids(await loadLocalPhotos('worker-1')).sort()).toEqual(['a', 'b', 'c']);
  });

  it('does not store the same capture twice', async () => {
    await addLocalPhoto(photo({ id: 'a' }));
    await addLocalPhoto(photo({ id: 'a' }));

    expect(ids(await loadLocalPhotos('worker-1'))).toEqual(['a']);
  });

  it("carries a person's photos over from the old shared list, and only theirs", async () => {
    mockDisk.set(
      'photoQueue',
      JSON.stringify([
        photo({ id: 'old-mine', personId: 'worker-1' }),
        photo({ id: 'old-theirs', personId: 'worker-2' }),
      ])
    );
    await addLocalPhoto(photo({ id: 'new-mine', personId: 'worker-1' }));

    expect(ids(await loadLocalPhotos('worker-1'))).toEqual(['new-mine', 'old-mine']);
    // Written to their own key, so it no longer depends on the old list.
    expect(ids(JSON.parse(mockDisk.get('photoQueue:worker-1') ?? '[]'))).toEqual(['new-mine', 'old-mine']);
  });

  it('marks only the given captures synced', async () => {
    await addLocalPhoto(photo({ id: 'a' }));
    await addLocalPhoto(photo({ id: 'b' }));

    await markLocalPhotosSynced('worker-1', ['a']);

    const stored = await loadLocalPhotos('worker-1');
    expect(stored.find(p => p.id === 'a')?.synced).toBe(true);
    expect(stored.find(p => p.id === 'b')?.synced).toBe(false);
  });

  it('does not reject when the device write fails', async () => {
    // Runs on every capture — an unhandled rejection would surface as a redbox mid-shot.
    (AsyncStorage.setItem as jest.Mock).mockRejectedValueOnce(new Error('disk full'));

    await expect(addLocalPhoto(photo({ id: 'a' }))).resolves.toBeUndefined();
  });
});
