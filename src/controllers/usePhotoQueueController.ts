import { useCallback, useEffect, useState } from 'react';

import { logEvent } from '@/api/eventsApi';
import { fetchPhotos, uploadPhotos } from '@/api/photosApi';
import { HAS_FIREBASE_CONFIG } from '@/constants/config';
import { SEED_PHOTOS } from '@/constants/mockData';
import { listGalleryCaptures } from '@/services/mediaLibraryService';
import { requestGallerySavePermission } from '@/services/permissionsService';
import { loadLocalPhotos, markLocalPhotosSynced, saveLocalPhotos } from '@/services/photoQueueStorage';
import { useAuthStore } from '@/store/useAuthStore';
import { selectPendingPhotos, usePhotoStore } from '@/store/usePhotoStore';
import { Photo } from '@/types/domain';
import { mergeById, mergePhotoLists, photoFromCaptureFileName } from '@/utils/photos';

/**
 * This person's captures found in the gallery album — after a reinstall,
 * the only copy left. Empty when there's no gallery access.
 */
async function recoverFromGallery(personId: string): Promise<Photo[]> {
  if (!(await requestGallerySavePermission())) return [];
  const files = await listGalleryCaptures().catch(e => {
    console.warn('[photos] gallery scan failed —', e);
    return [];
  });
  return files
    .map(photoFromCaptureFileName)
    .filter((photo): photo is Photo => photo !== null && photo.personId === personId);
}

/**
 * Shared by the owner Photos screen and the worker Queue screen: shows every
 * capture taken on this phone by the signed-in person — from their own saved
 * list, plus anything in the gallery album that list lost (a reinstall) —
 * alongside what the backend has, and exposes sync-to-backend.
 *
 * Captures are saved the moment they're taken (usePhotoCaptureController),
 * per person, so nothing here depends on this screen having been opened.
 *
 * Backend visibility is role-scoped: an owner fetches every recent photo, a
 * worker fetches only their own. firestore.rules enforces the same split
 * server-side, so a worker cannot widen it by tampering with the client.
 */
export function usePhotoQueueController() {
  const photos = usePhotoStore(state => state.photos);
  const loadedFor = usePhotoStore(state => state.loadedFor);
  const setPhotos = usePhotoStore(state => state.setPhotos);
  const markAllSynced = usePhotoStore(state => state.markAllSynced);
  const pendingPhotos = usePhotoStore(selectPendingPhotos);
  const profile = useAuthStore(state => state.profile);
  const workerName = profile?.name;
  const personId = profile?.id;
  const isOwner = profile?.appRole === 'owner';

  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  useEffect(() => {
    if (!personId || loadedFor === personId) return;
    (async () => {
      const saved = await loadLocalPhotos(personId);
      const local = mergeById(saved, await recoverFromGallery(personId));
      if (local.length > saved.length) await saveLocalPhotos(personId, local);

      // Without a Firebase project, demo photos stand in for the backend on an empty phone.
      const remote = HAS_FIREBASE_CONFIG
        ? await fetchPhotos(isOwner ? undefined : personId).catch(() => [])
        : local.length === 0
          ? SEED_PHOTOS
          : [];

      // Anything shot while this was loading is already in the store (and on
      // disk) but not in `local` — keep it rather than overwrite it.
      const shotMeanwhile = usePhotoStore.getState().photos.filter(photo => photo.personId === personId);
      setPhotos(mergePhotoLists(mergeById(local, shotMeanwhile), remote), personId);
    })();
  }, [loadedFor, setPhotos, isOwner, personId]);

  const syncNow = useCallback(async () => {
    if (pendingPhotos.length === 0 || syncing || !personId) return;
    setSyncError(null);
    setSyncing(true);
    try {
      // Without a real Firebase project there's nowhere to upload to — just
      // flip the local queue to synced, same as the rest of the static mode.
      if (HAS_FIREBASE_CONFIG) await uploadPhotos(pendingPhotos);
      markAllSynced();
      await markLocalPhotosSynced(
        personId,
        pendingPhotos.map(photo => photo.id)
      );
      if (HAS_FIREBASE_CONFIG) {
        logEvent(
          `${pendingPhotos.length} photo${pendingPhotos.length > 1 ? 's' : ''} uploaded from ${workerName ?? 'a worker'}`,
          'info'
        ).catch(() => {});
      }
    } catch {
      // The queue is left untouched, so the photos are still safe on disk and
      // the worker can retry — but they need to know it didn't go through.
      setSyncError('Upload failed — photos are still saved. Check your connection and tap Sync again.');
    } finally {
      setSyncing(false);
    }
  }, [pendingPhotos, markAllSynced, workerName, syncing, personId]);

  return { photos, pendingCount: pendingPhotos.length, syncNow, syncing, syncError };
}
