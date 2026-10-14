import { create } from 'zustand';

import { ActiveShift, Site } from '@/types/domain';

interface ShiftState {
  /** The current check-in, or null when checked out. */
  active: ActiveShift | null;
  /** Sites this person can check in at (their assigned ones). */
  sites: Site[];
  /** False until the saved shift has been read from the phone. */
  loaded: boolean;
  setActive: (active: ActiveShift | null) => void;
  setSites: (sites: Site[]) => void;
  setLoaded: (loaded: boolean) => void;
}

export const useShiftStore = create<ShiftState>(set => ({
  active: null,
  sites: [],
  loaded: false,
  setActive: active => set({ active }),
  setSites: sites => set({ sites }),
  setLoaded: loaded => set({ loaded }),
}));
