import React from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import EmptyState from '@/components/common/EmptyState';
import LoadingView from '@/components/common/LoadingView';
import ScreenContainer from '@/components/common/ScreenContainer';
import PhotoQueueRow from '@/components/worker/PhotoQueueRow';
import { colors, radius, spacing } from '@/constants/theme';
import { usePhotoQueueController } from '@/controllers/usePhotoQueueController';
import { usePhotoStore } from '@/store/usePhotoStore';

export default function QueueScreen() {
  const { photos, pendingCount, syncNow } = usePhotoQueueController();
  const loaded = usePhotoStore(state => state.loaded);

  if (!loaded) return <LoadingView />;

  return (
    <ScreenContainer padded={false}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>My photos</Text>
        <TouchableOpacity
          disabled={!pendingCount}
          onPress={syncNow}
          style={[styles.syncButton, !pendingCount && styles.syncButtonDisabled]}
        >
          <Text style={[styles.syncText, !pendingCount && styles.syncTextDisabled]}>
            {pendingCount ? 'Sync now' : 'All synced'}
          </Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={photos}
        keyExtractor={photo => photo.id}
        contentContainerStyle={{ padding: spacing.lg }}
        renderItem={({ item }) => <PhotoQueueRow photo={item} />}
        ListEmptyComponent={<EmptyState message="No photos yet — take one from the Camera tab." />}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
  },
  title: { fontSize: 22, fontWeight: '700', color: colors.text },
  syncButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md + 2,
    paddingVertical: spacing.sm + 1,
    borderRadius: radius.sm + 2,
  },
  syncButtonDisabled: { backgroundColor: '#f2eee6' },
  syncText: { color: colors.white, fontSize: 12.5, fontWeight: '600' },
  syncTextDisabled: { color: colors.textMuted },
});
