import { act, renderHook, waitFor } from '@testing-library/react-native';

import { fetchPhotos, uploadPhotos } from '@/api/photosApi';
import { usePhotoQueueController } from '@/controllers/usePhotoQueueController';
import { listGalleryCaptures } from '@/services/mediaLibraryService';
import { requestGallerySavePermission } from '@/services/permissionsService';
import { loadLocalPhotos, markLocalPhotosSynced, saveLocalPhotos } from '@/services/photoQueueStorage';
import { useAuthStore } from '@/store/useAuthStore';
import { usePhotoStore } from '@/store/usePhotoStore';
import { PersonProfile, Photo } from '@/types/domain';
import { captureFileName } from '@/utils/photos';

jest.mock('@/constants/config', () => ({ HAS_FIREBASE_CONFIG: true, LOCAL_MEDIA: { maxTaskChars: 60 } }));
jest.mock('@/api/photosApi', () => ({ fetchPhotos: jest.fn(async () => []), uploadPhotos: jest.fn() }));
jest.mock('@/api/eventsApi', () => ({ logEvent: jest.fn(async () => undefined) }));
jest.mock('@/services/photoQueueStorage', () => ({
  loadLocalPhotos: jest.fn(async () => []),
  saveLocalPhotos: jest.fn(async () => undefined),
  markLocalPhotosSynced: jest.fn(async () => undefined),
}));
jest.mock('@/services/mediaLibraryService', () => ({ listGalleryCaptures: jest.fn(async () => []) }));
jest.mock('@/services/permissionsService', () => ({
  requestGallerySavePermission: jest.fn(async () => true),
}));

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
  (listGalleryCaptures as jest.Mock).mockResolvedValue([]);
  (requestGallerySavePermission as jest.Mock).mockResolvedValue(true);
  (fetchPhotos as jest.Mock).mockResolvedValue([]);
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

    act(() => usePhotoStore.getState().addPhoto(queuedPhoto({ id: 'just-shot', takenAt: 9 })));
    await act(async () => finishLoad([queuedPhoto({ id: 'earlier', takenAt: 1 })]));

    await waitFor(() => expect(usePhotoStore.getState().loaded).toBe(true));
    expect(shownIds()).toEqual(['just-shot', 'earlier']);
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

  it("never writes one person's list while another is signed in", async () => {
    // The old bug: every change to the on-screen list was saved over the one
    // shared list, so the admin's (empty) list erased the worker's.
    useAuthStore.setState({ profile: owner });
    renderHook(() => usePhotoQueueController());

    await waitFor(() => expect(usePhotoStore.getState().loaded).toBe(true));
    expect(saveLocalPhotos).not.toHaveBeenCalled();
  });
});

describe('usePhotoQueueController gallery recovery', () => {
  beforeEach(() => {
    resetMocks();
    usePhotoStore.setState({ photos: [], loaded: false, loadedFor: null });
    useAuthStore.setState({ profile: worker });
  });

  const galleryFile = (photo: Photo) => ({
    filename: captureFileName(photo),
    uri: `file:///Pictures/${photo.id}`,
  });

  it('rebuilds the list from the gallery album after a reinstall, and saves it', async () => {
    const lost = queuedPhoto({ id: 'local-5-abc', takenAt: 5, task: 'Slab pour' });
    (listGalleryCaptures as jest.Mock).mockResolvedValue([galleryFile(lost)]);

    renderHook(() => usePhotoQueueController());

    await waitFor(() => expect(usePhotoStore.getState().loaded).toBe(true));
    expect(usePhotoStore.getState().photos[0]).toMatchObject({
      id: 'local-5-abc',
      task: 'Slab pour',
      uri: 'file:///Pictures/local-5-abc',
    });
    expect(saveLocalPhotos).toHaveBeenCalledWith('worker-1', [
      expect.objectContaining({ id: 'local-5-abc' }),
    ]);
  });

  it("does not recover another person's captures from the album", async () => {
    const theirs = queuedPhoto({ id: 'local-5-abc', personId: 'worker-2' });
    (listGalleryCaptures as jest.Mock).mockResolvedValue([galleryFile(theirs)]);

    renderHook(() => usePhotoQueueController());

    await waitFor(() => expect(usePhotoStore.getState().loaded).toBe(true));
    expect(shownIds()).toEqual([]);
    expect(saveLocalPhotos).not.toHaveBeenCalled();
  });

  it('does not duplicate captures the saved list already has', async () => {
    const kept = queuedPhoto({ id: 'local-5-abc', takenAt: 5 });
    (loadLocalPhotos as jest.Mock).mockResolvedValue([kept]);
    (listGalleryCaptures as jest.Mock).mockResolvedValue([galleryFile(kept)]);

    renderHook(() => usePhotoQueueController());

    await waitFor(() => expect(usePhotoStore.getState().loaded).toBe(true));
    expect(usePhotoStore.getState().photos).toEqual([kept]);
    expect(saveLocalPhotos).not.toHaveBeenCalled();
  });

  it('skips the gallery without access, and still shows the saved list', async () => {
    (requestGallerySavePermission as jest.Mock).mockResolvedValue(false);
    (loadLocalPhotos as jest.Mock).mockResolvedValue([queuedPhoto({ id: 'mine' })]);

    renderHook(() => usePhotoQueueController());

    await waitFor(() => expect(usePhotoStore.getState().loaded).toBe(true));
    expect(listGalleryCaptures).not.toHaveBeenCalled();
    expect(shownIds()).toEqual(['mine']);
  });
});

describe('usePhotoQueueController sync', () => {
  beforeEach(() => {
    resetMocks();
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
});
