import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';

import EmptyState from '@/components/common/EmptyState';
import LoadingView from '@/components/common/LoadingView';
import ScreenContainer from '@/components/common/ScreenContainer';
import ScreenTitle from '@/components/common/ScreenTitle';
import PersonFilterChips from '@/components/owner/PersonFilterChips';
import PhotoGridCell from '@/components/owner/PhotoGridCell';
import { colors, fontFamily, radius, spacing } from '@/constants/theme';
import { usePhotoQueueController } from '@/controllers/usePhotoQueueController';
import { usePhotoStore } from '@/store/usePhotoStore';

/** Not a real id — groups every photo with no stamped name under one filter chip. */
const UNKNOWN_ID = '__unknown__';

export default function PhotosScreen() {
  const { photos, pendingCount } = usePhotoQueueController();
  const loaded = usePhotoStore(state => state.loaded);
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);

  // Photos with no name on them (not yet backfilled, or taken before a name
  // was stamped on capture) share one "Unknown" chip instead of one per
  // person — there's nothing to tell those people apart by.
  const people = useMemo(() => {
    const byId = new Map<string, string>();
    let hasUnknown = false;
    for (const photo of photos) {
      if (photo.personName) byId.set(photo.personId, photo.personName);
      else hasUnknown = true;
    }
    const named = Array.from(byId, ([id, name]) => ({ id, name })).sort((a, b) =>
      a.name.localeCompare(b.name)
    );
    return hasUnknown ? [...named, { id: UNKNOWN_ID, name: 'Unknown' }] : named;
  }, [photos]);

  const visiblePhotos =
    selectedPersonId === null
      ? photos
      : selectedPersonId === UNKNOWN_ID
        ? photos.filter(photo => !photo.personName)
        : photos.filter(photo => photo.personId === selectedPersonId);

  if (!loaded) return <LoadingView />;

  return (
    <ScreenContainer padded={false}>
      <ScreenTitle>Photos</ScreenTitle>
      {pendingCount > 0 && (
        <View style={styles.pendingBar}>
          <Ionicons name="time-outline" size={13} color={colors.warningText} />
          <Text style={styles.pendingText}>
            {pendingCount} photo{pendingCount > 1 ? 's' : ''} of yours {pendingCount > 1 ? 'are' : 'is'} saved
            on this phone, not uploaded yet
          </Text>
        </View>
      )}
      {people.length > 0 && (
        <PersonFilterChips people={people} selectedId={selectedPersonId} onSelect={setSelectedPersonId} />
      )}
      <FlatList
        data={visiblePhotos}
        keyExtractor={photo => photo.id}
        numColumns={3}
        contentContainerStyle={{ padding: 8 }}
        renderItem={({ item }) => <PhotoGridCell photo={item} />}
        ListEmptyComponent={
          <EmptyState icon="images-outline" message="No photos yet. Take one from the Camera tab." />
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
