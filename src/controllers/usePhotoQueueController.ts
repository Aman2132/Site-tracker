import { useCallback, useEffect } from 'react';

import { logEvent } from '@/api/eventsApi';
import { fetchPhotos, uploadPhotos } from '@/api/photosApi';
import { HAS_FIREBASE_CONFIG } from '@/constants/config';
import { SEED_PHOTOS } from '@/constants/mockData';
import { loadQueuedPhotos, saveQueuedPhotos } from '@/services/photoQueueStorage';
import { useAuthStore } from '@/store/useAuthStore';
import { selectPendingPhotos, usePhotoStore } from '@/store/usePhotoStore';

let persistenceWired = false;

/** Mirrors the photo queue to disk on every change. Wired once per app run. */
function wirePersistenceOnce(): void {
  if (persistenceWired) return;
  persistenceWired = true;
  usePhotoStore.subscribe(state => {
    saveQueuedPhotos(state.photos);
  });
}

/**
 * Shared by the owner Photos screen and the worker Queue screen: loads the
 * photo queue (resuming an offline session from disk, or seeding demo data
 * on first run) and exposes sync-to-backend.
 */
export function usePhotoQueueController() {
  const photos = usePhotoStore(state => state.photos);
  const loaded = usePhotoStore(state => state.loaded);
  const setPhotos = usePhotoStore(state => state.setPhotos);
  const markAllSynced = usePhotoStore(state => state.markAllSynced);
  const pendingPhotos = usePhotoStore(selectPendingPhotos);
  const workerName = useAuthStore(state => state.profile?.name);

  useEffect(() => {
    wirePersistenceOnce();
    if (loaded) return;
    (async () => {
      const queuedOnDisk = await loadQueuedPhotos();
      if (queuedOnDisk && queuedOnDisk.length > 0) {
        setPhotos(queuedOnDisk);
      } else if (!HAS_FIREBASE_CONFIG) {
        setPhotos(SEED_PHOTOS);
      } else {
        setPhotos(await fetchPhotos());
      }
    })();
  }, [loaded, setPhotos]);

  const syncNow = useCallback(async () => {
    if (pendingPhotos.length === 0) return;
    // Without a real Firebase project there's nowhere to upload to — just
    // flip the local queue to synced, same as the rest of the static mode.
    if (HAS_FIREBASE_CONFIG) await uploadPhotos(pendingPhotos);
    markAllSynced();
    if (HAS_FIREBASE_CONFIG) {
      logEvent(
        `${pendingPhotos.length} photo${pendingPhotos.length > 1 ? 's' : ''} uploaded from ${workerName ?? 'a worker'}`,
        'info'
      ).catch(() => {});
    }
  }, [pendingPhotos, markAllSynced, workerName]);

  return { photos, pendingCount: pendingPhotos.length, syncNow };
}
