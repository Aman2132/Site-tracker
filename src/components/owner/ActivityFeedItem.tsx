import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, fontFamily, radius, shadow, spacing } from '@/constants/theme';
import { AppEvent } from '@/types/domain';
import { timeAgo } from '@/utils/formatters';

export default function ActivityFeedItem({ event }: { event: AppEvent }) {
  const isWarning = event.kind === 'warn';
  const tint = isWarning ? colors.warning : colors.success;
  const tintBg = isWarning ? colors.warningBg : colors.successBg;

  return (
    <View style={styles.row}>
      <View style={[styles.iconWrap, { backgroundColor: tintBg }]}>
        <Ionicons name={isWarning ? 'alert' : 'checkmark'} size={16} color={tint} />
      </View>
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
    ...shadow.sm,
  },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textColumn: { flex: 1, paddingTop: 2 },
  text: { fontFamily: fontFamily.medium, fontSize: 13.5, color: colors.text, lineHeight: 18 },
  time: { fontFamily: fontFamily.regular, fontSize: 11, color: colors.textMuted, marginTop: 3 },
});
