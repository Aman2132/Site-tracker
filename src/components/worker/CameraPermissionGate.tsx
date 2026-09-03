import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { PropsWithChildren } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useCameraPermission } from 'react-native-vision-camera';

import { colors, fontFamily, glow, gradients, radius, spacing, typography } from '@/constants/theme';

/** Gates its children behind camera permission, requesting it inline if missing. */
export default function CameraPermissionGate({ children }: PropsWithChildren<object>) {
  const { hasPermission, requestPermission } = useCameraPermission();

  if (!hasPermission) {
    return (
      <View style={styles.center}>
        <LinearGradient colors={gradients.worker} style={[styles.iconWrap, glow(colors.worker, 0.45)]}>
          <Ionicons name="camera" size={28} color={colors.white} />
        </LinearGradient>
        <Text style={styles.title}>Camera access needed</Text>
        <Text style={styles.text}>
          Site Tracker uses the camera to take geotagged photos of your work for the record.
        </Text>
        <TouchableOpacity onPress={requestPermission} activeOpacity={0.85}>
          <LinearGradient colors={gradients.worker} style={[styles.button, glow(colors.worker, 0.4)]}>
            <Text style={styles.buttonText}>Allow camera</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
    backgroundColor: colors.black,
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
    color: 'rgba(255,255,255,0.65)',
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: 19,
  },
  button: { paddingHorizontal: spacing.xl, paddingVertical: spacing.md, borderRadius: radius.xl + 4 },
  buttonText: { fontFamily: fontFamily.bold, color: colors.white },
});
