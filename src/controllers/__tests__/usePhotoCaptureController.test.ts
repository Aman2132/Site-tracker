import { act, renderHook, waitFor } from '@testing-library/react-native';

import { usePhotoCaptureController } from '@/controllers/usePhotoCaptureController';
import { writeGeotag } from '@/services/exifService';
import { watchPreciseFix } from '@/services/locationService';
import { saveToDeviceGallery } from '@/services/mediaLibraryService';
import { requestGallerySavePermission } from '@/services/permissionsService';
import { useAuthStore } from '@/store/useAuthStore';
import { usePhotoStore } from '@/store/usePhotoStore';
import { GeoFix } from '@/types/domain';

jest.mock('@/constants/config', () => ({
  DEFAULT_COORDS: { lat: 27.7172, lng: 85.324 },
  GEOTAG_ACCURACY: { goodMeters: 20, watchIntervalMs: 500 },
}));
jest.mock('@/services/exifService', () => ({
  writeGeotag: jest.fn(async (uri: string) => `${uri}-geo`),
}));
jest.mock('@/services/locationService', () => ({ watchPreciseFix: jest.fn(() => jest.fn()) }));
jest.mock('@/services/mediaLibraryService', () => ({ saveToDeviceGallery: jest.fn(async () => undefined) }));
jest.mock('@/services/permissionsService', () => ({
  requestGallerySavePermission: jest.fn(async () => true),
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

  it('falls back to the configured default when no fix has arrived yet', async () => {
    // Shutter pressed before GPS locks: the photo still saves, but with the
    // 9999 sentinel so the UI can warn it is not a real fix.
    (watchPreciseFix as jest.Mock).mockImplementation(() => jest.fn());

    const { result } = renderHook(() => usePhotoCaptureController());
    await act(() => result.current.capturePhoto(camera, 'Task'));

    const [photo] = usePhotoStore.getState().photos;
    expect(photo.accuracy).toBe(9999);
    expect(result.current.lastSavedIsPrecise).toBe(false);
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
