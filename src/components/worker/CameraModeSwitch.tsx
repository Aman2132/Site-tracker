import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { colors, fontFamily, radius, spacing } from '@/constants/theme';
import { CaptureMode } from '@/types/domain';

const OPTIONS: { mode: CaptureMode; label: string }[] = [
  { mode: 'photo', label: 'PHOTO' },
  { mode: 'video', label: 'VIDEO' },
];

/** Photo / Video toggle floating over the viewfinder. Locked while a clip is recording. */
export default function CameraModeSwitch({
  mode,
  onChange,
  disabled = false,
}: {
  mode: CaptureMode;
  onChange: (mode: CaptureMode) => void;
  disabled?: boolean;
}) {
  return (
    <View style={[styles.wrap, disabled && styles.wrapDisabled]}>
      {OPTIONS.map(option => {
        const selected = option.mode === mode;
        return (
          <TouchableOpacity
            key={option.mode}
            disabled={disabled}
            onPress={() => onChange(option.mode)}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            style={[styles.option, selected && styles.optionSelected]}
          >
            <Text style={[styles.label, selected && styles.labelSelected]}>{option.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    backgroundColor: colors.glass,
    borderRadius: radius.pill,
    padding: spacing.xs,
  },
  wrapDisabled: { opacity: 0.5 },
  option: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm - 1,
    borderRadius: radius.pill,
  },
  optionSelected: { backgroundColor: colors.white },
  label: { fontFamily: fontFamily.bold, fontSize: 11.5, letterSpacing: 0.9, color: colors.onGlassMuted },
  labelSelected: { color: colors.black },
});
