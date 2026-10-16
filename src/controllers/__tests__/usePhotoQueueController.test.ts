import { act, renderHook, waitFor } from '@testing-library/react-native';

import { fetchDeletedPhotos } from '@/api/deletedPhotosApi';
import { logEvent } from '@/api/eventsApi';
import { fetchPhotos, uploadPhotos } from '@/api/photosApi';
import { usePhotoQueueController } from '@/controllers/usePhotoQueueController';
import { deleteLocalFiles } from '@/services/localMediaService';
import { deleteLocalPhotos, loadLocalPhotos, markLocalPhotosSynced } from '@/services/photoQueueStorage';
import {
  deleteCachedRemotePhotos,
  loadCachedRemotePhotos,
  replaceCachedRemotePhotos,
  setCachedRemoteThumbs,
} from '@/services/remotePhotoCache';
import { downloadThumbnail } from '@/services/thumbnailCacheService';
import { useAuthStore } from '@/store/useAuthStore';
import { usePhotoStore } from '@/store/usePhotoStore';
import { PersonProfile, Photo } from '@/types/domain';

jest.mock('@/constants/config', () => ({
  HAS_FIREBASE_CONFIG: true,
  LOCAL_MEDIA: { maxTaskChars: 60 },
  AUTO_SYNC: { graceMs: 1000, retryMs: 5000 },
  THUMBNAIL_CACHE: { maxFiles: 10 },
}));
jest.mock('@/api/photosApi', () => ({ fetchPhotos: jest.fn(async () => []), uploadPhotos: jest.fn() }));
jest.mock('@/api/deletedPhotosApi', () => ({ fetchDeletedPhotos: jest.fn(async () => []) }));
jest.mock('@/api/eventsApi', () => ({ logEvent: jest.fn(async () => undefined) }));
jest.mock('@/services/photoQueueStorage', () => ({
  loadLocalPhotos: jest.fn(async () => []),
  markLocalPhotosSynced: jest.fn(async () => undefined),
  deleteLocalPhotos: jest.fn(async () => undefined),
}));
jest.mock('@/services/remotePhotoCache', () => ({
  loadCachedRemotePhotos: jest.fn(async () => []),
  replaceCachedRemotePhotos: jest.fn(async () => []),
  setCachedRemoteThumbs: jest.fn(async () => undefined),
  deleteCachedRemotePhotos: jest.fn(async () => undefined),
}));
jest.mock('@/services/localMediaService', () => ({ deleteLocalFiles: jest.fn(() => 0) }));
jest.mock('@/services/thumbnailCacheService', () => ({ downloadThumbnail: jest.fn(async () => null) }));
jest.mock('@/services/thumbnailService', () => ({ createThumbnail: jest.fn(async () => null) }));

const owner: PersonProfile = {
  id: 'owner-1',
  name: 'Administrator',
  role: 'Administrator',
  appRole: 'owner',
  color: '#1c4ff0',
};

const worker: PersonProfile = {
  id: 'worker-1',
  name: 'Ramesh Kumar',
  role: 'Driver',
  appRole: 'worker',
  color: '#1a73e8',
};

function queuedPhoto(overrides: Partial<Photo>): Photo {
  return {
    id: 'local-1-q1',
    uri: 'file:///docs/a.jpg',
    mediaType: 'photo',
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

const shownIds = () => usePhotoStore.getState().photos.map(p => p.id);

function resetMocks() {
  jest.clearAllMocks();
  (loadLocalPhotos as jest.Mock).mockResolvedValue([]);
  (loadCachedRemotePhotos as jest.Mock).mockResolvedValue([]);
  (replaceCachedRemotePhotos as jest.Mock).mockResolvedValue([]);
  (fetchPhotos as jest.Mock).mockResolvedValue([]);
  (fetchDeletedPhotos as jest.Mock).mockResolvedValue([]);
  (downloadThumbnail as jest.Mock).mockResolvedValue(null);
}

describe('usePhotoQueueController loading', () => {
  beforeEach(() => {
    resetMocks();
    usePhotoStore.setState({ photos: [], loaded: false, loadedFor: null });
  });

  it('fetches every photo for an owner', async () => {
    useAuthStore.setState({ profile: owner });

    renderHook(() => usePhotoQueueController());

    await waitFor(() => expect(fetchPhotos).toHaveBeenCalled());
    expect(fetchPhotos).toHaveBeenCalledWith(undefined);
  });

  it('fetches only their own photos for a worker', async () => {
    useAuthStore.setState({ profile: worker });

    renderHook(() => usePhotoQueueController());

    await waitFor(() => expect(fetchPhotos).toHaveBeenCalled());
    expect(fetchPhotos).toHaveBeenCalledWith('worker-1');
  });

  it("loads only the signed-in person's saved list", async () => {
    useAuthStore.setState({ profile: worker });

    renderHook(() => usePhotoQueueController());

    await waitFor(() => expect(loadLocalPhotos).toHaveBeenCalled());
    expect(loadLocalPhotos).toHaveBeenCalledWith('worker-1');
  });

  it('shows synced local captures too, not just pending ones', async () => {
    // They used to drop out of the list whenever the backend didn't return them.
    (loadLocalPhotos as jest.Mock).mockResolvedValue([
      queuedPhoto({ id: 'pending', takenAt: 2, synced: false }),
      queuedPhoto({ id: 'uploaded', takenAt: 1, synced: true }),
    ]);
    useAuthStore.setState({ profile: worker });

    renderHook(() => usePhotoQueueController());

    await waitFor(() => expect(usePhotoStore.getState().loaded).toBe(true));
    expect(shownIds()).toEqual(['pending', 'uploaded']);
  });

  it('still shows local captures when the backend fetch fails', async () => {
    (loadLocalPhotos as jest.Mock).mockResolvedValue([queuedPhoto({ id: 'mine' })]);
    (fetchPhotos as jest.Mock).mockRejectedValue(new Error('offline'));
    useAuthStore.setState({ profile: worker });

    renderHook(() => usePhotoQueueController());

    await waitFor(() => expect(usePhotoStore.getState().loaded).toBe(true));
    expect(shownIds()).toEqual(['mine']);
  });

  it('keeps a capture taken while the list was loading', async () => {
    let finishLoad: (photos: Photo[]) => void = () => {};
    (loadLocalPhotos as jest.Mock).mockReturnValue(new Promise(resolve => (finishLoad = resolve)));
    useAuthStore.setState({ profile: worker });
    renderHook(() => usePhotoQueueController());

    act(() => usePhotoStore.getState().addPhoto(queuedPhoto({ id: 'local-9-shot', takenAt: 9 })));
    await act(async () => finishLoad([queuedPhoto({ id: 'earlier', takenAt: 1 })]));

    await waitFor(() => expect(usePhotoStore.getState().loaded).toBe(true));
    expect(shownIds()).toEqual(['local-9-shot', 'earlier']);
  });

  it('reloads when a different person signs in on the same device', async () => {
    useAuthStore.setState({ profile: worker });
    const { rerender } = renderHook(() => usePhotoQueueController());
    await waitFor(() => expect(fetchPhotos).toHaveBeenCalledWith('worker-1'));

    act(() => useAuthStore.setState({ profile: { ...worker, id: 'worker-2', name: 'Pooja Devi' } }));
    rerender({});

    await waitFor(() => expect(fetchPhotos).toHaveBeenCalledWith('worker-2'));
    expect(loadLocalPhotos).toHaveBeenCalledWith('worker-2');
  });

  it("never touches another person's saved list while loading", async () => {
    useAuthStore.setState({ profile: owner });
    renderHook(() => usePhotoQueueController());

    await waitFor(() => expect(usePhotoStore.getState().loaded).toBe(true));
    expect(deleteLocalPhotos).not.toHaveBeenCalled();
  });
});

function remotePhoto(overrides: Partial<Photo>): Photo {
  return queuedPhoto({
    id: 'remote-1',
    uri: 'https://x.supabase.co/storage/v1/object/public/Photos/worker-1/a.jpg',
    thumbUrl: 'https://x.supabase.co/storage/v1/object/public/Photos/worker-1/a_thumb.jpg',
    synced: true,
    ...overrides,
  });
}

describe('usePhotoQueueController offline cache', () => {
  beforeEach(() => {
    resetMocks();
    usePhotoStore.setState({ photos: [], loaded: false, loadedFor: null });
    useAuthStore.setState({ profile: owner });
  });

  it("shows the last backend list when the phone is offline", async () => {
    (loadCachedRemotePhotos as jest.Mock).mockResolvedValue([remotePhoto({ id: 'theirs', personId: 'worker-9' })]);
    (fetchPhotos as jest.Mock).mockRejectedValue(new Error('offline'));

    renderHook(() => usePhotoQueueController());

    await waitFor(() => expect(shownIds()).toEqual(['theirs']));
    // A failed fetch must not wipe what was cached.
    expect(replaceCachedRemotePhotos).not.toHaveBeenCalled();
  });

  it('replaces the cached list with a successful fetch, and removes previews no longer needed', async () => {
    const fresh = remotePhoto({ id: 'fresh', personId: 'worker-9', takenAt: 5 });
    (fetchPhotos as jest.Mock).mockResolvedValue([fresh]);
    (replaceCachedRemotePhotos as jest.Mock).mockResolvedValue(['file:///docs/thumbnail-cache/old.jpg']);
    (loadCachedRemotePhotos as jest.Mock).mockResolvedValueOnce([]).mockResolvedValue([fresh]);

    renderHook(() => usePhotoQueueController());

    await waitFor(() => expect(replaceCachedRemotePhotos).toHaveBeenCalledWith('owner-1', [fresh]));
    expect(deleteLocalFiles).toHaveBeenCalledWith(['file:///docs/thumbnail-cache/old.jpg']);
    await waitFor(() => expect(shownIds()).toEqual(['fresh']));
  });

  it('downloads previews for other people\'s photos, and saves where they went', async () => {
    const theirs = remotePhoto({ id: 'theirs', personId: 'worker-9', takenAt: 5 });
    (fetchPhotos as jest.Mock).mockResolvedValue([theirs]);
    (loadCachedRemotePhotos as jest.Mock).mockResolvedValue([theirs]);
    (downloadThumbnail as jest.Mock).mockResolvedValue('file:///docs/thumbnail-cache/theirs.jpg');

    renderHook(() => usePhotoQueueController());

    await waitFor(() =>
      expect(setCachedRemoteThumbs).toHaveBeenCalledWith('owner-1', {
        theirs: 'file:///docs/thumbnail-cache/theirs.jpg',
      })
    );
    expect(downloadThumbnail).toHaveBeenCalledWith('theirs', theirs.thumbUrl);
    await waitFor(() =>
      expect(usePhotoStore.getState().photos[0].localThumbUri).toBe('file:///docs/thumbnail-cache/theirs.jpg')
    );
  });

  it('does not download a preview for a photo already on this phone', async () => {
    const mine = queuedPhoto({ id: 'local-1-q1', personId: 'owner-1', takenAt: 3, synced: true });
    const uploaded = remotePhoto({ id: 'remote-mine', personId: 'owner-1', takenAt: 3 });
    (loadLocalPhotos as jest.Mock).mockResolvedValue([mine]);
    (fetchPhotos as jest.Mock).mockResolvedValue([uploaded]);
    (loadCachedRemotePhotos as jest.Mock).mockResolvedValue([uploaded]);

    renderHook(() => usePhotoQueueController());

    await waitFor(() => expect(replaceCachedRemotePhotos).toHaveBeenCalled());
    await waitFor(() => expect(shownIds()).toEqual(['local-1-q1']));
    expect(downloadThumbnail).not.toHaveBeenCalled();
  });
});

describe('usePhotoQueueController admin deletions', () => {
  beforeEach(() => {
    resetMocks();
    usePhotoStore.setState({ photos: [], loaded: false, loadedFor: null });
    useAuthStore.setState({ profile: worker });
  });

  const note = (overrides: Partial<{ id: string; personId: string; takenAt: number }> = {}) => ({
    id: 'remote-1',
    personId: 'worker-1',
    takenAt: 5,
    ...overrides,
  });

  it('removes a synced capture the admin deleted: list, saved row and files', async () => {
    const gone = queuedPhoto({
      id: 'local-5-abc',
      takenAt: 5,
      synced: true,
      uri: 'file:///docs/captures/worker-1/a.jpg',
      localThumbUri: 'file:///docs/captures/worker-1/a_thumb.jpg',
    });
    (loadLocalPhotos as jest.Mock).mockResolvedValue([gone, queuedPhoto({ id: 'other', takenAt: 9, synced: true })]);
    (fetchDeletedPhotos as jest.Mock).mockResolvedValue([note()]);

    renderHook(() => usePhotoQueueController());

    await waitFor(() => expect(shownIds()).toEqual(['other']));
    expect(deleteLocalPhotos).toHaveBeenCalledWith('worker-1', ['local-5-abc']);
    expect(deleteLocalFiles).toHaveBeenCalledWith([
      'file:///docs/captures/worker-1/a.jpg',
      'file:///docs/captures/worker-1/a_thumb.jpg',
    ]);
  });

  it('never removes a capture that has not synced, even if a note matches its time', async () => {
    (loadLocalPhotos as jest.Mock).mockResolvedValue([queuedPhoto({ id: 'unsent', takenAt: 5, synced: false })]);
    (fetchDeletedPhotos as jest.Mock).mockResolvedValue([note()]);

    renderHook(() => usePhotoQueueController());

    await waitFor(() => expect(usePhotoStore.getState().loaded).toBe(true));
    await waitFor(() => expect(fetchDeletedPhotos).toHaveBeenCalled());
    expect(shownIds()).toEqual(['unsent']);
    expect(deleteLocalPhotos).not.toHaveBeenCalled();
    expect(deleteLocalFiles).not.toHaveBeenCalled();
  });

  it('keeps everything when the deletion check fails (offline)', async () => {
    (loadLocalPhotos as jest.Mock).mockResolvedValue([queuedPhoto({ id: 'kept', takenAt: 5, synced: true })]);
    (fetchDeletedPhotos as jest.Mock).mockRejectedValue(new Error('offline'));

    renderHook(() => usePhotoQueueController());

    await waitFor(() => expect(fetchDeletedPhotos).toHaveBeenCalled());
    await waitFor(() => expect(usePhotoStore.getState().loaded).toBe(true));
    expect(shownIds()).toEqual(['kept']);
    expect(deleteLocalPhotos).not.toHaveBeenCalled();
  });

  it('drops a deleted photo from the cached backend list and its saved preview', async () => {
    const cached = remotePhoto({
      id: 'remote-1',
      takenAt: 5,
      personId: 'worker-1',
      localThumbUri: 'file:///docs/thumbnail-cache/remote-1.jpg',
    });
    (loadCachedRemotePhotos as jest.Mock).mockResolvedValue([cached]);
    (fetchPhotos as jest.Mock).mockRejectedValue(new Error('offline'));
    (fetchDeletedPhotos as jest.Mock).mockResolvedValue([note()]);

    renderHook(() => usePhotoQueueController());

    await waitFor(() => expect(shownIds()).toEqual([]));
    expect(deleteCachedRemotePhotos).toHaveBeenCalledWith('worker-1', ['remote-1']);
    expect(deleteLocalFiles).toHaveBeenCalledWith([cached.uri, 'file:///docs/thumbnail-cache/remote-1.jpg']);
  });
});

describe('usePhotoQueueController sync', () => {
  beforeEach(() => {
    resetMocks();
    usePhotoStore.setState({ syncStatus: {}, noteEditingIds: [], trayIds: [] });
    useAuthStore.setState({ profile: worker });
    usePhotoStore.setState({
      photos: [queuedPhoto({ id: 'pending', synced: false })],
      loaded: true,
      loadedFor: 'worker-1',
    });
  });

  it('surfaces an error and leaves the queue unsynced when the upload throws', async () => {
    (uploadPhotos as jest.Mock).mockRejectedValue(new Error('network down'));

    const { result } = renderHook(() => usePhotoQueueController());
    await act(() => result.current.syncNow());

    await waitFor(() => expect(result.current.syncError).toBeTruthy());
    expect(usePhotoStore.getState().photos[0].synced).toBe(false);
    expect(result.current.pendingCount).toBe(1);
    expect(markLocalPhotosSynced).not.toHaveBeenCalled();
  });

  it("marks everything synced, on screen and in the person's saved list", async () => {
    (uploadPhotos as jest.Mock).mockResolvedValue(undefined);

    const { result } = renderHook(() => usePhotoQueueController());
    await act(() => result.current.syncNow());

    await waitFor(() => expect(usePhotoStore.getState().photos[0].synced).toBe(true));
    expect(result.current.syncError).toBeNull();
    expect(markLocalPhotosSynced).toHaveBeenCalledWith('worker-1', ['pending']);
  });

  it('lets an owner sync their own captures too, filed under the owner', async () => {
    (uploadPhotos as jest.Mock).mockResolvedValue(undefined);
    useAuthStore.setState({ profile: owner });
    usePhotoStore.setState({
      photos: [queuedPhoto({ id: 'mine', personId: 'owner-1', synced: false })],
      loaded: true,
      loadedFor: 'owner-1',
    });

    const { result } = renderHook(() => usePhotoQueueController());
    await act(() => result.current.syncNow());

    expect(uploadPhotos).toHaveBeenCalledWith(
      [expect.objectContaining({ id: 'mine', personId: 'owner-1' })],
      expect.anything()
    );
    expect(markLocalPhotosSynced).toHaveBeenCalledWith('owner-1', ['mine']);
    expect(logEvent).toHaveBeenCalledWith(
      expect.stringContaining('uploaded from Administrator'),
      'info',
      expect.objectContaining({ type: 'upload', personId: 'owner-1' })
    );
  });

  it('logs one typed upload event per site, so the dashboard can file each', async () => {
    (uploadPhotos as jest.Mock).mockResolvedValue(undefined);
    usePhotoStore.setState({
      photos: [
        queuedPhoto({ id: 'a', siteId: 'site-1' }),
        queuedPhoto({ id: 'b', siteId: 'site-1' }),
        queuedPhoto({ id: 'c' }),
      ],
      loaded: true,
      loadedFor: 'worker-1',
    });

    const { result } = renderHook(() => usePhotoQueueController());
    await act(() => result.current.syncNow());

    expect(logEvent).toHaveBeenCalledTimes(2);
    expect(logEvent).toHaveBeenCalledWith(
      expect.stringContaining('2 photos uploaded'),
      'info',
      expect.objectContaining({ type: 'upload', personId: 'worker-1', siteId: 'site-1' })
    );
    expect(logEvent).toHaveBeenCalledWith(
      expect.stringContaining('1 photo uploaded'),
      'info',
      expect.objectContaining({ type: 'upload', personId: 'worker-1', siteId: undefined })
    );
  });

  it('syncs one photo on its own and includes its note', async () => {
    (uploadPhotos as jest.Mock).mockResolvedValue(undefined);
    usePhotoStore.setState({
      photos: [queuedPhoto({ id: 'a', note: 'Pouring slab' }), queuedPhoto({ id: 'b' })],
      loaded: true,
      loadedFor: 'worker-1',
    });

    const { result } = renderHook(() => usePhotoQueueController());
    await act(() => result.current.syncOne('a'));

    expect(uploadPhotos).toHaveBeenCalledTimes(1);
    expect(uploadPhotos).toHaveBeenCalledWith(
      [expect.objectContaining({ id: 'a', note: 'Pouring slab' })],
      expect.anything()
    );
    expect(usePhotoStore.getState().photos.map(p => p.synced)).toEqual([true, false]);
  });

  it('flags the failed photo and never uploads one that is already uploading', async () => {
    let finish: () => void = () => {};
    (uploadPhotos as jest.Mock).mockReturnValueOnce(new Promise<void>(resolve => (finish = resolve)));

    const { result } = renderHook(() => usePhotoQueueController());
    let first: Promise<void> = Promise.resolve();
    act(() => {
      first = result.current.syncOne('pending');
    });
    await act(() => result.current.syncOne('pending'));
    expect(uploadPhotos).toHaveBeenCalledTimes(1);
    expect(usePhotoStore.getState().syncStatus).toEqual({ pending: 'syncing' });

    await act(async () => {
      finish();
      await first;
    });
    expect(usePhotoStore.getState().syncStatus).toEqual({});

    (uploadPhotos as jest.Mock).mockRejectedValueOnce(new Error('offline'));
    usePhotoStore.setState({ photos: [queuedPhoto({ id: 'p2' })] });
    await act(() => result.current.syncOne('p2'));
    expect(usePhotoStore.getState().syncStatus).toEqual({ p2: 'failed' });
    expect(result.current.syncError).toBeTruthy();
  });

  it('uploads a new capture by itself after the grace period', async () => {
    jest.useFakeTimers();
    (uploadPhotos as jest.Mock).mockResolvedValue(undefined);
    try {
      renderHook(() => usePhotoQueueController());
      await act(async () => {
        jest.advanceTimersByTime(1000);
      });
      expect(uploadPhotos).toHaveBeenCalledTimes(1);
    } finally {
      jest.useRealTimers();
    }
  });

  it('holds back a photo whose note is open', async () => {
    jest.useFakeTimers();
    usePhotoStore.setState({ noteEditingIds: ['pending'] });
    try {
      renderHook(() => usePhotoQueueController());
      await act(async () => {
        jest.advanceTimersByTime(1000);
      });
      expect(uploadPhotos).not.toHaveBeenCalled();
    } finally {
      jest.useRealTimers();
    }
  });
});
