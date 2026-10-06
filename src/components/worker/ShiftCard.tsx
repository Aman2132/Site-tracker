import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { colors, fontFamily, radius, shadow, spacing } from '@/constants/theme';
import { formatClockTime } from '@/utils/formatters';

interface ShiftCardProps {
  siteName: string;
  checkedInAt: number;
  busy: boolean;
  error: string | null;
  onCheckOut: () => void;
}

/** Shown while checked in: where, since when, and the way out. */
export default function ShiftCard({ siteName, checkedInAt, busy, error, onCheckOut }: ShiftCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <View style={styles.icon}>
          <Ionicons name="business" size={16} color={colors.worker} />
        </View>
        <View style={styles.text}>
          <Text style={styles.site}>{siteName}</Text>
          <Text style={styles.since}>Checked in at {formatClockTime(checkedInAt)}</Text>
        </View>
      </View>
      <TouchableOpacity
        style={[styles.button, busy && styles.disabled]}
        onPress={onCheckOut}
        disabled={busy}
        activeOpacity={0.85}
      >
        <Ionicons name="log-out-outline" size={16} color={colors.white} />
        <Text style={styles.buttonText}>Check out</Text>
      </TouchableOpacity>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginTop: spacing.md,
    gap: spacing.md,
    ...shadow.sm,
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  icon: {
    width: 34,
    height: 34,
    borderRadius: radius.md - 2,
    backgroundColor: colors.workerSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { flex: 1 },
  site: { fontFamily: fontFamily.semibold, fontSize: 14.5, color: colors.text },
  since: { fontFamily: fontFamily.regular, fontSize: 11, color: colors.textMuted, marginTop: 2 },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs + 2,
    backgroundColor: colors.ink,
    borderRadius: radius.pill,
    paddingVertical: spacing.md - 2,
  },
  disabled: { opacity: 0.5 },
  buttonText: { fontFamily: fontFamily.bold, fontSize: 13.5, color: colors.white },
  error: { fontFamily: fontFamily.medium, fontSize: 12.5, color: colors.dangerText },
});
