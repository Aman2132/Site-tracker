import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Image, StyleSheet, TouchableOpacity, View } from 'react-native';

import { colors, radius } from '@/constants/theme';
import { Photo } from '@/types/domain';

/** Newest capture beside the shutter, like a phone camera's gallery shortcut. Empty slot when there is none. */
export default function LastCaptureThumb({
  photo,
  onPress,
  disabled = false,
}: {
  photo: Photo | null;
  onPress: () => void;
  disabled?: boolean;
}) {
  // Same footprint when empty, so the shutter stays centred.
  if (!photo) return <View style={styles.empty} />;
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel="Open your photos"
    >
      {photo.mediaType === 'video' ? (
        <View style={[styles.thumb, styles.video]}>
          <Ionicons name="videocam" size={18} color={colors.white} />
        </View>
      ) : (
        <Image source={{ uri: photo.localThumbUri ?? photo.uri }} style={styles.thumb} />
      )}
    </TouchableOpacity>
  );
}

const SIZE = 48;

const styles = StyleSheet.create({
  thumb: {
    width: SIZE,
    height: SIZE,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: colors.white,
    backgroundColor: colors.glass,
  },
  empty: { width: SIZE, height: SIZE },
  video: { alignItems: 'center', justifyContent: 'center' },
});
