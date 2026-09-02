import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing } from '@/constants/theme';

export default function CaptureToast({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <View style={styles.toast}>
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    bottom: 130,
    left: spacing.xl,
    right: spacing.xl,
    backgroundColor: colors.overlayDark,
    borderRadius: radius.sm + 2,
    padding: spacing.md,
  },
  text: { color: colors.white, textAlign: 'center', fontSize: 12 },
});
