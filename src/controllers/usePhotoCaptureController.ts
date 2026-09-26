import { useCallback, useEffect, useRef, useState } from 'react';
import type { Camera, VideoFile } from 'react-native-vision-camera';

import { CAMERA, GEOTAG_ACCURACY } from '@/constants/config';
import { writeGeotag } from '@/services/exifService';
import { keepCaptureFile } from '@/services/localMediaService';
import { watchPreciseFix } from '@/services/locationService';
import { saveToDeviceGallery } from '@/services/mediaLibraryService';
import {
  requestForegroundLocationPermission,
  requestGallerySavePermission,
} from '@/services/permissionsService';
import { addLocalPhoto } from '@/services/photoQueueStorage';
import { useAuthStore } from '@/store/useAuthStore';
import { usePhotoStore } from '@/store/usePhotoStore';
import { GeoFix, Photo } from '@/types/domain';
import { formatDuration } from '@/utils/camera';
import { plusCodeFor } from '@/utils/geo';
import { smoothAccuracy } from '@/utils/gps';
import { captureFileName, newLocalPhotoId } from '@/utils/photos';

const TAG = '[capture]';
const errText = (e: unknown) => (e instanceof Error ? `${e.name}: ${e.message}` : String(e));

/** Gallery save with logging, so a photo that never shows up in Photos can be traced from Metro. */
async function saveToGalleryLogged(
  kind: string,
  uri: string,
  allowed: boolean,
  onGranted: () => void
): Promise<void> {
  if (!allowed) {
    // The prompt at screen open is easy to miss or dismiss — ask again now, when it matters.
    console.warn(`${TAG} ${kind}: no gallery permission yet — asking now`);
    const granted = await requestGallerySavePermission();
    console.log(`${TAG} ${kind}: permission re-request granted=${granted}`);
    if (!granted) {
      console.warn(
        `${TAG} ${kind}: gallery save SKIPPED — enable Photos/Media for Site Tracker in phone Settings > Apps > Permissions`
      );
      return;
    }
    onGranted();
  }
  try {
    await saveToDeviceGallery(uri);
    console.log(`${TAG} ${kind}: saved to gallery OK (${uri})`);
  } catch (e) {
    console.warn(`${TAG} ${kind}: gallery save FAILED for ${uri} — ${errText(e)}`);
  }
}

/**
 * Moves the capture's file into permanent app storage under its capture file
 * name (see utils/photos captureFileName). A failed move keeps the original
 * file rather than losing the shot.
 */
async function keepFileLogged(kind: string, photo: Photo): Promise<string> {
  try {
    const uri = await keepCaptureFile(photo.uri, photo.personId, captureFileName(photo));
    console.log(`${TAG} ${kind}: kept at ${uri}`);
    return uri;
  } catch (e) {
    console.warn(`${TAG} ${kind}: could not move out of cache, keeping ${photo.uri} — ${errText(e)}`);
    return photo.uri;
  }
}

/** What the worker was doing when a clip started: the geotag is taken then, not when they stop. */
interface ActiveRecording {
  camera: Camera;
  task: string;
  fix: GeoFix;
  startedAt: number;
}

/**
 * Worker Camera screen: keeps a high-accuracy GPS watch running for as long
 * as the screen is mounted (started here, torn down on unmount — see
 * services/locationService.ts watchPreciseFix for why this is a separate,
 * screen-scoped stream rather than reusing the battery-conscious background
 * tracking task). A photo reads the watch's latest fix and burns it into EXIF
 * offline. Every capture is then moved into permanent app storage, written to
 * its owner's saved list straight away (so it survives sign-out and restarts
 * even if the Photos tab is never opened), and copied into the gallery album.
 * A video is geotagged with the fix at the moment recording starts.
 */
export function usePhotoCaptureController() {
  const addPhoto = usePhotoStore(state => state.addPhoto);
  /** Whoever is signed in — worker or owner; their captures are filed under them. */
  const myId = useAuthStore(state => state.profile?.id);
  const [lastSavedLabel, setLastSavedLabel] = useState<string | null>(null);
  const [lastSavedIsPrecise, setLastSavedIsPrecise] = useState(true);
  /** Smoothed + rounded for display only; the raw fix used for geotagging lives in liveFixRef. */
  const [displayAccuracy, setDisplayAccuracy] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingMs, setRecordingMs] = useState(0);

  const liveFixRef = useRef<GeoFix | null>(null);
  const smoothedRef = useRef<number | null>(null);
  const canSaveToGallery = useRef(false);
  /** A 12 MP photo is ~5 MB of base64 in JS memory; two at once is a real memory spike, so one at a time. */
  const savingRef = useRef(false);
  const recordingRef = useRef<ActiveRecording | null>(null);
  const recordingTimer = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  useEffect(() => {
    return watchPreciseFix(fix => {
      liveFixRef.current = fix;
      smoothedRef.current = smoothAccuracy(
        smoothedRef.current,
        fix.accuracy,
        GEOTAG_ACCURACY.displaySmoothing
      );
      // Whole metres, and only when the number actually changes — otherwise the
      // whole camera screen would re-render on every raw sample.
      setDisplayAccuracy(Math.round(smoothedRef.current));
    });
  }, []);

  // Asked once when the camera opens rather than per shutter press, so nobody
  // is prompted mid-capture. Location comes first: the camera can't geotag
  // without it, and an owner may never have been asked (workers are asked on
  // their Home tab; owners don't have one). One at a time — Android drops a
  // second permission request made while the first dialog is still open.
  useEffect(() => {
    (async () => {
      const location = await requestForegroundLocationPermission();
      console.log(`${TAG} location permission granted=${location}`);
      const granted = await requestGallerySavePermission();
      console.log(`${TAG} gallery permission granted=${granted}`);
      canSaveToGallery.current = granted;
    })();
  }, []);

  const markGranted = useCallback(() => {
    canSaveToGallery.current = true;
  }, []);

  /**
   * Permanent file, then the saved list, then the screen, then the gallery
   * copy. The saved list comes before the gallery because the gallery save can
   * stop for a permission prompt — the shot must already be safe by then.
   */
  const keepCapture = useCallback(
    async (kind: string, capture: Photo) => {
      const photo = { ...capture, uri: await keepFileLogged(kind, capture) };
      await addLocalPhoto(photo);
      addPhoto(photo);
      await saveToGalleryLogged(kind, photo.uri, canSaveToGallery.current, markGranted);
    },
    [addPhoto, markGranted]
  );

  const stopRecordingTimer = useCallback(() => {
    if (recordingTimer.current) clearInterval(recordingTimer.current);
    recordingTimer.current = undefined;
  }, []);

  // Leaving the screen mid-recording must not leave the camera recording into the void.
  useEffect(
    () => () => {
      stopRecordingTimer();
      recordingRef.current?.camera.stopRecording().catch(() => {});
    },
    [stopRecordingTimer]
  );

  const capturePhoto = useCallback(
    async (camera: Camera, task: string) => {
      if (!myId || savingRef.current) return;
      // Never geotag from a guess: with no GPS fix yet there is nothing true to write.
      if (!liveFixRef.current) {
        console.warn(`${TAG} capturePhoto blocked — no GPS fix yet`);
        return;
      }
      const capturedFix = liveFixRef.current;
      savingRef.current = true;
      setIsSaving(true);
      try {
        console.log(`${TAG} takePhoto: start`);
        const photo = await camera.takePhoto();
        if (!photo) return;
        console.log(`${TAG} takePhoto: ${photo.path} ${photo.width}x${photo.height}`);

        // Read after the shutter, so it is the freshest fix (guarded non-null above; the watch never clears it).
        const fix = liveFixRef.current ?? capturedFix;
        const { lat, lng, accuracy } = fix;

        const photoUri = `file://${photo.path}`;
        const geoTaggedUri = await writeGeotag(photoUri, { lat, lng }).catch(e => {
          console.warn(`${TAG} EXIF write failed, using untagged file — ${errText(e)}`);
          return photoUri;
        });
        console.log(`${TAG} geotagged file: ${geoTaggedUri}`);

        const takenAt = Date.now();
        await keepCapture('photo', {
          id: newLocalPhotoId(takenAt),
          uri: geoTaggedUri,
          mediaType: 'photo',
          lat,
          lng,
          accuracy,
          plusCode: plusCodeFor({ lat, lng }),
          takenAt,
          personId: myId,
          task,
          synced: false,
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
    [keepCapture, myId]
  );

  const finishVideo = useCallback(
    async (video: VideoFile) => {
      const meta = recordingRef.current;
      recordingRef.current = null;
      stopRecordingTimer();
      setIsRecording(false);
      if (!meta || !myId) return;

      const { lat, lng, accuracy } = meta.fix;
      const durationMs = Math.round(video.duration * 1000);
      const uri = video.path.startsWith('file://') ? video.path : `file://${video.path}`;

      await keepCapture('video', {
        id: newLocalPhotoId(meta.startedAt),
        uri,
        mediaType: 'video',
        durationMs,
        lat,
        lng,
        accuracy,
        plusCode: plusCodeFor({ lat, lng }),
        takenAt: meta.startedAt,
        personId: myId,
        task: meta.task,
        synced: false,
      });
      setLastSavedIsPrecise(accuracy <= GEOTAG_ACCURACY.goodMeters);
      setLastSavedLabel(`Video ${formatDuration(durationMs)} · ±${Math.round(accuracy)} m`);
    },
    [keepCapture, myId, stopRecordingTimer]
  );

  const startVideo = useCallback(
    (camera: Camera, task: string) => {
      if (!myId || recordingRef.current) return;
      const fix = liveFixRef.current;
      if (!fix) {
        console.warn(`${TAG} startVideo blocked — no GPS fix yet`);
        return;
      }

      const startedAt = Date.now();
      recordingRef.current = { camera, task, fix, startedAt };
      setRecordingMs(0);
      setIsRecording(true);

      recordingTimer.current = setInterval(() => {
        const elapsed = Date.now() - startedAt;
        setRecordingMs(elapsed);
        // Clips are uploaded through JS memory, so they are capped at a length that fits.
        if (elapsed >= CAMERA.maxVideoSeconds * 1000) camera.stopRecording().catch(() => {});
      }, 250);

      camera.startRecording({
        fileType: 'mp4',
        videoCodec: 'h264',
        onRecordingFinished: video => {
          finishVideo(video);
        },
        onRecordingError: error => {
          console.warn(`${TAG} recording error — ${errText(error)}`);
          // Nothing usable was written; just put the UI back to idle.
          recordingRef.current = null;
          stopRecordingTimer();
          setIsRecording(false);
        },
      });
    },
    [myId, finishVideo, stopRecordingTimer]
  );

  const stopVideo = useCallback(() => {
    recordingRef.current?.camera.stopRecording().catch(() => {});
  }, []);

  const clearLastSavedLabel = useCallback(() => setLastSavedLabel(null), []);

  return {
    capturePhoto,
    startVideo,
    stopVideo,
    isSaving,
    isRecording,
    recordingMs,
    lastSavedLabel,
    lastSavedIsPrecise,
    clearLastSavedLabel,
    liveAccuracy: displayAccuracy,
    /** False until the first real GPS fix arrives; the shutter stays locked until then. */
    hasFix: displayAccuracy !== null,
  };
}
