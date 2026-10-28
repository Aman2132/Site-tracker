import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  addLocalPhoto,
  deleteLocalPhotos,
  loadLocalPhotos,
  markLocalPhotosSynced,
  setLocalPhotoInventory,
  setLocalPhotoNote,
  setLocalPhotoThumb,
} from '@/services/photoQueueStorage';
import { createFakePhotoDatabase } from '@/test-utils/fakePhotoDatabase';
import { Photo } from '@/types/domain';

jest.mock('@/constants/config', () => ({ PHOTO_DATABASE: { fileName: 'test.db' } }));

// An in-memory database, so the tests can check what ends up stored.
const mockDatabase = createFakePhotoDatabase();
jest.mock('expo-sqlite', () => ({ openDatabaseAsync: jest.fn(async () => mockDatabase) }));

// An in-memory AsyncStorage: only the old lists are read from it now.
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
    mockDatabase.rows.clear();
    mockDisk.clear();
    jest.clearAllMocks();
  });

  it('reads as empty on a fresh install', async () => {
    expect(await loadLocalPhotos('worker-1')).toEqual([]);
  });

  it('skips a row whose stored JSON is damaged rather than failing the list', async () => {
    mockDatabase.rows.set('worker-1|bad', {
      viewer_id: 'worker-1',
      id: 'bad',
      origin: 'local',
      taken_at: 1,
      data: '{"id":"oh no',
    });
    await addLocalPhoto(photo({ id: 'good', takenAt: 2 }));

    expect(ids(await loadLocalPhotos('worker-1'))).toEqual(['good']);
  });

  it("keeps each person's captures apart on a shared phone", async () => {
    await addLocalPhoto(photo({ id: 'a', personId: 'worker-1' }));
    await addLocalPhoto(photo({ id: 'b', personId: 'worker-2' }));

    expect(ids(await loadLocalPhotos('worker-1'))).toEqual(['a']);
    expect(ids(await loadLocalPhotos('worker-2'))).toEqual(['b']);
  });

  it('lists the newest capture first', async () => {
    await addLocalPhoto(photo({ id: 'old', takenAt: 1 }));
    await addLocalPhoto(photo({ id: 'new', takenAt: 9 }));

    expect(ids(await loadLocalPhotos('worker-1'))).toEqual(['new', 'old']);
  });

  it('does not add the same capture twice', async () => {
    await addLocalPhoto(photo({ id: 'a' }));
    await addLocalPhoto(photo({ id: 'a', task: 'changed' }));

    const stored = await loadLocalPhotos('worker-1');
    expect(stored).toHaveLength(1);
    expect(stored[0].task).toBe('Task');
  });

  it('marks only the given captures synced', async () => {
    await addLocalPhoto(photo({ id: 'a', takenAt: 2 }));
    await addLocalPhoto(photo({ id: 'b', takenAt: 1 }));

    await markLocalPhotosSynced('worker-1', ['a']);

    expect((await loadLocalPhotos('worker-1')).map(p => [p.id, p.synced])).toEqual([
      ['a', true],
      ['b', false],
    ]);
  });

  it('sets, changes and clears a note', async () => {
    await addLocalPhoto(photo({ id: 'a' }));

    await setLocalPhotoNote('worker-1', 'a', 'Pouring slab');
    expect((await loadLocalPhotos('worker-1'))[0].note).toBe('Pouring slab');

    await setLocalPhotoNote('worker-1', 'a', '');
    expect(await loadLocalPhotos('worker-1')).toEqual([expect.not.objectContaining({ note: expect.anything() })]);
  });

  it('links and unlinks an inventory entry', async () => {
    await addLocalPhoto(photo({ id: 'a' }));

    await setLocalPhotoInventory('worker-1', 'a', 'inv-1');
    expect((await loadLocalPhotos('worker-1'))[0].inventoryId).toBe('inv-1');

    await setLocalPhotoInventory('worker-1', 'a', null);
    expect((await loadLocalPhotos('worker-1'))[0]).not.toHaveProperty('inventoryId');
  });

  it("remembers where a capture's preview is saved", async () => {
    await addLocalPhoto(photo({ id: 'a' }));

    await setLocalPhotoThumb('worker-1', 'a', 'file:///docs/captures/worker-1/a_thumb.jpg');

    expect((await loadLocalPhotos('worker-1'))[0].localThumbUri).toBe('file:///docs/captures/worker-1/a_thumb.jpg');
  });

  it('keeps two quick changes to the same capture instead of losing one', async () => {
    await addLocalPhoto(photo({ id: 'a' }));

    await Promise.all([
      setLocalPhotoNote('worker-1', 'a', 'note'),
      setLocalPhotoThumb('worker-1', 'a', 'file:///t.jpg'),
      markLocalPhotosSynced('worker-1', ['a']),
    ]);

    expect((await loadLocalPhotos('worker-1'))[0]).toMatchObject({
      note: 'note',
      localThumbUri: 'file:///t.jpg',
      synced: true,
    });
  });

  it('ignores a change to a capture that is not there', async () => {
    await setLocalPhotoNote('worker-1', 'missing', 'x');

    expect(await loadLocalPhotos('worker-1')).toEqual([]);
  });

  it("deletes only the named captures, and only from that person's list", async () => {
    await addLocalPhoto(photo({ id: 'a', takenAt: 3 }));
    await addLocalPhoto(photo({ id: 'b', takenAt: 2 }));
    await addLocalPhoto(photo({ id: 'a', personId: 'worker-2' }));

    await deleteLocalPhotos('worker-1', ['a']);

    expect(ids(await loadLocalPhotos('worker-1'))).toEqual(['b']);
    expect(ids(await loadLocalPhotos('worker-2'))).toEqual(['a']);
  });

  it('never throws when the database cannot be opened, reading as nothing stored', async () => {
    await jest.isolateModulesAsync(async () => {
      jest.doMock('expo-sqlite', () => ({
        openDatabaseAsync: jest.fn(async () => {
          throw new Error('disk full');
        }),
      }));
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const storage = require('@/services/photoQueueStorage') as typeof import('@/services/photoQueueStorage');

      expect(await storage.loadLocalPhotos('worker-1')).toEqual([]);
      await expect(storage.addLocalPhoto(photo({}))).resolves.toBeUndefined();
    });
  });
});

describe('moving the old AsyncStorage lists into SQLite', () => {
  beforeEach(() => {
    mockDatabase.rows.clear();
    mockDisk.clear();
    jest.clearAllMocks();
  });

  it("carries a person's old list over, then removes it", async () => {
    mockDisk.set('photoQueue:old-1', JSON.stringify([photo({ id: 'x', personId: 'old-1', takenAt: 2 })]));

    expect(ids(await loadLocalPhotos('old-1'))).toEqual(['x']);
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith('photoQueue:old-1');
    expect(mockDisk.has('photoQueue:old-1')).toBe(false);
  });

  it('carries over only this person from the oldest shared list, leaving the others there', async () => {
    mockDisk.set(
      'photoQueue',
      JSON.stringify([photo({ id: 'mine', personId: 'old-2' }), photo({ id: 'theirs', personId: 'old-3' })])
    );

    expect(ids(await loadLocalPhotos('old-2'))).toEqual(['mine']);
    expect(JSON.parse(mockDisk.get('photoQueue') as string).map((p: Photo) => p.id)).toEqual(['theirs']);

    expect(ids(await loadLocalPhotos('old-3'))).toEqual(['theirs']);
    expect(mockDisk.has('photoQueue')).toBe(false);
  });

  it('does not duplicate a capture that is in both the old list and the database', async () => {
    mockDisk.set('photoQueue:old-4', JSON.stringify([photo({ id: 'dup', personId: 'old-4' })]));
    await addLocalPhoto(photo({ id: 'dup', personId: 'old-4', task: 'already in database' }));

    const stored = await loadLocalPhotos('old-4');
    expect(stored).toHaveLength(1);
    expect(stored[0].task).toBe('already in database');
  });

  it('treats a damaged old list as empty and still starts', async () => {
    mockDisk.set('photoQueue:old-5', '[{"id":"oh no');

    expect(await loadLocalPhotos('old-5')).toEqual([]);
  });
});
