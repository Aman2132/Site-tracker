import { act, renderHook } from '@testing-library/react-native';

import { useMapMotionController } from '@/controllers/useMapMotionController';
import { watchCompassHeading, watchTilt } from '@/services/motionService';

jest.mock('@/services/motionService', () => ({
  watchCompassHeading: jest.fn(),
  watchTilt: jest.fn(),
}));

let emitHeading: (degrees: number) => void = () => {};
let emitTilt: (beta: number) => void = () => {};
const stopHeading = jest.fn();
const stopTilt = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  (watchCompassHeading as jest.Mock).mockImplementation(cb => {
    emitHeading = cb;
    return stopHeading;
  });
  (watchTilt as jest.Mock).mockImplementation(cb => {
    emitTilt = cb;
    return stopTilt;
  });
});

describe('useMapMotionController', () => {
  it('does not touch the sensors while disabled', () => {
    const { result } = renderHook(() => useMapMotionController(false));
    expect(watchCompassHeading).not.toHaveBeenCalled();
    expect(watchTilt).not.toHaveBeenCalled();
    expect(result.current).toEqual({ heading: null, pitch: null });
  });

  it('publishes the first heading and tilt as-is', () => {
    const { result } = renderHook(() => useMapMotionController(true));
    act(() => {
      emitHeading(120);
      emitTilt(Math.PI / 2);
    });
    expect(result.current.heading).toBe(120);
    expect(result.current.pitch).toBeCloseTo(67, 5);
  });

  it('ignores compass wobble inside the deadband', () => {
    const { result } = renderHook(() => useMapMotionController(true));
    act(() => emitHeading(100));
    act(() => emitHeading(101));
    expect(result.current.heading).toBe(100);
  });

  it('smooths a real turn rather than snapping to it', () => {
    const { result } = renderHook(() => useMapMotionController(true));
    act(() => emitHeading(100));
    act(() => emitHeading(200));
    expect(result.current.heading).toBeGreaterThan(100);
    expect(result.current.heading).toBeLessThan(200);
  });

  it('turns the short way across north', () => {
    const { result } = renderHook(() => useMapMotionController(true));
    act(() => emitHeading(350));
    act(() => emitHeading(30));
    const heading = result.current.heading ?? -1;
    expect(heading > 350 || heading < 30).toBe(true);
  });

  it('stops both sensors and resets when disabled', () => {
    const { result, rerender } = renderHook(({ on }: { on: boolean }) => useMapMotionController(on), {
      initialProps: { on: true },
    });
    act(() => emitHeading(90));
    rerender({ on: false });

    expect(stopHeading).toHaveBeenCalledTimes(1);
    expect(stopTilt).toHaveBeenCalledTimes(1);
    expect(result.current).toEqual({ heading: null, pitch: null });
  });
});
