import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Alert, Image, Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import ZoomableImage from '@/components/common/ZoomableImage';
import { colors, radius, shadow, spacing, typography } from '@/constants/theme';
import { savePhotoToGallery, sharePhoto } from '@/services/photoExportService';
import { Photo } from '@/types/domain';

/** Full-screen capture viewer with an in-app options menu. */
export default function PhotoViewer({
  photo,
  onClose,
  onOpenMaps,
  onPlayVideo,
}: {
  photo: Photo | null;
  onClose: () => void;
  onOpenMaps: () => void;
  onPlayVideo: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [exporting, setExporting] = useState<'save' | 'share' | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [loadedUri, setLoadedUri] = useState<string | null>(null);
  if (!photo) return null;
  const isVideo = photo.mediaType === 'video';

  const runExport = async (action: 'save' | 'share') => {
    if (exporting) return;
    setExporting(action);
    try {
      if (action === 'save') await savePhotoToGallery(photo);
      else await sharePhoto(photo);
      if (action === 'save') Alert.alert('Saved', 'Photo saved to your gallery.');
    } catch (error) {
      Alert.alert(
        action === 'save' ? 'Could not save photo' : 'Could not share photo',
        error instanceof Error ? error.message : 'Please try again.'
      );
    } finally {
      setExporting(null);
    }
  };

  return (
    <Modal
      visible
      animationType="fade"
      onRequestClose={() => (menuOpen ? setMenuOpen(false) : onClose())}
      statusBarTranslucent
    >
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
          <>
            {loadedUri !== photo.uri && (photo.localThumbUri ?? photo.thumbUrl) && (
              <Image
                source={{ uri: photo.localThumbUri ?? photo.thumbUrl }}
                style={StyleSheet.absoluteFill}
                resizeMode="contain"
              />
            )}
            <ZoomableImage key={photo.uri} uri={photo.uri} onLoad={() => setLoadedUri(photo.uri)} />
          </>
        )}

        {menuOpen && (
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setMenuOpen(false)}
            accessibilityLabel="Dismiss photo options"
          />
        )}
        <TouchableOpacity
          style={[styles.options, { top: insets.top + spacing.sm }]}
          onPress={() => setMenuOpen(open => !open)}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Photo options"
          accessibilityState={{ expanded: menuOpen }}
        >
          <Ionicons name="ellipsis-vertical" size={22} color={colors.white} />
        </TouchableOpacity>
        {menuOpen && (
          <View style={[styles.menu, { top: insets.top + spacing.sm + 48 }]}>
            {!isVideo && (
              <>
                <TouchableOpacity
                  style={styles.menuItem}
                  disabled={exporting !== null}
                  onPress={() => {
                    setMenuOpen(false);
                    runExport('save');
                  }}
                  accessibilityRole="button"
                >
                  <Ionicons name="download-outline" size={22} color={colors.text} />
                  <Text style={styles.menuText}>Save to gallery</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.menuItem}
                  disabled={exporting !== null}
                  onPress={() => {
                    setMenuOpen(false);
                    runExport('share');
                  }}
                  accessibilityRole="button"
                >
                  <Ionicons name="share-social-outline" size={22} color={colors.text} />
                  <Text style={styles.menuText}>Share photo</Text>
                </TouchableOpacity>
              </>
            )}
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setMenuOpen(false);
                onOpenMaps();
              }}
              accessibilityRole="button"
            >
              <Ionicons name="navigate-outline" size={22} color={colors.text} />
              <Text style={styles.menuText}>Show on map</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.black },
  videoWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  options: {
    position: 'absolute',
    right: spacing.md,
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.glass,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menu: {
    position: 'absolute',
    right: spacing.md,
    minWidth: 200,
    paddingVertical: spacing.xs,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    ...shadow.lg,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  menuText: { ...typography.bodyMedium, color: colors.text },
});
