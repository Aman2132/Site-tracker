import { useCallback, useEffect, useRef, useState } from 'react';
import type { Camera } from 'react-native-vision-camera';

import { GEOTAG_ACCURACY } from '@/constants/config';
import { refreshPhotoStamp } from '@/controllers/photoStampActions';
import { writeGeotag } from '@/services/exifService';
import { keepCaptureFile } from '@/services/localMediaService';
import { watchPreciseFix } from '@/services/locationService';
import { watchCompassHeading } from '@/services/motionService';
import { requestForegroundLocationPermission } from '@/services/permissionsService';
import { addLocalPhoto } from '@/services/photoQueueStorage';
import { useAuthStore } from '@/store/useAuthStore';
import { usePhotoStore } from '@/store/usePhotoStore';
import { useShiftStore } from '@/store/useShiftStore';
import { GeoFix, Photo } from '@/types/domain';
import { FlashMode } from '@/utils/camera';
import { plusCodeFor } from '@/utils/geo';
import { photoStampTime } from '@/utils/photoStamp';
import { captureFileName, displaySize, newLocalPhotoId } from '@/utils/photos';

const TAG = '[capture]';
const errText = (e: unknown) => (e instanceof Error ? `${e.name}: ${e.message}` : String(e));

/**
 * Moves the capture's file into permanent app storage under its capture file
 * name (see utils/photos captureFileName). A failed move keeps the original
 * file rather than losing the shot.
 */
async function keepFileLogged(photo: Photo): Promise<string> {
  try {
    const uri = await keepCaptureFile(photo.uri, photo.personId, captureFileName(photo));
    console.log(`${TAG} kept at ${uri}`);
    return uri;
  } catch (e) {
    console.warn(`${TAG} could not move out of cache, keeping ${photo.uri} — ${errText(e)}`);
    return photo.uri;
  }
}

/** The site the person is checked in at right now, stamped on each capture. Absent when not checked in. */
function currentSite(): { siteId: string } | Record<string, never> {
  const siteId = useShiftStore.getState().active?.siteId;
  return siteId ? { siteId } : {};
}

/**
 * Worker Camera screen: keeps a high-accuracy GPS watch running for as long
 * as the screen is mounted (started here, torn down on unmount — see
 * services/locationService.ts watchPreciseFix for why this is a separate,
 * screen-scoped stream rather than reusing the battery-conscious background
 * tracking task). A photo reads the watch's latest fix and burns it into EXIF
 * offline. Every capture is then moved into permanent app storage and written
 * to its owner's saved list straight away (so it survives sign-out and
 * restarts even if the Photos tab is never opened). That is the only copy on
 * the phone — nothing is added to the gallery.
 */
export function usePhotoCaptureController() {
  const addPhoto = usePhotoStore(state => state.addPhoto);
  /** Whoever is signed in — worker or owner; their captures are filed under them. */
  const myId = useAuthStore(state => state.profile?.id);
  const myName = useAuthStore(state => state.profile?.name);
  const [lastSavedLabel, setLastSavedLabel] = useState<string | null>(null);
  const [lastSavedIsPrecise, setLastSavedIsPrecise] = useState(true);
  /** The live fix's accuracy, rounded — the same reading a photo taken now would be saved with. */
  const [displayAccuracy, setDisplayAccuracy] = useState<number | null>(null);
  const [lastCaptureId, setLastCaptureId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const liveFixRef = useRef<GeoFix | null>(null);
  const liveHeadingRef = useRef<number | null>(null);
  /** A 12 MP photo is ~5 MB of base64 in JS memory; two at once is a real memory spike, so one at a time. */
  const savingRef = useRef(false);

  useEffect(() => {
    return watchPreciseFix(fix => {
      liveFixRef.current = fix;
      // Raw, not smoothed: a smoothed badge lagged behind and could show ±15 m
      // while the photo was saved with ±50 m. Rounding to whole metres keeps
      // re-renders to when the number actually changes.
      setDisplayAccuracy(Math.round(fix.accuracy));
    });
  }, []);

  useEffect(() => {
    return watchCompassHeading(degrees => {
      liveHeadingRef.current = degrees;
    });
  }, []);

  // Asked once when the camera opens rather than per shutter press, so nobody
  // is prompted mid-capture. The camera can't geotag without location, and an
  // owner may never have been asked (workers are asked on their Home tab;
  // owners don't have one).
  useEffect(() => {
    requestForegroundLocationPermission().then(granted =>
      console.log(`${TAG} location permission granted=${granted}`)
    );
  }, []);

  /** Permanent file, then the saved list, then the screen, then the preview. */
  const keepCapture = useCallback(
    async (capture: Photo) => {
      const uri = await keepFileLogged(capture);
      const photo = {
        ...capture,
        uri,
        localStamp: { sourceUri: uri, timeLabel: photoStampTime(capture.takenAt) },
      };
      await addLocalPhoto(photo);
      addPhoto(photo);
      setLastCaptureId(photo.id);
      try {
        await refreshPhotoStamp(photo);
      } catch (error) {
        // The original is safe. Sync retries stamping and never uploads a new capture unstamped.
        console.warn(`${TAG} stamp pending — ${errText(error)}`);
      }
    },
    [addPhoto]
  );

  const capturePhoto = useCallback(
    async (camera: Camera, task: string, flash: FlashMode = 'off') => {
      if (!myId || savingRef.current) return;
      // Never geotag from a guess: with no GPS fix yet there is nothing true to write.
      if (!liveFixRef.current) {
        console.warn(`${TAG} capturePhoto blocked — no GPS fix yet`);
        return;
      }
      const capturedFix = liveFixRef.current;
      const capturedHeading = liveHeadingRef.current;
      savingRef.current = true;
      setIsSaving(true);
      try {
        console.log(`${TAG} takePhoto: start`);
        const takenAt = Date.now();
        const photo = await camera.takePhoto({ flash });
        if (!photo) return;
        console.log(`${TAG} takePhoto: ${photo.path} ${photo.width}x${photo.height}`);

        // Read after the shutter, so it is the freshest fix (guarded non-null above; the watch never clears it).
        const fix = liveFixRef.current ?? capturedFix;
        const heading = liveHeadingRef.current ?? capturedHeading;
        const { lat, lng, accuracy, altitude } = fix;

        const photoUri = `file://${photo.path}`;
        const geoTaggedUri = await writeGeotag(photoUri, {
          lat,
          lng,
          takenAt: new Date(takenAt),
          ...(altitude != null ? { altitude } : {}),
          ...(heading != null ? { heading } : {}),
        }).catch(e => {
          console.warn(`${TAG} EXIF write failed, using untagged file — ${errText(e)}`);
          return photoUri;
        });
        console.log(`${TAG} geotagged file: ${geoTaggedUri}`);

        await keepCapture({
          id: newLocalPhotoId(takenAt),
          uri: geoTaggedUri,
          mediaType: 'photo',
          lat,
          lng,
          accuracy,
          ...(altitude != null ? { altitude } : {}),
          ...(heading != null ? { heading } : {}),
          plusCode: plusCodeFor({ lat, lng }),
          takenAt,
          personId: myId,
          personName: myName,
          task,
          synced: false,
          ...displaySize(photo.width, photo.height, photo.orientation),
          ...currentSite(),
        });
        setLastSavedIsPrecise(accuracy <= GEOTAG_ACCURACY.goodMeters);
        setLastSavedLabel(`±${Math.round(accuracy)} m`);
      } catch (e) {
        console.warn(`${TAG} capturePhoto FAILED — ${errText(e)}`);
      } finally {
        savingRef.current = false;
        setIsSaving(false);
      }
    },
    [keepCapture, myId, myName]
  );

  const clearLastSavedLabel = useCallback(() => setLastSavedLabel(null), []);

  return {
    capturePhoto,
    isSaving,
    lastSavedLabel,
    lastSavedIsPrecise,
    /** Id of the newest capture, so the camera can offer to add a note to it. */
    lastCaptureId,
    clearLastSavedLabel,
    liveAccuracy: displayAccuracy,
    /** False until the first real GPS fix arrives; the shutter stays locked until then. */
    hasFix: displayAccuracy !== null,
  };
}
