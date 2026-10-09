import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { colors, fontFamily, radius, spacing } from '@/constants/theme';
import { InventoryEntry } from '@/types/domain';
import { formatDayTime } from '@/utils/formatters';
import { formatPack, formatQuantity, isUsedUp, remainingQuantity, usedShare } from '@/utils/inventory';

/**
 * One logged delivery, visible to everyone assigned to the site. "+ again"
 * starts a new delivery of the same item (anyone can do this). "Used" works
 * only for the person who logged it — site-mates see it locked — and greys
 * out once everything has been used, like a finished item in a checklist.
 */
export default function InventoryRow({
  entry,
  siteName,
  canLogUsage,
  onRepeat,
  onLogUsage,
}: {
  entry: InventoryEntry;
  siteName?: string;
  canLogUsage: boolean;
  onRepeat: () => void;
  onLogUsage: () => void;
}) {
  const used = entry.usedQuantity ?? 0;
  const usedUp = isUsedUp(entry);
  const pack = formatPack(entry);
  const usable = canLogUsage && !usedUp && !entry.pending;
  return (
    <View style={[styles.card, usedUp && styles.cardDone]}>
      <View style={styles.main}>
        <Text style={[styles.quantity, usedUp && styles.done]}>
          {pack ?? formatQuantity(entry.quantity)}{' '}
          <Text style={styles.unit}>
            {pack ? `= ${formatQuantity(entry.quantity)} ${entry.unit}` : entry.unit}
          </Text>
        </Text>
        <Text style={[styles.name, usedUp && styles.done]} numberOfLines={2}>
          {entry.name}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {[siteName, formatDayTime(entry.receivedAt)].filter(Boolean).join(' · ')}
        </Text>
        <View style={styles.by}>
          <Ionicons
            name="person-circle-outline"
            size={14}
            color={canLogUsage ? colors.workerDeep : colors.textMuted}
          />
          <Text style={[styles.byText, canLogUsage && styles.byMe]} numberOfLines={1}>
            {/* canLogUsage is true exactly for my own entries. */}
            Logged by {canLogUsage ? 'you' : entry.personName || 'crew'}
          </Text>
        </View>
        {used > 0 && (
          <>
            <View style={styles.bar}>
              <View
                style={[styles.barFill, usedUp && styles.barDone, { width: `${usedShare(entry) * 100}%` }]}
              />
            </View>
            {usedUp ? (
              <View style={[styles.badge, styles.badgeDone]}>
                <Ionicons name="checkmark-circle" size={12} color={colors.successText} />
                <Text style={[styles.badgeText, styles.badgeTextDone]}>All used</Text>
              </View>
            ) : (
              <Text style={styles.used}>
                {formatQuantity(used)} {entry.unit} used · {formatQuantity(remainingQuantity(entry))} left
              </Text>
            )}
          </>
        )}
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
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.action, usable ? styles.actionPrimary : styles.actionLocked]}
          onPress={onLogUsage}
          disabled={!usable}
          activeOpacity={0.8}
          accessibilityLabel={
            usable
              ? `Log usage for ${entry.name}`
              : usedUp
                ? 'Everything has been used'
                : `Only ${entry.personName || 'who logged it'} can log usage`
          }
          accessibilityState={{ disabled: !usable }}
        >
          <Ionicons
            name={usable ? 'remove-circle-outline' : usedUp ? 'checkmark-done' : 'lock-closed'}
            size={15}
            color={usable ? colors.white : colors.textFaint}
          />
          <Text style={usable ? styles.actionTextPrimary : styles.actionTextLocked}>
            {usedUp ? 'Done' : 'Used'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.action}
          onPress={onRepeat}
          activeOpacity={0.8}
          accessibilityLabel={`Log more ${entry.name}`}
        >
          <Ionicons name="add" size={16} color={colors.workerDeep} />
          <Text style={styles.actionText}>again</Text>
        </TouchableOpacity>
      </View>
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
  by: { flexDirection: 'row', alignItems: 'center', gap: spacing.xxs },
  byText: { fontFamily: fontFamily.semibold, fontSize: 12.5, color: colors.textMuted },
  byMe: { color: colors.workerDeep },
  used: { fontFamily: fontFamily.semibold, fontSize: 12, color: colors.textMuted },
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
  actions: { gap: spacing.xs },
  action: {
    minHeight: 40,
    minWidth: 68,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xxs,
    borderRadius: radius.pill,
    backgroundColor: colors.workerSoft,
    paddingHorizontal: spacing.sm,
  },
  actionPrimary: { backgroundColor: colors.worker },
  actionLocked: { backgroundColor: colors.background },
  actionTextLocked: { fontFamily: fontFamily.bold, fontSize: 13, color: colors.textFaint },
  cardDone: { backgroundColor: colors.background },
  done: { color: colors.textMuted },
  bar: {
    height: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.border,
    overflow: 'hidden',
    marginTop: spacing.xs,
  },
  barFill: { height: '100%', borderRadius: radius.pill, backgroundColor: colors.worker },
  barDone: { backgroundColor: colors.success },
  badgeDone: { backgroundColor: colors.successBg },
  badgeTextDone: { color: colors.successText },
  actionText: { fontFamily: fontFamily.bold, fontSize: 13, color: colors.workerDeep },
  actionTextPrimary: { fontFamily: fontFamily.bold, fontSize: 13, color: colors.white },
});
