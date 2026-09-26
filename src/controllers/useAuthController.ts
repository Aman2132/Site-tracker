import { useCallback, useEffect, useState } from 'react';

import { createPersonProfile, fetchPersonProfile, savePushToken } from '@/api/peopleApi';
import { HAS_FIREBASE_CONFIG } from '@/constants/config';
import { colors } from '@/constants/theme';
import { stopEventsSubscription } from '@/controllers/useActivityFeedController';
import { stopCrewSubscription } from '@/controllers/useCrewTrackingController';
import { currentUserId, onAuthChange, signIn, signOutUser, signUp } from '@/services/authService';
import { registerForPushNotifications } from '@/services/pushService';
import { useAuthStore } from '@/store/useAuthStore';
import { PersonProfile, Role } from '@/types/domain';

const DEACTIVATED_MESSAGE = 'This account has been deactivated. Ask your site owner to reactivate it.';
const NO_PROFILE_MESSAGE = "This account isn't set up on the crew yet. Ask your site owner.";
const PROFILE_LOAD_FAILED_MESSAGE =
  "Signed in, but couldn't load your profile. Check your connection and try again.";

/**
 * handleSignUp writes the new profile itself, right after creating the Auth
 * account. Without this flag the session listener — which fires the instant
 * the account exists, before that profile write has happened — would find no
 * people/{uid} doc and sign the brand-new user straight back out. One signup
 * only ever triggers one extra auth-state event, so a single-shot flag is
 * enough. Module-level because the listener and the sign-up run in different
 * hook instances (RootNavigator vs LoginScreen).
 */
let suppressNextAuthChange = false;

type Admission = { profile: PersonProfile } | { reason: string };

/**
 * Loads a just-signed-in user's profile and decides whether they get in. A
 * missing or deactivated profile is signed back out; a failed load is not
 * (it's usually the network) — either way they stay on the login screen with
 * a message saying why.
 */
async function admit(uid: string): Promise<Admission> {
  let profile: PersonProfile | null;
  try {
    profile = await fetchPersonProfile(uid);
  } catch {
    return { reason: PROFILE_LOAD_FAILED_MESSAGE };
  }
  if (!profile) {
    await signOutUser().catch(() => {});
    return { reason: NO_PROFILE_MESSAGE };
  }
  // Deactivated by an owner: the Firebase account still exists (deleting it
  // needs the Admin SDK), so the app itself refuses to let them in.
  if (profile.active === false) {
    await signOutUser().catch(() => {});
    return { reason: DEACTIVATED_MESSAGE };
  }
  return { profile };
}

function registerPush(uid: string): void {
  registerForPushNotifications()
    .then(token => (token ? savePushToken(uid, token) : undefined))
    .catch(() => {});
}

/** The owner screens' live Firestore listeners, closed before anyone is signed out. */
function stopLiveFeeds(): void {
  stopCrewSubscription();
  stopEventsSubscription();
}

/**
 * RootNavigator only — the one place Firebase's auth state is listened to.
 * On launch it restores the signed-in person's profile (appRole is what
 * RootNavigator branches on); after that it follows sign-outs, including
 * sessions ended from elsewhere.
 */
export function useAuthSessionController() {
  const profile = useAuthStore(state => state.profile);
  const setProfile = useAuthStore(state => state.setProfile);
  const setSignedOutReason = useAuthStore(state => state.setSignedOutReason);

  useEffect(() => {
    return onAuthChange(async firebaseUser => {
      if (suppressNextAuthChange) {
        suppressNextAuthChange = false;
        return;
      }
      if (!firebaseUser) {
        stopLiveFeeds();
        setProfile(null);
        return;
      }
      const admission = await admit(firebaseUser.uid);
      if ('reason' in admission) {
        setSignedOutReason(admission.reason);
        setProfile(null);
        return;
      }
      // Signed out (or someone else signed in) while the profile was loading.
      if (currentUserId() !== firebaseUser.uid) return;
      setProfile(admission.profile);
      registerPush(firebaseUser.uid);
    });
  }, [setProfile, setSignedOutReason]);

  return { profile, initializing: profile === undefined };
}

/**
 * LoginScreen: sign in / create account. The spinner stays up until the
 * person's profile has loaded and they're actually let in — not just until
 * Firebase accepts the password — and every way it can fail ends in a
 * message, never a silent return to an idle button.
 */
export function useAuthController() {
  const setProfile = useAuthStore(state => state.setProfile);
  const signedOutReason = useAuthStore(state => state.signedOutReason);
  const setSignedOutReason = useAuthStore(state => state.setSignedOutReason);
  const [signInError, setSignInError] = useState<string | null>(null);
  const [signingIn, setSigningIn] = useState(false);

  const handleSignIn = useCallback(
    async (email: string, password: string) => {
      setSignInError(null);
      setSignedOutReason(null);
      setSigningIn(true);
      try {
        // No real Firebase project wired up yet (see README "Backend setup") —
        // accept any credentials and fabricate a local profile so the rest of
        // the app is browsable. This branch stops applying the moment
        // HAS_FIREBASE_CONFIG flips true, so it can't linger into production.
        if (!HAS_FIREBASE_CONFIG) {
          setProfile(devProfileFor(email));
          return;
        }
        const user = await signIn(email, password);
        const admission = await admit(user.uid);
        if ('reason' in admission) {
          setSignInError(admission.reason);
          return;
        }
        setProfile(admission.profile);
      } catch (error) {
        setSignInError(error instanceof Error ? friendlySignInError(error.message) : 'Sign-in failed.');
      } finally {
        setSigningIn(false);
      }
    },
    [setProfile, setSignedOutReason]
  );

  const handleSignUp = useCallback(
    async (email: string, password: string, name: string) => {
      setSignInError(null);
      setSignedOutReason(null);
      setSigningIn(true);
      try {
        if (!HAS_FIREBASE_CONFIG) {
          setProfile(devSignupProfileFor(email, name));
          return;
        }

        suppressNextAuthChange = true;
        const user = await signUp(email, password);

        try {
          await createPersonProfile(user.uid, name.trim());
        } catch (profileError) {
          // The Auth account now exists but has no roster doc — the session
          // listener would have nothing to route on. Sign back out so the
          // failure is clean and the same email can be retried, rather than
          // leaving a half-created account stuck logged in.
          suppressNextAuthChange = false;
          await signOutUser().catch(() => {});
          throw profileError;
        }

        const newProfile = await fetchPersonProfile(user.uid);
        setProfile(newProfile);
        registerPush(user.uid);
      } catch (error) {
        setSignInError(error instanceof Error ? friendlySignUpError(error.message) : 'Sign-up failed.');
      } finally {
        setSigningIn(false);
      }
    },
    [setProfile, setSignedOutReason]
  );

  return {
    signIn: handleSignIn,
    signUp: handleSignUp,
    signingIn,
    // A notice from the session (e.g. deactivated) shows until the next attempt replaces it.
    signInError: signInError ?? signedOutReason,
  };
}

/**
 * Not a hook — SignOutButton calls this directly (with the store's setter).
 * Live listeners close first: left open, Firestore rejects them with
 * permission-denied the moment nobody is signed in.
 */
export function performSignOut(setProfile: (profile: PersonProfile | null) => void): Promise<void> {
  stopLiveFeeds();
  if (!HAS_FIREBASE_CONFIG) {
    setProfile(null);
    return Promise.resolve();
  }
  return signOutUser();
}

/** Fabricates a local profile for the no-Firebase-yet sign-in bypass — see handleSignIn above. */
function devProfileFor(email: string): PersonProfile {
  const localPart = email.trim().split('@')[0] || 'Dev User';
  const name = localPart.charAt(0).toUpperCase() + localPart.slice(1);
  const appRole: Role = localPart.toLowerCase().includes('worker') ? 'worker' : 'owner';
  return {
    id: `dev-${localPart.toLowerCase()}`,
    name,
    role: appRole === 'owner' ? 'Site owner' : 'Field worker',
    color: colors.primary,
    appRole,
  };
}

/** Dev-bypass equivalent for sign-up — always a worker, matching the real flow. */
function devSignupProfileFor(email: string, name: string): PersonProfile {
  const localPart = email.trim().split('@')[0] || 'dev-worker';
  return {
    id: `dev-${localPart.toLowerCase()}`,
    name: name.trim() || 'Field worker',
    role: 'Field worker',
    color: colors.worker,
    appRole: 'worker',
  };
}

function friendlySignInError(message: string): string {
  if (
    message.includes('invalid-credential') ||
    message.includes('wrong-password') ||
    message.includes('user-not-found')
  ) {
    return 'Email or password is incorrect.';
  }
  if (message.includes('too-many-requests')) {
    return 'Too many attempts — try again in a bit.';
  }
  if (message.includes('network-request-failed')) {
    return 'No connection — check your internet and try again.';
  }
  return 'Sign-in failed. Please try again.';
}

function friendlySignUpError(message: string): string {
  if (message.includes('email-already-in-use')) {
    return 'An account already exists for that email — try signing in instead.';
  }
  if (message.includes('weak-password')) {
    return 'Password should be at least 6 characters.';
  }
  if (message.includes('invalid-email')) {
    return "That doesn't look like a valid email address.";
  }
  if (message.includes('network-request-failed')) {
    return 'No connection — check your internet and try again.';
  }
  return 'Sign-up failed. Please try again.';
}
