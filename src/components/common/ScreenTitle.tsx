import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, spacing, typography } from '@/constants/theme';

export default function ScreenTitle({ children }: { children: string }) {
  const insets = useSafeAreaInsets();
  return <Text style={[styles.title, { paddingTop: insets.top + spacing.sm }]}>{children}</Text>;
}

const styles = StyleSheet.create({
  title: {
    ...typography.title,
    color: colors.text,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.md,
  },
});
