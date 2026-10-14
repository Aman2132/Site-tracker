import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import React, { useEffect } from 'react';
import { SectionList, StyleSheet, Text, View } from 'react-native';

import EmptyState from '@/components/common/EmptyState';
import FilterSheet from '@/components/common/FilterSheet';
import LoadingView from '@/components/common/LoadingView';
import ScreenContainer from '@/components/common/ScreenContainer';
import ScreenTitle from '@/components/common/ScreenTitle';
import PendingSyncBar from '@/components/owner/PendingSyncBar';
import PhotoGridCell from '@/components/owner/PhotoGridCell';
import PhotoViewer from '@/components/owner/PhotoViewer';
import { colors, fontFamily, spacing } from '@/constants/theme';
import { EVERYONE, useOwnerPhotosController } from '@/controllers/useOwnerPhotosController';
import { OwnerTabParamList } from '@/types/navigation';

/** Owner Photos tab: everyone's photos by day, filterable by person, site and date; tap one to open it. */
export default function PhotosScreen() {
  const photos = useOwnerPhotosController();
  const { filters } = photos;
  const route = useRoute<RouteProp<OwnerTabParamList, 'Photos'>>();
  const navigation = useNavigation();

  // Arriving from an Activity entry: show that person's photos, then drop the param so it applies once.
  const focusPersonId = route.params?.personId;
  const { setPersonId } = photos;
  useEffect(() => {
    if (!focusPersonId) return;
    setPersonId(focusPersonId);
    navigation.setParams({ personId: undefined } as never);
  }, [focusPersonId, setPersonId, navigation]);

  if (!photos.loaded) return <LoadingView />;

  return (
    <ScreenContainer padded={false}>
      <ScreenTitle>Photos</ScreenTitle>
      {photos.pendingCount > 0 && (
        <PendingSyncBar
          pendingCount={photos.pendingCount}
          syncing={photos.syncing}
          syncError={photos.syncError}
          onSync={photos.syncNow}
        />
      )}
      {photos.hasPhotos && (
        <FilterSheet
          summary={photos.summary}
          activeCount={photos.activeFilterCount}
          onReset={photos.reset}
          sections={[
            {
              title: 'Site',
              options: filters.siteOptions,
              selectedId: filters.siteFilter,
              onSelect: filters.setSiteFilter,
            },
            {
              title: 'Date',
              options: filters.dateOptions,
              selectedId: filters.range,
              onSelect: filters.setRange,
            },
            ...(photos.people.length > 2
              ? [
                  {
                    title: 'Person',
                    options: photos.people,
                    selectedId: photos.personId,
                    onSelect: setPersonId,
                  },
                ]
              : []),
          ]}
        />
      )}
      <SectionList
        sections={photos.sections}
        keyExtractor={row => row[0].id}
        contentContainerStyle={styles.list}
        stickySectionHeadersEnabled={false}
        renderSectionHeader={({ section }) => <Text style={styles.dayHeader}>{section.title}</Text>}
        renderItem={({ item: row }) => (
          <View style={styles.row}>
            {row.map(photo => (
              <PhotoGridCell key={photo.id} photo={photo} onPress={() => photos.open(photo.id)} />
            ))}
          </View>
        )}
        ListEmptyComponent={
          <EmptyState
            icon="images-outline"
            message={
              filters.filtering || photos.personId !== EVERYONE
                ? 'No photos match these filters.'
                : 'No photos yet. Take one from the Camera tab.'
            }
          />
        }
      />
      <PhotoViewer
        photo={photos.openPhoto}
        siteName={photos.openPhotoSiteName}
        onClose={photos.close}
        onOpenMaps={photos.showOnMap}
        onPlayVideo={photos.playVideo}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  list: { padding: spacing.sm, paddingBottom: spacing.xl },
  row: { flexDirection: 'row' },
  dayHeader: {
    fontFamily: fontFamily.bold,
    fontSize: 13,
    color: colors.text,
    paddingHorizontal: spacing.xs,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
  },
});
