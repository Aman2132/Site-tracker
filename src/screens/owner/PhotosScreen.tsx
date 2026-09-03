import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';

import EmptyState from '@/components/common/EmptyState';
import LoadingView from '@/components/common/LoadingView';
import ScreenContainer from '@/components/common/ScreenContainer';
import ScreenTitle from '@/components/common/ScreenTitle';
import PhotoGridCell from '@/components/owner/PhotoGridCell';
import { colors, fontFamily, radius, spacing } from '@/constants/theme';
import { usePhotoQueueController } from '@/controllers/usePhotoQueueController';
import { usePhotoStore } from '@/store/usePhotoStore';

export default function PhotosScreen() {
  const { photos, pendingCount } = usePhotoQueueController();
  const loaded = usePhotoStore(state => state.loaded);

  if (!loaded) return <LoadingView />;

  return (
    <ScreenContainer padded={false}>
      <ScreenTitle>Photos</ScreenTitle>
      {pendingCount > 0 && (
        <View style={styles.pendingBar}>
          <Ionicons name="time-outline" size={13} color={colors.warningText} />
          <Text style={styles.pendingText}>
            {pendingCount} photo{pendingCount > 1 ? 's' : ''} waiting on a connection
          </Text>
        </View>
      )}
      <FlatList
        data={photos}
        keyExtractor={photo => photo.id}
        numColumns={3}
        contentContainerStyle={{ padding: 8 }}
        renderItem={({ item }) => <PhotoGridCell photo={item} />}
        ListEmptyComponent={
          <EmptyState icon="images-outline" message="No photos yet. Take one from the worker Camera tab." />
        }
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  pendingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    backgroundColor: colors.warningBg,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.lg,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    borderRadius: radius.md,
  },
  pendingText: { fontFamily: fontFamily.medium, color: colors.warningText, fontSize: 12 },
});
