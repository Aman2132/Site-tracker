import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { PropsWithChildren, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCameraPermission } from 'react-native-vision-camera';

import { colors, fontFamily, glow, gradients, radius, spacing, typography } from '@/constants/theme';
import { openAppSettings } from '@/services/permissionsService';

interface CameraPermissionGateProps {
  /** Leaves the camera. The tab bar is hidden here, so this is the visible way out. */
  onClose: () => void;
}

/**
 * Gates its children behind camera permission. Children don't mount until
 * access is granted — so the camera's own location/gallery prompts can't
 * collide with this one (Android silently drops a second request made while
 * the first is still open).
 *
 * If the request comes back refused — including when Android no longer shows
 * the prompt at all after an earlier "Don't allow" — the button switches to
 * opening the app's Settings. The permission is re-checked automatically when
 * the person comes back from Settings.
 */
export default function CameraPermissionGate({
  children,
  onClose,
}: PropsWithChildren<CameraPermissionGateProps>) {
  const { hasPermission, requestPermission } = useCameraPermission();
  const [asking, setAsking] = useState(false);
  const [refused, setRefused] = useState(false);
  const insets = useSafeAreaInsets();

  if (hasPermission) return <>{children}</>;

  const ask = async () => {
    setAsking(true);
    const granted = await requestPermission().catch(() => false);
    setAsking(false);
    setRefused(!granted);
  };

  return (
    <View style={styles.center}>
      <TouchableOpacity
        style={[styles.closeButton, { top: insets.top + spacing.sm }]}
        onPress={onClose}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel="Close camera"
      >
        <Ionicons name="close" size={22} color={colors.white} />
      </TouchableOpacity>

      <LinearGradient colors={gradients.worker} style={[styles.iconWrap, glow(colors.worker, 0.45)]}>
        <Ionicons name="camera" size={28} color={colors.white} />
      </LinearGradient>
      <Text style={styles.title}>Camera access needed</Text>
      <Text style={styles.text}>
        {refused
          ? 'Camera access is turned off for Site Tracker. Open Settings, tap Permissions, and allow Camera - then come back here.'
          : 'Site Tracker uses the camera to take geotagged photos of your work for the record.'}
      </Text>
      <TouchableOpacity onPress={refused ? openAppSettings : ask} disabled={asking} activeOpacity={0.85}>
        <LinearGradient colors={gradients.worker} style={[styles.button, glow(colors.worker, 0.4)]}>
          {asking ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={styles.buttonText}>{refused ? 'Open Settings' : 'Allow camera'}</Text>
          )}
        </LinearGradient>
      </TouchableOpacity>
      {refused && (
        <TouchableOpacity onPress={ask} hitSlop={8} style={styles.retry}>
          <Text style={styles.retryText}>Try again</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
    backgroundColor: colors.black,
  },
  closeButton: {
    position: 'absolute',
    left: spacing.md,
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.glass,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrap: {
    width: 68,
    height: 68,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  title: { ...typography.heading, color: colors.white, marginBottom: spacing.sm },
  text: {
    fontFamily: fontFamily.regular,
    color: colors.onGlassMuted,
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: 19,
  },
  button: {
    minWidth: 160,
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.xl + 4,
  },
  buttonText: { fontFamily: fontFamily.bold, color: colors.white },
  retry: { marginTop: spacing.lg },
  retryText: { fontFamily: fontFamily.semibold, color: colors.onGlassMuted },
});
