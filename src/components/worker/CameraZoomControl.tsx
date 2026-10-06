import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { colors, fontFamily, spacing } from '@/constants/theme';
import { ZoomStop, zoomLabel } from '@/utils/camera';

/** How close (in zoom factor) the current zoom must be to a stop for that stop to read as "selected". */
const SELECTED_TOLERANCE = 0.05;

/**
 * Row of quick-zoom buttons (0.5x, 1x, 2x ...). If the worker has pinched to a
 * zoom that is not one of the presets, that exact value is shown, highlighted,
 * in its place in the row — so the current zoom is always readable.
 */
export default function CameraZoomControl({
  stops,
  zoom,
  neutralZoom,
  onSelect,
}: {
  stops: ZoomStop[];
  zoom: number;
  neutralZoom: number;
  onSelect: (zoom: number) => void;
}) {
  const onAStop = stops.some(stop => Math.abs(stop.zoom - zoom) < SELECTED_TOLERANCE);
  const items = onAStop
    ? stops
    : [...stops, { label: zoomLabel(zoom, neutralZoom), zoom }].sort((a, b) => a.zoom - b.zoom);

  // A single stop is nothing to choose between.
  if (items.length < 2 && onAStop) return null;

  return (
    <View style={styles.row}>
      {items.map(item => {
        const selected = Math.abs(item.zoom - zoom) < SELECTED_TOLERANCE;
        return (
          <TouchableOpacity
            key={item.label}
            onPress={() => onSelect(item.zoom)}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={`Zoom ${item.label}`}
            accessibilityState={{ selected }}
            style={[styles.chip, selected && styles.chipSelected]}
          >
            <Text style={[styles.label, selected && styles.labelSelected]}>{item.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const CHIP_SIZE = 40;

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  chip: {
    minWidth: CHIP_SIZE,
    height: CHIP_SIZE,
    paddingHorizontal: spacing.sm,
    borderRadius: CHIP_SIZE / 2,
    backgroundColor: colors.glass,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipSelected: { backgroundColor: colors.glassStrong, borderWidth: 1.5, borderColor: colors.worker },
  label: { fontFamily: fontFamily.semibold, fontSize: 12.5, color: colors.white },
  labelSelected: { color: colors.workerBright },
});
