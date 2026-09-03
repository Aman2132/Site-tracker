import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Camera, useCameraDevice } from 'react-native-vision-camera';

import CameraPermissionGate from '@/components/worker/CameraPermissionGate';
import CameraShutterButton from '@/components/worker/CameraShutterButton';
import CaptureToast from '@/components/worker/CaptureToast';
import { colors, fontFamily, radius, spacing } from '@/constants/theme';
import { usePhotoCaptureController } from '@/controllers/usePhotoCaptureController';

const DEFAULT_TASK_LABEL = 'Column grid L4';

export default function CameraScreen() {
  const cameraRef = useRef<Camera>(null);
  const device = useCameraDevice('back');
  const { capturePhoto, lastSavedLabel, clearLastSavedLabel } = usePhotoCaptureController();
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
        {device && <Camera ref={cameraRef} style={styles.flex} device={device} isActive photo />}

        <View style={[styles.taskBar, { top: insets.top + spacing.sm }]}>
          <Ionicons name="location" size={13} color={colors.white} />
          <Text style={styles.taskText}>{DEFAULT_TASK_LABEL}</Text>
        </View>

        <CameraShutterButton onPress={handleShutterPress} />
        <CaptureToast message={lastSavedLabel ? `Saved · ${lastSavedLabel}` : null} />
      </View>
    </CameraPermissionGate>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.black },
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
});
