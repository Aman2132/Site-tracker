import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { colors, fontFamily, radius, shadow, spacing } from '@/constants/theme';
import { MapStyle } from '@/types/map';

type IconName = Extract<keyof typeof Ionicons.glyphMap, string>;

const STYLE_LABELS: Record<MapStyle, string> = {
  standard: 'Map',
  hybrid: 'Hybrid',
  satellite: 'Satellite',
  terrain: 'Terrain',
};

function ControlButton({
  icon,
  label,
  active = false,
  onPress,
  accessibilityLabel,
}: {
  icon: IconName;
  label: string;
  active?: boolean;
  onPress: () => void;
  accessibilityLabel: string;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ selected: active }}
      style={[styles.button, shadow.md, active && styles.buttonActive]}
    >
      <Ionicons name={icon} size={18} color={active ? colors.white : colors.text} />
      <Text style={[styles.label, active && styles.labelActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

/** Floating column of live-map controls: 3D, base map style, motion steering, recenter. */
export default function MapControls({
  is3d,
  onToggle3d,
  mapStyle,
  onCycleMapStyle,
  motionMode,
  onToggleMotionMode,
  heading,
  onRecenter,
}: {
  is3d: boolean;
  onToggle3d: () => void;
  mapStyle: MapStyle;
  onCycleMapStyle: () => void;
  motionMode: boolean;
  onToggleMotionMode: () => void;
  /** Live compass heading while motion mode is on. */
  heading: number | null;
  onRecenter: () => void;
}) {
  return (
    <View style={styles.column} pointerEvents="box-none">
      <ControlButton
        icon="cube-outline"
        label={is3d ? '3D' : '2D'}
        active={is3d}
        onPress={onToggle3d}
        accessibilityLabel={is3d ? 'Switch to flat map' : 'Switch to 3D map'}
      />
      <ControlButton
        icon="layers-outline"
        label={STYLE_LABELS[mapStyle]}
        onPress={onCycleMapStyle}
        accessibilityLabel={`Map style: ${STYLE_LABELS[mapStyle]}. Tap to change`}
      />
      <ControlButton
        icon="compass-outline"
        label={motionMode && heading != null ? `${Math.round(heading)}°` : 'Motion'}
        active={motionMode}
        onPress={onToggleMotionMode}
        accessibilityLabel={
          motionMode
            ? 'Stop steering the map with the phone'
            : 'Steer the map by turning and tilting the phone'
        }
      />
      <ControlButton
        icon="locate-outline"
        label="Site"
        onPress={onRecenter}
        accessibilityLabel="Back to the site"
      />
    </View>
  );
}

const BUTTON_SIZE = 52;

const styles = StyleSheet.create({
  column: { gap: spacing.sm, alignItems: 'center' },
  button: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
  },
  buttonActive: { backgroundColor: colors.primary },
  label: { fontFamily: fontFamily.bold, fontSize: 9.5, color: colors.textMuted },
  labelActive: { color: colors.white },
});
