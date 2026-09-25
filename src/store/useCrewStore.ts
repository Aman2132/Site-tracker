import { create } from 'zustand';

import { GeoPoint, Person, TrackedFix } from '@/types/domain';

interface CrewState {
  people: Person[];
  loaded: boolean;
  /** Recent positions per person id, oldest first — drawn as motion trails on the live map. */
  trails: Record<string, GeoPoint[]>;
  setPeople: (people: Person[]) => void;
  setTrails: (trails: Record<string, GeoPoint[]>) => void;
  updatePersonPosition: (personId: string, fix: TrackedFix) => void;
}

export const useCrewStore = create<CrewState>(set => ({
  people: [],
  loaded: false,
  trails: {},
  setPeople: people => set({ people, loaded: true }),
  setTrails: trails => set({ trails }),
  updatePersonPosition: (personId, fix) =>
    set(state => ({
      people: state.people.map(person =>
        person.id === personId ? { ...person, ...fix, lastFixAt: Date.now() } : person
      ),
    })),
}));
