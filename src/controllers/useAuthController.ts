import { useCallback, useEffect, useRef, useState } from 'react';

import { createPersonProfile, fetchPersonProfile, savePushToken } from '@/api/peopleApi';
import { HAS_FIREBASE_CONFIG } from '@/constants/config';
import { colors } from '@/constants/theme';
import { onAuthChange, signIn, signOutUser, signUp } from '@/services/authService';
import { registerForPushNotifications } from '@/services/pushService';
import { useAuthStore } from '@/store/useAuthStore';
import { PersonProfile, Role } from '@/types/domain';

/**
 * Wires Firebase's auth state to the app: on sign-in, resolves the
 * matching people/{uid} Firestore doc to learn the person's name and
 * appRole (owner vs worker) — that's what RootNavigator branches on.
 */
export function useAuthController() {
  const profile = useAuthStore(state => state.profile);
  const setProfile = useAuthStore(state => state.setProfile);
  const [signInError, setSignInError] = useState<string | null>(null);
  const [signingIn, setSigningIn] = useState(false);

  // handleSignUp writes the new profile itself, right after creating the
  // Auth account, and calls setProfile with the result directly. Without
  // this flag the shared onAuthChange listener below — which fires the
  // instant the account exists, before that profile write has happened —
  // would read a still-missing people/{uid} doc, get null back, and bounce
  // the brand-new user to the login screen for a beat. One signup only ever
  // triggers one extra auth-state event, so a single-shot flag is enough.
  const suppressNextAuthChangeRef = useRef(false);

  useEffect(() => {
    return onAuthChange(async firebaseUser => {
      if (suppressNextAuthChangeRef.current) {
        suppressNextAuthChangeRef.current = false;
        return;
      }
      if (!firebaseUser) {
        setProfile(null);
        return;
      }
      const personProfile = await fetchPersonProfile(firebaseUser.uid).catch(() => null);
      setProfile(personProfile);

      registerForPushNotifications()
        .then(token => (token ? savePushToken(firebaseUser.uid, token) : undefined))
        .catch(() => {});
    });
  }, [setProfile]);

  const handleSignIn = useCallback(
    async (email: string, password: string) => {
      setSignInError(null);
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
        await signIn(email, password);
      } catch (error) {
        setSignInError(error instanceof Error ? friendlySignInError(error.message) : 'Sign-in failed.');
      } finally {
        setSigningIn(false);
      }
    },
    [setProfile]
  );

  const handleSignUp = useCallback(
    async (email: string, password: string, name: string) => {
      setSignInError(null);
      setSigningIn(true);
      try {
        if (!HAS_FIREBASE_CONFIG) {
          setProfile(devSignupProfileFor(email, name));
          return;
        }

        suppressNextAuthChangeRef.current = true;
        const user = await signUp(email, password);

        try {
          await createPersonProfile(user.uid, name.trim());
        } catch (profileError) {
          // The Auth account now exists but has no roster doc — the shared
          // listener would have nothing to route on. Sign back out so the
          // failure is clean and the same email can be retried, rather than
          // leaving a half-created account stuck logged in.
          suppressNextAuthChangeRef.current = false;
          await signOutUser().catch(() => {});
          throw profileError;
        }

        const newProfile = await fetchPersonProfile(user.uid);
        setProfile(newProfile);

        registerForPushNotifications()
          .then(token => (token ? savePushToken(user.uid, token) : undefined))
          .catch(() => {});
      } catch (error) {
        setSignInError(error instanceof Error ? friendlySignUpError(error.message) : 'Sign-up failed.');
      } finally {
        setSigningIn(false);
      }
    },
    [setProfile]
  );

  const handleSignOut = useCallback(() => performSignOut(setProfile), [setProfile]);

  return {
    profile,
    initializing: profile === undefined,
    signIn: handleSignIn,
    signUp: handleSignUp,
    signOut: handleSignOut,
    signingIn,
    signInError,
  };
}

/**
 * Not a hook — SignOutButton calls this directly (with the store's setter)
 * instead of remounting the whole controller, which would open a second
 * onAuthChange subscription alongside RootNavigator's.
 */
export function performSignOut(setProfile: (profile: PersonProfile | null) => void): Promise<void> {
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
