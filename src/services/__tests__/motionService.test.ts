import * as Location from 'expo-location';
import { DeviceMotion } from 'expo-sensors';

import { watchCompassHeading, watchTilt } from '@/services/motionService';

jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(),
  watchHeadingAsync: jest.fn(),
}));
jest.mock('expo-sensors', () => ({
  DeviceMotion: {
    isAvailableAsync: jest.fn(),
    setUpdateInterval: jest.fn(),
    addListener: jest.fn(),
  },
}));

const flush = () => new Promise<void>(resolve => setImmediate(() => resolve()));

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({ granted: true });
});

describe('watchCompassHeading', () => {
  it('prefers true north once the phone can correct for it', async () => {
    let emit: (h: unknown) => void = () => {};
    (Location.watchHeadingAsync as jest.Mock).mockImplementation(async cb => {
      emit = cb;
      return { remove: jest.fn() };
    });
    const onHeading = jest.fn();

    const stop = watchCompassHeading(onHeading);
    await flush();
    emit({ trueHeading: 91, magHeading: 90, accuracy: 3 });
    emit({ trueHeading: -1, magHeading: 45, accuracy: 3 });

    expect(onHeading.mock.calls).toEqual([[91], [45]]);
    stop();
  });

  it('removes the subscription when stopped before it resolves', async () => {
    const remove = jest.fn();
    let resolve: (sub: unknown) => void = () => {};
    (Location.watchHeadingAsync as jest.Mock).mockReturnValue(new Promise(r => (resolve = r)));

    const stop = watchCompassHeading(jest.fn());
    await flush(); // permission granted, compass watch now pending
    stop();
    resolve({ remove });
    await flush();

    expect(remove).toHaveBeenCalledTimes(1);
  });

  it('never starts the compass when stopped while the permission prompt is open', async () => {
    const stop = watchCompassHeading(jest.fn());
    stop();
    await flush();
    expect(Location.watchHeadingAsync).not.toHaveBeenCalled();
  });

  it('does not start the compass without location permission', async () => {
    (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({ granted: false });
    const stop = watchCompassHeading(jest.fn());
    await flush();
    expect(Location.watchHeadingAsync).not.toHaveBeenCalled();
    expect(() => stop()).not.toThrow();
  });

  it('stays quiet when the compass is unavailable', async () => {
    (Location.watchHeadingAsync as jest.Mock).mockRejectedValue(new Error('no sensor'));
    const stop = watchCompassHeading(jest.fn());
    await flush();
    expect(() => stop()).not.toThrow();
  });
});

describe('watchTilt', () => {
  it('forwards the front-to-back tilt at the requested rate', async () => {
    let emit: (r: unknown) => void = () => {};
    (DeviceMotion.isAvailableAsync as jest.Mock).mockResolvedValue(true);
    (DeviceMotion.addListener as jest.Mock).mockImplementation(cb => {
      emit = cb;
      return { remove: jest.fn() };
    });
    const onTilt = jest.fn();

    const stop = watchTilt(onTilt, 100);
    await flush();
    emit({ rotation: { alpha: 0, beta: 1.2, gamma: 0 } });
    emit({ rotation: null });

    expect(DeviceMotion.setUpdateInterval).toHaveBeenCalledWith(100);
    expect(onTilt.mock.calls).toEqual([[1.2]]);
    stop();
  });

  it('does not subscribe when the device has no motion sensor', async () => {
    (DeviceMotion.isAvailableAsync as jest.Mock).mockResolvedValue(false);
    watchTilt(jest.fn(), 100);
    await flush();
    expect(DeviceMotion.addListener).not.toHaveBeenCalled();
  });

  it('does not subscribe when stopped before availability is known', async () => {
    (DeviceMotion.isAvailableAsync as jest.Mock).mockResolvedValue(true);
    const stop = watchTilt(jest.fn(), 100);
    stop();
    await flush();
    expect(DeviceMotion.addListener).not.toHaveBeenCalled();
  });
});
