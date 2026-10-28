import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

import { colors, glow, gradients } from '@/constants/theme';

/** The capture button: a white disc, like a phone's own camera app. The parent positions it. */
export default function CameraShutterButton({
  onPress,
  disabled = false,
}: {
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <LinearGradient
      colors={gradients.worker}
      style={[styles.glowRing, glow(colors.worker, 0.6), disabled && styles.disabled]}
    >
      <TouchableOpacity
        style={styles.ring}
        onPress={onPress}
        disabled={disabled}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel="Take photo"
      >
        <View style={styles.inner} />
      </TouchableOpacity>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  glowRing: { width: 82, height: 82, borderRadius: 41, alignItems: 'center', justifyContent: 'center' },
  disabled: { opacity: 0.5 },
  ring: {
    width: 74,
    height: 74,
    borderRadius: 37,
    borderWidth: 3,
    borderColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inner: { width: 58, height: 58, borderRadius: 29, backgroundColor: colors.white },
});
