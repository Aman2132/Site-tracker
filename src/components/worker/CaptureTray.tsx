import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { colors, fontFamily, radius, spacing } from '@/constants/theme';
import { Photo } from '@/types/domain';

/**
 * Strip of this camera visit's captures over the viewfinder. Tapping one opens
 * the note/item sheet for just that capture; the count button opens it for the
 * whole batch. Presentational: the controller owns the tray.
 */
export default function CaptureTray({
  photos,
  onOpenOne,
  onOpenAll,
}: {
  photos: Photo[];
  onOpenOne: (id: string) => void;
  onOpenAll: () => void;
}) {
  if (photos.length === 0) return null;
  return (
    <View style={styles.wrap}>
      <TouchableOpacity
        style={styles.all}
        onPress={onOpenAll}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel={`Add a note to all ${photos.length} captures`}
      >
        <Ionicons name="create-outline" size={16} color={colors.white} />
        <Text style={styles.allText}>{photos.length === 1 ? 'Add note' : `Note all ${photos.length}`}</Text>
      </TouchableOpacity>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.strip}>
        {photos.map(photo => (
          <TouchableOpacity
            key={photo.id}
            onPress={() => onOpenOne(photo.id)}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Add a note to this capture"
          >
            {photo.mediaType === 'video' ? (
              <View style={[styles.thumb, styles.video]}>
                <Ionicons name="videocam" size={18} color={colors.white} />
              </View>
            ) : (
              <Image source={{ uri: photo.uri }} style={styles.thumb} />
            )}
            {(photo.note || photo.inventoryId) && (
              <View style={styles.badge}>
                <Ionicons name={photo.inventoryId ? 'cube' : 'create'} size={10} color={colors.white} />
              </View>
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const THUMB = 52;

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 214,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingLeft: spacing.lg,
  },
  all: {
    minHeight: THUMB,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.glassStrong,
  },
  allText: { fontFamily: fontFamily.bold, fontSize: 13, color: colors.white },
  strip: { gap: spacing.xs + 2, paddingRight: spacing.lg },
  thumb: {
    width: THUMB,
    height: THUMB,
    borderRadius: radius.sm,
    borderWidth: 2,
    borderColor: colors.white,
    backgroundColor: colors.glassStrong,
  },
  video: { alignItems: 'center', justifyContent: 'center' },
  badge: {
    position: 'absolute',
    right: -3,
    top: -3,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.worker,
  },
});
