import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { colors, fontFamily, glow, gradients, radius, spacing, typography } from '@/constants/theme';

/** Shown over the viewfinder when the camera could not be opened, with a way to try again. */
export default function CameraProblemOverlay({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <View style={styles.overlay}>
      <View style={styles.iconWrap}>
        <Ionicons name="videocam-off" size={28} color={colors.white} />
      </View>
      <Text style={styles.title}>Camera unavailable</Text>
      <Text style={styles.message}>{message}</Text>
      <TouchableOpacity onPress={onRetry} activeOpacity={0.85} accessibilityRole="button">
        <LinearGradient colors={gradients.worker} style={[styles.button, glow(colors.worker, 0.4)]}>
          <Ionicons name="refresh" size={15} color={colors.white} />
          <Text style={styles.buttonText}>Try again</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: colors.overlayDark,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: radius.pill,
    backgroundColor: colors.glassStrong,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  title: { ...typography.heading, color: colors.white, marginBottom: spacing.sm },
  message: {
    fontFamily: fontFamily.regular,
    color: colors.onGlassMuted,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: spacing.xl,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.xl + 4,
  },
  buttonText: { fontFamily: fontFamily.bold, color: colors.white },
});
