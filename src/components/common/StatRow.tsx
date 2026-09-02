import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing } from '@/constants/theme';

export default function StatRow({ label, value }: { label: string; value: string | number }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg - 1,
    marginTop: spacing.md,
  },
  label: { fontSize: 14, color: colors.text },
  value: { fontSize: 14, fontWeight: '600', color: colors.text },
});
