import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useMemo } from 'react';

import { usePhotoQueueController } from '@/controllers/usePhotoQueueController';

import { useAuthStore } from '@/store/useAuthStore';
import { usePhotoStore } from '@/store/usePhotoStore';
import { Photo } from '@/types/domain';
import { hasOwnerAccess } from '@/utils/roles';

/**
 * The camera's capture tray: everything shot during this camera visit, so the
 * person can keep shooting and add a note/item to one or several afterwards.
 * Tray captures are held back from background upload (see usePhotoQueueController)
 * until the camera closes; then they upload as usual.
 */
export function useCaptureTrayController(lastCaptureId: string | null) {
  // Loads the saved list if nothing has yet (an owner can open the camera
  // straight from the Map tab), so the last-photo thumbnail has something to show.
  usePhotoQueueController();
  const trayIds = usePhotoStore(state => state.trayIds);
  const photos = usePhotoStore(state => state.photos);
  const profile = useAuthStore(state => state.profile);

  useEffect(() => {
    if (lastCaptureId) usePhotoStore.getState().addToTray(lastCaptureId);
  }, [lastCaptureId]);

  // Leaving the camera ends the visit: the tray empties and its captures may upload.
  useFocusEffect(useCallback(() => () => usePhotoStore.getState().clearTray(), []));

  /** Newest first; anything already uploaded (e.g. Sync now elsewhere) drops out. */
  const tray = useMemo(
    () =>
      trayIds
        .map(id => photos.find(photo => photo.id === id))
        .filter((photo): photo is Photo => photo != null && !photo.synced),
    [trayIds, photos]
  );

  /** The viewfinder's last-photo thumbnail: this person's newest capture, synced or not. */
  const lastPhoto = useMemo(
    () =>
      photos.reduce<Photo | null>(
        (newest, photo) =>
          photo.personId === profile?.id && (!newest || photo.takenAt > newest.takenAt) ? photo : newest,
        null
      ),
    [photos, profile?.id]
  );

  /** Where the thumbnail leads: owners and workers name their photos tab differently. */
  const photosTab = profile && hasOwnerAccess(profile.appRole) ? 'Photos' : 'MyPhotos';

  return { tray, lastPhoto, photosTab };
}
