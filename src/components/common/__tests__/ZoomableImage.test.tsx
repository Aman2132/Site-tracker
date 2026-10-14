import { act, fireEvent, render } from '@testing-library/react-native';
import React from 'react';
import { Image, StyleSheet } from 'react-native';

import ZoomableImage from '@/components/common/ZoomableImage';

jest.mock('@/constants/config', () => ({
  PHOTO_VIEWER: { maxZoom: 5, doubleTapZoom: 2.5, doubleTapMs: 300 },
}));

const touch = (pageX: number, pageY = 0) => ({ pageX, pageY });

function setup() {
  const screen = render(<ZoomableImage uri="https://x/photo.jpg" />);
  const surface = screen.UNSAFE_getByType(Image).parent!.parent!;
  const scale = () => {
    const transform = StyleSheet.flatten(screen.UNSAFE_getByType(Image).props.style).transform as {
      scale?: number;
    }[];
    return transform.find(step => step.scale != null)?.scale;
  };
  const translateX = () => {
    const transform = StyleSheet.flatten(screen.UNSAFE_getByType(Image).props.style).transform as {
      translateX?: number;
    }[];
    return transform.find(step => step.translateX != null)?.translateX;
  };
  const oneFinger = (type: string, x: number, touchesLeft = 1) =>
    fireEvent(surface, type, {
      nativeEvent: { pageX: x, pageY: 0, touches: touchesLeft ? [touch(x)] : [] },
    });
  return { surface, scale, translateX, oneFinger };
}

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

it('pinching apart zooms in, capped at the max', () => {
  const { surface, scale } = setup();

  fireEvent(surface, 'touchStart', { nativeEvent: { touches: [touch(100), touch(200)] } });
  fireEvent(surface, 'touchMove', { nativeEvent: { touches: [touch(50), touch(250)] } });
  expect(scale()).toBe(2);

  fireEvent(surface, 'touchMove', { nativeEvent: { touches: [touch(0), touch(2000)] } });
  expect(scale()).toBe(5);
});

it('double-tap jumps in, and a second double-tap goes back to 1x', () => {
  const { scale, oneFinger } = setup();

  oneFinger('touchStart', 10);
  oneFinger('touchEnd', 10, 0);
  act(() => jest.advanceTimersByTime(100));
  oneFinger('touchStart', 10);
  expect(scale()).toBe(2.5);
  oneFinger('touchEnd', 10, 0);

  act(() => jest.advanceTimersByTime(1000));
  oneFinger('touchStart', 10);
  oneFinger('touchEnd', 10, 0);
  act(() => jest.advanceTimersByTime(100));
  oneFinger('touchStart', 10);
  expect(scale()).toBe(1);
});

it('drags only while zoomed', () => {
  const { scale, translateX, oneFinger } = setup();

  oneFinger('touchStart', 100);
  oneFinger('touchMove', 160);
  expect(translateX()).toBe(0);
  oneFinger('touchEnd', 160, 0);

  // Zoom in with a double-tap, then drag.
  act(() => jest.advanceTimersByTime(1000));
  oneFinger('touchStart', 100);
  oneFinger('touchEnd', 100, 0);
  act(() => jest.advanceTimersByTime(100));
  oneFinger('touchStart', 100);
  expect(scale()).toBe(2.5);
  oneFinger('touchMove', 160);
  expect(translateX()).toBe(60);
});
