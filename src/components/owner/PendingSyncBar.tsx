import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { colors, fontFamily, radius, spacing } from '@/constants/theme';

interface PendingSyncBarProps {
  pendingCount: number;
  syncing: boolean;
  /** Why the last sync failed, or null. */
  syncError: string | null;
  onSync: () => void;
}

/** Owner Photos tab: captures still only on this phone, with the button that uploads them. */
export default function PendingSyncBar({ pendingCount, syncing, syncError, onSync }: PendingSyncBarProps) {
  return (
    <View style={styles.wrap}>
      <View style={styles.bar}>
        <Ionicons name="time-outline" size={13} color={colors.warningText} />
        <Text style={styles.text}>
          {pendingCount} photo{pendingCount > 1 ? 's' : ''} of yours {pendingCount > 1 ? 'are' : 'is'} saved
          on this phone, not uploaded yet
        </Text>
        <TouchableOpacity
          style={[styles.button, syncing && styles.buttonBusy]}
          onPress={onSync}
          disabled={syncing}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Sync photos now"
        >
          {syncing ? (
            <ActivityIndicator size="small" color={colors.white} />
          ) : (
            <Ionicons name="sync" size={13} color={colors.white} />
          )}
          <Text style={styles.buttonText}>{syncing ? 'Syncing…' : 'Sync now'}</Text>
        </TouchableOpacity>
      </View>
      {syncError ? <Text style={styles.error}>{syncError}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginHorizontal: spacing.lg, marginBottom: spacing.sm, gap: spacing.xs },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    backgroundColor: colors.warningBg,
    paddingVertical: spacing.sm,
    paddingLeft: spacing.md,
    paddingRight: spacing.sm,
    borderRadius: radius.md,
  },
  text: { flex: 1, fontFamily: fontFamily.medium, color: colors.warningText, fontSize: 12 },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    paddingVertical: spacing.xs + 3,
    paddingHorizontal: spacing.md,
  },
  buttonBusy: { opacity: 0.7 },
  buttonText: { fontFamily: fontFamily.bold, color: colors.white, fontSize: 12 },
  error: {
    fontFamily: fontFamily.medium,
    color: colors.dangerText,
    fontSize: 12,
    paddingHorizontal: spacing.xs,
  },
});
