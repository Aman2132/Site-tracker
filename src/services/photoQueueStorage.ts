import AsyncStorage from '@react-native-async-storage/async-storage';

import { Photo } from '@/types/domain';

/**
 * Typed AsyncStorage wrapper for the offline photo queue. Kept as a thin
 * service so usePhotoStore's persistence concern doesn't leak parsing/
 * serialization details into the store itself.
 */

const PHOTO_QUEUE_KEY = 'photoQueue';

export async function loadQueuedPhotos(): Promise<Photo[] | null> {
  const raw = await AsyncStorage.getItem(PHOTO_QUEUE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Photo[];
  } catch {
    return null;
  }
}

export async function saveQueuedPhotos(photos: Photo[]): Promise<void> {
  await AsyncStorage.setItem(PHOTO_QUEUE_KEY, JSON.stringify(photos)).catch(() => {});
}
