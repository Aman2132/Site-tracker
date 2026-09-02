import { create } from 'zustand';

import { Role } from '@/types/domain';

/**
 * Which half of the app is showing. Stands in for real auth/role lookup —
 * everything downstream (navigation, screens) already reads role from here,
 * so swapping in a login flow only means changing how `setRole` gets called.
 */
interface RoleState {
  role: Role;
  setRole: (role: Role) => void;
}

export const useRoleStore = create<RoleState>(set => ({
  role: 'owner',
  setRole: role => set({ role }),
}));
