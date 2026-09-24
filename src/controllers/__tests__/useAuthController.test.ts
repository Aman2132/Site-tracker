import { act, renderHook, waitFor } from '@testing-library/react-native';

import { createPersonProfile, fetchPersonProfile, savePushToken } from '@/api/peopleApi';
import { useAuthController } from '@/controllers/useAuthController';
import { onAuthChange, signIn, signOutUser, signUp } from '@/services/authService';
import { registerForPushNotifications } from '@/services/pushService';
import { useAuthStore } from '@/store/useAuthStore';

jest.mock('@/constants/config', () => ({ HAS_FIREBASE_CONFIG: true }));
jest.mock('@/api/peopleApi', () => ({
  fetchPersonProfile: jest.fn(),
  createPersonProfile: jest.fn(async () => undefined),
  savePushToken: jest.fn(async () => undefined),
}));
jest.mock('@/services/authService', () => ({
  onAuthChange: jest.fn(() => jest.fn()),
  signIn: jest.fn(async () => undefined),
  signUp: jest.fn(),
  signOutUser: jest.fn(async () => undefined),
}));
jest.mock('@/services/pushService', () => ({
  registerForPushNotifications: jest.fn(async () => null),
}));

const workerProfile = {
  id: 'worker-9',
  name: 'Pooja Devi',
  role: 'Worker',
  appRole: 'worker',
  color: '#a142f4',
};

describe('useAuthController signUp', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuthStore.setState({ profile: undefined });
    // clearAllMocks only wipes call history, not implementations set via
    // mockResolvedValue/mockRejectedValue in a specific test — restore the
    // happy-path default here so an error-path test earlier in the file
    // can't leave later tests silently broken.
    (createPersonProfile as jest.Mock).mockResolvedValue(undefined);
  });

  it('creates the auth account, the profile, and sets it directly without waiting on the listener', async () => {
    (signUp as jest.Mock).mockResolvedValue({ uid: 'worker-9' });
    (fetchPersonProfile as jest.Mock).mockResolvedValue(workerProfile);

    const { result } = renderHook(() => useAuthController());
    await act(() => result.current.signUp('pooja@site.com', 'secret123', 'Pooja Devi'));

    expect(signUp).toHaveBeenCalledWith('pooja@site.com', 'secret123');
    expect(createPersonProfile).toHaveBeenCalledWith('worker-9', 'Pooja Devi');
    expect(useAuthStore.getState().profile).toEqual(workerProfile);
  });

  it('does not bounce to signed-out when the shared listener fires mid-signup', async () => {
    // onAuthStateChanged fires the instant the Auth account exists — before
    // createPersonProfile has written the doc it depends on. Simulate that
    // race: the listener callback runs synchronously inside signUp(),
    // exactly like the real SDK does.
    let authChangeCallback: (user: { uid: string } | null) => void = () => {};
    (onAuthChange as jest.Mock).mockImplementation(cb => {
      authChangeCallback = cb;
      return jest.fn();
    });
    (signUp as jest.Mock).mockImplementation(async () => {
      authChangeCallback({ uid: 'worker-9' }); // the SDK's own listener firing
      return { uid: 'worker-9' };
    });
    (fetchPersonProfile as jest.Mock).mockResolvedValue(workerProfile);

    const { result } = renderHook(() => useAuthController());
    await act(() => result.current.signUp('pooja@site.com', 'secret123', 'Pooja Devi'));

    // fetchPersonProfile is only mocked to resolve the correct profile, so if
    // the race had won, profile would be stuck at null or undefined instead.
    expect(useAuthStore.getState().profile).toEqual(workerProfile);
  });

  it('signs back out and surfaces an error when the profile write fails after the account is created', async () => {
    (signUp as jest.Mock).mockResolvedValue({ uid: 'worker-9' });
    (createPersonProfile as jest.Mock).mockRejectedValue(new Error('permission-denied'));

    const { result } = renderHook(() => useAuthController());
    await act(() => result.current.signUp('pooja@site.com', 'secret123', 'Pooja Devi'));

    expect(signOutUser).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(result.current.signInError).toBeTruthy());
    expect(useAuthStore.getState().profile).not.toEqual(workerProfile);
  });

  it('surfaces a friendly message for an email already in use', async () => {
    (signUp as jest.Mock).mockRejectedValue(new Error('Firebase: Error (auth/email-already-in-use).'));

    const { result } = renderHook(() => useAuthController());
    await act(() => result.current.signUp('pooja@site.com', 'secret123', 'Pooja Devi'));

    expect(result.current.signInError).toMatch(/already exists/i);
  });

  it('registers a push token after a successful signup, same as sign-in does', async () => {
    (signUp as jest.Mock).mockResolvedValue({ uid: 'worker-9' });
    (fetchPersonProfile as jest.Mock).mockResolvedValue(workerProfile);
    (registerForPushNotifications as jest.Mock).mockResolvedValue('expo-token-abc');

    const { result } = renderHook(() => useAuthController());
    await act(() => result.current.signUp('pooja@site.com', 'secret123', 'Pooja Devi'));
    await waitFor(() => expect(savePushToken).toHaveBeenCalledWith('worker-9', 'expo-token-abc'));
  });

  it('leaves the next real auth-state event alone after a successful signup', async () => {
    // The suppress flag is single-shot. It gets consumed by the listener
    // firing *during* signUp (same as the SDK's real race — see the test
    // above) and must not still be armed for a later, unrelated event.
    let authChangeCallback: (user: { uid: string } | null) => void = () => {};
    (onAuthChange as jest.Mock).mockImplementation(cb => {
      authChangeCallback = cb;
      return jest.fn();
    });
    (signUp as jest.Mock).mockImplementation(async () => {
      authChangeCallback({ uid: 'worker-9' }); // the SDK's own listener firing, consumes the flag
      return { uid: 'worker-9' };
    });
    (fetchPersonProfile as jest.Mock).mockResolvedValue(workerProfile);

    const { result } = renderHook(() => useAuthController());
    await act(() => result.current.signUp('pooja@site.com', 'secret123', 'Pooja Devi'));
    expect(useAuthStore.getState().profile).toEqual(workerProfile);

    // A later, unrelated sign-out must go through normally, not be swallowed.
    await act(async () => authChangeCallback(null));
    expect(useAuthStore.getState().profile).toBeNull();
  });
});

describe('useAuthController signIn (unaffected by the signup addition)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuthStore.setState({ profile: undefined });
  });

  it('still calls plain signIn, not signUp', async () => {
    const { result } = renderHook(() => useAuthController());
    await act(() => result.current.signIn('pooja@site.com', 'secret123'));

    expect(signIn).toHaveBeenCalledWith('pooja@site.com', 'secret123');
    expect(signUp).not.toHaveBeenCalled();
  });
});
