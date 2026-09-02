import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

import { colors } from '@/constants/theme';

export default function CameraShutterButton({ onPress }: { onPress: () => void }) {
  return (
    <View style={styles.row}>
      <TouchableOpacity style={styles.shutter} onPress={onPress} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { position: 'absolute', bottom: 40, left: 0, right: 0, alignItems: 'center' },
  shutter: { width: 76, height: 76, borderRadius: 38, borderWidth: 4, borderColor: colors.white },
});
