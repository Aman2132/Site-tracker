import { useCallback, useEffect, useRef, useState } from 'react';
import { GestureResponderEvent } from 'react-native';
import { Camera } from 'react-native-vision-camera';

import { CAMERA } from '@/constants/config';
import { useCameraSessionController } from '@/controllers/useCameraSessionController';
import { usePhotoCaptureController } from '@/controllers/usePhotoCaptureController';
import { pinchZoom, touchDistance } from '@/utils/camera';

/**
 * The one hook CameraScreen reads: the live session (lens, zoom, mode, retries)
 * plus capture (photo / video), and the pinch-to-zoom touch handlers that tie
 * them together.
 */
export function useCameraController(task: string) {
  const cameraRef = useRef<Camera>(null);
  const session = useCameraSessionController();
  const capture = usePhotoCaptureController();

  const { zoom, zoomRange, setZoom, mode, supportsFocus } = session;
  const pinch = useRef<{ startZoom: number; startDistance: number } | null>(null);
  /** A single-finger touch that might turn out to be a tap (not a drag, not the start of a pinch). */
  const tap = useRef<{ x: number; y: number; at: number; pinched: boolean } | null>(null);
  const [focusPoint, setFocusPoint] = useState<{ x: number; y: number; key: number } | null>(null);
  const focusKey = useRef(0);

  useEffect(() => {
    if (!focusPoint) return;
    const timer = setTimeout(() => setFocusPoint(null), CAMERA.focusIndicatorMs);
    return () => clearTimeout(timer);
  }, [focusPoint]);

  const onTouchStart = useCallback(
    (event: GestureResponderEvent) => {
      const touches = event.nativeEvent.touches;
      if (touches.length === 1) {
        const { locationX, locationY } = event.nativeEvent;
        tap.current = { x: locationX, y: locationY, at: Date.now(), pinched: false };
      } else if (tap.current) {
        tap.current.pinched = true;
      }
      if (touches.length === 2) {
        pinch.current = { startZoom: zoom, startDistance: touchDistance(touches[0], touches[1]) };
      }
    },
    [zoom]
  );

  const onTouchMove = useCallback(
    (event: GestureResponderEvent) => {
      const touches = event.nativeEvent.touches;
      if (touches.length !== 2 || !pinch.current || !zoomRange) return;
      setZoom(
        pinchZoom({
          ...pinch.current,
          distance: touchDistance(touches[0], touches[1]),
          min: zoomRange.min,
          max: zoomRange.max,
        })
      );
    },
    [setZoom, zoomRange]
  );

  const onTouchEnd = useCallback(
    (event: GestureResponderEvent) => {
      if (event.nativeEvent.touches.length < 2) pinch.current = null;

      const start = tap.current;
      if (event.nativeEvent.touches.length !== 0 || !start) return;
      tap.current = null;

      const { locationX, locationY } = event.nativeEvent;
      const moved = Math.hypot(locationX - start.x, locationY - start.y);
      const isTap = !start.pinched && moved <= CAMERA.tapSlopPx && Date.now() - start.at <= CAMERA.tapMaxMs;
      if (!isTap) return;

      // Show the ring even where focus isn't supported — it still confirms the tap.
      focusKey.current += 1;
      setFocusPoint({ x: start.x, y: start.y, key: focusKey.current });
      if (supportsFocus) {
        cameraRef.current?.focus({ x: start.x, y: start.y }).catch(e => {
          console.warn('[camera] focus failed —', e instanceof Error ? e.message : e);
        });
      }
    },
    [supportsFocus]
  );

  /** The shutter does the right thing for the current mode. */
  const onShutter = useCallback(() => {
    const camera = cameraRef.current;
    if (!camera) return;
    if (mode === 'photo') capture.capturePhoto(camera, task);
    else if (capture.isRecording) capture.stopVideo();
    else capture.startVideo(camera, task);
  }, [mode, capture, task]);

  return {
    cameraRef,
    ...session,
    ...capture,
    onShutter,
    focusPoint,
    pinchHandlers: { onTouchStart, onTouchMove, onTouchEnd, onTouchCancel: onTouchEnd },
  };
}
