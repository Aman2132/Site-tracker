import React from 'react';
import { StyleSheet, Text } from 'react-native';

import { colors, spacing } from '@/constants/theme';

export default function EmptyState({ message }: { message: string }) {
  return <Text style={styles.text}>{message}</Text>;
}

const styles = StyleSheet.create({
  text: { textAlign: 'center', color: colors.textMuted, marginTop: 40, paddingHorizontal: spacing.xxl },
});
