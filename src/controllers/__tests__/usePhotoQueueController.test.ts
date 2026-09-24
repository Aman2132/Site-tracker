import { act, renderHook, waitFor } from '@testing-library/react-native';

import { fetchPhotos, uploadPhotos } from '@/api/photosApi';
import { usePhotoQueueController } from '@/controllers/usePhotoQueueController';
import { loadQueuedPhotos } from '@/services/photoQueueStorage';
import { useAuthStore } from '@/store/useAuthStore';
import { usePhotoStore } from '@/store/usePhotoStore';
import { PersonProfile, Photo } from '@/types/domain';

jest.mock('@/constants/config', () => ({ HAS_FIREBASE_CONFIG: true }));
jest.mock('@/api/photosApi', () => ({ fetchPhotos: jest.fn(async () => []), uploadPhotos: jest.fn() }));
jest.mock('@/api/eventsApi', () => ({ logEvent: jest.fn(async () => undefined) }));
jest.mock('@/services/photoQueueStorage', () => ({
  loadQueuedPhotos: jest.fn(async () => null),
  saveQueuedPhotos: jest.fn(async () => undefined),
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
    id: 'q1',
    uri: 'file:///tmp/a.jpg',
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

describe('usePhotoQueueController visibility scoping', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    usePhotoStore.setState({ photos: [], loaded: false, loadedFor: null });
    (loadQueuedPhotos as jest.Mock).mockResolvedValue(null);
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

  it("drops another person's leftovers from the on-disk queue", async () => {
    (loadQueuedPhotos as jest.Mock).mockResolvedValue([
      queuedPhoto({ id: 'mine', personId: 'worker-1' }),
      queuedPhoto({ id: 'theirs', personId: 'worker-2' }),
    ]);
    useAuthStore.setState({ profile: worker });

    renderHook(() => usePhotoQueueController());

    await waitFor(() => expect(usePhotoStore.getState().loaded).toBe(true));
    expect(usePhotoStore.getState().photos.map(p => p.id)).toEqual(['mine']);
  });

  it('reloads when a different person signs in on the same device', async () => {
    useAuthStore.setState({ profile: worker });
    const { rerender } = renderHook(() => usePhotoQueueController());
    await waitFor(() => expect(fetchPhotos).toHaveBeenCalledWith('worker-1'));

    act(() => useAuthStore.setState({ profile: { ...worker, id: 'worker-2', name: 'Pooja Devi' } }));
    rerender({});

    await waitFor(() => expect(fetchPhotos).toHaveBeenCalledWith('worker-2'));
  });
});

describe('usePhotoQueueController sync failures', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (loadQueuedPhotos as jest.Mock).mockResolvedValue(null);
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
  });

  it('marks everything synced when the upload succeeds', async () => {
    (uploadPhotos as jest.Mock).mockResolvedValue(undefined);

    const { result } = renderHook(() => usePhotoQueueController());
    await act(() => result.current.syncNow());

    await waitFor(() => expect(usePhotoStore.getState().photos[0].synced).toBe(true));
    expect(result.current.syncError).toBeNull();
  });
});
