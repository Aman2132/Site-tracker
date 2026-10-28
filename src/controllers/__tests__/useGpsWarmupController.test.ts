import { act, renderHook, waitFor } from '@testing-library/react-native';
import { AppState } from 'react-native';

import { useGpsWarmupController } from '@/controllers/useGpsWarmupController';
import { watchPreciseFix } from '@/services/locationService';
import { hasForegroundLocationPermission } from '@/services/permissionsService';

jest.mock('@/services/locationService', () => ({ watchPreciseFix: jest.fn() }));
jest.mock('@/services/permissionsService', () => ({ hasForegroundLocationPermission: jest.fn() }));

const stop = jest.fn();
let appStateListener: (state: string) => void = () => {};

beforeEach(() => {
  jest.clearAllMocks();
  (watchPreciseFix as jest.Mock).mockReturnValue(stop);
  (hasForegroundLocationPermission as jest.Mock).mockResolvedValue(true);
  Object.defineProperty(AppState, 'currentState', { value: 'active', configurable: true });
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, listener) => {
    appStateListener = listener as (state: string) => void;
    return { remove: jest.fn() } as never;
  });
});

it('keeps GPS running while signed in and on screen, and stops it in the background', async () => {
  renderHook(() => useGpsWarmupController(true));
  await waitFor(() => expect(watchPreciseFix).toHaveBeenCalledTimes(1));

  act(() => appStateListener('background'));
  expect(stop).toHaveBeenCalledTimes(1);

  act(() => appStateListener('active'));
  await waitFor(() => expect(watchPreciseFix).toHaveBeenCalledTimes(2));
});

it('does nothing when signed out or without location permission', async () => {
  renderHook(() => useGpsWarmupController(false));
  (hasForegroundLocationPermission as jest.Mock).mockResolvedValue(false);
  renderHook(() => useGpsWarmupController(true));
  await act(async () => {});
  expect(watchPreciseFix).not.toHaveBeenCalled();
});
