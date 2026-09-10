import { addDoc, collection, getDocs, limit, orderBy, query } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';

import { firestore, storage } from './firebaseClient';

import { Photo } from '@/types/domain';

const PHOTOS_COLLECTION = 'photos';
const RECENT_PHOTOS_LIMIT = 60;

/** One-shot fetch used to seed the Photos screens (live updates aren't needed here — new
 *  photos a worker takes show up immediately from local state; syncing them is what matters). */
export async function fetchPhotos(): Promise<Photo[]> {
  const photosQuery = query(
    collection(firestore, PHOTOS_COLLECTION),
    orderBy('takenAt', 'desc'),
    limit(RECENT_PHOTOS_LIMIT)
  );
  const snapshot = await getDocs(photosQuery);
  return snapshot.docs.map(d => ({ id: d.id, ...(d.data() as Omit<Photo, 'id'>) }));
}

/** Uploads each queued photo's image to Storage, then writes its metadata to Firestore. */
export async function uploadPhotos(photos: Photo[]): Promise<void> {
  for (const photo of photos) {
    const response = await fetch(photo.uri);
    const blob = await response.blob();
    const storageRef = ref(storage, `photos/${photo.personId}/${photo.id}.jpg`);
    await uploadBytes(storageRef, blob);
    const downloadUrl = await getDownloadURL(storageRef);

    await addDoc(collection(firestore, PHOTOS_COLLECTION), {
      uri: downloadUrl,
      lat: photo.lat,
      lng: photo.lng,
      accuracy: photo.accuracy,
      plusCode: photo.plusCode,
      takenAt: photo.takenAt,
      personId: photo.personId,
      task: photo.task,
      synced: true,
    });
  }
}
