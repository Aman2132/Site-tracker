import {
  addDoc,
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  QueryConstraint,
  where,
} from 'firebase/firestore';

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

/**
 * One-shot fetch used to seed the Photos screens (live updates aren't needed here — new
 * photos a worker takes show up immediately from local state; syncing them is what matters).
 *
 * `personId` scopes the result to one worker. It is not optional in
 * practice: firestore.rules only lets the owner read the collection
 * unscoped, so a worker calling this without a personId gets a
 * permission-denied rather than everyone's photos.
 */
export async function fetchPhotos(personId?: string): Promise<Photo[]> {
  const constraints: QueryConstraint[] = [orderBy('takenAt', 'desc'), limit(RECENT_PHOTOS_LIMIT)];
  if (personId) constraints.unshift(where('personId', '==', personId));

  const snapshot = await getDocs(query(collection(firestore, PHOTOS_COLLECTION), ...constraints));
  return snapshot.docs.map(d => ({ id: d.id, ...(d.data() as Omit<Photo, 'id'>) }));
}

/** Uploads each queued photo or video to Supabase Storage, then writes its metadata to Firestore. */
export async function uploadPhotos(photos: Photo[]): Promise<void> {
  for (const photo of photos) {
    // arrayBuffer(), not blob() — RN's Blob polyfill silently truncates
    // large files on Android, arrayBuffer() doesn't have that problem. It
    // reads the whole file into memory, which is why videos are length-capped
    // (CAMERA.maxVideoSeconds) until uploads can stream.
    const response = await fetch(photo.uri);
    const body = await response.arrayBuffer();
    const isVideo = photo.mediaType === 'video';
    const path = `${photo.personId}/${photo.id}.${isVideo ? 'mp4' : 'jpg'}`;

    const { error: uploadError } = await supabase.storage
      .from(PHOTOS_BUCKET)
      .upload(path, body, { contentType: isVideo ? 'video/mp4' : 'image/jpeg', upsert: true });
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
      mediaType: photo.mediaType ?? 'photo',
      // Firestore rejects `undefined` field values outright, so only send a
      // duration when there is one (photos have none).
      ...(photo.durationMs != null ? { durationMs: photo.durationMs } : {}),
      synced: true,
    });
  }
}
