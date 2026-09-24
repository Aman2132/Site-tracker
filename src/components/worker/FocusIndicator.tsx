import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet } from 'react-native';

import { colors } from '@/constants/theme';

const SIZE = 72;

/** Square focus ring that pops in where the worker tapped, then fades. Re-triggers on every new `pointKey`. */
export default function FocusIndicator({ x, y, pointKey }: { x: number; y: number; pointKey: number }) {
  const scale = useRef(new Animated.Value(1.5)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    scale.setValue(1.5);
    opacity.setValue(1);
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 6 }),
      Animated.timing(opacity, { toValue: 0.0, duration: 1000, delay: 250, useNativeDriver: true }),
    ]).start();
  }, [pointKey, scale, opacity]);

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.ring, { left: x - SIZE / 2, top: y - SIZE / 2, opacity, transform: [{ scale }] }]}
    />
  );
}

const styles = StyleSheet.create({
  ring: {
    position: 'absolute',
    width: SIZE,
    height: SIZE,
    borderWidth: 1.5,
    borderColor: colors.workerBright,
    borderRadius: 6,
  },
});
