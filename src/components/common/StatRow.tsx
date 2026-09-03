import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, fontFamily, radius, shadow, spacing } from '@/constants/theme';

type IconName = keyof typeof Ionicons.glyphMap;

interface StatRowProps {
  label: string;
  value: string | number;
  icon?: IconName;
  gradient?: readonly [string, string];
}

export default function StatRow({
  label,
  value,
  icon = 'cloud-upload-outline',
  gradient = ['#4f7bff', '#1c4ff0'] as const,
}: StatRowProps) {
  return (
    <View style={styles.row}>
      <LinearGradient colors={gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.iconWrap}>
        <Ionicons name={icon} size={17} color={colors.white} />
      </LinearGradient>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginTop: spacing.md,
    ...shadow.sm,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  label: { fontFamily: fontFamily.medium, fontSize: 14, color: colors.text, flex: 1 },
  value: { fontFamily: fontFamily.extrabold, fontSize: 16, color: colors.text },
});
