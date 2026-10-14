import { Ionicons } from '@expo/vector-icons';
import React, { ComponentProps } from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';

import { colors, fontFamily, radius } from '@/constants/theme';

/** Round glass icon button over the viewfinder (flash, lens flip), with an optional small caption. */
export default function CameraRoundButton({
  icon,
  caption,
  onPress,
  disabled = false,
  accessibilityLabel,
}: {
  icon: ComponentProps<typeof Ionicons>['name'];
  caption?: string;
  onPress: () => void;
  disabled?: boolean;
  accessibilityLabel: string;
}) {
  return (
    <TouchableOpacity
      style={[styles.button, disabled && styles.disabled]}
      onPress={onPress}
      disabled={disabled}
      hitSlop={8}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      <Ionicons name={icon} size={20} color={colors.white} />
      {caption && <Text style={styles.caption}>{caption}</Text>}
    </TouchableOpacity>
  );
}

const SIZE = 44;

const styles = StyleSheet.create({
  button: {
    width: SIZE,
    height: SIZE,
    borderRadius: radius.pill,
    backgroundColor: colors.glass,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: { opacity: 0.35 },
  caption: { fontFamily: fontFamily.bold, fontSize: 8.5, color: colors.white, marginTop: -2 },
});
