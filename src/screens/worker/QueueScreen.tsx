import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import EmptyState from '@/components/common/EmptyState';
import FilterChips from '@/components/common/FilterChips';
import LoadingView from '@/components/common/LoadingView';
import ScreenContainer from '@/components/common/ScreenContainer';
import PhotoNoteSheet from '@/components/worker/PhotoNoteSheet';
import PhotoQueueRow from '@/components/worker/PhotoQueueRow';
import { colors, fontFamily, glow, gradients, radius, spacing, typography } from '@/constants/theme';
import { usePhotoFilterController } from '@/controllers/usePhotoFilterController';
import { usePhotoNoteController } from '@/controllers/usePhotoNoteController';
import { usePhotoQueueController } from '@/controllers/usePhotoQueueController';
import { usePhotoStore } from '@/store/usePhotoStore';

/** Worker "My photos" tab: their own captures, filterable by site and date, with sync. */
export default function QueueScreen() {
  const { photos, pendingCount, syncNow, syncOne, syncing, syncError, syncStatus } =
    usePhotoQueueController();
  const { sharedNote, sharedInventoryId, visible, linkable, openNote, closeNote, saveNote } =
    usePhotoNoteController();
  const loaded = usePhotoStore(state => state.loaded);
  const insets = useSafeAreaInsets();
  const filters = usePhotoFilterController(photos);

  if (!loaded) return <LoadingView />;

  return (
    <ScreenContainer padded={false}>
      <View style={[styles.headerRow, { paddingTop: insets.top + spacing.lg }]}>
        <Text style={styles.title}>My photos</Text>
        {pendingCount ? (
          <TouchableOpacity onPress={syncNow} activeOpacity={0.8} disabled={syncing}>
            <LinearGradient
              colors={gradients.worker}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.syncButton, glow(colors.worker, 0.35)]}
            >
              {syncing ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <Ionicons name="sync" size={13} color={colors.white} />
              )}
              <Text style={styles.syncText}>{syncing ? 'Syncing…' : 'Sync now'}</Text>
            </LinearGradient>
          </TouchableOpacity>
        ) : (
          <View style={[styles.syncButton, styles.syncButtonDisabled]}>
            <Ionicons name="checkmark-done" size={13} color={colors.textMuted} />
            <Text style={styles.syncTextDisabled}>All synced</Text>
          </View>
        )}
      </View>
      {syncError && (
        <View style={styles.errorBar}>
          <Ionicons name="alert-circle-outline" size={14} color={colors.dangerText} />
          <Text style={styles.errorText}>{syncError}</Text>
        </View>
      )}
      {photos.length > 0 && (
        <>
          <FilterChips
            options={filters.siteOptions}
            selectedId={filters.siteFilter}
            onSelect={filters.setSiteFilter}
            accent={colors.worker}
          />
          <FilterChips
            options={filters.dateOptions}
            selectedId={filters.range}
            onSelect={filters.setRange}
            accent={colors.worker}
          />
        </>
      )}
      <FlatList
        data={filters.visiblePhotos}
        keyExtractor={photo => photo.id}
        contentContainerStyle={{ padding: spacing.lg }}
        renderItem={({ item }) => (
          <PhotoQueueRow
            photo={item}
            status={syncStatus[item.id]}
            onSync={() => syncOne(item.id)}
            onEditNote={() => openNote(item.id)}
          />
        )}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          <EmptyState
            icon="camera-outline"
            message={
              filters.filtering
                ? 'No photos match these filters.'
                : 'No photos yet — take one from the Camera tab.'
            }
          />
        }
      />
      <PhotoNoteSheet
        visible={visible}
        note={sharedNote}
        inventoryId={sharedInventoryId}
        items={linkable}
        onSave={saveNote}
        onClose={closeNote}
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
    paddingBottom: spacing.md,
  },
  title: { ...typography.title, color: colors.text },
  syncButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md + 2,
    paddingVertical: spacing.sm + 1,
    borderRadius: radius.pill,
  },
  errorBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    backgroundColor: colors.dangerBg,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.lg,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    borderRadius: radius.md,
  },
  errorText: { flex: 1, fontFamily: fontFamily.medium, color: colors.dangerText, fontSize: 12 },
  syncButtonDisabled: { backgroundColor: colors.background },
  syncText: { fontFamily: fontFamily.bold, color: colors.white, fontSize: 12.5 },
  syncTextDisabled: { fontFamily: fontFamily.bold, color: colors.textMuted, fontSize: 12.5 },
});
