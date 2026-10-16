import { useCallback, useEffect, useRef, useState } from 'react';
import { GestureResponderEvent } from 'react-native';
import { Camera } from 'react-native-vision-camera';

import { CAMERA } from '@/constants/config';
import { useCameraSessionController } from '@/controllers/useCameraSessionController';
import { usePhotoCaptureController } from '@/controllers/usePhotoCaptureController';
import { pinchZoom, touchDistance } from '@/utils/camera';

/**
 * The one hook CameraScreen reads: the live session (lens, zoom, retries)
 * plus photo capture, and the pinch-to-zoom touch handlers that tie
 * them together.
 */
export function useCameraController(task: string) {
  const cameraRef = useRef<Camera>(null);
  const session = useCameraSessionController();
  const capture = usePhotoCaptureController();

  const { zoom, zoomRange, setZoom, supportsFocus, flash } = session;
  const pinch = useRef<{ startZoom: number; startDistance: number } | null>(null);
  /** Latest pinch zoom not yet applied, and the frame that will apply it. */
  const pendingZoom = useRef<number | null>(null);
  const zoomFrame = useRef<number | null>(null);
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
      if (touches.length !== 2 || !zoomRange) return;
      // The second finger's touch-start can land on an overlay and never reach us — start the pinch here instead.
      if (!pinch.current) {
        pinch.current = { startZoom: zoom, startDistance: touchDistance(touches[0], touches[1]) };
        if (tap.current) tap.current.pinched = true;
        return;
      }
      pendingZoom.current = pinchZoom({
        ...pinch.current,
        distance: touchDistance(touches[0], touches[1]),
        min: zoomRange.min,
        max: zoomRange.max,
      });
      // Phones report finger moves far faster than the screen redraws (120–240 Hz), and each
      // zoom change re-renders the screen and calls into the camera — so apply one per frame.
      if (zoomFrame.current == null) {
        zoomFrame.current = requestAnimationFrame(() => {
          zoomFrame.current = null;
          if (pendingZoom.current != null) setZoom(pendingZoom.current);
        });
      }
    },
    [setZoom, zoom, zoomRange]
  );

  useEffect(
    () => () => {
      if (zoomFrame.current != null) cancelAnimationFrame(zoomFrame.current);
    },
    []
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

  const onShutter = useCallback(() => {
    const camera = cameraRef.current;
    if (camera) capture.capturePhoto(camera, task, flash);
  }, [capture, task, flash]);

  return {
    cameraRef,
    ...session,
    ...capture,
    onShutter,
    focusPoint,
    pinchHandlers: { onTouchStart, onTouchMove, onTouchEnd, onTouchCancel: onTouchEnd },
  };
}
