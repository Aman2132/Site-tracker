import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useMemo } from 'react';

import { usePhotoStore } from '@/store/usePhotoStore';
import { Photo } from '@/types/domain';

/**
 * The camera's capture tray: everything shot during this camera visit, so the
 * person can keep shooting and add a note/item to one or several afterwards.
 * Tray captures are held back from background upload (see usePhotoQueueController)
 * until the camera closes; then they upload as usual.
 */
export function useCaptureTrayController(lastCaptureId: string | null) {
  const trayIds = usePhotoStore(state => state.trayIds);
  const photos = usePhotoStore(state => state.photos);

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

  return { tray };
}
