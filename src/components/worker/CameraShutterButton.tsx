import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

import { colors, glow, gradients } from '@/constants/theme';
import { CaptureMode } from '@/types/domain';

/**
 * The capture button. White disc for a photo; red disc when a video is ready
 * to record; a red rounded square while recording (tap to stop) — the same
 * visual language as a phone's own camera app. The parent positions it.
 */
export default function CameraShutterButton({
  onPress,
  mode = 'photo',
  recording = false,
  disabled = false,
}: {
  onPress: () => void;
  mode?: CaptureMode;
  recording?: boolean;
  disabled?: boolean;
}) {
  const innerStyle = recording
    ? styles.innerRecording
    : mode === 'video'
      ? styles.innerVideo
      : styles.innerPhoto;

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
        accessibilityLabel={
          recording ? 'Stop recording' : mode === 'video' ? 'Start recording' : 'Take photo'
        }
      >
        <View style={innerStyle} />
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
  innerPhoto: { width: 58, height: 58, borderRadius: 29, backgroundColor: colors.white },
  innerVideo: { width: 58, height: 58, borderRadius: 29, backgroundColor: colors.danger },
  innerRecording: { width: 30, height: 30, borderRadius: 7, backgroundColor: colors.danger },
});
