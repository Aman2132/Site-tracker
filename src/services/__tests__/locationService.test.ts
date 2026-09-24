import * as Location from 'expo-location';

import {
  classifyActivity,
  startBackgroundTracking,
  stopBackgroundTracking,
  watchPreciseFix,
} from '@/services/locationService';

jest.mock('expo-task-manager', () => ({ defineTask: jest.fn() }));
jest.mock('expo-location', () => ({
  Accuracy: { Balanced: 3, BestForNavigation: 6 },
  hasStartedLocationUpdatesAsync: jest.fn(),
  startLocationUpdatesAsync: jest.fn(async () => undefined),
  stopLocationUpdatesAsync: jest.fn(async () => undefined),
  watchPositionAsync: jest.fn(),
}));

describe('classifyActivity', () => {
  it('treats a missing speed as still', () => {
    expect(classifyActivity(null)).toBe('still');
    expect(classifyActivity(undefined)).toBe('still');
  });

  it('treats the sentinel negative speed some devices report as still', () => {
    expect(classifyActivity(-1)).toBe('still');
  });

  it('classifies by the configured thresholds', () => {
    expect(classifyActivity(0)).toBe('still');
    expect(classifyActivity(1)).toBe('walk');
    expect(classifyActivity(10)).toBe('vehicle');
  });

  it('treats each threshold as exclusive, so a boundary speed stays in the lower band', () => {
    // Thresholds are `>`, not `>=` — 0.3 is still, 2.5 is walk.
    expect(classifyActivity(0.3)).toBe('still');
    expect(classifyActivity(0.31)).toBe('walk');
    expect(classifyActivity(2.5)).toBe('walk');
    expect(classifyActivity(2.51)).toBe('vehicle');
  });
});

describe('startBackgroundTracking', () => {
  beforeEach(() => jest.clearAllMocks());

  it('does not start a second task when one is already running', async () => {
    (Location.hasStartedLocationUpdatesAsync as jest.Mock).mockResolvedValue(true);

    await startBackgroundTracking();

    expect(Location.startLocationUpdatesAsync).not.toHaveBeenCalled();
  });

  it('starts tracking as a foreground service when nothing is running yet', async () => {
    (Location.hasStartedLocationUpdatesAsync as jest.Mock).mockResolvedValue(false);

    await startBackgroundTracking();

    expect(Location.startLocationUpdatesAsync).toHaveBeenCalledTimes(1);
    const [, options] = (Location.startLocationUpdatesAsync as jest.Mock).mock.calls[0];
    expect(options.foregroundService).toBeDefined();
  });

  it('treats a failed status check as "not started" rather than throwing', async () => {
    (Location.hasStartedLocationUpdatesAsync as jest.Mock).mockRejectedValue(new Error('no permission'));

    await expect(startBackgroundTracking()).resolves.toBeUndefined();
    expect(Location.startLocationUpdatesAsync).toHaveBeenCalledTimes(1);
  });
});

describe('stopBackgroundTracking', () => {
  beforeEach(() => jest.clearAllMocks());

  it('does not try to stop a task that was never started', async () => {
    (Location.hasStartedLocationUpdatesAsync as jest.Mock).mockResolvedValue(false);

    await stopBackgroundTracking();

    expect(Location.stopLocationUpdatesAsync).not.toHaveBeenCalled();
  });
});

describe('watchPreciseFix', () => {
  beforeEach(() => jest.clearAllMocks());

  it('forwards each fix with a fallback accuracy when the device omits it', async () => {
    let emit: (loc: unknown) => void = () => {};
    (Location.watchPositionAsync as jest.Mock).mockImplementation(async (_opts, cb) => {
      emit = cb;
      return { remove: jest.fn() };
    });
    const onUpdate = jest.fn();

    watchPreciseFix(onUpdate);
    await Promise.resolve();

    emit({ coords: { latitude: 27.7, longitude: 85.3, accuracy: null } });
    expect(onUpdate).toHaveBeenCalledWith({ lat: 27.7, lng: 85.3, accuracy: 9999 });
  });

  it('removes the subscription even when the screen unmounts before it resolves', async () => {
    const remove = jest.fn();
    let resolveWatch: (sub: unknown) => void = () => {};
    (Location.watchPositionAsync as jest.Mock).mockReturnValue(
      new Promise(resolve => {
        resolveWatch = resolve;
      })
    );

    // Unmount first, subscription arrives afterwards — without the `cancelled`
    // guard this would leak a live GPS stream for the rest of the session.
    const stop = watchPreciseFix(jest.fn());
    stop();
    resolveWatch({ remove });
    await Promise.resolve();

    expect(remove).toHaveBeenCalledTimes(1);
  });

  it('stays silent when location permission is refused', async () => {
    (Location.watchPositionAsync as jest.Mock).mockRejectedValue(new Error('denied'));
    const onUpdate = jest.fn();

    const stop = watchPreciseFix(onUpdate);
    await Promise.resolve();

    expect(onUpdate).not.toHaveBeenCalled();
    expect(() => stop()).not.toThrow();
  });
});
