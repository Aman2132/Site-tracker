import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { colors, radius, spacing } from '@/constants/theme';

interface PauseToggleRowProps {
  paused: boolean;
  onToggle: () => void;
}

export default function PauseToggleRow({ paused, onToggle }: PauseToggleRowProps) {
  return (
    <TouchableOpacity style={styles.row} onPress={onToggle}>
      <View style={styles.textColumn}>
        <Text style={styles.label}>Pause sharing</Text>
        <Text style={styles.sublabel}>Your supervisor is told that you paused</Text>
      </View>
      <View style={[styles.track, paused && styles.trackOn]}>
        <View style={styles.knob} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg - 1,
    marginTop: spacing.md,
  },
  textColumn: { flex: 1 },
  label: { fontSize: 14.5, color: colors.text },
  sublabel: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  track: {
    width: 48,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#e0e3e6',
    justifyContent: 'center',
    padding: 3,
  },
  trackOn: { backgroundColor: colors.warning, alignItems: 'flex-end' },
  knob: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.white },
});
