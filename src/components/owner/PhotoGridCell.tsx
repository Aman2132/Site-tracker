import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing } from '@/constants/theme';
import { Photo } from '@/types/domain';

export default function PhotoGridCell({ photo }: { photo: Photo }) {
  return (
    <View style={styles.cell}>
      <Image source={{ uri: photo.uri }} style={styles.thumb} />
      <View style={styles.overlay}>
        <Text style={styles.overlayText}>
          {photo.lat.toFixed(4)} {photo.lng.toFixed(4)}
        </Text>
      </View>
      {!photo.synced && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>QUEUED</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  cell: { width: '33.33%', aspectRatio: 1, padding: 3 },
  thumb: { flex: 1, borderRadius: radius.sm, backgroundColor: colors.placeholderImage },
  overlay: { position: 'absolute', left: spacing.sm - 2, right: spacing.sm - 2, bottom: spacing.sm - 2 },
  overlayText: { color: colors.white, fontSize: 9, fontFamily: 'monospace' },
  badge: {
    position: 'absolute',
    top: spacing.sm - 2,
    left: spacing.sm - 2,
    backgroundColor: colors.warningBg,
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: { color: colors.warningText, fontSize: 8, fontWeight: '600' },
});
