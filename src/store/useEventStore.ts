import { create } from 'zustand';

import { AppEvent } from '@/types/domain';

interface EventState {
  events: AppEvent[];
  loaded: boolean;
  setEvents: (events: AppEvent[]) => void;
}

export const useEventStore = create<EventState>(set => ({
  events: [],
  loaded: false,
  setEvents: events => set({ events, loaded: true }),
}));
