import { act, renderHook, waitFor } from '@testing-library/react-native';

import { usePhotoCaptureController } from '@/controllers/usePhotoCaptureController';
import { watchPreciseFix } from '@/services/locationService';
import { saveToDeviceGallery } from '@/services/mediaLibraryService';
import { requestGallerySavePermission } from '@/services/permissionsService';
import { useAuthStore } from '@/store/useAuthStore';
import { usePhotoStore } from '@/store/usePhotoStore';
import { GeoFix } from '@/types/domain';

jest.mock('@/constants/config', () => ({
  DEFAULT_COORDS: { lat: 27.7172, lng: 85.324 },
  GEOTAG_ACCURACY: { goodMeters: 20, watchIntervalMs: 500 },
  LOCAL_MEDIA: { maxTaskChars: 60 },
  CAMERA: { maxVideoSeconds: 30 },
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

const photoCamera = { takePhoto: jest.fn(async () => ({ path: '/tmp/shot.jpg' })) } as never;

/** Pushes a fix through the controller's GPS watch. */
function primeFix(fix: GeoFix) {
  (watchPreciseFix as jest.Mock).mockImplementation((cb: (f: GeoFix) => void) => {
    cb(fix);
    return jest.fn();
  });
}

function signIn() {
  useAuthStore.setState({
    profile: { id: 'worker-1', name: 'Ramesh', role: 'Driver', appRole: 'worker', color: '#1a73e8' },
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  usePhotoStore.setState({ photos: [], loaded: false, loadedFor: null });
  signIn();
  (requestGallerySavePermission as jest.Mock).mockResolvedValue(true);
  primeFix({ lat: 27.7, lng: 85.3, accuracy: 8 });
});

describe('photo capture guard', () => {
  it('marks the item as a photo', async () => {
    const { result } = renderHook(() => usePhotoCaptureController());

    await act(() => result.current.capturePhoto(photoCamera, 'Task'));

    expect(usePhotoStore.getState().photos[0].mediaType).toBe('photo');
  });

  it('ignores a second shutter press while the first photo is still being processed', async () => {
    // A 12 MP photo is ~5 MB of base64 in JS memory; two in parallel is a spike.
    let release: (value: { path: string }) => void = () => {};
    const takePhoto = jest.fn(() => new Promise<{ path: string }>(resolve => (release = resolve)));
    const slowCamera = { takePhoto } as never;
    const { result } = renderHook(() => usePhotoCaptureController());

    let first: Promise<void> = Promise.resolve();
    act(() => {
      first = result.current.capturePhoto(slowCamera, 'Task');
    });
    await act(() => result.current.capturePhoto(slowCamera, 'Task'));

    expect(takePhoto).toHaveBeenCalledTimes(1);
    expect(result.current.isSaving).toBe(true);

    await act(async () => {
      release({ path: '/tmp/slow.jpg' });
      await first;
    });
    expect(result.current.isSaving).toBe(false);
    expect(usePhotoStore.getState().photos).toHaveLength(1);
  });

  it('accepts a new photo once the previous one has finished, even if it failed', async () => {
    const takePhoto = jest
      .fn()
      .mockRejectedValueOnce(new Error('camera busy'))
      .mockResolvedValue({ path: '/tmp/ok.jpg' });
    const flaky = { takePhoto } as never;
    const { result } = renderHook(() => usePhotoCaptureController());

    await act(async () => {
      await result.current.capturePhoto(flaky, 'Task').catch(() => {});
    });
    await act(() => result.current.capturePhoto(flaky, 'Task'));

    expect(usePhotoStore.getState().photos).toHaveLength(1);
    expect(result.current.isSaving).toBe(false);
  });
});

describe('video capture', () => {
  interface RecordingOptions {
    onRecordingFinished: (video: { path: string; duration: number }) => void;
    onRecordingError: (error: Error) => void;
    fileType: string;
    videoCodec: string;
  }

  function videoCamera() {
    let captured: RecordingOptions | undefined;
    const raw = {
      startRecording: jest.fn((opts: RecordingOptions) => {
        captured = opts;
      }),
      stopRecording: jest.fn(async () => undefined),
    };
    return { cam: raw as never, raw, options: () => captured as RecordingOptions };
  }

  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('records an h264 mp4', () => {
    const { cam, options } = videoCamera();
    const { result } = renderHook(() => usePhotoCaptureController());

    act(() => result.current.startVideo(cam, 'Task'));

    expect(options().fileType).toBe('mp4');
    expect(options().videoCodec).toBe('h264');
    expect(result.current.isRecording).toBe(true);
  });

  it('counts recording time up while recording', () => {
    const { cam } = videoCamera();
    const { result } = renderHook(() => usePhotoCaptureController());

    act(() => result.current.startVideo(cam, 'Task'));
    act(() => {
      jest.advanceTimersByTime(3_000);
    });

    expect(result.current.recordingMs).toBeGreaterThanOrEqual(2_750);
  });

  it('queues the finished clip as a video with its length', async () => {
    const { cam, options } = videoCamera();
    const { result } = renderHook(() => usePhotoCaptureController());
    act(() => result.current.startVideo(cam, 'Column grid L4'));

    await act(async () => {
      options().onRecordingFinished({ path: '/tmp/clip.mp4', duration: 12.34 });
    });

    const [item] = usePhotoStore.getState().photos;
    expect(item).toMatchObject({
      uri: 'file:///tmp/clip.mp4',
      mediaType: 'video',
      durationMs: 12_340,
      task: 'Column grid L4',
      personId: 'worker-1',
      synced: false,
    });
    expect(result.current.isRecording).toBe(false);
    expect(result.current.lastSavedLabel).toBe('Video 00:12 · ±8 m');
  });

  it('geotags the clip with where the worker was when recording STARTED', async () => {
    // They may walk across the site while filming; the record is for the start.
    let push: (fix: GeoFix) => void = () => {};
    (watchPreciseFix as jest.Mock).mockImplementation((cb: (f: GeoFix) => void) => {
      push = cb;
      cb({ lat: 27.7, lng: 85.3, accuracy: 8 });
      return jest.fn();
    });
    const { cam, options } = videoCamera();
    const { result } = renderHook(() => usePhotoCaptureController());
    act(() => result.current.startVideo(cam, 'Task'));

    act(() => push({ lat: 27.9, lng: 85.9, accuracy: 30 }));
    await act(async () => {
      options().onRecordingFinished({ path: '/tmp/clip.mp4', duration: 5 });
    });

    const [item] = usePhotoStore.getState().photos;
    expect(item.lat).toBe(27.7);
    expect(item.lng).toBe(85.3);
    expect(item.accuracy).toBe(8);
  });

  it('copies the clip into the device gallery', async () => {
    const { cam, options } = videoCamera();
    const { result } = renderHook(() => usePhotoCaptureController());
    await waitFor(() => expect(requestGallerySavePermission).toHaveBeenCalled());
    act(() => result.current.startVideo(cam, 'Task'));

    await act(async () => {
      options().onRecordingFinished({ path: '/tmp/clip.mp4', duration: 5 });
    });

    expect(saveToDeviceGallery).toHaveBeenCalledWith('file:///tmp/clip.mp4');
  });

  it('still queues the clip when the gallery copy fails', async () => {
    (saveToDeviceGallery as jest.Mock).mockRejectedValueOnce(new Error('storage full'));
    const { cam, options } = videoCamera();
    const { result } = renderHook(() => usePhotoCaptureController());
    await waitFor(() => expect(requestGallerySavePermission).toHaveBeenCalled());
    act(() => result.current.startVideo(cam, 'Task'));

    await act(async () => {
      options().onRecordingFinished({ path: '/tmp/clip.mp4', duration: 5 });
    });

    expect(usePhotoStore.getState().photos).toHaveLength(1);
  });

  it('stops by itself at the maximum clip length', () => {
    const { cam, raw } = videoCamera();
    const { result } = renderHook(() => usePhotoCaptureController());
    act(() => result.current.startVideo(cam, 'Task'));

    act(() => {
      jest.advanceTimersByTime(29_000);
    });
    expect(raw.stopRecording).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(1_500);
    });
    expect(raw.stopRecording).toHaveBeenCalled();
  });

  it('stops the camera when asked to', () => {
    const { cam, raw } = videoCamera();
    const { result } = renderHook(() => usePhotoCaptureController());
    act(() => result.current.startVideo(cam, 'Task'));

    act(() => result.current.stopVideo());

    expect(raw.stopRecording).toHaveBeenCalledTimes(1);
  });

  it('returns to idle and queues nothing if recording fails', () => {
    const { cam, options } = videoCamera();
    const { result } = renderHook(() => usePhotoCaptureController());
    act(() => result.current.startVideo(cam, 'Task'));

    act(() => options().onRecordingError(new Error('disk full')));

    expect(result.current.isRecording).toBe(false);
    expect(usePhotoStore.getState().photos).toHaveLength(0);
  });

  it('will not start a second recording on top of the first', () => {
    const { cam, raw } = videoCamera();
    const { result } = renderHook(() => usePhotoCaptureController());
    act(() => result.current.startVideo(cam, 'Task'));

    act(() => result.current.startVideo(cam, 'Task'));

    expect(raw.startRecording).toHaveBeenCalledTimes(1);
  });

  it('will not record when nobody is signed in', () => {
    useAuthStore.setState({ profile: null });
    const { cam, raw } = videoCamera();
    const { result } = renderHook(() => usePhotoCaptureController());

    act(() => result.current.startVideo(cam, 'Task'));

    expect(raw.startRecording).not.toHaveBeenCalled();
    expect(result.current.isRecording).toBe(false);
  });

  it('stops a recording that is still running when the screen unmounts', () => {
    const { cam, raw } = videoCamera();
    const { result, unmount } = renderHook(() => usePhotoCaptureController());
    act(() => result.current.startVideo(cam, 'Task'));

    unmount();

    expect(raw.stopRecording).toHaveBeenCalled();
  });
});
