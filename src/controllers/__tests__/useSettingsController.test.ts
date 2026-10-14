import { act, renderHook, waitFor } from '@testing-library/react-native';
import { AppState } from 'react-native';

import { deletePushToken, savePushToken } from '@/api/peopleApi';
import { useSettingsController } from '@/controllers/useSettingsController';
import {
  getLocationAccess,
  openAppSettings,
  requestLocationPermissions,
} from '@/services/permissionsService';
import {
  getNotificationAccess,
  loadNotificationsEnabled,
  registerForPushNotifications,
  saveNotificationsEnabled,
} from '@/services/pushService';
import { useAuthStore } from '@/store/useAuthStore';

jest.mock('@/constants/config', () => ({ HAS_FIREBASE_CONFIG: true }));
jest.mock('@/api/peopleApi', () => ({
  deletePushToken: jest.fn(async () => undefined),
  savePushToken: jest.fn(async () => undefined),
}));
jest.mock('@/services/appInfoService', () => ({ appVersion: () => '1.0.0' }));
jest.mock('@/services/permissionsService', () => ({
  getLocationAccess: jest.fn(),
  openAppSettings: jest.fn(async () => undefined),
  requestLocationPermissions: jest.fn(async () => ({ granted: true, background: false })),
}));
jest.mock('@/services/pushService', () => ({
  getNotificationAccess: jest.fn(),
  loadNotificationsEnabled: jest.fn(),
  registerForPushNotifications: jest.fn(async () => 'expo-token'),
  saveNotificationsEnabled: jest.fn(async () => undefined),
}));

let appStateListener: (state: string) => void = () => {};

async function mount() {
  const hook = renderHook(() => useSettingsController());
  await waitFor(() => expect(hook.result.current.location).not.toBeNull());
  return hook;
}

beforeEach(() => {
  jest.clearAllMocks();
  useAuthStore.setState({ profile: { id: 'worker-9' } as never });
  (getLocationAccess as jest.Mock).mockResolvedValue('ask');
  (getNotificationAccess as jest.Mock).mockResolvedValue('granted');
  (loadNotificationsEnabled as jest.Mock).mockResolvedValue(true);
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, listener) => {
    appStateListener = listener as (state: string) => void;
    return { remove: jest.fn() } as never;
  });
});

it('shows the app version', async () => {
  const { result } = await mount();
  expect(result.current.version).toBe('1.0.0');
});

describe('location', () => {
  it('asks while Android will still show the prompt', async () => {
    const { result } = await mount();
    (getLocationAccess as jest.Mock).mockResolvedValue('always');

    await act(() => result.current.onLocationAction());

    expect(requestLocationPermissions).toHaveBeenCalled();
    expect(openAppSettings).not.toHaveBeenCalled();
    expect(result.current.location).toBe('always');
  });

  it('opens Android Settings once permission is blocked for good, instead of doing nothing', async () => {
    (getLocationAccess as jest.Mock).mockResolvedValue('blocked');
    const { result } = await mount();

    await act(() => result.current.onLocationAction());

    expect(openAppSettings).toHaveBeenCalled();
    expect(requestLocationPermissions).not.toHaveBeenCalled();
  });

  it('re-reads the permission when the person comes back from Settings', async () => {
    (getLocationAccess as jest.Mock).mockResolvedValue('blocked');
    const { result } = await mount();
    (getLocationAccess as jest.Mock).mockResolvedValue('whileUsing');

    await act(async () => appStateListener('active'));

    await waitFor(() => expect(result.current.location).toBe('whileUsing'));
  });
});

describe('notifications', () => {
  it('switching off saves the choice and forgets the push token', async () => {
    const { result } = await mount();
    expect(result.current.notificationsOn).toBe(true);
    (loadNotificationsEnabled as jest.Mock).mockResolvedValue(false);

    await act(() => result.current.setNotifications(false));

    expect(saveNotificationsEnabled).toHaveBeenCalledWith(false);
    expect(deletePushToken).toHaveBeenCalledWith('worker-9');
    expect(result.current.notificationsOn).toBe(false);
  });

  it('switching on registers and stores the push token', async () => {
    (loadNotificationsEnabled as jest.Mock).mockResolvedValue(false);
    const { result } = await mount();
    (loadNotificationsEnabled as jest.Mock).mockResolvedValue(true);

    await act(() => result.current.setNotifications(true));

    expect(savePushToken).toHaveBeenCalledWith('worker-9', 'expo-token');
    expect(result.current.notificationsOn).toBe(true);
  });

  it('switching on while blocked opens Android Settings', async () => {
    (getNotificationAccess as jest.Mock).mockResolvedValue('blocked');
    const { result } = await mount();

    await act(() => result.current.setNotifications(true));

    expect(openAppSettings).toHaveBeenCalled();
    expect(registerForPushNotifications).not.toHaveBeenCalled();
    expect(result.current.notificationsOn).toBe(false);
  });
});
