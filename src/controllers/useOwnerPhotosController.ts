import { useCallback, useMemo, useState } from 'react';

import { usePhotoFilterController } from '@/controllers/usePhotoFilterController';
import { usePhotoQueueController } from '@/controllers/usePhotoQueueController';
import { openInMaps, openUrl } from '@/services/linkingService';
import { usePhotoStore } from '@/store/usePhotoStore';
import { Photo } from '@/types/domain';
import { groupByDay } from '@/utils/formatters';
import { ALL_SITES, DATE_RANGES, NO_SITE } from '@/utils/photoFilters';

/** Not real ids — "everyone", and every photo with no stamped name. */
export const EVERYONE = '__everyone__';
const UNKNOWN_ID = '__unknown__';
const GRID_COLUMNS = 3;

/**
 * Owner Photos tab: everyone's photos, narrowed by person, site and date,
 * grouped by day into grid rows, plus the full-size viewer.
 */
export function useOwnerPhotosController() {
  const queue = usePhotoQueueController();
  const { photos } = queue;
  const loaded = usePhotoStore(state => state.loaded);
  const [personId, setPersonId] = useState<string>(EVERYONE);
  const [openId, setOpenId] = useState<string | null>(null);

  // Photos with no name on them (not yet backfilled, or taken before a name
  // was stamped on capture) share one "Unknown" choice instead of one per
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
  // Someone with no photos left (e.g. a tap-through from Activity) falls back to everyone.
  const selectedPerson = people.some(person => person.id === personId) ? personId : EVERYONE;

  const personPhotos = useMemo(
    () =>
      selectedPerson === EVERYONE
        ? photos
        : selectedPerson === UNKNOWN_ID
          ? photos.filter(photo => !photo.personName)
          : photos.filter(photo => photo.personId === selectedPerson),
    [photos, selectedPerson]
  );
  const filters = usePhotoFilterController(personPhotos);

  /** One section per day, its photos split into rows of three for the grid. */
  const sections = useMemo(
    () =>
      groupByDay(
        [...filters.visiblePhotos].sort((a, b) => b.takenAt - a.takenAt),
        photo => photo.takenAt
      ).map(({ title, data }) => ({
        title,
        data: Array.from({ length: Math.ceil(data.length / GRID_COLUMNS) }, (_, row) =>
          data.slice(row * GRID_COLUMNS, row * GRID_COLUMNS + GRID_COLUMNS)
        ),
      })),
    [filters.visiblePhotos]
  );

  const siteLabel = (siteId: string | undefined): string | null =>
    siteId ? (filters.siteNames[siteId] ?? 'Unknown site') : null;

  const summary = [
    filters.siteFilter === ALL_SITES
      ? 'All sites'
      : filters.siteFilter === NO_SITE
        ? 'No site'
        : siteLabel(filters.siteFilter),
    DATE_RANGES.find(range => range.id === filters.range)?.label,
    people.find(person => person.id === selectedPerson)?.label,
  ].join(' · ');

  const reset = useCallback(() => {
    filters.setSiteFilter(ALL_SITES);
    filters.setRange('all');
    setPersonId(EVERYONE);
  }, [filters]);

  const openPhoto: Photo | null = photos.find(photo => photo.id === openId) ?? null;

  return {
    loaded,
    hasPhotos: photos.length > 0,
    pendingCount: queue.pendingCount,
    syncNow: queue.syncNow,
    syncing: queue.syncing,
    syncError: queue.syncError,
    sections,
    filters,
    people,
    personId: selectedPerson,
    setPersonId,
    summary,
    activeFilterCount:
      Number(filters.siteFilter !== ALL_SITES) +
      Number(filters.range !== 'all') +
      Number(selectedPerson !== EVERYONE),
    reset,
    openPhoto,
    openPhotoSiteName: siteLabel(openPhoto?.siteId),
    open: setOpenId,
    close: () => setOpenId(null),
    showOnMap: () => openPhoto && openInMaps(openPhoto.lat, openPhoto.lng, openPhoto.task),
    playVideo: () => openPhoto && openUrl(openPhoto.uri),
  };
}
