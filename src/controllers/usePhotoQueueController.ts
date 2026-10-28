import { useCallback, useEffect } from 'react';
import { AppState } from 'react-native';

import { fetchDeletedPhotos } from '@/api/deletedPhotosApi';
import { logEvent } from '@/api/eventsApi';
import { fetchPhotos, uploadPhotos } from '@/api/photosApi';
import { AUTO_SYNC, HAS_FIREBASE_CONFIG, THUMBNAIL_CACHE } from '@/constants/config';
import { SEED_PHOTOS } from '@/constants/mockData';
import { deleteLocalFiles } from '@/services/localMediaService';
import { deleteLocalPhotos, loadLocalPhotos, markLocalPhotosSynced } from '@/services/photoQueueStorage';
import {
  deleteCachedRemotePhotos,
  loadCachedRemotePhotos,
  replaceCachedRemotePhotos,
  setCachedRemoteThumbs,
} from '@/services/remotePhotoCache';
import { downloadThumbnail } from '@/services/thumbnailCacheService';
import { createThumbnail } from '@/services/thumbnailService';
import { useAuthStore } from '@/store/useAuthStore';
import { selectPendingPhotos, usePhotoStore } from '@/store/usePhotoStore';
import { DeletedPhoto, Photo } from '@/types/domain';
import {
  autoSyncable,
  captureKey,
  countBySite,
  isLocalPhotoId,
  mergeById,
  mergePhotoLists,
  splitDeleted,
} from '@/utils/photos';
import { hasOwnerAccess } from '@/utils/roles';

/** Ids being uploaded right now. Module-level, so every screen using this controller shares one guard. */
const inFlight = new Set<string>();

/**
 * A small preview for each pending photo (videos get none), keyed by photo id.
 * One already saved at capture time is reused; otherwise it is made now.
 * A failed one is just skipped.
 */
async function makeThumbnails(photos: Photo[]): Promise<Record<string, string>> {
  const thumbs: Record<string, string> = {};
  for (const photo of photos) {
    if (photo.mediaType === 'video') continue;
    const uri = photo.localThumbUri ?? (await createThumbnail(photo.uri));
    if (uri) thumbs[photo.id] = uri;
  }
  return thumbs;
}

/**
 * Takes the photos an admin deleted out of this list and off the phone: their
 * files, their saved rows and their cached previews. Returns the photos that
 * remain. Deletes only photos that already synced (see splitDeleted).
 */
async function dropDeleted(personId: string, photos: Photo[], deleted: DeletedPhoto[]): Promise<Photo[]> {
  const { keep, gone } = splitDeleted(photos, deleted);
  if (gone.length === 0) return keep;
  const ids = gone.map(photo => photo.id);
  deleteLocalFiles(gone.flatMap(photo => [photo.uri, photo.localThumbUri]));
  await deleteLocalPhotos(personId, ids);
  await deleteCachedRemotePhotos(personId, ids);
  return keep;
}

/** True while a deletion check is running, so screens sharing this controller don't repeat it. */
let checkingDeleted = false;

/**
 * Asks the backend what was deleted since, and removes those photos from the
 * list and the phone. Quiet when offline: a failed check is retried next time.
 */
async function removeDeletedPhotos(personId: string): Promise<void> {
  if (checkingDeleted) return;
  checkingDeleted = true;
  try {
    const deleted = await fetchDeletedPhotos(personId);
    const { photos, setPhotos, loadedFor } = usePhotoStore.getState();
    if (loadedFor !== personId) return;
    const keep = await dropDeleted(personId, photos, deleted);
    if (keep.length !== photos.length) setPhotos(keep, personId);
  } catch (error) {
    console.warn('[photos] deletion check failed —', error);
  } finally {
    checkingDeleted = false;
  }
}

/**
 * Saves previews of backend-only photos on the phone (newest first, capped), so
 * their list shows offline. Runs after the list is on screen; a failed
 * download is skipped and tried again on the next load.
 */
async function cacheThumbnails(personId: string, photos: Photo[]): Promise<void> {
  const wanted = photos
    .filter(photo => photo.thumbUrl && !photo.localThumbUri && photo.mediaType !== 'video')
    .slice(0, THUMBNAIL_CACHE.maxFiles);
  const saved: Record<string, string> = {};
  for (const photo of wanted) {
    const uri = await downloadThumbnail(photo.id, photo.thumbUrl as string);
    if (uri) saved[photo.id] = uri;
  }
  if (Object.keys(saved).length === 0) return;
  await setCachedRemoteThumbs(personId, saved);
  if (usePhotoStore.getState().loadedFor === personId) usePhotoStore.getState().setLocalThumbs(saved);
}

/**
 * Shared by the owner Photos screen and the worker Queue screen: shows every
 * capture taken on this phone by the signed-in person — from the on-phone
 * database — alongside what the backend has, and exposes sync-to-backend.
 *
 * The screen appears at once from the database (this phone's captures plus the
 * backend photos from the last successful fetch, so it works offline); the
 * fresh backend list then replaces the cached one. Photos an admin deleted are
 * removed from the list and the phone (see removeDeletedPhotos), on load and
 * whenever the app returns to the foreground.
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
  const isOwner = hasOwnerAccess(profile?.appRole);

  const syncStatus = usePhotoStore(state => state.syncStatus);
  const syncing = Object.values(syncStatus).includes('syncing');
  const syncError = Object.values(syncStatus).includes('failed')
    ? 'Upload failed — photos are still saved. Check your connection; it retries automatically, or tap Sync.'
    : null;

  useEffect(() => {
    if (!personId || loadedFor === personId) return;
    (async () => {
      const local = await loadLocalPhotos(personId);

      // Puts this phone's captures and a backend list on screen. Anything shot
      // while this was loading is already in the store (and in the database) but
      // not in `local` — keep it rather than overwrite it. The store's copy of a
      // known capture wins: it has any note or preview added meanwhile.
      const known = new Set(local.map(photo => photo.id));
      const publish = (mine: Photo[], remote: Photo[]) => {
        const inStore = new Map(usePhotoStore.getState().photos.map(photo => [photo.id, photo]));
        const shotMeanwhile = [...inStore.values()].filter(
          photo => photo.personId === personId && isLocalPhotoId(photo.id) && !known.has(photo.id)
        );
        const current = mine.map(photo => inStore.get(photo.id) ?? photo);
        setPhotos(mergePhotoLists(mergeById(current, shotMeanwhile), remote), personId);
      };

      // Without a Firebase project, demo photos stand in for the backend on an empty phone.
      if (!HAS_FIREBASE_CONFIG) {
        publish(local, local.length === 0 ? SEED_PHOTOS : []);
        return;
      }

      // 1. On screen straight away: this phone's captures + the last backend list.
      const cached = await loadCachedRemotePhotos(personId);
      publish(local, cached);

      // 2. Then the network. Each call is allowed to fail on its own (offline).
      const fetched = await fetchPhotos(isOwner ? undefined : personId).catch(error => {
        console.warn('[photos] fetch failed —', error);
        return null;
      });
      const deleted = await fetchDeletedPhotos(personId).catch(error => {
        console.warn('[photos] deletion check failed —', error);
        return [] as DeletedPhoto[];
      });

      // 3. Anything an admin deleted goes off the phone first, so it can't be cached again.
      const localKept = await dropDeleted(personId, local, deleted);
      let remote = await dropDeleted(personId, fetched ?? cached, deleted);
      if (fetched) {
        deleteLocalFiles(await replaceCachedRemotePhotos(personId, remote));
        // Read back so each photo carries the preview already saved for it.
        const stored = await loadCachedRemotePhotos(personId);
        if (stored.length > 0) remote = stored;
      }
      publish(localKept, remote);

      // 4. Previews for other people's photos, saved for next time offline.
      if (fetched) {
        const mine = new Set(localKept.map(captureKey));
        cacheThumbnails(
          personId,
          remote.filter(photo => !mine.has(captureKey(photo)))
        );
      }
    })();
  }, [loadedFor, setPhotos, isOwner, personId]);

  // Coming back to the app is when an admin's deletion is most likely to be waiting.
  useEffect(() => {
    if (!HAS_FIREBASE_CONFIG || !personId || loadedFor !== personId) return;
    const appState = AppState.addEventListener('change', state => {
      if (state === 'active') removeDeletedPhotos(personId);
    });
    return () => appState.remove();
  }, [loadedFor, personId]);

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
      // Held: anything whose note sheet is open, and the camera tray until the camera closes.
      const { photos: all, noteEditingIds, trayIds } = usePhotoStore.getState();
      syncPhotos(autoSyncable(all, personId, [...noteEditingIds, ...trayIds]));
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
