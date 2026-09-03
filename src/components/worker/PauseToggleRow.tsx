import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { colors, fontFamily, radius, shadow, spacing } from '@/constants/theme';

interface PauseToggleRowProps {
  paused: boolean;
  onToggle: () => void;
}

export default function PauseToggleRow({ paused, onToggle }: PauseToggleRowProps) {
  return (
    <TouchableOpacity style={styles.row} onPress={onToggle} activeOpacity={0.75}>
      <View style={[styles.iconWrap, { backgroundColor: paused ? colors.warningBg : colors.background }]}>
        <Ionicons
          name={paused ? 'play' : 'pause'}
          size={16}
          color={paused ? colors.warning : colors.textMuted}
        />
      </View>
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
    padding: spacing.md,
    marginTop: spacing.md,
    ...shadow.sm,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: radius.md - 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textColumn: { flex: 1 },
  label: { fontFamily: fontFamily.semibold, fontSize: 14.5, color: colors.text },
  sublabel: { fontFamily: fontFamily.regular, fontSize: 11, color: colors.textMuted, marginTop: 2 },
  track: {
    width: 48,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#e0e3e6',
    justifyContent: 'center',
    padding: 3,
  },
  trackOn: { backgroundColor: colors.warning, alignItems: 'flex-end' },
  knob: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.white, ...shadow.sm },
});
