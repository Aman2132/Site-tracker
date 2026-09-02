import { create } from 'zustand';

import { AppEvent, EventKind } from '@/types/domain';

interface EventState {
  events: AppEvent[];
  loaded: boolean;
  setEvents: (events: AppEvent[]) => void;
  addEvent: (text: string, kind: EventKind) => void;
}

export const useEventStore = create<EventState>(set => ({
  events: [],
  loaded: false,
  setEvents: events => set({ events, loaded: true }),
  addEvent: (text, kind) =>
    set(state => ({
      events: [{ id: `local-${Date.now()}`, at: Date.now(), text, kind }, ...state.events],
    })),
}));
