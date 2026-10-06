import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';

import { GEOTAG_ACCURACY } from '@/constants/config';
import { latestRecognizedActivity } from '@/services/activityRecognitionService';
import { readBatteryLevel } from '@/services/batteryService';
import {
  setLocationUpdateHandler,
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
jest.mock('@/services/activityRecognitionService', () => ({ latestRecognizedActivity: jest.fn(() => null) }));
jest.mock('@/services/batteryService', () => ({ readBatteryLevel: jest.fn(async () => undefined) }));

// Registered once at import, before any test clears the mocks.
const locationTask = (TaskManager.defineTask as jest.Mock).mock.calls[0][1] as (body: {
  data?: unknown;
  error?: unknown;
}) => Promise<void>;

describe('background location task', () => {
  const locations = (speed: number | null) => ({
    locations: [{ coords: { latitude: 27.7, longitude: 85.3, accuracy: 12, speed } }],
  });

  afterEach(() => setLocationUpdateHandler(null));

  it('reports the phone battery level with each fix', async () => {
    (readBatteryLevel as jest.Mock).mockResolvedValueOnce(0.42);
    const handler = jest.fn();
    setLocationUpdateHandler(handler);

    await locationTask({ data: locations(0) });

    expect(handler).toHaveBeenCalledWith(expect.objectContaining({ lat: 27.7, lng: 85.3, battery: 0.42 }));
  });

  it('leaves battery out rather than guessing when the phone cannot say', async () => {
    const handler = jest.fn();
    setLocationUpdateHandler(handler);

    await locationTask({ data: locations(0) });

    expect(handler.mock.calls[0][0]).not.toHaveProperty('battery');
  });

  it('uses a fresh, confident OS activity reading over GPS speed', async () => {
    // Crawling in traffic: GPS speed says walking, the recognizer knows it's a vehicle.
    (latestRecognizedActivity as jest.Mock).mockReturnValueOnce({
      kind: 'vehicle',
      confidence: 90,
      at: Date.now(),
    });
    const handler = jest.fn();
    setLocationUpdateHandler(handler);

    await locationTask({ data: locations(1.2) });

    expect(handler.mock.calls[0][0].kind).toBe('vehicle');
  });

  it('falls back to GPS speed with no OS reading', async () => {
    const handler = jest.fn();
    setLocationUpdateHandler(handler);

    await locationTask({ data: locations(1.2) });

    expect(handler.mock.calls[0][0].kind).toBe('walk');
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

    const stop = watchPreciseFix(onUpdate);
    await Promise.resolve();

    emit({ coords: { latitude: 27.7, longitude: 85.3, accuracy: null } });
    expect(onUpdate).toHaveBeenCalledWith({ lat: 27.7, lng: 85.3, accuracy: 9999 });
    stop();
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

  describe('self-healing', () => {
    beforeEach(() => jest.useFakeTimers());
    afterEach(() => jest.useRealTimers());

    it('retries until the subscription works (e.g. permission granted after first launch)', async () => {
      (Location.watchPositionAsync as jest.Mock)
        .mockRejectedValueOnce(new Error('denied'))
        .mockResolvedValue({ remove: jest.fn() });

      const stop = watchPreciseFix(jest.fn());
      await jest.advanceTimersByTimeAsync(0);
      expect(Location.watchPositionAsync).toHaveBeenCalledTimes(1);

      await jest.advanceTimersByTimeAsync(GEOTAG_ACCURACY.retryIntervalMs);
      expect(Location.watchPositionAsync).toHaveBeenCalledTimes(2);
      stop();
    });

    it('stops retrying once cancelled', async () => {
      (Location.watchPositionAsync as jest.Mock).mockRejectedValue(new Error('denied'));

      const stop = watchPreciseFix(jest.fn());
      await jest.advanceTimersByTimeAsync(0);
      stop();
      await jest.advanceTimersByTimeAsync(GEOTAG_ACCURACY.retryIntervalMs * 5);

      expect(Location.watchPositionAsync).toHaveBeenCalledTimes(1);
    });

    it('restarts the watch when it goes quiet', async () => {
      const remove = jest.fn();
      (Location.watchPositionAsync as jest.Mock).mockResolvedValue({ remove });

      const stop = watchPreciseFix(jest.fn());
      await jest.advanceTimersByTimeAsync(
        GEOTAG_ACCURACY.staleAfterMs + GEOTAG_ACCURACY.watchdogIntervalMs * 2
      );

      expect(remove).toHaveBeenCalled();
      expect(Location.watchPositionAsync).toHaveBeenCalledTimes(2);
      stop();
    });

    it('leaves a healthy stream alone', async () => {
      let emit: (loc: unknown) => void = () => {};
      const remove = jest.fn();
      (Location.watchPositionAsync as jest.Mock).mockImplementation(async (_o, cb) => {
        emit = cb;
        return { remove };
      });

      const stop = watchPreciseFix(jest.fn());
      for (let i = 0; i < 6; i += 1) {
        await jest.advanceTimersByTimeAsync(GEOTAG_ACCURACY.staleAfterMs / 2);
        emit({ coords: { latitude: 1, longitude: 2, accuracy: 5 } });
      }

      expect(remove).not.toHaveBeenCalled();
      expect(Location.watchPositionAsync).toHaveBeenCalledTimes(1);
      stop();
    });
  });
});
