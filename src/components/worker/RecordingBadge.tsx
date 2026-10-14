import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, fontFamily, radius, spacing } from '@/constants/theme';
import { formatDuration } from '@/utils/camera';

/** Red-dot recording clock: "● 00:07 / 00:30". Shows how much of the clip limit is left. */
export default function RecordingBadge({ elapsedMs, maxMs }: { elapsedMs: number; maxMs: number }) {
  return (
    <View style={styles.badge} accessibilityRole="timer">
      <View style={styles.dot} />
      <Text style={styles.text}>
        {formatDuration(elapsedMs)} / {formatDuration(maxMs)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm - 2,
    backgroundColor: colors.glassStrong,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 3,
  },
  dot: { width: 9, height: 9, borderRadius: 5, backgroundColor: colors.danger },
  text: { fontFamily: fontFamily.bold, fontSize: 12.5, color: colors.white, fontVariant: ['tabular-nums'] },
});
