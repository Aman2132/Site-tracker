import { collection, getDocs, query, where } from 'firebase/firestore';

import { firestore } from './firebaseClient';

import { DeletedPhoto } from '@/types/domain';

/**
 * Notes the dashboard leaves when it deletes a photo (see deletePhotoCompletely
 * in the dashboard's lib/photoServer.ts). Each phone reads its own person's
 * notes and removes its copy of those photos. The query must filter on
 * personId, which firestore.rules requires for anyone who isn't an owner.
 */
const DELETED_PHOTOS_COLLECTION = 'deletedPhotos';

export async function fetchDeletedPhotos(personId: string): Promise<DeletedPhoto[]> {
  const snapshot = await getDocs(
    query(collection(firestore, DELETED_PHOTOS_COLLECTION), where('personId', '==', personId))
  );
  return snapshot.docs.map(d => {
    const data = d.data() as { personId: string; takenAt: number };
    return { id: d.id, personId: data.personId, takenAt: data.takenAt };
  });
}
