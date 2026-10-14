import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity } from 'react-native';

import { colors, fontFamily, radius, spacing } from '@/constants/theme';

export interface FilterChipOption {
  id: string;
  label: string;
}

/** A horizontal, scrollable row of single-choice chips (sites, dates, people…). */
export default function FilterChips({
  options,
  selectedId,
  onSelect,
  accent = colors.primary,
}: {
  options: FilterChipOption[];
  selectedId: string;
  onSelect: (id: string) => void;
  /** Fill colour of the selected chip: the owner's blue or the worker's orange. */
  accent?: string;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.scroll}
      contentContainerStyle={styles.row}
    >
      {options.map(option => {
        const selected = option.id === selectedId;
        return (
          <TouchableOpacity
            key={option.id}
            style={[styles.chip, selected && { backgroundColor: accent, borderColor: accent }]}
            onPress={() => onSelect(option.id)}
            accessibilityRole="button"
            accessibilityState={{ selected }}
          >
            <Text style={[styles.chipText, selected && styles.chipTextSelected]} numberOfLines={1}>
              {option.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  // A horizontal ScrollView with no explicit style grows to fill whatever
  // vertical space its flex-column parent has left over (confirmed on device:
  // the row measured 607px tall around a 113px chip). flexGrow/flexShrink: 0
  // keeps it sized to its own content instead.
  scroll: { flexGrow: 0, flexShrink: 0 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipText: { fontFamily: fontFamily.medium, fontSize: 12.5, color: colors.textMuted },
  chipTextSelected: { color: colors.white },
});
