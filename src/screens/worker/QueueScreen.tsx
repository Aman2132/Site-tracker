import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import EmptyState from '@/components/common/EmptyState';
import LoadingView from '@/components/common/LoadingView';
import ScreenContainer from '@/components/common/ScreenContainer';
import PhotoQueueRow from '@/components/worker/PhotoQueueRow';
import { colors, fontFamily, glow, gradients, radius, spacing, typography } from '@/constants/theme';
import { usePhotoQueueController } from '@/controllers/usePhotoQueueController';
import { usePhotoStore } from '@/store/usePhotoStore';

export default function QueueScreen() {
  const { photos, pendingCount, syncNow } = usePhotoQueueController();
  const loaded = usePhotoStore(state => state.loaded);
  const insets = useSafeAreaInsets();

  if (!loaded) return <LoadingView />;

  return (
    <ScreenContainer padded={false}>
      <View style={[styles.headerRow, { paddingTop: insets.top + spacing.lg }]}>
        <Text style={styles.title}>My photos</Text>
        {pendingCount ? (
          <TouchableOpacity onPress={syncNow} activeOpacity={0.8}>
            <LinearGradient
              colors={gradients.worker}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.syncButton, glow(colors.worker, 0.35)]}
            >
              <Ionicons name="sync" size={13} color={colors.white} />
              <Text style={styles.syncText}>Sync now</Text>
            </LinearGradient>
          </TouchableOpacity>
        ) : (
          <View style={[styles.syncButton, styles.syncButtonDisabled]}>
            <Ionicons name="checkmark-done" size={13} color={colors.textMuted} />
            <Text style={styles.syncTextDisabled}>All synced</Text>
          </View>
        )}
      </View>
      <FlatList
        data={photos}
        keyExtractor={photo => photo.id}
        contentContainerStyle={{ padding: spacing.lg }}
        renderItem={({ item }) => <PhotoQueueRow photo={item} />}
        ListEmptyComponent={
          <EmptyState icon="camera-outline" message="No photos yet — take one from the Camera tab." />
        }
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
  syncButtonDisabled: { backgroundColor: colors.background },
  syncText: { fontFamily: fontFamily.bold, color: colors.white, fontSize: 12.5 },
  syncTextDisabled: { fontFamily: fontFamily.bold, color: colors.textMuted, fontSize: 12.5 },
});
