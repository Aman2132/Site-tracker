import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FilterChipOption } from '@/components/common/FilterChips';
import { colors, fontFamily, radius, shadow, spacing, typography } from '@/constants/theme';

export interface FilterSection {
  title: string;
  options: FilterChipOption[];
  selectedId: string;
  onSelect: (id: string) => void;
}

/**
 * One "Filters" button plus a chip summing up what is active ("Alpha · Last
 * 7 days · Everyone"). Tapping either opens a bottom sheet with every filter
 * as wrapping chips, so nothing is cut off and nothing needs sideways scrolling.
 */
export default function FilterSheet({
  summary,
  activeCount,
  sections,
  onReset,
  accent = colors.primary,
}: {
  summary: string;
  /** How many filters differ from their default; shown as a badge. */
  activeCount: number;
  sections: FilterSection[];
  onReset: () => void;
  accent?: string;
}) {
  const [open, setOpen] = useState(false);
  const insets = useSafeAreaInsets();

  return (
    <>
      <View style={styles.bar}>
        <TouchableOpacity
          style={[styles.filtersButton, activeCount > 0 && { borderColor: accent }]}
          onPress={() => setOpen(true)}
          accessibilityRole="button"
          accessibilityLabel={`Filters, ${activeCount} active`}
        >
          <Ionicons name="options-outline" size={16} color={activeCount > 0 ? accent : colors.textMuted} />
          <Text style={[styles.filtersText, activeCount > 0 && { color: accent }]}>Filters</Text>
          {activeCount > 0 && (
            <View style={[styles.badge, { backgroundColor: accent }]}>
              <Text style={styles.badgeText}>{activeCount}</Text>
            </View>
          )}
        </TouchableOpacity>
        <TouchableOpacity style={styles.summary} onPress={() => setOpen(true)} accessibilityRole="button">
          <Text style={styles.summaryText} numberOfLines={1}>
            {summary}
          </Text>
        </TouchableOpacity>
      </View>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.scrim} onPress={() => setOpen(false)} accessibilityLabel="Close filters" />
        <View style={[styles.sheet, shadow.xl, { paddingBottom: insets.bottom + spacing.lg }]}>
          <View style={styles.grabber} />
          <View style={styles.headRow}>
            <Text style={styles.heading}>Filters</Text>
            <TouchableOpacity onPress={onReset} hitSlop={8} accessibilityRole="button">
              <Text style={[styles.reset, { color: accent }]}>Reset</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.body}>
            {sections.map(section => (
              <View key={section.title} style={styles.section}>
                <Text style={styles.sectionTitle}>{section.title.toUpperCase()}</Text>
                <View style={styles.chips}>
                  {section.options.map(option => {
                    const selected = option.id === section.selectedId;
                    return (
                      <TouchableOpacity
                        key={option.id}
                        style={[styles.chip, selected && { backgroundColor: accent, borderColor: accent }]}
                        onPress={() => section.onSelect(option.id)}
                        accessibilityRole="button"
                        accessibilityState={{ selected }}
                      >
                        <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                          {option.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            ))}
          </ScrollView>
          <TouchableOpacity
            style={[styles.done, { backgroundColor: accent }]}
            onPress={() => setOpen(false)}
            accessibilityRole="button"
          >
            <Text style={styles.doneText}>Done</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  filtersButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 3,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filtersText: { fontFamily: fontFamily.semibold, fontSize: 13, color: colors.textMuted },
  badge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
  },
  badgeText: { fontFamily: fontFamily.bold, fontSize: 10.5, color: colors.white },
  summary: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 3,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  summaryText: { fontFamily: fontFamily.medium, fontSize: 12.5, color: colors.text },
  scrim: { flex: 1, backgroundColor: colors.overlayScrim },
  sheet: {
    maxHeight: '75%',
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xxl,
    borderTopRightRadius: radius.xxl,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
  },
  grabber: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  headRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heading: { ...typography.heading, color: colors.text },
  reset: { fontFamily: fontFamily.bold, fontSize: 13.5 },
  body: { marginTop: spacing.sm },
  section: { marginTop: spacing.md },
  sectionTitle: { ...typography.label, color: colors.textFaint, marginBottom: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs + 2 },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 3,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipText: { fontFamily: fontFamily.medium, fontSize: 13, color: colors.textMuted },
  chipTextSelected: { color: colors.white },
  done: { marginTop: spacing.lg, borderRadius: radius.md, paddingVertical: spacing.md, alignItems: 'center' },
  doneText: { fontFamily: fontFamily.bold, fontSize: 14, color: colors.white },
});
