import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { colors, radius, spacing } from '@/constants/theme';
import { ActivityKind, Person } from '@/types/domain';
import { formatAccuracy, formatBatteryPercent, timeAgo } from '@/utils/formatters';

const ACTIVITY_LABEL: Record<ActivityKind, string> = {
  vehicle: 'IN VEHICLE',
  walk: 'WALKING',
  still: 'STATIONARY',
  stale: 'NO SIGNAL',
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
  const isStale = person.kind === 'stale' || person.paused;
  const fixAgeMs = Date.now() - person.lastFixAt;

  return (
    <View style={styles.sheet}>
      <TouchableOpacity onPress={onClose} style={styles.closeRow}>
        <Text style={styles.close}>×</Text>
      </TouchableOpacity>
      <Text style={styles.name}>{person.name}</Text>
      <Text style={styles.role}>{person.role}</Text>

      {isStale && (
        <View style={styles.banner}>
          <Text style={styles.bannerText}>
            Not live. Showing last known position from {timeAgo(fixAgeMs)}.
          </Text>
        </View>
      )}

      <Row label="Coordinates" value={`${person.lat.toFixed(6)}, ${person.lng.toFixed(6)}`} />
      <Row label="Activity" value={ACTIVITY_LABEL[person.kind]} />
      <Row label="Updated" value={timeAgo(fixAgeMs)} />
      <Row label="Accuracy" value={formatAccuracy(person.accuracy)} />
      <Row label="Battery" value={formatBatteryPercent(person.battery)} />
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
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
    borderTopLeftRadius: radius.xl + 2,
    borderTopRightRadius: radius.xl + 2,
    padding: spacing.xl,
    elevation: 8,
  },
  closeRow: { alignSelf: 'flex-end' },
  close: { fontSize: 22, color: colors.textMuted },
  name: { fontSize: 19, fontWeight: '700', color: colors.text },
  role: { fontSize: 13, color: colors.textMuted, marginBottom: spacing.md - 2 },
  banner: {
    backgroundColor: colors.warningBg,
    borderRadius: radius.sm + 2,
    padding: spacing.md - 2,
    marginBottom: spacing.md - 2,
  },
  bannerText: { color: colors.warningText, fontSize: 12 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: '#f1f3f4',
  },
  rowLabel: { color: colors.textMuted, fontSize: 13 },
  rowValue: { color: colors.text, fontSize: 13, fontWeight: '500' },
});
