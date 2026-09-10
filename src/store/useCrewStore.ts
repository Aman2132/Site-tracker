import { create } from 'zustand';

import { Person, TrackedFix } from '@/types/domain';

interface CrewState {
  people: Person[];
  loaded: boolean;
  setPeople: (people: Person[]) => void;
  updatePersonPosition: (personId: string, fix: TrackedFix) => void;
}

export const useCrewStore = create<CrewState>(set => ({
  people: [],
  loaded: false,
  setPeople: people => set({ people, loaded: true }),
  updatePersonPosition: (personId, fix) =>
    set(state => ({
      people: state.people.map(person =>
        person.id === personId ? { ...person, ...fix, lastFixAt: Date.now() } : person
      ),
    })),
}));
