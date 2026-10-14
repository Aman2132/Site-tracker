import { create } from 'zustand';

import { InventoryEntry } from '@/types/domain';

interface InventoryState {
  /** This person's entries as the server has them. */
  entries: InventoryEntry[];
  /** Saved on the phone, not yet confirmed by the server. */
  outbox: InventoryEntry[];
  /** False until the first server answer (or failure). */
  loaded: boolean;
  setEntries: (entries: InventoryEntry[]) => void;
  setOutbox: (outbox: InventoryEntry[]) => void;
  setLoaded: (loaded: boolean) => void;
}

export const useInventoryStore = create<InventoryState>(set => ({
  entries: [],
  outbox: [],
  loaded: false,
  setEntries: entries => set({ entries }),
  setOutbox: outbox => set({ outbox }),
  setLoaded: loaded => set({ loaded }),
}));
