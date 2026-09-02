import { create } from 'zustand';

import { Site } from '@/types/domain';

interface SiteState {
  site: Site | null;
  loaded: boolean;
  setSite: (site: Site) => void;
  setGeofenceRadius: (radiusMeters: number) => void;
}

export const useSiteStore = create<SiteState>(set => ({
  site: null,
  loaded: false,
  setSite: site => set({ site, loaded: true }),
  setGeofenceRadius: radiusMeters =>
    set(state => (state.site ? { site: { ...state.site, radius: radiusMeters } } : state)),
}));
