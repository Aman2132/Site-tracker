import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import { colors, fontFamily, radius, shadow, spacing } from '@/constants/theme';
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
        <Ionicons
          name={photo.synced ? 'checkmark-circle' : 'time'}
          size={11}
          color={photo.synced ? colors.successText : colors.warningText}
        />
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
    ...shadow.sm,
  },
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
});
