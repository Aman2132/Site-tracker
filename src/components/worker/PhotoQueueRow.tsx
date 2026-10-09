import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { GEOTAG_ACCURACY } from '@/constants/config';
import { colors, fontFamily, radius, shadow, spacing } from '@/constants/theme';
import { PhotoSyncStatus } from '@/store/usePhotoStore';
import { Photo } from '@/types/domain';
import { formatDuration } from '@/utils/camera';
import { formatAccuracy } from '@/utils/formatters';

interface PhotoQueueRowProps {
  photo: Photo;
  status?: PhotoSyncStatus;
  /** Upload just this photo. */
  onSync?: () => void;
  /** Open the note sheet for this photo. */
  onEditNote?: () => void;
}

export default function PhotoQueueRow({ photo, status, onSync, onEditNote }: PhotoQueueRowProps) {
  const uploading = status === 'syncing';
  const failed = status === 'failed';
  const isLowAccuracy = photo.accuracy > GEOTAG_ACCURACY.goodMeters;

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <Image source={{ uri: photo.uri }} style={styles.thumb} />
        <View style={styles.textColumn}>
          <Text style={styles.title}>
            {photo.mediaType === 'video' ? `▶ ${photo.task}` : photo.task}
            {photo.mediaType === 'video' && photo.durationMs != null
              ? ` · ${formatDuration(photo.durationMs)}`
              : ''}
          </Text>
          <Text style={styles.meta}>
            {photo.lat.toFixed(6)} N {photo.lng.toFixed(6)} E {formatAccuracy(photo.accuracy)}
          </Text>
          <Text style={styles.meta}>{photo.plusCode}</Text>
          <Text style={styles.meta}>
            {new Date(photo.takenAt).toLocaleTimeString()} ·{' '}
            {photo.synced
              ? 'uploaded'
              : uploading
                ? 'uploading…'
                : failed
                  ? 'upload failed'
                  : 'saved offline'}
          </Text>
          {isLowAccuracy && (
            <View style={styles.lowAccuracyBadge}>
              <Ionicons name="warning" size={10} color={colors.warningText} />
              <Text style={styles.lowAccuracyText}>Low accuracy — retake?</Text>
            </View>
          )}
        </View>
        <View style={[styles.state, photo.synced ? styles.stateSynced : styles.stateQueued]}>
          <Ionicons
            name={photo.synced ? 'checkmark-circle' : failed ? 'alert-circle' : 'time'}
            size={11}
            color={photo.synced ? colors.successText : colors.warningText}
          />
          <Text style={photo.synced ? styles.stateTextSynced : styles.stateTextQueued}>
            {photo.synced ? 'SYNCED' : failed ? 'FAILED' : uploading ? 'UPLOADING' : 'QUEUED'}
          </Text>
        </View>
      </View>
      {photo.note && photo.synced && <Text style={styles.note}>{photo.note}</Text>}
      {!photo.synced && (
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.noteButton}
            onPress={onEditNote}
            disabled={uploading || !onEditNote}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={photo.note ? 'Edit note' : 'Add note'}
          >
            <Ionicons name="create-outline" size={16} color={colors.primary} />
            <Text style={styles.noteButtonText} numberOfLines={2}>
              {photo.note ?? (photo.inventoryId ? 'Item linked · add note' : 'Add note / item')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.syncButton, uploading && styles.syncButtonBusy]}
            onPress={onSync}
            disabled={uploading || !onSync}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel={failed ? 'Retry sync' : 'Sync this photo'}
          >
            {uploading ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <Ionicons name="sync" size={15} color={colors.white} />
            )}
            <Text style={styles.syncButtonText}>{failed ? 'Retry' : 'Sync'}</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm + 2,
    gap: spacing.sm,
    ...shadow.sm,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  note: { fontFamily: fontFamily.regular, fontSize: 13, color: colors.text },
  actions: { flexDirection: 'row', alignItems: 'stretch', gap: spacing.sm },
  noteButton: {
    flex: 1,
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
  },
  noteButtonText: { flex: 1, fontFamily: fontFamily.semibold, fontSize: 13, color: colors.primary },
  syncButton: {
    minHeight: 48,
    minWidth: 92,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs + 2,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
  },
  syncButtonBusy: { opacity: 0.6 },
  syncButtonText: { fontFamily: fontFamily.bold, fontSize: 14, color: colors.white },
  thumb: { width: 54, height: 54, borderRadius: radius.sm + 2, backgroundColor: colors.placeholderImage },
  textColumn: { flex: 1 },
  title: { fontFamily: fontFamily.bold, fontSize: 13.5, color: colors.text },
  meta: { fontSize: 10.5, color: colors.textMuted, fontFamily: 'monospace', marginTop: 2 },
  state: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm - 2,
    borderRadius: radius.pill,
  },
  stateQueued: { backgroundColor: colors.warningBg },
  stateSynced: { backgroundColor: colors.successBg },
  stateTextQueued: { fontFamily: fontFamily.bold, color: colors.warningText, fontSize: 10 },
  stateTextSynced: { fontFamily: fontFamily.bold, color: colors.successText, fontSize: 10 },
  lowAccuracyBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 3 },
  lowAccuracyText: { fontFamily: fontFamily.bold, color: colors.warningText, fontSize: 9.5 },
});
