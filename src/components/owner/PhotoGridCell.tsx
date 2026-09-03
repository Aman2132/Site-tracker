import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import { colors, fontFamily, radius, spacing } from '@/constants/theme';
import { Photo } from '@/types/domain';

export default function PhotoGridCell({ photo }: { photo: Photo }) {
  return (
    <View style={styles.cell}>
      <Image source={{ uri: photo.uri }} style={styles.thumb} />
      <View style={styles.scrim}>
        <Ionicons name="location" size={9} color={colors.white} />
        <Text style={styles.overlayText} numberOfLines={1}>
          {photo.lat.toFixed(4)}, {photo.lng.toFixed(4)}
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
  scrim: {
    position: 'absolute',
    left: 3,
    right: 3,
    bottom: 3,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.overlayScrim,
    borderBottomLeftRadius: radius.sm,
    borderBottomRightRadius: radius.sm,
    paddingHorizontal: spacing.xs + 2,
    paddingVertical: spacing.xxs + 1,
  },
  overlayText: { flex: 1, color: colors.white, fontSize: 9, fontFamily: 'monospace' },
  badge: {
    position: 'absolute',
    top: spacing.sm - 2,
    left: spacing.sm - 2,
    backgroundColor: colors.warning,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: radius.sm - 2,
  },
  badgeText: { fontFamily: fontFamily.bold, color: colors.white, fontSize: 8, letterSpacing: 0.3 },
});
