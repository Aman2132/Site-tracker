import { useCameraPermissions } from 'expo-camera';
import React, { PropsWithChildren } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { colors, radius, spacing } from '@/constants/theme';

/** Gates its children behind camera permission, requesting it inline if missing. */
export default function CameraPermissionGate({ children }: PropsWithChildren<object>) {
  const [permission, requestPermission] = useCameraPermissions();

  if (!permission) return <View style={styles.flex} />;

  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text style={styles.text}>Camera access is needed to take site photos.</Text>
        <TouchableOpacity style={styles.button} onPress={requestPermission}>
          <Text style={styles.buttonText}>Allow camera</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.black },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
    backgroundColor: colors.black,
  },
  text: { color: colors.white, textAlign: 'center', marginBottom: spacing.lg },
  button: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.xl + 4,
  },
  buttonText: { color: colors.white, fontWeight: '600' },
});
