import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing } from '@/constants/theme';
import { AppEvent } from '@/types/domain';
import { timeAgo } from '@/utils/formatters';

export default function ActivityFeedItem({ event }: { event: AppEvent }) {
  const isWarning = event.kind === 'warn';
  return (
    <View style={styles.row}>
      <View style={[styles.dot, { backgroundColor: isWarning ? colors.warning : colors.success }]} />
      <View style={styles.textColumn}>
        <Text style={styles.text}>{event.text}</Text>
        <Text style={styles.time}>{timeAgo(Date.now() - event.at)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md + 2,
    marginBottom: spacing.sm + 2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dot: { width: 10, height: 10, borderRadius: 5, marginTop: 4 },
  textColumn: { flex: 1 },
  text: { fontSize: 13.5, color: colors.text },
  time: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
});
