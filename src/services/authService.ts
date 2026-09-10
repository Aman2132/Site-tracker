import { onAuthStateChanged, signInWithEmailAndPassword, signOut, User as FirebaseUser } from 'firebase/auth';

import { auth } from '@/api/firebaseClient';

/**
 * Thin wrapper around Firebase Auth. Sign-in only — accounts are created
 * for employees ahead of time (see scripts/seedFirebase.js), not
 * self-registered, since this is a closed roster of ~20-30 known workers.
 */

export async function signIn(email: string, password: string): Promise<void> {
  await signInWithEmailAndPassword(auth, email.trim(), password);
}

export async function signOutUser(): Promise<void> {
  await signOut(auth);
}

export function onAuthChange(callback: (user: FirebaseUser | null) => void): () => void {
  return onAuthStateChanged(auth, callback);
}
