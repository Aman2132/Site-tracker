import React, { useRef, useState } from 'react';
import { GestureResponderEvent, Image, StyleSheet, View } from 'react-native';

import { PHOTO_VIEWER } from '@/constants/config';
import { pinchZoom, touchDistance } from '@/utils/camera';

const NO_ZOOM = { scale: 1, x: 0, y: 0 };

/**
 * A photo that can be pinched to zoom (1×–PHOTO_VIEWER.maxZoom), dragged
 * while zoomed, and double-tapped to jump in or back out. Plain touch events,
 * the same approach as the camera's pinch — no gesture library needed.
 */
export default function ZoomableImage({ uri, onLoad }: { uri: string; onLoad?: () => void }) {
  const [view, setView] = useState(NO_ZOOM);
  const [viewport, setViewport] = useState({ width: 0, height: 0 });
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const pinch = useRef<{ startZoom: number; startDistance: number } | null>(null);
  const pan = useRef<{ pageX: number; pageY: number; x: number; y: number } | null>(null);
  const lastTapAt = useRef(0);

  const clampView = (next: typeof NO_ZOOM) => {
    if (!viewport.width || !viewport.height || !imageSize.width || !imageSize.height)
      return { ...next, x: 0, y: 0 };
    const fit = Math.min(viewport.width / imageSize.width, viewport.height / imageSize.height);
    const maxX = Math.max(0, (imageSize.width * fit * next.scale - viewport.width) / 2);
    const maxY = Math.max(0, (imageSize.height * fit * next.scale - viewport.height) / 2);
    return {
      ...next,
      x: Math.max(-maxX, Math.min(maxX, next.x)),
      y: Math.max(-maxY, Math.min(maxY, next.y)),
    };
  };

  const onTouchStart = (event: GestureResponderEvent) => {
    const touches = event.nativeEvent.touches;
    if (touches.length >= 2) {
      pan.current = null;
      pinch.current = { startZoom: view.scale, startDistance: touchDistance(touches[0], touches[1]) };
      return;
    }
    const { pageX, pageY } = event.nativeEvent;
    pan.current = { pageX, pageY, x: view.x, y: view.y };
    const now = Date.now();
    if (now - lastTapAt.current < PHOTO_VIEWER.doubleTapMs) {
      lastTapAt.current = 0;
      setView(view.scale > 1 ? NO_ZOOM : { scale: PHOTO_VIEWER.doubleTapZoom, x: 0, y: 0 });
    } else {
      lastTapAt.current = now;
    }
  };

  const onTouchMove = (event: GestureResponderEvent) => {
    const touches = event.nativeEvent.touches;
    if (touches.length >= 2) {
      if (!pinch.current) {
        pinch.current = { startZoom: view.scale, startDistance: touchDistance(touches[0], touches[1]) };
        return;
      }
      const scale = pinchZoom({
        ...pinch.current,
        distance: touchDistance(touches[0], touches[1]),
        min: 1,
        max: PHOTO_VIEWER.maxZoom,
      });
      setView(current => clampView({ ...current, scale }));
      return;
    }
    if (pan.current && view.scale > 1) {
      const { pageX, pageY } = event.nativeEvent;
      const start = pan.current;
      setView(current =>
        clampView({
          ...current,
          x: start.x + pageX - start.pageX,
          y: start.y + pageY - start.pageY,
        })
      );
    }
  };

  const onTouchEnd = (event: GestureResponderEvent) => {
    if (event.nativeEvent.touches.length < 2) pinch.current = null;
    if (event.nativeEvent.touches.length === 0) {
      pan.current = null;
      if (view.scale <= 1) setView(NO_ZOOM);
    }
  };

  return (
    <View
      style={styles.fill}
      onLayout={event => setViewport(event.nativeEvent.layout)}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onTouchCancel={onTouchEnd}
    >
      <Image
        source={{ uri }}
        onLoad={event => {
          setImageSize(event.nativeEvent.source);
          onLoad?.();
        }}
        resizeMode="contain"
        style={[
          styles.fill,
          { transform: [{ translateX: view.x }, { translateY: view.y }, { scale: view.scale }] },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
});
