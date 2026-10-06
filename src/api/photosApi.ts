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

/*
 * 🚨🚨🚨 READ BEFORE ADDING ANY "DELETE PHOTO" CODE 🚨🚨🚨
 *
 * ❗ A photo is TWO files + ONE Firestore record, and all three must be deleted
 *    together: the original file, the `_thumb.jpg` thumbnail, AND the Firestore
 *    record (it holds the path / URL). Delete only one and you leave a BROKEN
 *    IMAGE (record without file) or an ORPHAN FILE (file without record).
 *
 *    The project owner left this note for themselves.
 *    Checklist: docs/READ-BEFORE-BUILDING-PHOTO-DELETION.md
 *    Also: firestore.rules currently blocks deleting photos — that must change.
 */

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

/** Uploads one small preview next to the original and returns its public URL. */
async function uploadThumbnail(photo: Photo, thumbUri: string): Promise<string> {
  const body = await (await fetch(thumbUri)).arrayBuffer();
  const path = `${photo.personId}/${photo.id}_thumb.jpg`;
  const { error } = await supabase.storage.from(PHOTOS_BUCKET).upload(path, body, { contentType: 'image/jpeg', upsert: true });
  if (error) throw error;
  return supabase.storage.from(PHOTOS_BUCKET).getPublicUrl(path).data.publicUrl;
}

/**
 * Uploads each queued photo or video to Supabase Storage, then writes its
 * metadata to Firestore. `thumbUris` maps a photo id to a small local preview
 * (made on the phone, see thumbnailService) which is uploaded alongside it so
 * the admin dashboard can show a gallery without pulling every original.
 */
export async function uploadPhotos(photos: Photo[], thumbUris: Record<string, string> = {}): Promise<void> {
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
    const thumbUri = thumbUris[photo.id];
    const thumbUrl = thumbUri ? await uploadThumbnail(photo, thumbUri) : undefined;

    await addDoc(collection(firestore, PHOTOS_COLLECTION), {
      uri: publicUrl,
      lat: photo.lat,
      lng: photo.lng,
      accuracy: photo.accuracy,
      plusCode: photo.plusCode,
      takenAt: photo.takenAt,
      personId: photo.personId,
      // Firestore rejects `undefined`, so only send it when the capture has one
      // (older queued photos from before this field existed won't).
      ...(photo.personName != null ? { personName: photo.personName } : {}),
      ...(photo.siteId != null ? { siteId: photo.siteId } : {}),
      ...(photo.width != null && photo.height != null ? { width: photo.width, height: photo.height } : {}),
      ...(thumbUrl ? { thumbUrl } : {}),
      task: photo.task,
      mediaType: photo.mediaType ?? 'photo',
      // Firestore rejects `undefined` field values outright, so only send a
      // duration when there is one (photos have none).
      ...(photo.durationMs != null ? { durationMs: photo.durationMs } : {}),
      synced: true,
    });
  }
}
