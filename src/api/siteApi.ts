import { doc, getDoc, updateDoc } from 'firebase/firestore';

import { firestore } from './firebaseClient';

import { Site } from '@/types/domain';

/** Single-site deployment for now — one fixed doc. Swap for a real site picker later. */
const SITE_DOC_ID = 'default';

export async function fetchSite(): Promise<Site> {
  const snap = await getDoc(doc(firestore, 'sites', SITE_DOC_ID));
  if (!snap.exists()) {
    throw new Error('No site configured yet — create sites/default in Firestore.');
  }
  return snap.data() as Site;
}

export async function updateGeofenceRadius(radiusMeters: number): Promise<void> {
  await updateDoc(doc(firestore, 'sites', SITE_DOC_ID), { radius: radiusMeters });
}
