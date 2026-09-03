import { useCallback, useState } from 'react';
import type { Camera } from 'react-native-vision-camera';

import { DEFAULT_COORDS } from '@/constants/config';
import { CURRENT_WORKER_ID } from '@/constants/session';
import { writeGeotag } from '@/services/exifService';
import { getCurrentFix } from '@/services/locationService';
import { usePhotoStore } from '@/store/usePhotoStore';
import { formatCoord } from '@/utils/formatters';

/**
 * Worker Camera screen: locks the GPS fix and the raw photo at the same
 * instant (so the coordinates stay trustworthy even if the phone moves
 * afterwards), burns GPS into EXIF offline, then queues it locally.
 */
export function usePhotoCaptureController() {
  const addPhoto = usePhotoStore(state => state.addPhoto);
  const [lastSavedLabel, setLastSavedLabel] = useState<string | null>(null);

  const capturePhoto = useCallback(
    async (camera: Camera, task: string) => {
      const [photo, fix] = await Promise.all([camera.takePhoto(), getCurrentFix().catch(() => null)]);
      if (!photo) return;

      const lat = fix?.lat ?? DEFAULT_COORDS.lat;
      const lng = fix?.lng ?? DEFAULT_COORDS.lng;
      const accuracy = fix?.accuracy ?? 9999;

      const photoUri = `file://${photo.path}`;
      const geoTaggedUri = await writeGeotag(photoUri, { lat, lng }).catch(() => photoUri);

      addPhoto({
        uri: geoTaggedUri,
        lat,
        lng,
        accuracy,
        takenAt: Date.now(),
        personId: CURRENT_WORKER_ID,
        task,
      });
      setLastSavedLabel(formatCoord(lat, lng));
    },
    [addPhoto]
  );

  const clearLastSavedLabel = useCallback(() => setLastSavedLabel(null), []);

  return { capturePhoto, lastSavedLabel, clearLastSavedLabel };
}
