import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import InitialsAvatar from '@/components/common/InitialsAvatar';
import { colors, fontFamily, radius, shadow, spacing, typography } from '@/constants/theme';
import { ActivityKind, Person } from '@/types/domain';
import { formatAccuracy, formatBatteryPercent, timeAgo } from '@/utils/formatters';

type IconName = keyof typeof Ionicons.glyphMap;

const ACTIVITY_LABEL: Record<ActivityKind, string> = {
  vehicle: 'IN VEHICLE',
  walk: 'WALKING',
  still: 'STATIONARY',
  stale: 'NO SIGNAL',
};

const ACTIVITY_ICON: Record<ActivityKind, IconName> = {
  vehicle: 'car',
  walk: 'walk',
  still: 'body',
  stale: 'cloud-offline',
};

interface PersonDetailSheetProps {
  person: Person;
  onClose: () => void;
}

/**
 * Full field set: activity, coordinates, time since fix, accuracy, battery,
 * and an explicit stale/paused banner rather than presenting a last-known
 * point as if it were live.
 */
export default function PersonDetailSheet({ person, onClose }: PersonDetailSheetProps) {
  const insets = useSafeAreaInsets();
  const isStale = person.kind === 'stale' || person.paused;
  const fixAgeMs = Date.now() - person.lastFixAt;
  const batteryIcon: IconName =
    person.battery < 0.2 ? 'battery-dead' : person.battery < 0.6 ? 'battery-half' : 'battery-full';

  return (
    <View style={[styles.sheet, shadow.xl, { paddingBottom: insets.bottom + spacing.lg }]}>
      <LinearGradient colors={[`${person.color}29`, 'rgba(255,255,255,0)']} style={styles.headGlow} />
      <View style={styles.grabber} />

      <TouchableOpacity onPress={onClose} style={styles.closeButton} hitSlop={8}>
        <Ionicons name="close" size={18} color={colors.textMuted} />
      </TouchableOpacity>

      <View style={styles.headRow}>
        <InitialsAvatar name={person.name} color={person.color} size={50} faded={isStale} ringed />
        <View style={styles.headText}>
          <Text style={styles.name}>{person.name}</Text>
          <Text style={styles.role}>{person.role}</Text>
        </View>
      </View>

      {isStale && (
        <View style={styles.banner}>
          <Ionicons name="warning" size={14} color={colors.warningText} />
          <Text style={styles.bannerText}>Not live · last seen {timeAgo(fixAgeMs)}</Text>
        </View>
      )}

      <View style={styles.grid}>
        <Row icon={ACTIVITY_ICON[person.kind]} label="Activity" value={ACTIVITY_LABEL[person.kind]} />
        <Row icon="time-outline" label="Updated" value={timeAgo(fixAgeMs)} />
        <Row icon="locate-outline" label="Accuracy" value={formatAccuracy(person.accuracy)} />
        <Row icon={batteryIcon} label="Battery" value={formatBatteryPercent(person.battery)} />
      </View>

      <View style={styles.coordRow}>
        <Ionicons name="pin-outline" size={13} color={colors.textFaint} />
        <Text style={styles.coordText}>
          {person.lat.toFixed(6)}, {person.lng.toFixed(6)}
        </Text>
      </View>
    </View>
  );
}

function Row({ icon, label, value }: { icon: IconName; label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Ionicons name={icon} size={16} color={colors.textMuted} style={styles.rowIcon} />
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xxl,
    borderTopRightRadius: radius.xxl,
    padding: spacing.xl,
    overflow: 'hidden',
  },
  headGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 140,
  },
  grabber: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  closeButton: {
    position: 'absolute',
    top: spacing.lg,
    right: spacing.lg,
    width: 30,
    height: 30,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.sm,
  },
  headRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.md },
  headText: { flex: 1 },
  name: { ...typography.heading, color: colors.text },
  role: { fontFamily: fontFamily.medium, fontSize: 13, color: colors.textMuted, marginTop: 1 },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    backgroundColor: colors.warningBg,
    borderRadius: radius.sm + 2,
    padding: spacing.md - 2,
    marginBottom: spacing.md,
  },
  bannerText: { fontFamily: fontFamily.medium, color: colors.warningText, fontSize: 12 },
  grid: {
    backgroundColor: colors.background,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm + 3,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  rowIcon: { width: 22 },
  rowLabel: { fontFamily: fontFamily.regular, flex: 1, color: colors.textMuted, fontSize: 13 },
  rowValue: { fontFamily: fontFamily.bold, color: colors.text, fontSize: 13 },
  coordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    justifyContent: 'center',
    marginTop: spacing.lg,
  },
  coordText: { ...typography.mono, fontSize: 11, color: colors.textFaint },
});
