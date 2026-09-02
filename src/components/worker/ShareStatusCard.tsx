import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing } from '@/constants/theme';

export default function ShareStatusCard({ paused }: { paused: boolean }) {
  return (
    <View style={[styles.card, paused ? styles.paused : styles.on]}>
      <View style={styles.head}>
        <View style={[styles.dot, { backgroundColor: paused ? colors.warning : colors.success }]} />
        <Text style={[styles.title, { color: paused ? colors.warningText : colors.successText }]}>
          {paused ? 'Sharing is paused' : 'Location is on'}
        </Text>
      </View>
      <Text style={[styles.body, { color: paused ? '#8a5a00' : '#137333' }]}>
        {paused
          ? 'Your supervisor can see that you paused, and the last place you were.'
          : 'Your supervisor can see where you are. Photos you take are tagged with the exact spot.'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.xl - 2, padding: spacing.xl - 1, borderWidth: 1 },
  on: { backgroundColor: colors.successBg, borderColor: colors.successBorder },
  paused: { backgroundColor: colors.warningBg, borderColor: colors.warningBorder },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm + 2, marginBottom: spacing.md - 2 },
  dot: { width: 12, height: 12, borderRadius: 6 },
  title: { fontSize: 17, fontWeight: '700' },
  body: { fontSize: 13, lineHeight: 19 },
});
