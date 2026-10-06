import { addDoc, collection, doc, updateDoc } from 'firebase/firestore';

import { firestore } from './firebaseClient';

import { SessionEndReason } from '@/types/domain';

const SESSIONS_COLLECTION = 'sessions';

/** Opens a session (check-in or resume) and returns its id, which closeSession needs later. */
export async function openSession(personId: string, siteId: string, start: number): Promise<string> {
  const ref = await addDoc(collection(firestore, SESSIONS_COLLECTION), { personId, siteId, start });
  return ref.id;
}

/** Closes a session (check-out or pause). firestore.rules only lets the owner of the session do this, once. */
export async function closeSession(sessionId: string, end: number, endReason: SessionEndReason): Promise<void> {
  await updateDoc(doc(firestore, SESSIONS_COLLECTION, sessionId), { end, endReason });
}
