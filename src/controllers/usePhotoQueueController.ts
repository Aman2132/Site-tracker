import { useCallback, useEffect } from 'react';
import { AppState } from 'react-native';

import { logEvent } from '@/api/eventsApi';
import { fetchPhotos, uploadPhotos } from '@/api/photosApi';
import { AUTO_SYNC, HAS_FIREBASE_CONFIG } from '@/constants/config';
import { SEED_PHOTOS } from '@/constants/mockData';
import { listGalleryCaptures } from '@/services/mediaLibraryService';
import { requestGallerySavePermission } from '@/services/permissionsService';
import { loadLocalPhotos, markLocalPhotosSynced, saveLocalPhotos } from '@/services/photoQueueStorage';
import { createThumbnail } from '@/services/thumbnailService';
import { useAuthStore } from '@/store/useAuthStore';
import { selectPendingPhotos, usePhotoStore } from '@/store/usePhotoStore';
import { Photo } from '@/types/domain';
import {
  autoSyncable,
  countBySite,
  mergeById,
  mergePhotoLists,
  photoFromCaptureFileName,
} from '@/utils/photos';

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

/** Ids being uploaded right now. Module-level, so every screen using this controller shares one guard. */
const inFlight = new Set<string>();

/** A small preview for each pending photo (videos get none), keyed by photo id. A failed one is just skipped. */
async function makeThumbnails(photos: Photo[]): Promise<Record<string, string>> {
  const thumbs: Record<string, string> = {};
  for (const photo of photos) {
    if (photo.mediaType === 'video') continue;
    const uri = await createThumbnail(photo.uri);
    if (uri) thumbs[photo.id] = uri;
  }
  return thumbs;
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
  const pendingPhotos = usePhotoStore(selectPendingPhotos);
  const profile = useAuthStore(state => state.profile);
  const workerName = profile?.name;
  const personId = profile?.id;
  const isOwner = profile?.appRole === 'owner';

  const syncStatus = usePhotoStore(state => state.syncStatus);
  const syncing = Object.values(syncStatus).includes('syncing');
  const syncError = Object.values(syncStatus).includes('failed')
    ? 'Upload failed — photos are still saved. Check your connection; it retries automatically, or tap Sync.'
    : null;

  useEffect(() => {
    if (!personId || loadedFor === personId) return;
    (async () => {
      const saved = await loadLocalPhotos(personId);
      const local = mergeById(saved, await recoverFromGallery(personId));
      if (local.length > saved.length) await saveLocalPhotos(personId, local);

      // Without a Firebase project, demo photos stand in for the backend on an empty phone.
      const remote = HAS_FIREBASE_CONFIG
        ? await fetchPhotos(isOwner ? undefined : personId).catch(error => {
            console.warn('[photos] fetch failed —', error);
            return [];
          })
        : local.length === 0
          ? SEED_PHOTOS
          : [];

      // Anything shot while this was loading is already in the store (and on
      // disk) but not in `local` — keep it rather than overwrite it.
      const shotMeanwhile = usePhotoStore.getState().photos.filter(photo => photo.personId === personId);
      setPhotos(mergePhotoLists(mergeById(local, shotMeanwhile), remote), personId);
    })();
  }, [loadedFor, setPhotos, isOwner, personId]);

  /**
   * Uploads these captures one at a time, each marked synced the moment it
   * lands (so a failure part-way never re-uploads the ones already done).
   * Anything already uploading — from a tap, the background retry, or another
   * screen using this controller — is skipped, so a photo is never sent twice.
   */
  const syncPhotos = useCallback(
    async (candidates: Photo[]) => {
      if (!personId) return;
      const { setSyncStatus, markSynced } = usePhotoStore.getState();
      const mine = candidates.filter(photo => !inFlight.has(photo.id));
      mine.forEach(photo => {
        inFlight.add(photo.id);
        setSyncStatus(photo.id, 'syncing');
      });
      const uploaded: Photo[] = [];
      try {
        for (const queued of mine) {
          // Read again: a note may have been added since the list was built.
          const photo = usePhotoStore.getState().photos.find(p => p.id === queued.id) ?? queued;
          // Without a real Firebase project there's nowhere to upload to — just
          // flip the local queue to synced, same as the rest of the static mode.
          if (HAS_FIREBASE_CONFIG) await uploadPhotos([photo], await makeThumbnails([photo]));
          markSynced([photo.id]);
          await markLocalPhotosSynced(personId, [photo.id]);
          setSyncStatus(photo.id, null);
          uploaded.push(photo);
        }
      } catch (error) {
        // Still safe on disk; the failed one is flagged and retried later.
        console.warn('[photos] sync failed —', error);
      } finally {
        // The first one not uploaded is the one that failed; the rest go back to queued.
        const done = new Set(uploaded.map(photo => photo.id));
        const failed = mine.find(photo => !done.has(photo.id));
        mine.forEach(photo => {
          inFlight.delete(photo.id);
          if (!done.has(photo.id)) setSyncStatus(photo.id, photo === failed ? 'failed' : null);
        });
      }
      if (HAS_FIREBASE_CONFIG) {
        // One entry per site, so the dashboard can file each under the right site.
        for (const [siteId, count] of countBySite(uploaded)) {
          logEvent(
            `${count} photo${count > 1 ? 's' : ''} uploaded from ${workerName ?? 'a worker'}`,
            'info',
            {
              type: 'upload',
              personId,
              siteId,
            }
          ).catch(error => console.warn('[photos] activity log failed —', error));
        }
      }
    },
    [workerName, personId]
  );

  const syncNow = useCallback(() => syncPhotos(selectPendingPhotos(usePhotoStore.getState())), [syncPhotos]);

  const syncOne = useCallback(
    (id: string) =>
      syncPhotos(usePhotoStore.getState().photos.filter(photo => photo.id === id && !photo.synced)),
    [syncPhotos]
  );

  // Background upload: shortly after a capture (leaving time to add a note),
  // again on a timer while anything is unsynced (connectivity returning), and
  // the moment the app comes back to the foreground.
  const pendingKey = pendingPhotos.map(photo => photo.id).join(',');
  useEffect(() => {
    if (!personId || loadedFor !== personId || !pendingKey) return;
    const run = () => {
      const { photos: all, noteEditingId } = usePhotoStore.getState();
      syncPhotos(autoSyncable(all, personId, noteEditingId));
    };
    const first = setTimeout(run, AUTO_SYNC.graceMs);
    const retry = setInterval(run, AUTO_SYNC.retryMs);
    const appState = AppState.addEventListener('change', state => state === 'active' && run());
    return () => {
      clearTimeout(first);
      clearInterval(retry);
      appState.remove();
    };
  }, [pendingKey, personId, loadedFor, syncPhotos]);

  return { photos, pendingCount: pendingPhotos.length, syncNow, syncOne, syncing, syncError, syncStatus };
}
