import { CameraView } from 'expo-camera';
import React, { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';

import CameraPermissionGate from '@/components/worker/CameraPermissionGate';
import CameraShutterButton from '@/components/worker/CameraShutterButton';
import CaptureToast from '@/components/worker/CaptureToast';
import { colors } from '@/constants/theme';
import { usePhotoCaptureController } from '@/controllers/usePhotoCaptureController';

const DEFAULT_TASK_LABEL = 'Column grid L4';

export default function CameraScreen() {
  const cameraRef = useRef<CameraView>(null);
  const { capturePhoto, lastSavedLabel, clearLastSavedLabel } = usePhotoCaptureController();

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
        <CameraView ref={cameraRef} style={styles.flex} facing="back" />
        <CameraShutterButton onPress={handleShutterPress} />
        <CaptureToast message={lastSavedLabel ? `Saved · ${lastSavedLabel}` : null} />
      </View>
    </CameraPermissionGate>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.black },
});
