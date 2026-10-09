import React, { useMemo, useState } from 'react';
import { FlatList } from 'react-native';

import EmptyState from '@/components/common/EmptyState';
import FilterChips from '@/components/common/FilterChips';
import LoadingView from '@/components/common/LoadingView';
import ScreenContainer from '@/components/common/ScreenContainer';
import ScreenTitle from '@/components/common/ScreenTitle';
import PendingSyncBar from '@/components/owner/PendingSyncBar';
import PhotoGridCell from '@/components/owner/PhotoGridCell';
import { usePhotoFilterController } from '@/controllers/usePhotoFilterController';
import { usePhotoQueueController } from '@/controllers/usePhotoQueueController';
import { usePhotoStore } from '@/store/usePhotoStore';

/** Not real ids — "everyone", and every photo with no stamped name. */
const EVERYONE = '__everyone__';
const UNKNOWN_ID = '__unknown__';

/** Owner Photos tab: everyone's photos, filterable by person, site and date. */
export default function PhotosScreen() {
  const { photos, pendingCount, syncNow, syncing, syncError } = usePhotoQueueController();
  const loaded = usePhotoStore(state => state.loaded);
  const [selectedPersonId, setSelectedPersonId] = useState<string>(EVERYONE);

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
    const named = Array.from(byId, ([id, label]) => ({ id, label })).sort((a, b) =>
      a.label.localeCompare(b.label)
    );
    return [
      { id: EVERYONE, label: 'Everyone' },
      ...named,
      ...(hasUnknown ? [{ id: UNKNOWN_ID, label: 'Unknown' }] : []),
    ];
  }, [photos]);

  const personPhotos = useMemo(
    () =>
      selectedPersonId === EVERYONE
        ? photos
        : selectedPersonId === UNKNOWN_ID
          ? photos.filter(photo => !photo.personName)
          : photos.filter(photo => photo.personId === selectedPersonId),
    [photos, selectedPersonId]
  );
  const filters = usePhotoFilterController(personPhotos);

  if (!loaded) return <LoadingView />;

  return (
    <ScreenContainer padded={false}>
      <ScreenTitle>Photos</ScreenTitle>
      {pendingCount > 0 && (
        <PendingSyncBar
          pendingCount={pendingCount}
          syncing={syncing}
          syncError={syncError}
          onSync={syncNow}
        />
      )}
      {photos.length > 0 && (
        <>
          <FilterChips
            options={filters.siteOptions}
            selectedId={filters.siteFilter}
            onSelect={filters.setSiteFilter}
          />
          <FilterChips options={filters.dateOptions} selectedId={filters.range} onSelect={filters.setRange} />
          {people.length > 2 && (
            <FilterChips options={people} selectedId={selectedPersonId} onSelect={setSelectedPersonId} />
          )}
        </>
      )}
      <FlatList
        data={filters.visiblePhotos}
        keyExtractor={photo => photo.id}
        numColumns={3}
        contentContainerStyle={{ padding: 8 }}
        renderItem={({ item }) => <PhotoGridCell photo={item} />}
        ListEmptyComponent={
          <EmptyState
            icon="images-outline"
            message={
              filters.filtering || selectedPersonId !== EVERYONE
                ? 'No photos match these filters.'
                : 'No photos yet. Take one from the Camera tab.'
            }
          />
        }
      />
    </ScreenContainer>
  );
}
