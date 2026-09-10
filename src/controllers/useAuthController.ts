import { useCallback, useEffect, useState } from 'react';

import { fetchPersonProfile, savePushToken } from '@/api/peopleApi';
import { HAS_FIREBASE_CONFIG } from '@/constants/config';
import { colors } from '@/constants/theme';
import { onAuthChange, signIn, signOutUser } from '@/services/authService';
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

  useEffect(() => {
    return onAuthChange(async firebaseUser => {
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

  const handleSignOut = useCallback(() => performSignOut(setProfile), [setProfile]);

  return {
    profile,
    initializing: profile === undefined,
    signIn: handleSignIn,
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
