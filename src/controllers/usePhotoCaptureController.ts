import { useCallback, useEffect, useRef, useState } from 'react';
import type { Camera } from 'react-native-vision-camera';

import { DEFAULT_COORDS, GEOTAG_ACCURACY } from '@/constants/config';
import { writeGeotag } from '@/services/exifService';
import { watchPreciseFix } from '@/services/locationService';
import { useAuthStore } from '@/store/useAuthStore';
import { usePhotoStore } from '@/store/usePhotoStore';
import { GeoFix } from '@/types/domain';
import { plusCodeFor } from '@/utils/geo';

/**
 * Worker Camera screen: keeps a high-accuracy GPS watch running for as long
 * as the screen is mounted (started here, torn down on unmount — see
 * services/locationService.ts watchPreciseFix for why this is a separate,
 * screen-scoped stream rather than reusing the battery-conscious background
 * tracking task). Capture reads the watch's latest fix, burns it into EXIF
 * offline, then queues the photo locally.
 */
export function usePhotoCaptureController() {
  const addPhoto = usePhotoStore(state => state.addPhoto);
  const workerId = useAuthStore(state => state.profile?.id);
  const [lastSavedLabel, setLastSavedLabel] = useState<string | null>(null);
  const [lastSavedIsPrecise, setLastSavedIsPrecise] = useState(true);
  const [liveFix, setLiveFix] = useState<GeoFix | null>(null);
  const liveFixRef = useRef<GeoFix | null>(null);

  useEffect(() => {
    return watchPreciseFix(fix => {
      liveFixRef.current = fix;
      setLiveFix(fix);
    });
  }, []);

  const capturePhoto = useCallback(
    async (camera: Camera, task: string) => {
      if (!workerId) return;
      const photo = await camera.takePhoto();
      if (!photo) return;

      const fix = liveFixRef.current;
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
        plusCode: plusCodeFor({ lat, lng }),
        takenAt: Date.now(),
        personId: workerId,
        task,
      });
      setLastSavedIsPrecise(accuracy <= GEOTAG_ACCURACY.goodMeters);
      setLastSavedLabel(`±${Math.round(accuracy)} m`);
    },
    [addPhoto, workerId]
  );

  const clearLastSavedLabel = useCallback(() => setLastSavedLabel(null), []);

  return {
    capturePhoto,
    lastSavedLabel,
    lastSavedIsPrecise,
    clearLastSavedLabel,
    liveAccuracy: liveFix?.accuracy ?? null,
  };
}
