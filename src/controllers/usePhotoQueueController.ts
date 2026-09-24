import { useCallback, useEffect, useState } from 'react';

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
 *
 * Visibility is role-scoped: an owner fetches every recent photo, a worker
 * fetches only their own. firestore.rules enforces the same split server-
 * side, so a worker cannot widen it by tampering with the client.
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
    wirePersistenceOnce();
    if (!personId || loadedFor === personId) return;
    (async () => {
      // Anything still unsynced on this device belongs in the list regardless
      // of what the backend knows — it hasn't reached the backend yet. Other
      // people's leftovers don't: a shared handset must not show worker A's
      // queue to worker B.
      const pendingOnDisk =
        (await loadQueuedPhotos())?.filter(photo => !photo.synced && photo.personId === personId) ?? [];
      if (!HAS_FIREBASE_CONFIG) {
        setPhotos(pendingOnDisk.length > 0 ? pendingOnDisk : SEED_PHOTOS, personId);
        return;
      }
      const remote = await fetchPhotos(isOwner ? undefined : personId).catch(() => []);
      setPhotos([...pendingOnDisk, ...remote], personId);
    })();
  }, [loadedFor, setPhotos, isOwner, personId]);

  const syncNow = useCallback(async () => {
    if (pendingPhotos.length === 0 || syncing) return;
    setSyncError(null);
    setSyncing(true);
    try {
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
    } catch {
      // The queue is left untouched, so the photos are still safe on disk and
      // the worker can retry — but they need to know it didn't go through.
      setSyncError('Upload failed — photos are still saved. Check your connection and tap Sync again.');
    } finally {
      setSyncing(false);
    }
  }, [pendingPhotos, markAllSynced, workerName, syncing]);

  return { photos, pendingCount: pendingPhotos.length, syncNow, syncing, syncError };
}
