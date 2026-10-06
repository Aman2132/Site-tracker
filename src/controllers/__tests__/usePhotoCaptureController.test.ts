import { act, renderHook, waitFor } from '@testing-library/react-native';

import { usePhotoCaptureController } from '@/controllers/usePhotoCaptureController';
import { writeGeotag } from '@/services/exifService';
import { keepCaptureFile } from '@/services/localMediaService';
import { watchPreciseFix } from '@/services/locationService';
import { saveToDeviceGallery } from '@/services/mediaLibraryService';
import {
  requestForegroundLocationPermission,
  requestGallerySavePermission,
} from '@/services/permissionsService';
import { addLocalPhoto } from '@/services/photoQueueStorage';
import { useAuthStore } from '@/store/useAuthStore';
import { usePhotoStore } from '@/store/usePhotoStore';
import { GeoFix } from '@/types/domain';

jest.mock('@/constants/config', () => ({
  DEFAULT_COORDS: { lat: 27.7172, lng: 85.324 },
  GEOTAG_ACCURACY: { goodMeters: 20, watchIntervalMs: 500 },
  LOCAL_MEDIA: { maxTaskChars: 60 },
}));
jest.mock('@/services/exifService', () => ({
  writeGeotag: jest.fn(async (uri: string) => `${uri}-geo`),
}));
jest.mock('@/services/localMediaService', () => ({
  // Pass-through by default: the file stays where it is.
  keepCaptureFile: jest.fn(async (uri: string) => uri),
}));
jest.mock('@/services/photoQueueStorage', () => ({ addLocalPhoto: jest.fn(async () => undefined) }));
jest.mock('@/services/locationService', () => ({ watchPreciseFix: jest.fn(() => jest.fn()) }));
jest.mock('@/services/mediaLibraryService', () => ({ saveToDeviceGallery: jest.fn(async () => undefined) }));
jest.mock('@/services/permissionsService', () => ({
  requestGallerySavePermission: jest.fn(async () => true),
  requestForegroundLocationPermission: jest.fn(async () => true),
}));

const camera = { takePhoto: jest.fn(async () => ({ path: '/tmp/shot.jpg' })) } as never;

/** Pushes a fix through the controller's GPS watch. */
function primeFix(fix: GeoFix) {
  (watchPreciseFix as jest.Mock).mockImplementation((cb: (f: GeoFix) => void) => {
    cb(fix);
    return jest.fn();
  });
}

describe('usePhotoCaptureController gallery copy', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    usePhotoStore.setState({ photos: [], loaded: false, loadedFor: null });
    useAuthStore.setState({
      profile: { id: 'worker-1', name: 'Ramesh', role: 'Driver', appRole: 'worker', color: '#1a73e8' },
    });
    (requestGallerySavePermission as jest.Mock).mockResolvedValue(true);
    primeFix({ lat: 27.7, lng: 85.3, accuracy: 8 });
  });

  it('saves the geotagged copy, not the raw camera file', async () => {
    const { result } = renderHook(() => usePhotoCaptureController());
    await waitFor(() => expect(requestGallerySavePermission).toHaveBeenCalled());

    await act(() => result.current.capturePhoto(camera, 'Column grid L4'));

    expect(writeGeotag).toHaveBeenCalledWith('file:///tmp/shot.jpg', { lat: 27.7, lng: 85.3 });
    expect(saveToDeviceGallery).toHaveBeenCalledWith('file:///tmp/shot.jpg-geo');
  });

  it('queues the same geotagged file it put in the gallery', async () => {
    const { result } = renderHook(() => usePhotoCaptureController());
    await waitFor(() => expect(requestGallerySavePermission).toHaveBeenCalled());

    await act(() => result.current.capturePhoto(camera, 'Column grid L4'));

    expect(usePhotoStore.getState().photos[0].uri).toBe('file:///tmp/shot.jpg-geo');
  });

  it('skips the gallery entirely when permission was refused', async () => {
    (requestGallerySavePermission as jest.Mock).mockResolvedValue(false);

    const { result } = renderHook(() => usePhotoCaptureController());
    await waitFor(() => expect(requestGallerySavePermission).toHaveBeenCalled());
    await act(() => result.current.capturePhoto(camera, 'Task'));

    expect(saveToDeviceGallery).not.toHaveBeenCalled();
    // The capture still reaches the app's own queue — that's the copy that syncs.
    expect(usePhotoStore.getState().photos).toHaveLength(1);
  });

  it('still keeps the photo when the gallery write fails', async () => {
    (saveToDeviceGallery as jest.Mock).mockRejectedValue(new Error('storage full'));

    const { result } = renderHook(() => usePhotoCaptureController());
    await waitFor(() => expect(requestGallerySavePermission).toHaveBeenCalled());
    await act(() => result.current.capturePhoto(camera, 'Task'));

    expect(usePhotoStore.getState().photos).toHaveLength(1);
  });

  it('asks for gallery permission once per screen, not once per shot', async () => {
    const { result } = renderHook(() => usePhotoCaptureController());
    await waitFor(() => expect(requestGallerySavePermission).toHaveBeenCalled());

    await act(() => result.current.capturePhoto(camera, 'Task'));
    await act(() => result.current.capturePhoto(camera, 'Task'));

    expect(requestGallerySavePermission).toHaveBeenCalledTimes(1);
    expect(saveToDeviceGallery).toHaveBeenCalledTimes(2);
  });
});

describe('usePhotoCaptureController local save', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    usePhotoStore.setState({ photos: [], loaded: false, loadedFor: null });
    useAuthStore.setState({
      profile: { id: 'worker-1', name: 'Ramesh', role: 'Driver', appRole: 'worker', color: '#1a73e8' },
    });
    (requestGallerySavePermission as jest.Mock).mockResolvedValue(true);
    (keepCaptureFile as jest.Mock).mockImplementation(
      async (_uri: string, personId: string, fileName: string) =>
        `file:///docs/captures/${personId}/${fileName}`
    );
    primeFix({ lat: 27.7, lng: 85.3, accuracy: 8 });
  });

  it("saves the capture to its owner's list the moment it's taken", async () => {
    // Without this, a capture only reached disk once the Photos tab was opened.
    const { result } = renderHook(() => usePhotoCaptureController());

    await act(() => result.current.capturePhoto(camera, 'Column grid L4'));

    expect(addLocalPhoto).toHaveBeenCalledTimes(1);
    expect(addLocalPhoto).toHaveBeenCalledWith(
      expect.objectContaining({ personId: 'worker-1', task: 'Column grid L4', synced: false })
    );
  });

  it('moves the file out of the cache and uses the permanent copy everywhere', async () => {
    const { result } = renderHook(() => usePhotoCaptureController());
    await waitFor(() => expect(requestGallerySavePermission).toHaveBeenCalled());

    await act(() => result.current.capturePhoto(camera, 'Task'));

    const [movedFrom, personId, fileName] = (keepCaptureFile as jest.Mock).mock.calls[0];
    expect(movedFrom).toBe('file:///tmp/shot.jpg-geo');
    expect(personId).toBe('worker-1');
    expect(fileName).toMatch(/^ST_worker-1_\d+_[a-z0-9]+_27\.700000_85\.300000_8\.0_Task\.jpg$/);

    const kept = `file:///docs/captures/worker-1/${fileName}`;
    expect((addLocalPhoto as jest.Mock).mock.calls[0][0].uri).toBe(kept);
    expect(usePhotoStore.getState().photos[0].uri).toBe(kept);
    expect(saveToDeviceGallery).toHaveBeenCalledWith(kept);
  });

  it('keeps the cache file rather than losing the shot when the move fails', async () => {
    (keepCaptureFile as jest.Mock).mockRejectedValue(new Error('no space'));

    const { result } = renderHook(() => usePhotoCaptureController());
    await act(() => result.current.capturePhoto(camera, 'Task'));

    expect(usePhotoStore.getState().photos[0].uri).toBe('file:///tmp/shot.jpg-geo');
    expect(addLocalPhoto).toHaveBeenCalledTimes(1);
  });
});

describe('usePhotoCaptureController geotag source', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    usePhotoStore.setState({ photos: [], loaded: false, loadedFor: null });
    useAuthStore.setState({
      profile: { id: 'worker-1', name: 'Ramesh', role: 'Driver', appRole: 'worker', color: '#1a73e8' },
    });
    (requestGallerySavePermission as jest.Mock).mockResolvedValue(true);
  });

  it('flags a poor fix as imprecise', async () => {
    primeFix({ lat: 27.7, lng: 85.3, accuracy: 45 });

    const { result } = renderHook(() => usePhotoCaptureController());
    await act(() => result.current.capturePhoto(camera, 'Task'));

    expect(result.current.lastSavedIsPrecise).toBe(false);
    expect(result.current.lastSavedLabel).toBe('±45 m');
  });

  it('refuses to capture before the first GPS fix, rather than tagging a guessed location', async () => {
    (watchPreciseFix as jest.Mock).mockImplementation(() => jest.fn());

    const { result } = renderHook(() => usePhotoCaptureController());
    expect(result.current.hasFix).toBe(false);
    await act(() => result.current.capturePhoto(camera, 'Task'));

    expect((camera as unknown as { takePhoto: jest.Mock }).takePhoto).not.toHaveBeenCalled();
    expect(usePhotoStore.getState().photos).toHaveLength(0);
  });

  it('reports hasFix once the first fix arrives', async () => {
    primeFix({ lat: 27.7, lng: 85.3, accuracy: 8 });

    const { result } = renderHook(() => usePhotoCaptureController());

    expect(result.current.hasFix).toBe(true);
  });

  it('does not capture at all when nobody is signed in', async () => {
    useAuthStore.setState({ profile: null });
    primeFix({ lat: 27.7, lng: 85.3, accuracy: 8 });

    const { result } = renderHook(() => usePhotoCaptureController());
    await act(() => result.current.capturePhoto(camera, 'Task'));

    expect(usePhotoStore.getState().photos).toHaveLength(0);
    expect(saveToDeviceGallery).not.toHaveBeenCalled();
  });
});

describe('usePhotoCaptureController for owners', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    usePhotoStore.setState({ photos: [], loaded: false, loadedFor: null });
    useAuthStore.setState({
      profile: { id: 'owner-1', name: 'Administrator', role: 'Owner', appRole: 'owner', color: '#1c4ff0' },
    });
    (requestGallerySavePermission as jest.Mock).mockResolvedValue(true);
    primeFix({ lat: 27.7, lng: 85.3, accuracy: 8 });
  });

  it("files an owner's capture under the owner", async () => {
    const { result } = renderHook(() => usePhotoCaptureController());

    await act(() => result.current.capturePhoto(camera, 'Site walk'));

    expect(addLocalPhoto).toHaveBeenCalledWith(
      expect.objectContaining({ personId: 'owner-1', task: 'Site walk' })
    );
  });

  it('asks for location when the camera opens, before gallery access', async () => {
    // Owners have no Home tab, so this may be the first time they're asked.
    const order: string[] = [];
    (requestForegroundLocationPermission as jest.Mock).mockImplementation(async () => {
      order.push('location');
      return true;
    });
    (requestGallerySavePermission as jest.Mock).mockImplementation(async () => {
      order.push('gallery');
      return true;
    });

    renderHook(() => usePhotoCaptureController());

    await waitFor(() => expect(order).toEqual(['location', 'gallery']));
  });
});
