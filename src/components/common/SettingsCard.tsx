import React from 'react';
import { StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';

import { colors, fontFamily, radius, shadow, spacing, typography } from '@/constants/theme';
import { LocationAccess, PermissionAccess } from '@/types/domain';

const LOCATION_COPY: Record<LocationAccess, { status: string; hint?: string; action?: string }> = {
  always: { status: 'Allowed all the time' },
  whileUsing: {
    status: 'Only while using the app',
    hint: 'Choose "Allow all the time" in Android Settings so tracking keeps working with the screen off.',
    action: 'Open Android Settings',
  },
  ask: { status: 'Not allowed', action: 'Allow location' },
  blocked: {
    status: 'Blocked',
    hint: 'Android will not ask again. Turn it on in Android Settings → Permissions → Location.',
    action: 'Open Android Settings',
  },
};

/** Profile tab's settings: version, location permission, notifications switch. Props in, JSX out. */
export default function SettingsCard({
  version,
  location,
  onLocationAction,
  notificationsOn,
  notificationAccess,
  onNotificationsChange,
  busy,
  accent,
}: {
  version: string;
  location: LocationAccess | null;
  onLocationAction: () => void;
  notificationsOn: boolean;
  notificationAccess: PermissionAccess | null;
  onNotificationsChange: (on: boolean) => void;
  busy: boolean;
  accent: string;
}) {
  const copy = location ? LOCATION_COPY[location] : null;
  const blocked = location === 'blocked';

  return (
    <View style={[styles.card, shadow.sm]}>
      <Text style={styles.label}>SETTINGS</Text>

      <View style={[styles.row, styles.divider]}>
        <View style={styles.flex}>
          <Text style={styles.rowLabel}>Location</Text>
          <Text style={[styles.status, blocked && styles.statusBad]}>{copy?.status ?? 'Checking…'}</Text>
          {copy?.hint && <Text style={styles.hint}>{copy.hint}</Text>}
        </View>
        {copy?.action && (
          <TouchableOpacity
            style={[styles.button, { borderColor: accent }]}
            onPress={onLocationAction}
            disabled={busy}
            accessibilityRole="button"
          >
            <Text style={[styles.buttonText, { color: accent }]}>{copy.action}</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={[styles.row, styles.divider]}>
        <View style={styles.flex}>
          <Text style={styles.rowLabel}>Notifications</Text>
          {notificationAccess === 'blocked' && (
            <Text style={styles.hint}>Blocked in Android Settings. Turning this on opens them.</Text>
          )}
        </View>
        <Switch
          value={notificationsOn}
          onValueChange={onNotificationsChange}
          disabled={busy}
          trackColor={{ true: accent, false: colors.borderStrong }}
          thumbColor={colors.white}
          accessibilityLabel="Notifications"
        />
      </View>

      <View style={styles.row}>
        <Text style={[styles.rowLabel, styles.flex]}>App version</Text>
        <Text style={styles.value}>{version}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg },
  label: { ...typography.label, color: colors.textFaint, marginBottom: spacing.xs },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md - 2, gap: spacing.md },
  divider: { borderBottomWidth: 1, borderBottomColor: colors.border },
  flex: { flex: 1 },
  rowLabel: { fontFamily: fontFamily.regular, fontSize: 13, color: colors.textMuted },
  status: { fontFamily: fontFamily.bold, fontSize: 13, color: colors.text, marginTop: spacing.xxs },
  statusBad: { color: colors.dangerText },
  hint: { ...typography.bodySmall, color: colors.textFaint, marginTop: spacing.xxs },
  value: { fontFamily: fontFamily.bold, fontSize: 13, color: colors.text },
  button: {
    borderWidth: 1.5,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    maxWidth: 150,
  },
  buttonText: { fontFamily: fontFamily.bold, fontSize: 12.5, textAlign: 'center' },
});
