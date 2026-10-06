import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity } from 'react-native';

import { colors, fontFamily, radius, spacing } from '@/constants/theme';

/** Horizontal "All" + one chip per person, for filtering a photo grid by who took it. */
export default function PersonFilterChips({
  people,
  selectedId,
  onSelect,
}: {
  people: { id: string; name: string }[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.scroll}
      contentContainerStyle={styles.row}
    >
      <Chip label="All" selected={selectedId === null} onPress={() => onSelect(null)} />
      {people.map(person => (
        <Chip
          key={person.id}
          label={person.name}
          selected={selectedId === person.id}
          onPress={() => onSelect(person.id)}
        />
      ))}
    </ScrollView>
  );
}

function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity style={[styles.chip, selected && styles.chipSelected]} onPress={onPress}>
      <Text style={[styles.chipText, selected && styles.chipTextSelected]} numberOfLines={1}>
        {label}
      </Text>
    </TouchableOpacity>
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
  chipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontFamily: fontFamily.medium, fontSize: 12.5, color: colors.textMuted },
  chipTextSelected: { color: colors.white },
});
