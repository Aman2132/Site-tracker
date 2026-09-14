import { addDoc, collection, getDocs, limit, orderBy, query } from 'firebase/firestore';

import { firestore } from './firebaseClient';
import { supabase } from './supabaseClient';

import { Photo } from '@/types/domain';

const PHOTOS_COLLECTION = 'photos';
const RECENT_PHOTOS_LIMIT = 60;

// Supabase Storage bucket — create it once in the Supabase dashboard
// (Storage -> New bucket -> name it "Photos", mark it Public so
// getPublicUrl() below resolves to a working image URL). Bucket names are
// case-sensitive; this must match exactly what's in the Supabase dashboard.
const PHOTOS_BUCKET = 'Photos';

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

/** Uploads each queued photo's image to Supabase Storage, then writes its metadata to Firestore. */
export async function uploadPhotos(photos: Photo[]): Promise<void> {
  for (const photo of photos) {
    // arrayBuffer(), not blob() — RN's Blob polyfill silently truncates
    // large images on Android, arrayBuffer() doesn't have that problem.
    const response = await fetch(photo.uri);
    const body = await response.arrayBuffer();
    const path = `${photo.personId}/${photo.id}.jpg`;

    const { error: uploadError } = await supabase.storage
      .from(PHOTOS_BUCKET)
      .upload(path, body, { contentType: 'image/jpeg', upsert: true });
    if (uploadError) throw uploadError;

    const {
      data: { publicUrl },
    } = supabase.storage.from(PHOTOS_BUCKET).getPublicUrl(path);

    await addDoc(collection(firestore, PHOTOS_COLLECTION), {
      uri: publicUrl,
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
