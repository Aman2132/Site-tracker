import { withNetworkDelay } from './mockNetwork';

import { SEED_PHOTOS } from '@/constants/mockData';
import { Photo } from '@/types/domain';

export async function fetchPhotos(): Promise<Photo[]> {
  return withNetworkDelay(SEED_PHOTOS.map(p => ({ ...p })));
}

/** Uploads queued photos (with their burned-in EXIF GPS) to the backend. */
export async function uploadPhotos(_photos: Photo[]): Promise<void> {
  return withNetworkDelay(undefined);
}
