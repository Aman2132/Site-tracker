import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  User as FirebaseUser,
} from 'firebase/auth';

import { auth } from '@/api/firebaseClient';

/**
 * Thin wrapper around Firebase Auth. The owner account and any pre-seeded
 * workers come from scripts/seedFirebase.js; signUp below is the self-serve
 * path anyone can use to create a worker account from the app itself — see
 * firestore.rules for how appRole is pinned to 'worker' for these.
 */

export async function signIn(email: string, password: string): Promise<FirebaseUser> {
  const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
  return credential.user;
}

/** Creates the Firebase Auth account itself. The matching people/{uid}
 *  profile doc is a separate write — see peopleApi.createPersonProfile. */
export async function signUp(email: string, password: string): Promise<FirebaseUser> {
  const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
  return credential.user;
}

export async function signOutUser(): Promise<void> {
  await signOut(auth);
}

/** The signed-in person's email, for display on their Profile tab. */
export function currentUserEmail(): string | null {
  return auth.currentUser?.email ?? null;
}

/** Who is signed in right now, or null. Lets a slow profile load notice it was overtaken by a sign-out. */
export function currentUserId(): string | null {
  return auth.currentUser?.uid ?? null;
}

export function onAuthChange(callback: (user: FirebaseUser | null) => void): () => void {
  return onAuthStateChanged(auth, callback);
}
