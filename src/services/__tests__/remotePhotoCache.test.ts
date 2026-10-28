import { addLocalPhoto, loadLocalPhotos } from '@/services/photoQueueStorage';
import {
  deleteCachedRemotePhotos,
  loadCachedRemotePhotos,
  replaceCachedRemotePhotos,
  setCachedRemoteThumbs,
} from '@/services/remotePhotoCache';
import { createFakePhotoDatabase } from '@/test-utils/fakePhotoDatabase';
import { Photo } from '@/types/domain';

jest.mock('@/constants/config', () => ({ PHOTO_DATABASE: { fileName: 'test.db' } }));

const mockDatabase = createFakePhotoDatabase();
jest.mock('expo-sqlite', () => ({ openDatabaseAsync: jest.fn(async () => mockDatabase) }));
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(async () => null),
  setItem: jest.fn(async () => undefined),
  removeItem: jest.fn(async () => undefined),
}));

function remote(overrides: Partial<Photo>): Photo {
  return {
    id: 'rec-1',
    uri: 'https://cdn/a.jpg',
    thumbUrl: 'https://cdn/a_thumb.jpg',
    lat: 27.7,
    lng: 85.3,
    accuracy: 6,
    plusCode: '7JJVXR9R+2X',
    takenAt: 1,
    personId: 'worker-9',
    task: 'Task',
    synced: true,
    ...overrides,
  };
}

const ids = (photos: Photo[]) => photos.map(p => p.id);

describe('remotePhotoCache', () => {
  beforeEach(() => {
    mockDatabase.rows.clear();
  });

  it('reads as empty before anything was fetched', async () => {
    expect(await loadCachedRemotePhotos('owner-1')).toEqual([]);
  });

  it('stores a fetch and lists it newest first', async () => {
    await replaceCachedRemotePhotos('owner-1', [remote({ id: 'old', takenAt: 1 }), remote({ id: 'new', takenAt: 9 })]);

    expect(ids(await loadCachedRemotePhotos('owner-1'))).toEqual(['new', 'old']);
  });

  it('replaces the whole list on the next fetch, so an admin deletion disappears', async () => {
    await replaceCachedRemotePhotos('owner-1', [remote({ id: 'a' }), remote({ id: 'b', takenAt: 2 })]);

    await replaceCachedRemotePhotos('owner-1', [remote({ id: 'b', takenAt: 2 })]);

    expect(ids(await loadCachedRemotePhotos('owner-1'))).toEqual(['b']);
  });

  it('hands back the saved previews of photos that left the list, so their files can be deleted', async () => {
    await replaceCachedRemotePhotos('owner-1', [remote({ id: 'a' }), remote({ id: 'b', takenAt: 2 })]);
    await setCachedRemoteThumbs('owner-1', { a: 'file:///c/a.jpg', b: 'file:///c/b.jpg' });

    const unneeded = await replaceCachedRemotePhotos('owner-1', [remote({ id: 'b', takenAt: 2 })]);

    expect(unneeded).toEqual(['file:///c/a.jpg']);
  });

  it('keeps a photo\'s saved preview across fetches while its backend preview is unchanged', async () => {
    await replaceCachedRemotePhotos('owner-1', [remote({ id: 'a' })]);
    await setCachedRemoteThumbs('owner-1', { a: 'file:///c/a.jpg' });

    await replaceCachedRemotePhotos('owner-1', [remote({ id: 'a' })]);

    expect((await loadCachedRemotePhotos('owner-1'))[0].localThumbUri).toBe('file:///c/a.jpg');
  });

  it('forgets the saved preview when the backend preview changed', async () => {
    await replaceCachedRemotePhotos('owner-1', [remote({ id: 'a' })]);
    await setCachedRemoteThumbs('owner-1', { a: 'file:///c/a.jpg' });

    await replaceCachedRemotePhotos('owner-1', [remote({ id: 'a', thumbUrl: 'https://cdn/a_v2_thumb.jpg' })]);

    expect((await loadCachedRemotePhotos('owner-1'))[0]).not.toHaveProperty('localThumbUri');
  });

  it("keeps each person's cache apart", async () => {
    await replaceCachedRemotePhotos('owner-1', [remote({ id: 'a' })]);
    await replaceCachedRemotePhotos('worker-2', [remote({ id: 'b' })]);

    expect(ids(await loadCachedRemotePhotos('owner-1'))).toEqual(['a']);
    expect(ids(await loadCachedRemotePhotos('worker-2'))).toEqual(['b']);
  });

  it('drops only the named photos', async () => {
    await replaceCachedRemotePhotos('owner-1', [remote({ id: 'a', takenAt: 2 }), remote({ id: 'b', takenAt: 1 })]);

    await deleteCachedRemotePhotos('owner-1', ['a']);

    expect(ids(await loadCachedRemotePhotos('owner-1'))).toEqual(['b']);
  });

  it("never touches this phone's own captures", async () => {
    await addLocalPhoto(remote({ id: 'local-1-abc', personId: 'owner-1', synced: false }));

    await replaceCachedRemotePhotos('owner-1', [remote({ id: 'a' })]);
    await deleteCachedRemotePhotos('owner-1', ['local-1-abc']);

    expect(ids(await loadLocalPhotos('owner-1'))).toEqual(['local-1-abc']);
    expect(ids(await loadCachedRemotePhotos('owner-1'))).toEqual(['a']);
  });
});
