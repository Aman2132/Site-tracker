import { act, renderHook, waitFor } from '@testing-library/react-native';

import { usePhotoCaptureController } from '@/controllers/usePhotoCaptureController';
import { writeGeotag } from '@/services/exifService';
import { keepCaptureFile } from '@/services/localMediaService';
import { watchPreciseFix } from '@/services/locationService';
import { requestForegroundLocationPermission } from '@/services/permissionsService';
import { addLocalPhoto, setLocalPhotoThumb } from '@/services/photoQueueStorage';
import { createThumbnail } from '@/services/thumbnailService';
import { useAuthStore } from '@/store/useAuthStore';
import { usePhotoStore } from '@/store/usePhotoStore';
import { useShiftStore } from '@/store/useShiftStore';
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
jest.mock('@/services/photoQueueStorage', () => ({
  addLocalPhoto: jest.fn(async () => undefined),
  setLocalPhotoThumb: jest.fn(async () => undefined),
}));
jest.mock('@/services/thumbnailService', () => ({ createThumbnail: jest.fn(async () => null) }));
jest.mock('@/services/locationService', () => ({ watchPreciseFix: jest.fn(() => jest.fn()) }));
jest.mock('@/services/permissionsService', () => ({
  requestForegroundLocationPermission: jest.fn(async () => true),
}));

const camera = {
  takePhoto: jest.fn(async () => ({
    path: '/tmp/shot.jpg',
    width: 4032,
    height: 3024,
    orientation: 'landscape-left',
  })),
} as never;

/** Pushes a fix through the controller's GPS watch. */
function primeFix(fix: GeoFix) {
  (watchPreciseFix as jest.Mock).mockImplementation((cb: (f: GeoFix) => void) => {
    cb(fix);
    return jest.fn();
  });
}

describe('usePhotoCaptureController geotagged file', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    usePhotoStore.setState({ photos: [], loaded: false, loadedFor: null });
    useAuthStore.setState({
      profile: { id: 'worker-1', name: 'Ramesh', role: 'Driver', appRole: 'worker', color: '#1a73e8' },
    });
    primeFix({ lat: 27.7, lng: 85.3, accuracy: 8 });
  });

  it('keeps the geotagged copy, not the raw camera file', async () => {
    const { result } = renderHook(() => usePhotoCaptureController());

    await act(() => result.current.capturePhoto(camera, 'Column grid L4'));

    expect(writeGeotag).toHaveBeenCalledWith('file:///tmp/shot.jpg', { lat: 27.7, lng: 85.3 });
    expect(usePhotoStore.getState().photos[0].uri).toBe('file:///tmp/shot.jpg-geo');
  });

  it('asks for location once when the camera opens', async () => {
    renderHook(() => usePhotoCaptureController());

    await waitFor(() => expect(requestForegroundLocationPermission).toHaveBeenCalledTimes(1));
  });
});

describe('usePhotoCaptureController preview', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    usePhotoStore.setState({ photos: [], loaded: false, loadedFor: null });
    useAuthStore.setState({
      profile: { id: 'worker-1', name: 'Ramesh', role: 'Driver', appRole: 'worker', color: '#1a73e8' },
    });
    (keepCaptureFile as jest.Mock).mockImplementation(
      async (_uri: string, personId: string, fileName: string) =>
        `file:///docs/captures/${personId}/${fileName}`
    );
    (createThumbnail as jest.Mock).mockResolvedValue('file:///cache/small.jpg');
    primeFix({ lat: 27.7, lng: 85.3, accuracy: 8 });
  });

  it('saves a small preview next to the photo and records it, after the shot is already safe', async () => {
    const { result } = renderHook(() => usePhotoCaptureController());

    await act(() => result.current.capturePhoto(camera, 'Task'));

    await waitFor(() => expect(setLocalPhotoThumb).toHaveBeenCalledTimes(1));
    const photo = usePhotoStore.getState().photos[0];
    expect(photo.localThumbUri).toMatch(/^file:\/\/\/docs\/captures\/worker-1\/ST_.*_Task_thumb\.jpg$/);
    expect(setLocalPhotoThumb).toHaveBeenCalledWith('worker-1', photo.id, photo.localThumbUri);
    // The saved list got the capture first, without waiting for the preview.
    expect((addLocalPhoto as jest.Mock).mock.calls[0][0]).not.toHaveProperty('localThumbUri');
  });

  it('keeps the photo with no preview when one cannot be made', async () => {
    (createThumbnail as jest.Mock).mockResolvedValue(null);
    const { result } = renderHook(() => usePhotoCaptureController());

    await act(() => result.current.capturePhoto(camera, 'Task'));

    expect(usePhotoStore.getState().photos).toHaveLength(1);
    expect(setLocalPhotoThumb).not.toHaveBeenCalled();
  });
});

describe('usePhotoCaptureController local save', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    usePhotoStore.setState({ photos: [], loaded: false, loadedFor: null });
    useAuthStore.setState({
      profile: { id: 'worker-1', name: 'Ramesh', role: 'Driver', appRole: 'worker', color: '#1a73e8' },
    });
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

    await act(() => result.current.capturePhoto(camera, 'Task'));

    const [movedFrom, personId, fileName] = (keepCaptureFile as jest.Mock).mock.calls[0];
    expect(movedFrom).toBe('file:///tmp/shot.jpg-geo');
    expect(personId).toBe('worker-1');
    expect(fileName).toMatch(/^ST_worker-1_\d+_[a-z0-9]+_27\.700000_85\.300000_8\.0_Task\.jpg$/);

    const kept = `file:///docs/captures/worker-1/${fileName}`;
    expect((addLocalPhoto as jest.Mock).mock.calls[0][0].uri).toBe(kept);
    expect(usePhotoStore.getState().photos[0].uri).toBe(kept);
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
  });
});

describe('usePhotoCaptureController check-in details', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    usePhotoStore.setState({ photos: [], loaded: false, loadedFor: null });
    useShiftStore.setState({ active: null });
    useAuthStore.setState({
      profile: { id: 'worker-1', name: 'Ramesh', role: 'Driver', appRole: 'worker', color: '#1a73e8' },
    });
    primeFix({ lat: 27.7, lng: 85.3, accuracy: 8 });
  });

  it('stamps the site the person is checked in at, and the photo size as shown', async () => {
    useShiftStore.setState({
      active: { siteId: 'site-1', siteName: 'Tower B', checkedInAt: 1, sessionId: 's', paused: false },
    });
    const { result } = renderHook(() => usePhotoCaptureController());

    await act(() => result.current.capturePhoto(camera, 'Task'));

    // The mock camera reports 4032x3024 with a landscape-left orientation, i.e. an upright portrait shot.
    expect(usePhotoStore.getState().photos[0]).toMatchObject({ siteId: 'site-1', width: 3024, height: 4032 });
  });

  it('leaves the site off when nobody is checked in', async () => {
    const { result } = renderHook(() => usePhotoCaptureController());

    await act(() => result.current.capturePhoto(camera, 'Task'));

    expect(usePhotoStore.getState().photos[0]).not.toHaveProperty('siteId');
  });
});

describe('usePhotoCaptureController for owners', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    usePhotoStore.setState({ photos: [], loaded: false, loadedFor: null });
    useAuthStore.setState({
      profile: { id: 'owner-1', name: 'Administrator', role: 'Owner', appRole: 'owner', color: '#1c4ff0' },
    });
    primeFix({ lat: 27.7, lng: 85.3, accuracy: 8 });
  });

  it("files an owner's capture under the owner", async () => {
    const { result } = renderHook(() => usePhotoCaptureController());

    await act(() => result.current.capturePhoto(camera, 'Site walk'));

    expect(addLocalPhoto).toHaveBeenCalledWith(
      expect.objectContaining({ personId: 'owner-1', task: 'Site walk' })
    );
  });
});
