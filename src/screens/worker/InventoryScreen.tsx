import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useState } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import EmptyState from '@/components/common/EmptyState';
import LoadingView from '@/components/common/LoadingView';
import ScreenContainer from '@/components/common/ScreenContainer';
import InventoryEntrySheet from '@/components/worker/InventoryEntrySheet';
import InventoryRow from '@/components/worker/InventoryRow';
import InventoryUsageSheet from '@/components/worker/InventoryUsageSheet';
import { colors, fontFamily, glow, gradients, radius, spacing, typography } from '@/constants/theme';
import { useInventoryController } from '@/controllers/useInventoryController';
import { InventoryEntry } from '@/types/domain';
import { ItemSuggestion } from '@/utils/inventory';

export default function InventoryScreen() {
  const inventory = useInventoryController();
  const insets = useSafeAreaInsets();
  /** Null while closed; `preset` set when opened from a row's "+ again". */
  const [sheet, setSheet] = useState<{ preset?: ItemSuggestion } | null>(null);
  const close = useCallback(() => setSheet(null), []);
  const [usageFor, setUsageFor] = useState<InventoryEntry | null>(null);
  const closeUsage = useCallback(() => setUsageFor(null), []);
  const noSites = inventory.sites.length === 0;

  if (!inventory.loaded) return <LoadingView />;

  return (
    <ScreenContainer padded={false}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.lg }]}>
        <Text style={styles.title}>Items received</Text>
        {inventory.waitingCount > 0 && (
          <Text style={styles.waiting}>{inventory.waitingCount} waiting to sync</Text>
        )}
      </View>

      <TouchableOpacity
        onPress={() => setSheet({})}
        activeOpacity={0.85}
        disabled={noSites}
        style={styles.addWrap}
      >
        <LinearGradient
          colors={gradients.worker}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.add, glow(colors.worker, 0.3), noSites && styles.addDisabled]}
        >
          <Ionicons name="add-circle" size={24} color={colors.white} />
          <Text style={styles.addText}>Log received items</Text>
        </LinearGradient>
      </TouchableOpacity>
      {noSites && <Text style={styles.hint}>You are not assigned to a site yet. Ask your admin.</Text>}
      {inventory.syncError && <Text style={styles.error}>Not sent yet: {inventory.syncError}</Text>}

      <FlatList
        data={inventory.items}
        keyExtractor={entry => entry.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <InventoryRow
            entry={item}
            siteName={inventory.siteNames[item.siteId]}
            canLogUsage={inventory.canLogUsage(item)}
            onRepeat={() => setSheet({ preset: { name: item.name, unit: item.unit } })}
            onLogUsage={() => setUsageFor(item)}
          />
        )}
        ListEmptyComponent={
          <EmptyState
            icon="cube-outline"
            message="Nothing logged at your sites yet. Tap the button above when a delivery arrives."
          />
        }
      />

      <InventoryEntrySheet
        visible={sheet != null}
        sites={inventory.sites}
        defaultSiteId={inventory.defaultSiteId}
        preset={sheet?.preset}
        suggest={inventory.suggest}
        unitFor={inventory.unitFor}
        onSave={inventory.add}
        onClose={close}
      />
      <InventoryUsageSheet entry={usageFor} onSave={inventory.logUsage} onClose={closeUsage} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.md,
  },
  title: { ...typography.title, color: colors.text },
  waiting: { fontFamily: fontFamily.semibold, fontSize: 12.5, color: colors.warningText },
  addWrap: { marginHorizontal: spacing.lg },
  add: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: radius.lg,
  },
  addDisabled: { opacity: 0.5 },
  addText: { fontFamily: fontFamily.bold, fontSize: 16, color: colors.white },
  hint: { ...typography.bodySmall, color: colors.textMuted, textAlign: 'center', marginTop: spacing.sm },
  error: {
    ...typography.bodySmall,
    color: colors.dangerText,
    marginHorizontal: spacing.xl,
    marginTop: spacing.sm,
  },
  list: { padding: spacing.lg },
});
