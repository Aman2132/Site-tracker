import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

import { colors, glow, gradients } from '@/constants/theme';

export default function CameraShutterButton({ onPress }: { onPress: () => void }) {
  return (
    <View style={styles.row}>
      <LinearGradient colors={gradients.worker} style={[styles.glowRing, glow(colors.worker, 0.6)]}>
        <TouchableOpacity style={styles.ring} onPress={onPress} activeOpacity={0.7}>
          <View style={styles.inner} />
        </TouchableOpacity>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { position: 'absolute', bottom: 44, left: 0, right: 0, alignItems: 'center' },
  glowRing: { width: 82, height: 82, borderRadius: 41, alignItems: 'center', justifyContent: 'center' },
  ring: {
    width: 74,
    height: 74,
    borderRadius: 37,
    borderWidth: 3,
    borderColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inner: { width: 58, height: 58, borderRadius: 29, backgroundColor: colors.white },
});
