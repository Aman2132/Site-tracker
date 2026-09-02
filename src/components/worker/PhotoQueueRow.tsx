import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing } from '@/constants/theme';
import { Photo } from '@/types/domain';
import { formatAccuracy } from '@/utils/formatters';

export default function PhotoQueueRow({ photo }: { photo: Photo }) {
  return (
    <View style={styles.row}>
      <Image source={{ uri: photo.uri }} style={styles.thumb} />
      <View style={styles.textColumn}>
        <Text style={styles.title}>{photo.task}</Text>
        <Text style={styles.meta}>
          {photo.lat.toFixed(6)} N {photo.lng.toFixed(6)} E {formatAccuracy(photo.accuracy)}
        </Text>
        <Text style={styles.meta}>
          {new Date(photo.takenAt).toLocaleTimeString()} · {photo.synced ? 'uploaded' : 'saved offline'}
        </Text>
      </View>
      <View style={[styles.state, photo.synced ? styles.stateSynced : styles.stateQueued]}>
        <Text style={photo.synced ? styles.stateTextSynced : styles.stateTextQueued}>
          {photo.synced ? 'SYNCED' : 'QUEUED'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm + 2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  thumb: { width: 52, height: 52, borderRadius: radius.sm + 2, backgroundColor: colors.placeholderImage },
  textColumn: { flex: 1 },
  title: { fontSize: 13.5, color: colors.text },
  meta: { fontSize: 10.5, color: colors.textMuted, fontFamily: 'monospace', marginTop: 2 },
  state: { paddingHorizontal: spacing.sm, paddingVertical: spacing.sm - 2, borderRadius: 6 },
  stateQueued: { backgroundColor: colors.warningBg },
  stateSynced: { backgroundColor: colors.successBg },
  stateTextQueued: { color: colors.warningText, fontSize: 10, fontWeight: '600' },
  stateTextSynced: { color: colors.successText, fontSize: 10, fontWeight: '600' },
});
