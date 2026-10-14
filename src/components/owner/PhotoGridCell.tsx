import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import Skeleton from '@/components/common/Skeleton';
import { colors, fontFamily, radius, spacing } from '@/constants/theme';
import { Photo } from '@/types/domain';
import { formatClockTime } from '@/utils/formatters';

/** One square in the owner's photo grid: thumbnail, time + first name, tap to open full size. */
export default function PhotoGridCell({ photo, onPress }: { photo: Photo; onPress: () => void }) {
  const [state, setState] = useState<'loading' | 'loaded' | 'failed'>('loading');
  const firstName = photo.personName?.split(' ')[0] ?? 'Unknown';

  return (
    <TouchableOpacity
      style={styles.cell}
      onPress={onPress}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={`${photo.mediaType === 'video' ? 'Video' : 'Photo'} by ${photo.personName ?? 'unknown'} at ${formatClockTime(photo.takenAt)}. Open`}
    >
      <View style={styles.frame}>
        {state === 'loading' && <Skeleton style={StyleSheet.absoluteFill} />}
        {state === 'failed' ? (
          <View style={styles.failed}>
            <Ionicons name="image-outline" size={22} color={colors.textFaint} />
          </View>
        ) : (
          <Image
            source={{ uri: photo.thumbUrl ?? photo.uri }}
            style={styles.thumb}
            onLoad={() => setState('loaded')}
            onError={() => setState('failed')}
          />
        )}
        <View style={styles.scrim}>
          <Text style={styles.caption} numberOfLines={1}>
            {formatClockTime(photo.takenAt)} · {firstName}
          </Text>
        </View>
        {photo.mediaType === 'video' && (
          <View style={styles.playWrap} pointerEvents="none">
            <Ionicons name="play-circle" size={30} color={colors.white} />
          </View>
        )}
        {!photo.synced && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>QUEUED</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  cell: { width: '33.33%', aspectRatio: 1, padding: 3 },
  frame: { flex: 1, borderRadius: radius.sm, overflow: 'hidden', backgroundColor: colors.background },
  thumb: { flex: 1 },
  failed: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.border },
  scrim: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.overlayScrim,
    paddingHorizontal: spacing.xs + 2,
    paddingVertical: spacing.xxs + 1,
  },
  caption: { color: colors.white, fontSize: 11.5, fontFamily: fontFamily.semibold },
  playWrap: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: spacing.xs,
    left: spacing.xs,
    backgroundColor: colors.warning,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: radius.sm - 2,
  },
  badgeText: { fontFamily: fontFamily.bold, color: colors.white, fontSize: 8, letterSpacing: 0.3 },
});
