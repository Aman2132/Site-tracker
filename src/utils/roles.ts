import { Role } from '@/types/domain';

/** Superadmin gets everything an owner gets (firestore.rules isOwner() agrees). */
export function hasOwnerAccess(role: Role | undefined): boolean {
  return role === 'owner' || role === 'superadmin';
}

export function roleLabel(role: Role): string {
  if (role === 'superadmin') return 'Superadmin';
  return role === 'owner' ? 'Owner' : 'Worker';
}
