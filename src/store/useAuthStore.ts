import { create } from 'zustand';

import { PersonProfile } from '@/types/domain';

interface AuthState {
  /** null once resolved-and-signed-out; undefined while still checking. */
  profile: PersonProfile | null | undefined;
  setProfile: (profile: PersonProfile | null) => void;
}

export const useAuthStore = create<AuthState>(set => ({
  profile: undefined,
  setProfile: profile => set({ profile }),
}));
