import { useIsFocused } from '@react-navigation/native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import {
  CameraRuntimeError,
  useCameraDevice,
  useCameraFormat,
  useMicrophonePermission,
} from 'react-native-vision-camera';

import { CAMERA } from '@/constants/config';
import { CaptureMode } from '@/types/domain';
import { clampZoom, zoomStops } from '@/utils/camera';

/** "Someone else has the camera right now" — usually gone a moment later, so worth retrying quietly. */
const TRANSIENT_ERRORS = new Set(['device/camera-already-in-use', 'system/camera-is-restricted']);

export interface CameraProblem {
  code: string;
  message: string;
}

function friendlyMessage(error: CameraRuntimeError): string {
  switch (error.code) {
    case 'device/camera-already-in-use':
      return 'Another app is using the camera. Close any other camera apps, then try again.';
    case 'system/camera-is-restricted':
      return 'Your phone is blocking camera access right now. Check Settings > Apps > Site Tracker > Permissions > Camera, and that no privacy or battery setting is restricting it.';
    default:
      return error.message;
  }
}

const STABILIZATION_PREFERENCE = ['cinematic-extended', 'cinematic', 'standard', 'auto'] as const;

/** Strongest video stabilization the format offers, or undefined when it offers none. */
function bestStabilization(modes: readonly string[] | undefined) {
  return STABILIZATION_PREFERENCE.find(mode => modes?.includes(mode));
}

/** True while the app is in the foreground. The phone takes the camera away from an app that is not. */
function useAppIsForeground(): boolean {
  const [foreground, setForeground] = useState(AppState.currentState === 'active');
  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => setForeground(state === 'active'));
    return () => subscription.remove();
  }, []);
  return foreground;
}

/**
 * Owns the live camera session: which lens and format, photo vs video, zoom,
 * and — most importantly — WHEN the camera is allowed to be open.
 *
 * The camera used to be hard-wired on, so once the Camera tab had been visited
 * the app held the lens forever, through tab switches and backgrounding. That
 * is what produced "camera-already-in-use" and "camera-is-restricted": the
 * phone (rightly) refuses a lens to an app that is not on screen. Now it is
 * only open while this screen is focused AND the app is in the foreground.
 */
export function useCameraSessionController() {
  const device = useCameraDevice('back');
  const isFocused = useIsFocused();
  const appForeground = useAppIsForeground();
  const microphone = useMicrophonePermission();

  const [mode, setModeState] = useState<CaptureMode>('photo');
  const [zoomOverride, setZoomOverride] = useState<number | null>(null);
  /** Changing this remounts <Camera>, forcing a brand-new session. */
  const [attempt, setAttempt] = useState(0);
  /** True while we deliberately hold the camera closed between retries. */
  const [releasing, setReleasing] = useState(false);
  const [problem, setProblem] = useState<CameraProblem | null>(null);

  const autoRetries = useRef(0);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const zoomRange = useMemo(
    () =>
      device
        ? { min: device.minZoom, max: Math.min(device.maxZoom, CAMERA.maxZoom), neutral: device.neutralZoom }
        : null,
    [device]
  );
  const zoom = zoomRange ? clampZoom(zoomOverride ?? zoomRange.neutral, zoomRange.min, zoomRange.max) : 1;
  const stops = useMemo(() => (zoomRange ? zoomStops(zoomRange, CAMERA.maxZoom) : []), [zoomRange]);

  // A new lens has its own zoom range — don't carry a zoom over from the old one.
  const deviceId = device?.id;
  useEffect(() => setZoomOverride(null), [deviceId]);

  // Ask for the sharpest photo (~12 MP) in photo mode, and 1080p in video mode.
  // With no format chosen the library falls back to a small default, which is
  // what made captures look soft.
  const formatFilters = useMemo(
    () =>
      mode === 'photo'
        ? [
            { photoResolution: CAMERA.photoTarget },
            { photoAspectRatio: CAMERA.photoTarget.width / CAMERA.photoTarget.height },
            // Lowest priority: take an HDR-capable format if one still matches the above.
            { photoHdr: true },
          ]
        : [
            { videoResolution: CAMERA.videoTarget },
            { videoAspectRatio: CAMERA.videoTarget.width / CAMERA.videoTarget.height },
            { fps: CAMERA.videoFps },
            { videoHdr: true },
            { videoStabilizationMode: 'cinematic' as const },
          ],
    [mode]
  );
  const format = useCameraFormat(device, formatFilters);

  const setZoom = useCallback(
    (next: number) => {
      if (zoomRange) setZoomOverride(clampZoom(next, zoomRange.min, zoomRange.max));
    },
    [zoomRange]
  );

  const setMode = useCallback(
    (next: CaptureMode) => {
      setModeState(next);
      // Only ask for the microphone when someone actually opts into video.
      if (next === 'video' && !microphone.hasPermission) microphone.requestPermission();
    },
    [microphone]
  );

  const clearRetryTimer = useCallback(() => {
    if (retryTimer.current) clearTimeout(retryTimer.current);
    retryTimer.current = undefined;
  }, []);

  const onCameraError = useCallback((error: CameraRuntimeError) => {
    // The library can report the same failure several times in a burst.
    // Only the first should start a retry.
    if (retryTimer.current) return;

    if (TRANSIENT_ERRORS.has(error.code) && autoRetries.current < CAMERA.maxAutoRetries) {
      autoRetries.current += 1;
      // Really let go of the camera first, then reopen after a growing pause.
      setReleasing(true);
      retryTimer.current = setTimeout(() => {
        retryTimer.current = undefined;
        setAttempt(current => current + 1);
        setReleasing(false);
      }, CAMERA.retryDelayMs * autoRetries.current);
      return;
    }

    setProblem({ code: error.code, message: friendlyMessage(error) });
  }, []);

  /** The session opened successfully — earn back the full retry budget. */
  const onCameraInitialized = useCallback(() => {
    autoRetries.current = 0;
  }, []);

  /** Manual "Try again": a clean slate, fresh session. */
  const retry = useCallback(() => {
    clearRetryTimer();
    autoRetries.current = 0;
    setProblem(null);
    setReleasing(false);
    setAttempt(current => current + 1);
  }, [clearRetryTimer]);

  // Coming back to the screen after a failure deserves a fresh attempt, not a stale error.
  useEffect(() => {
    if (isFocused && problem) retry();
    // Only react to focus changing, not to the problem being set.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFocused]);

  useEffect(() => clearRetryTimer, [clearRetryTimer]);

  const isActive = isFocused && appForeground && !releasing && problem === null;

  return {
    device,
    format,
    isActive,
    mode,
    setMode,
    /** Audio is recorded only in video mode, and only once the microphone permission is granted. */
    // Only switch on what the chosen lens/format actually supports — asking for
    // an unsupported feature is a runtime error, not a graceful no-op.
    photoHdr: mode === 'photo' && format?.supportsPhotoHdr === true,
    videoHdr: mode === 'video' && format?.supportsVideoHdr === true,
    lowLightBoost: device?.supportsLowLightBoost === true,
    videoStabilizationMode: mode === 'video' ? bestStabilization(format?.videoStabilizationModes) : undefined,
    supportsFocus: device?.supportsFocus === true,
    audioEnabled: mode === 'video' && microphone.hasPermission,
    zoom,
    zoomRange,
    zoomStops: stops,
    setZoom,
    /** Bump-to-remount key for <Camera> so a retry gets a genuinely new session. */
    attempt,
    problem,
    retry,
    onCameraError,
    onCameraInitialized,
  };
}
