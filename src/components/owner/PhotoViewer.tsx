import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Image, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import ZoomableImage from '@/components/common/ZoomableImage';
import { colors, fontFamily, radius, spacing } from '@/constants/theme';
import { Photo } from '@/types/domain';
import { formatAccuracy, formatDayTime } from '@/utils/formatters';

/**
 * Full-screen view of one capture: pinch/double-tap zoom for photos, a play
 * button for videos, and who / when / where underneath. Props in, JSX out.
 */
export default function PhotoViewer({
  photo,
  siteName,
  onClose,
  onOpenMaps,
  onPlayVideo,
}: {
  photo: Photo | null;
  siteName: string | null;
  onClose: () => void;
  onOpenMaps: () => void;
  onPlayVideo: () => void;
}) {
  const insets = useSafeAreaInsets();
  if (!photo) return null;
  const isVideo = photo.mediaType === 'video';

  return (
    <Modal visible animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.screen}>
        {isVideo ? (
          <View style={styles.videoWrap}>
            {photo.thumbUrl && (
              <Image source={{ uri: photo.thumbUrl }} style={StyleSheet.absoluteFill} resizeMode="contain" />
            )}
            <TouchableOpacity
              onPress={onPlayVideo}
              accessibilityRole="button"
              accessibilityLabel="Play video"
            >
              <Ionicons name="play-circle" size={72} color={colors.white} />
            </TouchableOpacity>
          </View>
        ) : (
          <ZoomableImage uri={photo.uri} />
        )}

        <TouchableOpacity
          style={[styles.close, { top: insets.top + spacing.sm }]}
          onPress={onClose}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Close photo"
        >
          <Ionicons name="close" size={22} color={colors.white} />
        </TouchableOpacity>

        <View style={[styles.info, { paddingBottom: insets.bottom + spacing.lg }]} pointerEvents="box-none">
          <Text style={styles.title} numberOfLines={1}>
            {photo.personName ?? 'Unknown'} · {photo.task}
          </Text>
          <Text style={styles.meta}>{formatDayTime(photo.takenAt)}</Text>
          <Text style={styles.meta}>
            {siteName ?? 'No site'} · {formatAccuracy(photo.accuracy)}
          </Text>
          {photo.note && <Text style={styles.note}>{photo.note}</Text>}
          <TouchableOpacity
            style={styles.mapsButton}
            onPress={onOpenMaps}
            activeOpacity={0.8}
            accessibilityRole="button"
          >
            <Ionicons name="navigate-outline" size={15} color={colors.white} />
            <Text style={styles.mapsText}>Show on map</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.black },
  videoWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  close: {
    position: 'absolute',
    left: spacing.md,
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.glass,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    backgroundColor: colors.glassStrong,
    gap: spacing.xxs,
  },
  title: { fontFamily: fontFamily.bold, fontSize: 15, color: colors.white },
  meta: { fontFamily: fontFamily.regular, fontSize: 12.5, color: colors.onGlassMuted },
  note: { fontFamily: fontFamily.medium, fontSize: 13, color: colors.white, marginTop: spacing.xs },
  mapsButton: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    alignItems: 'center',
    gap: spacing.xs + 2,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.onGlassMuted,
  },
  mapsText: { fontFamily: fontFamily.bold, fontSize: 12.5, color: colors.white },
});
