import { useIsFocused } from '@react-navigation/native';
import { act, renderHook } from '@testing-library/react-native';
import { AppState } from 'react-native';
import { useCameraDevice, useCameraFormat } from 'react-native-vision-camera';

import { useCameraSessionController } from '@/controllers/useCameraSessionController';

jest.mock('@/constants/config', () => ({
  CAMERA: {
    photoTarget: { width: 4032, height: 3024 },
    maxVideoSeconds: 30,
    maxZoom: 10,
    maxAutoRetries: 3,
    retryDelayMs: 700,
  },
}));
jest.mock('@react-navigation/native', () => ({ useIsFocused: jest.fn() }));
jest.mock('react-native-vision-camera', () => ({
  useCameraDevice: jest.fn(),
  useCameraFormat: jest.fn(),
}));

const device = { id: 'back-1', minZoom: 1, maxZoom: 8, neutralZoom: 1 };
const inUse = { code: 'device/camera-already-in-use', message: 'The given Camera Device is already in use!' };
const restricted = { code: 'system/camera-is-restricted', message: 'restricted' };

let appStateListener: (state: string) => void = () => {};

function mount() {
  return renderHook(() => useCameraSessionController());
}

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
  (useCameraDevice as jest.Mock).mockReturnValue(device);
  (useCameraFormat as jest.Mock).mockReturnValue({ id: 'format-1' });
  (useIsFocused as jest.Mock).mockReturnValue(true);
  Object.defineProperty(AppState, 'currentState', { value: 'active', configurable: true });
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, listener) => {
    appStateListener = listener as (state: string) => void;
    return { remove: jest.fn() } as never;
  });
});

afterEach(() => jest.useRealTimers());

describe('when the camera is allowed to be open', () => {
  it('is active while the screen is focused and the app is in the foreground', () => {
    const { result } = mount();

    expect(result.current.isActive).toBe(true);
  });

  it('lets go of the camera when the user leaves the Camera screen', () => {
    // The old always-on camera held the lens through tab switches.
    (useIsFocused as jest.Mock).mockReturnValue(false);

    const { result } = mount();

    expect(result.current.isActive).toBe(false);
  });

  it('lets go of the camera when the app goes to the background', () => {
    // The phone refuses a lens to an app that is not on screen.
    const { result } = mount();

    act(() => appStateListener('background'));

    expect(result.current.isActive).toBe(false);
  });

  it('takes the camera back when the app returns to the foreground', () => {
    const { result } = mount();
    act(() => appStateListener('background'));

    act(() => appStateListener('active'));

    expect(result.current.isActive).toBe(true);
  });
});

describe('when Android reports the camera busy or restricted', () => {
  it('releases the camera, then reopens it as a fresh session after a pause', () => {
    const { result } = mount();
    const before = result.current.attempt;

    act(() => result.current.onCameraError(inUse as never));
    expect(result.current.isActive).toBe(false);
    expect(result.current.problem).toBeNull();

    act(() => jest.advanceTimersByTime(700));

    expect(result.current.isActive).toBe(true);
    expect(result.current.attempt).toBe(before + 1);
  });

  it('treats a burst of identical errors as one failure, not five retries', () => {
    // The library reported "already in use" five times in a row on the phone.
    const { result } = mount();
    const before = result.current.attempt;

    act(() => {
      for (let i = 0; i < 5; i++) result.current.onCameraError(inUse as never);
    });
    act(() => jest.advanceTimersByTime(700));

    expect(result.current.attempt).toBe(before + 1);
  });

  it('retries the restricted error the same way', () => {
    const { result } = mount();

    act(() => result.current.onCameraError(restricted as never));

    expect(result.current.isActive).toBe(false);
    expect(result.current.problem).toBeNull();
  });

  it('waits longer before each successive retry', () => {
    const { result } = mount();

    act(() => result.current.onCameraError(inUse as never));
    act(() => jest.advanceTimersByTime(700));
    const afterFirst = result.current.attempt;

    act(() => result.current.onCameraError(inUse as never));
    act(() => jest.advanceTimersByTime(700));
    // Second retry waits 1400ms, so 700ms in it must still be closed.
    expect(result.current.attempt).toBe(afterFirst);
    expect(result.current.isActive).toBe(false);

    act(() => jest.advanceTimersByTime(700));
    expect(result.current.attempt).toBe(afterFirst + 1);
  });

  it('gives up after the retry budget and shows a plain-English problem', () => {
    const { result } = mount();

    for (let i = 0; i < 3; i++) {
      act(() => result.current.onCameraError(inUse as never));
      act(() => jest.advanceTimersByTime(700 * (i + 1)));
    }
    act(() => result.current.onCameraError(inUse as never));

    expect(result.current.problem?.code).toBe('device/camera-already-in-use');
    expect(result.current.problem?.message).toMatch(/another app/i);
    expect(result.current.isActive).toBe(false);
  });

  it('explains a restricted camera in terms of phone settings', () => {
    const { result } = mount();

    for (let i = 0; i < 3; i++) {
      act(() => result.current.onCameraError(restricted as never));
      act(() => jest.advanceTimersByTime(700 * (i + 1)));
    }
    act(() => result.current.onCameraError(restricted as never));

    expect(result.current.problem?.message).toMatch(/permissions/i);
  });

  it('refills the retry budget once a session opens successfully', () => {
    const { result } = mount();
    for (let i = 0; i < 3; i++) {
      act(() => result.current.onCameraError(inUse as never));
      act(() => jest.advanceTimersByTime(700 * (i + 1)));
    }

    act(() => result.current.onCameraInitialized());
    act(() => result.current.onCameraError(inUse as never));

    // With a full budget again this is a quiet retry, not a shown problem.
    expect(result.current.problem).toBeNull();
    expect(result.current.isActive).toBe(false);
  });

  it('shows anything else straight away, without retrying', () => {
    const { result } = mount();

    act(() =>
      result.current.onCameraError({ code: 'session/invalid-output-configuration', message: 'bad' } as never)
    );

    expect(result.current.problem).toEqual({ code: 'session/invalid-output-configuration', message: 'bad' });
  });

  it('starts clean when the user presses Try again', () => {
    const { result } = mount();
    act(() => result.current.onCameraError({ code: 'device/fatal-error', message: 'boom' } as never));
    const before = result.current.attempt;

    act(() => result.current.retry());

    expect(result.current.problem).toBeNull();
    expect(result.current.isActive).toBe(true);
    expect(result.current.attempt).toBe(before + 1);
  });

  it('gives a stale error a fresh attempt when the user comes back to the screen', () => {
    const { result, rerender } = mount();
    act(() => result.current.onCameraError({ code: 'device/fatal-error', message: 'boom' } as never));
    (useIsFocused as jest.Mock).mockReturnValue(false);
    rerender({});

    (useIsFocused as jest.Mock).mockReturnValue(true);
    rerender({});

    expect(result.current.problem).toBeNull();
    expect(result.current.isActive).toBe(true);
  });
});

describe('zoom', () => {
  it('starts at the main lens', () => {
    const { result } = mount();

    expect(result.current.zoom).toBe(1);
  });

  it('holds a requested zoom inside what the lens can do', () => {
    const { result } = mount();

    act(() => result.current.setZoom(50));
    expect(result.current.zoom).toBe(8);

    act(() => result.current.setZoom(0.1));
    expect(result.current.zoom).toBe(1);
  });

  it('caps zoom at the configured maximum even when the lens goes further', () => {
    (useCameraDevice as jest.Mock).mockReturnValue({ ...device, maxZoom: 30 });
    const { result } = mount();

    act(() => result.current.setZoom(25));

    expect(result.current.zoom).toBe(10);
  });

  it('offers quick-select stops that fit the lens', () => {
    const { result } = mount();

    expect(result.current.zoomStops.map(s => s.label)).toEqual(['1×', '2×', '5×']);
  });

  it('does nothing while there is no camera device', () => {
    (useCameraDevice as jest.Mock).mockReturnValue(undefined);
    const { result } = mount();

    act(() => result.current.setZoom(3));

    expect(result.current.zoom).toBe(1);
    expect(result.current.zoomStops).toEqual([]);
  });
});

describe('photo format', () => {
  it('asks for the ~12 MP photo format', () => {
    mount();

    const filters = (useCameraFormat as jest.Mock).mock.calls[0][1];
    expect(filters).toContainEqual({ photoResolution: { width: 4032, height: 3024 } });
  });
});

describe('flash', () => {
  const withFlash = { ...device, hasFlash: true };

  it('is hidden on a lens without a flash, and never sent to it', () => {
    const { result } = mount();

    act(() => result.current.cycleFlash());

    expect(result.current.flashSupported).toBe(false);
    expect(result.current.flash).toBe('off');
  });

  it('cycles off, auto, on', () => {
    (useCameraDevice as jest.Mock).mockReturnValue(withFlash);
    const { result } = mount();

    act(() => result.current.cycleFlash());
    expect(result.current.flash).toBe('auto');
    act(() => result.current.cycleFlash());
    expect(result.current.flash).toBe('on');
    act(() => result.current.cycleFlash());
    expect(result.current.flash).toBe('off');
  });
});

describe('front / back flip', () => {
  const front = { id: 'front-1', minZoom: 1, maxZoom: 2, neutralZoom: 1 };

  it('switches to the front lens and back again', () => {
    (useCameraDevice as jest.Mock).mockImplementation(position => (position === 'front' ? front : device));
    const { result } = mount();
    expect(result.current.canFlip).toBe(true);

    act(() => result.current.flip());
    expect(result.current.device).toBe(front);

    act(() => result.current.flip());
    expect(result.current.device).toBe(device);
  });

  it('offers no flip on a phone with one lens', () => {
    (useCameraDevice as jest.Mock).mockImplementation(position =>
      position === 'front' ? undefined : device
    );
    const { result } = mount();

    expect(result.current.canFlip).toBe(false);
  });
});
