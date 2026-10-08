import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { colors, fontFamily, radius, spacing } from '@/constants/theme';
import { InventoryEntry } from '@/types/domain';
import { formatDayTime } from '@/utils/formatters';
import { formatQuantity } from '@/utils/inventory';

/** One logged delivery. Read-only for the crew; "+ again" starts a new entry for the same item. */
export default function InventoryRow({
  entry,
  siteName,
  onRepeat,
}: {
  entry: InventoryEntry;
  siteName?: string;
  onRepeat: () => void;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.main}>
        <Text style={styles.quantity}>
          {formatQuantity(entry.quantity)} <Text style={styles.unit}>{entry.unit}</Text>
        </Text>
        <Text style={styles.name} numberOfLines={2}>
          {entry.name}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {[siteName, formatDayTime(entry.receivedAt)].filter(Boolean).join(' · ')}
        </Text>
        {entry.note ? (
          <Text style={styles.note} numberOfLines={3}>
            {entry.note}
          </Text>
        ) : null}
        {entry.pending ? (
          <View style={[styles.badge, styles.badgeWaiting]}>
            <Ionicons name="cloud-upload-outline" size={12} color={colors.warningText} />
            <Text style={[styles.badgeText, styles.badgeTextWaiting]}>Waiting to sync</Text>
          </View>
        ) : entry.editedAt ? (
          <View style={[styles.badge, styles.badgeEdited]}>
            <Ionicons name="create-outline" size={12} color={colors.primary} />
            <Text style={[styles.badgeText, styles.badgeTextEdited]}>Corrected by admin</Text>
          </View>
        ) : null}
      </View>
      <TouchableOpacity
        style={styles.repeat}
        onPress={onRepeat}
        activeOpacity={0.8}
        accessibilityLabel={`Log more ${entry.name}`}
      >
        <Ionicons name="add" size={18} color={colors.workerDeep} />
        <Text style={styles.repeatText}>again</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md + 2,
    marginBottom: spacing.sm,
  },
  main: { flex: 1, gap: spacing.xxs },
  quantity: { fontFamily: fontFamily.extrabold, fontSize: 20, color: colors.text },
  unit: { fontFamily: fontFamily.semibold, fontSize: 14, color: colors.textMuted },
  name: { fontFamily: fontFamily.bold, fontSize: 15, color: colors.text },
  meta: { fontFamily: fontFamily.regular, fontSize: 12, color: colors.textFaint },
  note: { fontFamily: fontFamily.regular, fontSize: 13, color: colors.textMuted, marginTop: spacing.xs },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing.xs,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    marginTop: spacing.xs + 2,
  },
  badgeWaiting: { backgroundColor: colors.warningBg },
  badgeEdited: { backgroundColor: colors.primarySoft },
  badgeText: { fontFamily: fontFamily.semibold, fontSize: 11.5 },
  badgeTextWaiting: { color: colors.warningText },
  badgeTextEdited: { color: colors.primary },
  repeat: {
    minHeight: 44,
    minWidth: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xxs,
    borderRadius: radius.pill,
    backgroundColor: colors.workerSoft,
    paddingHorizontal: spacing.sm,
  },
  repeatText: { fontFamily: fontFamily.bold, fontSize: 13, color: colors.workerDeep },
});
