import { create } from 'zustand';

import { PersonProfile } from '@/types/domain';

interface AuthState {
  /** null once resolved-and-signed-out; undefined while still checking. */
  profile: PersonProfile | null | undefined;
  setProfile: (profile: PersonProfile | null) => void;
  /** Why the app signed someone out on its own (e.g. a deactivated account) — shown on the login screen. */
  signedOutReason: string | null;
  setSignedOutReason: (reason: string | null) => void;
}

export const useAuthStore = create<AuthState>(set => ({
  profile: undefined,
  setProfile: profile => set({ profile }),
  signedOutReason: null,
  setSignedOutReason: signedOutReason => set({ signedOutReason }),
}));
