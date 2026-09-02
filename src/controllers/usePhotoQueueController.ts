import { useCallback, useEffect } from 'react';

import { fetchPhotos, uploadPhotos } from '@/api/photosApi';
import { loadQueuedPhotos, saveQueuedPhotos } from '@/services/photoQueueStorage';
import { useEventStore } from '@/store/useEventStore';
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
  const addEvent = useEventStore(state => state.addEvent);

  useEffect(() => {
    wirePersistenceOnce();
    if (loaded) return;
    (async () => {
      const queuedOnDisk = await loadQueuedPhotos();
      if (queuedOnDisk && queuedOnDisk.length > 0) {
        setPhotos(queuedOnDisk);
      } else {
        setPhotos(await fetchPhotos());
      }
    })();
  }, [loaded, setPhotos]);

  const syncNow = useCallback(async () => {
    if (pendingPhotos.length === 0) return;
    await uploadPhotos(pendingPhotos);
    markAllSynced();
    addEvent(
      `${pendingPhotos.length} photo${pendingPhotos.length > 1 ? 's' : ''} uploaded from Suryakant`,
      'info'
    );
  }, [pendingPhotos, markAllSynced, addEvent]);

  return { photos, pendingCount: pendingPhotos.length, syncNow };
}
