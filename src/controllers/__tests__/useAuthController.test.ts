import { act, renderHook, waitFor } from '@testing-library/react-native';

import { createPersonProfile, fetchPersonProfile, savePushToken } from '@/api/peopleApi';
import { stopEventsSubscription } from '@/controllers/useActivityFeedController';
import { performSignOut, useAuthController, useAuthSessionController } from '@/controllers/useAuthController';
import { stopCrewSubscription } from '@/controllers/useCrewTrackingController';
import { currentUserId, onAuthChange, signIn, signOutUser, signUp } from '@/services/authService';
import { registerForPushNotifications } from '@/services/pushService';
import { useAuthStore } from '@/store/useAuthStore';
import { PersonProfile } from '@/types/domain';

jest.mock('@/constants/config', () => ({ HAS_FIREBASE_CONFIG: true }));
jest.mock('@/api/peopleApi', () => ({
  fetchPersonProfile: jest.fn(),
  createPersonProfile: jest.fn(async () => undefined),
  savePushToken: jest.fn(async () => undefined),
}));
jest.mock('@/services/authService', () => ({
  onAuthChange: jest.fn(() => jest.fn()),
  signIn: jest.fn(async () => ({ uid: 'worker-9' })),
  signUp: jest.fn(),
  signOutUser: jest.fn(async () => undefined),
  currentUserId: jest.fn(() => 'worker-9'),
}));
jest.mock('@/services/pushService', () => ({
  registerForPushNotifications: jest.fn(async () => null),
}));
jest.mock('@/controllers/useCrewTrackingController', () => ({ stopCrewSubscription: jest.fn() }));
jest.mock('@/controllers/useActivityFeedController', () => ({ stopEventsSubscription: jest.fn() }));

const workerProfile: PersonProfile = {
  id: 'worker-9',
  name: 'Pooja Devi',
  role: 'Worker',
  appRole: 'worker',
  color: '#a142f4',
};

type AuthCallback = (user: { uid: string } | null) => Promise<void> | void;
let authChangeCallback: AuthCallback = () => {};

/** RootNavigator's session listener and LoginScreen's actions, mounted together as in the app. */
function renderApp() {
  return renderHook(() => ({ session: useAuthSessionController(), login: useAuthController() }));
}

beforeEach(() => {
  jest.clearAllMocks();
  useAuthStore.setState({ profile: undefined, signedOutReason: null });
  // clearAllMocks only wipes call history, not implementations set in a
  // specific test — restore the happy-path defaults so an error-path test
  // can't leave later tests silently broken.
  (onAuthChange as jest.Mock).mockImplementation((cb: AuthCallback) => {
    authChangeCallback = cb;
    return jest.fn();
  });
  (signIn as jest.Mock).mockResolvedValue({ uid: 'worker-9' });
  (currentUserId as jest.Mock).mockReturnValue('worker-9');
  (createPersonProfile as jest.Mock).mockResolvedValue(undefined);
  (fetchPersonProfile as jest.Mock).mockResolvedValue(workerProfile);
});

describe('sign-in', () => {
  it('keeps the spinner up until the profile has loaded, not just until the password is accepted', async () => {
    // The old bug: the spinner stopped the moment Firebase accepted the
    // password, then nothing happened while the profile loaded, so people
    // tapped again and again.
    let finishProfile: (profile: PersonProfile) => void = () => {};
    (fetchPersonProfile as jest.Mock).mockReturnValue(new Promise(resolve => (finishProfile = resolve)));

    const { result } = renderHook(() => useAuthController());
    let signingIn: Promise<void> = Promise.resolve();
    act(() => {
      signingIn = result.current.signIn('pooja@site.com', 'secret123');
    });
    await waitFor(() => expect(fetchPersonProfile).toHaveBeenCalled());

    expect(result.current.signingIn).toBe(true);

    await act(async () => {
      finishProfile(workerProfile);
      await signingIn;
    });
    expect(useAuthStore.getState().profile).toEqual(workerProfile);
    expect(result.current.signingIn).toBe(false);
  });

  it('calls plain signIn, not signUp', async () => {
    const { result } = renderHook(() => useAuthController());
    await act(() => result.current.signIn('pooja@site.com', 'secret123'));

    expect(signIn).toHaveBeenCalledWith('pooja@site.com', 'secret123');
    expect(signUp).not.toHaveBeenCalled();
  });

  it('explains a wrong password', async () => {
    (signIn as jest.Mock).mockRejectedValue(new Error('Firebase: Error (auth/invalid-credential).'));

    const { result } = renderHook(() => useAuthController());
    await act(() => result.current.signIn('pooja@site.com', 'nope'));

    expect(result.current.signInError).toMatch(/incorrect/i);
    expect(result.current.signingIn).toBe(false);
  });

  it('says so when the profile cannot load, instead of silently staying on the login screen', async () => {
    (fetchPersonProfile as jest.Mock).mockRejectedValue(new Error('unavailable'));

    const { result } = renderHook(() => useAuthController());
    await act(() => result.current.signIn('pooja@site.com', 'secret123'));

    expect(result.current.signInError).toMatch(/couldn't load your profile/i);
    expect(useAuthStore.getState().profile).not.toEqual(workerProfile);
  });

  it('signs back out an account with no crew profile, and says why', async () => {
    (fetchPersonProfile as jest.Mock).mockResolvedValue(null);

    const { result } = renderHook(() => useAuthController());
    await act(() => result.current.signIn('pooja@site.com', 'secret123'));

    expect(signOutUser).toHaveBeenCalled();
    expect(result.current.signInError).toMatch(/isn't set up/i);
  });

  it('refuses a deactivated account at sign-in', async () => {
    (fetchPersonProfile as jest.Mock).mockResolvedValue({ ...workerProfile, active: false });

    const { result } = renderHook(() => useAuthController());
    await act(() => result.current.signIn('pooja@site.com', 'secret123'));

    expect(signOutUser).toHaveBeenCalled();
    expect(result.current.signInError).toMatch(/deactivated/i);
    expect(useAuthStore.getState().profile).not.toEqual(expect.objectContaining({ id: 'worker-9' }));
  });
});

describe('session listener', () => {
  it('is only opened by the session hook, not by the login screen', () => {
    renderHook(() => useAuthController());
    expect(onAuthChange).not.toHaveBeenCalled();

    renderHook(() => useAuthSessionController());
    expect(onAuthChange).toHaveBeenCalledTimes(1);
  });

  it('restores the signed-in profile on launch and registers for push', async () => {
    (registerForPushNotifications as jest.Mock).mockResolvedValue('expo-token-abc');
    const { result } = renderHook(() => useAuthSessionController());
    expect(result.current.initializing).toBe(true);

    await act(() => authChangeCallback({ uid: 'worker-9' }));

    expect(result.current.profile).toEqual(workerProfile);
    await waitFor(() => expect(savePushToken).toHaveBeenCalledWith('worker-9', 'expo-token-abc'));
  });

  it('signs a deactivated person straight back out on launch and says why', async () => {
    (fetchPersonProfile as jest.Mock).mockResolvedValue({ ...workerProfile, active: false });

    const { result } = renderApp();
    await act(() => authChangeCallback({ uid: 'worker-9' }));

    expect(signOutUser).toHaveBeenCalled();
    expect(useAuthStore.getState().profile).toBeNull();
    expect(result.current.login.signInError).toMatch(/deactivated/i);
    expect(registerForPushNotifications).not.toHaveBeenCalled();
  });

  it('lets in a profile with no active flag (created before deactivation existed)', async () => {
    renderHook(() => useAuthSessionController());
    await act(() => authChangeCallback({ uid: 'worker-9' }));

    expect(signOutUser).not.toHaveBeenCalled();
    expect(useAuthStore.getState().profile).toEqual(workerProfile);
  });

  it('ignores a profile that finishes loading after the person already signed out', async () => {
    (currentUserId as jest.Mock).mockReturnValue(null);
    useAuthStore.setState({ profile: null });

    renderHook(() => useAuthSessionController());
    await act(() => authChangeCallback({ uid: 'worker-9' }));

    expect(useAuthStore.getState().profile).toBeNull();
  });

  it('closes the live feeds when the session ends', async () => {
    renderHook(() => useAuthSessionController());
    await act(() => authChangeCallback(null));

    expect(stopCrewSubscription).toHaveBeenCalled();
    expect(stopEventsSubscription).toHaveBeenCalled();
    expect(useAuthStore.getState().profile).toBeNull();
  });

  it('clears the deactivation notice on the next sign-in attempt', async () => {
    useAuthStore.setState({ profile: null, signedOutReason: 'This account has been deactivated.' });

    const { result } = renderHook(() => useAuthController());
    await act(() => result.current.signIn('pooja@site.com', 'secret123'));

    expect(result.current.signInError).toBeNull();
  });
});

describe('sign-up', () => {
  beforeEach(() => (signUp as jest.Mock).mockResolvedValue({ uid: 'worker-9' }));

  it('creates the auth account, the profile, and sets it directly without waiting on the listener', async () => {
    const { result } = renderHook(() => useAuthController());
    await act(() => result.current.signUp('pooja@site.com', 'secret123', 'Pooja Devi'));

    expect(signUp).toHaveBeenCalledWith('pooja@site.com', 'secret123');
    expect(createPersonProfile).toHaveBeenCalledWith('worker-9', 'Pooja Devi');
    expect(useAuthStore.getState().profile).toEqual(workerProfile);
  });

  it('is not signed back out by the listener firing before the profile exists', async () => {
    // onAuthStateChanged fires the instant the Auth account exists — before
    // createPersonProfile has written the doc. Without the suppress flag the
    // listener would find no profile and sign the new user out.
    let profileWritten = false;
    (fetchPersonProfile as jest.Mock).mockImplementation(async () => (profileWritten ? workerProfile : null));
    (createPersonProfile as jest.Mock).mockImplementation(async () => {
      profileWritten = true;
    });
    (signUp as jest.Mock).mockImplementation(async () => {
      await authChangeCallback({ uid: 'worker-9' }); // fires before the profile doc exists
      return { uid: 'worker-9' };
    });

    const { result } = renderApp();
    await act(() => result.current.login.signUp('pooja@site.com', 'secret123', 'Pooja Devi'));

    expect(signOutUser).not.toHaveBeenCalled();
    expect(useAuthStore.getState().profile).toEqual(workerProfile);
  });

  it('leaves the next real auth-state event alone after a successful signup', async () => {
    (signUp as jest.Mock).mockImplementation(async () => {
      await authChangeCallback({ uid: 'worker-9' }); // consumes the single-shot flag
      return { uid: 'worker-9' };
    });

    const { result } = renderApp();
    await act(() => result.current.login.signUp('pooja@site.com', 'secret123', 'Pooja Devi'));
    expect(useAuthStore.getState().profile).toEqual(workerProfile);

    // A later, unrelated sign-out must go through normally, not be swallowed.
    await act(() => authChangeCallback(null));
    expect(useAuthStore.getState().profile).toBeNull();
  });

  it('signs back out and surfaces an error when the profile write fails after the account is created', async () => {
    (createPersonProfile as jest.Mock).mockRejectedValue(new Error('permission-denied'));

    const { result } = renderHook(() => useAuthController());
    await act(() => result.current.signUp('pooja@site.com', 'secret123', 'Pooja Devi'));

    expect(signOutUser).toHaveBeenCalledTimes(1);
    expect(result.current.signInError).toBeTruthy();
    expect(useAuthStore.getState().profile).not.toEqual(workerProfile);
  });

  it('surfaces a friendly message for an email already in use', async () => {
    (signUp as jest.Mock).mockRejectedValue(new Error('Firebase: Error (auth/email-already-in-use).'));

    const { result } = renderHook(() => useAuthController());
    await act(() => result.current.signUp('pooja@site.com', 'secret123', 'Pooja Devi'));

    expect(result.current.signInError).toMatch(/already exists/i);
  });

  it('registers a push token after a successful signup, same as sign-in does', async () => {
    (registerForPushNotifications as jest.Mock).mockResolvedValue('expo-token-abc');

    const { result } = renderHook(() => useAuthController());
    await act(() => result.current.signUp('pooja@site.com', 'secret123', 'Pooja Devi'));

    await waitFor(() => expect(savePushToken).toHaveBeenCalledWith('worker-9', 'expo-token-abc'));
  });
});

describe('performSignOut', () => {
  it('closes the live feeds before signing out, so Firestore never sees them unauthenticated', async () => {
    const order: string[] = [];
    (stopCrewSubscription as jest.Mock).mockImplementation(() => order.push('crew'));
    (stopEventsSubscription as jest.Mock).mockImplementation(() => order.push('events'));
    (signOutUser as jest.Mock).mockImplementation(async () => {
      order.push('signOut');
    });

    await performSignOut(jest.fn());

    expect(order).toEqual(['crew', 'events', 'signOut']);
  });
});
