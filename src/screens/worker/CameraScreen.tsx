import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Camera, useCameraDevice } from 'react-native-vision-camera';

import CameraPermissionGate from '@/components/worker/CameraPermissionGate';
import CameraShutterButton from '@/components/worker/CameraShutterButton';
import CaptureToast from '@/components/worker/CaptureToast';
import GpsAccuracyBadge from '@/components/worker/GpsAccuracyBadge';
import { colors, fontFamily, radius, spacing } from '@/constants/theme';
import { usePhotoCaptureController } from '@/controllers/usePhotoCaptureController';

const DEFAULT_TASK_LABEL = 'Column grid L4';

export default function CameraScreen() {
  const cameraRef = useRef<Camera>(null);
  const device = useCameraDevice('back');
  const { capturePhoto, lastSavedLabel, lastSavedIsPrecise, clearLastSavedLabel, liveAccuracy } =
    usePhotoCaptureController();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!lastSavedLabel) return;
    const timer = setTimeout(clearLastSavedLabel, 2000);
    return () => clearTimeout(timer);
  }, [lastSavedLabel, clearLastSavedLabel]);

  const handleShutterPress = () => {
    if (cameraRef.current) capturePhoto(cameraRef.current, DEFAULT_TASK_LABEL);
  };

  return (
    <CameraPermissionGate>
      <View style={styles.flex}>
        {device ? (
          <Camera ref={cameraRef} style={styles.flex} device={device} isActive photo />
        ) : (
          <View style={styles.noDeviceWrap}>
            <Ionicons name="camera-outline" size={40} color="rgba(255,255,255,0.5)" />
            <Text style={styles.noDeviceTitle}>No camera detected</Text>
            <Text style={styles.noDeviceText}>
              react-native-vision-camera can't find a usable camera. Android Studio emulators often don't
              expose one it recognizes — try a physical device, or set the AVD's back camera to your
              computer's webcam (Device Manager → edit device → Camera).
            </Text>
          </View>
        )}

        <View style={[styles.taskBar, { top: insets.top + spacing.sm }]}>
          <Ionicons name="location" size={13} color={colors.white} />
          <Text style={styles.taskText}>{DEFAULT_TASK_LABEL}</Text>
        </View>

        <View style={[styles.accuracyBar, { top: insets.top + spacing.sm + 40 }]}>
          <GpsAccuracyBadge accuracyMeters={liveAccuracy} />
        </View>

        <CameraShutterButton onPress={handleShutterPress} />
        <CaptureToast
          message={
            lastSavedLabel ? `Saved · ${lastSavedLabel}${lastSavedIsPrecise ? '' : ' · low accuracy'}` : null
          }
          warn={!lastSavedIsPrecise}
        />
      </View>
    </CameraPermissionGate>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.black },
  noDeviceWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
    gap: spacing.sm,
  },
  noDeviceTitle: {
    fontFamily: fontFamily.semibold,
    color: colors.white,
    fontSize: 16,
    marginTop: spacing.xs,
  },
  noDeviceText: {
    fontFamily: fontFamily.regular,
    color: 'rgba(255,255,255,0.65)',
    fontSize: 12.5,
    textAlign: 'center',
    lineHeight: 18,
  },
  taskBar: {
    position: 'absolute',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 3,
  },
  taskText: { fontFamily: fontFamily.semibold, color: colors.white, fontSize: 12.5 },
  accuracyBar: { position: 'absolute', alignSelf: 'center' },
});
