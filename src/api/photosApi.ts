import { File, UploadType } from 'expo-file-system';
import { collection, getDocs, limit, orderBy, query, QueryConstraint, where } from 'firebase/firestore';

import { auth, firestore } from './firebaseClient';

import { PHOTO_UPLOAD } from '@/constants/config';
import { Photo } from '@/types/domain';

const PHOTOS_COLLECTION = 'photos';
const RECENT_PHOTOS_LIMIT = 60;

type UploadTarget = { url: string; headers: Record<string, string> };

function isLocalHttpOrigin(origin: string): boolean {
  const host = /^http:\/\/([a-z\d.]+)(?::\d+)?$/i.exec(origin)?.[1]?.toLowerCase();
  if (host === 'localhost' || host === '127.0.0.1') return true;
  if (!host || !/^(?:0|[1-9]\d{0,2})(?:\.(?:0|[1-9]\d{0,2})){3}$/.test(host)) return false;

  const octets = host.split('.').map(Number);
  if (octets.some(octet => octet > 255)) return false;
  const [first, second] = octets;
  return first === 10 || (first === 172 && second >= 16 && second <= 31) || (first === 192 && second === 168);
}

function readTarget(value: unknown): UploadTarget {
  if (
    value == null ||
    typeof value !== 'object' ||
    !('url' in value) ||
    typeof value.url !== 'string' ||
    !value.url.startsWith('https://') ||
    !('headers' in value) ||
    value.headers == null ||
    typeof value.headers !== 'object' ||
    Array.isArray(value.headers) ||
    Object.values(value.headers).some(header => typeof header !== 'string')
  ) {
    throw new Error('The photo service returned invalid upload instructions.');
  }
  return { url: value.url, headers: value.headers as Record<string, string> };
}

async function requestUpload(
  personId: string,
  payload: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const user = auth.currentUser;
  if (!user || user.uid !== personId)
    throw new Error('Sign in as the person who took this photo to sync it.');
  const origin = PHOTO_UPLOAD.apiOrigin.replace(/\/+$/, '');
  const httpsOrigin = /^https:\/\/[^/?#]+$/i.test(origin);
  const localDebugOrigin = __DEV__ && isLocalHttpOrigin(origin);
  if (!httpsOrigin && !localDebugOrigin)
    throw new Error('Use an HTTPS photo server or a local HTTP server in an Android debug build.');
  const token = await user.getIdToken();
  let response: Response;
  try {
    response = await fetch(origin + PHOTO_UPLOAD.endpoint, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new Error('Could not reach the photo upload service.');
  }
  if (!response.ok) throw new Error(`The photo upload service rejected the request (${response.status}).`);
  const result: unknown = await response.json();
  if (result == null || typeof result !== 'object' || Array.isArray(result)) {
    throw new Error('The photo service returned an invalid response.');
  }
  return result as Record<string, unknown>;
}

function readCapture(uri: string) {
  const file = new File(uri);
  if (!file.exists) throw new Error('Could not read the saved capture.');
  const bytes = file.size;
  if (!Number.isSafeInteger(bytes) || bytes <= 0)
    throw new Error('The saved capture is empty or unreadable.');
  return { file, bytes };
}

async function uploadToStorage(target: UploadTarget, file: File): Promise<void> {
  let status: number;
  try {
    // Stream the file from app storage through the native upload task.
    const response = await file.upload(target.url, {
      httpMethod: 'PUT',
      uploadType: UploadType.BINARY_CONTENT,
      headers: target.headers,
    });
    status = response.status;
  } catch {
    // The network error may include the signed URL. Report the failure without it.
    throw new Error('Could not reach photo storage.');
  }
  // A previous attempt may already have uploaded this object. Finalization
  // verifies the object at its authorized key before recording the capture.
  if ((status < 200 || status >= 300) && status !== 412)
    throw new Error(`Photo storage refused the upload (${status}).`);
}

function uploadMetadata(photo: Photo) {
  return {
    lat: photo.lat,
    lng: photo.lng,
    accuracy: photo.accuracy,
    ...(photo.altitude != null ? { altitude: photo.altitude } : {}),
    ...(photo.heading != null ? { heading: photo.heading } : {}),
    plusCode: photo.plusCode,
    takenAt: photo.takenAt,
    ...(photo.personName != null ? { personName: photo.personName } : {}),
    ...(photo.siteId != null ? { siteId: photo.siteId } : {}),
    ...(photo.width != null && photo.height != null ? { width: photo.width, height: photo.height } : {}),
    task: photo.task,
    ...(photo.note ? { note: photo.note } : {}),
    ...(photo.inventoryId ? { inventoryId: photo.inventoryId } : {}),
    ...(photo.durationMs != null ? { durationMs: photo.durationMs } : {}),
  };
}

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

/**
 * Upload each queued capture straight to R2, then ask the photo service to
 * verify the files and save the Firestore record. A failure leaves the local
 * capture queued so it can get fresh URLs and retry.
 */
export async function uploadPhotos(photos: Photo[], thumbUris: Record<string, string> = {}): Promise<void> {
  for (const photo of photos) {
    const mediaType = photo.mediaType ?? 'photo';
    const original = readCapture(photo.uri);
    const thumbUri = mediaType === 'photo' ? thumbUris[photo.id] : undefined;
    const thumbnail = thumbUri ? readCapture(thumbUri) : undefined;
    const capture = {
      captureId: photo.id,
      mediaType,
      originalBytes: original.bytes,
      ...(thumbnail ? { thumbnailBytes: thumbnail.bytes } : {}),
      revision: photo.localStamp?.renderedNote ?? '',
    };
    const prepared = await requestUpload(photo.personId, { action: 'prepare', ...capture });
    if (prepared.completed === true) continue;

    const { uploadWindow } = prepared;
    if (typeof uploadWindow !== 'number' || !Number.isSafeInteger(uploadWindow) || uploadWindow < 0) {
      throw new Error('The photo service returned an invalid upload window.');
    }
    const originalTarget = readTarget(prepared.original);
    const thumbnailTarget = thumbnail ? readTarget(prepared.thumbnail) : undefined;
    await uploadToStorage(originalTarget, original.file);
    if (thumbnail && thumbnailTarget) await uploadToStorage(thumbnailTarget, thumbnail.file);

    const finalized = await requestUpload(photo.personId, {
      action: 'complete',
      ...capture,
      uploadWindow,
      photo: uploadMetadata(photo),
    });
    if (finalized.completed !== true) throw new Error('The photo service did not confirm the upload.');
  }
}
