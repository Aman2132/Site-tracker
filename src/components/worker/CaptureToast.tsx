import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, fontFamily, radius, shadow, spacing } from '@/constants/theme';

export default function CaptureToast({ message, warn = false }: { message: string | null; warn?: boolean }) {
  if (!message) return null;
  return (
    <View style={styles.toast}>
      <View style={[styles.iconWrap, warn && styles.iconWrapWarn]}>
        <Ionicons name={warn ? 'warning' : 'checkmark'} size={13} color={colors.white} />
      </View>
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    bottom: 140,
    left: spacing.xl,
    right: spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.overlayDark,
    borderRadius: radius.pill,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    ...shadow.md,
  },
  iconWrap: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapWarn: { backgroundColor: colors.warning },
  text: { fontFamily: fontFamily.medium, flex: 1, color: colors.white, fontSize: 12.5 },
});
