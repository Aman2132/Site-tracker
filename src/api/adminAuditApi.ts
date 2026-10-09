import { addDoc, collection } from 'firebase/firestore';

import { firestore } from './firebaseClient';

export interface AdminAuditDetails {
  targetType?: string;
  targetId?: string;
  note?: string;
}

/**
 * One line in the superadmin-only audit trail (`adminAudit`), written as the
 * signed-in owner after each owner edit. firestore.rules allows exactly these
 * keys. Never throws: a failed log must not undo or block the edit it records.
 */
export async function logAdminAction(
  action: string,
  details: AdminAuditDetails,
  actor: { id: string; name: string }
): Promise<void> {
  const note = details.note?.trim();
  const present = Object.fromEntries(
    Object.entries({ ...details, note }).filter(([, value]) => value != null && value !== '')
  );
  try {
    await addDoc(collection(firestore, 'adminAudit'), {
      actorId: actor.id,
      actorName: actor.name,
      action: action.slice(0, 200),
      ...present,
      ...(note ? { note: note.slice(0, 500) } : {}),
      at: Date.now(),
    });
  } catch (error) {
    console.warn('[audit] admin action log failed —', error);
  }
}
