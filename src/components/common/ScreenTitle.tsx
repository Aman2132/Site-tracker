import React from 'react';
import { StyleSheet, Text } from 'react-native';

import { colors, spacing, typography } from '@/constants/theme';

export default function ScreenTitle({ children }: { children: string }) {
  return <Text style={styles.title}>{children}</Text>;
}

const styles = StyleSheet.create({
  title: {
    ...typography.title,
    color: colors.text,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.md,
  },
});
