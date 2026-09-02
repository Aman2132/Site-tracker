import Slider from '@react-native-community/slider';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import InitialsAvatar from '@/components/common/InitialsAvatar';
import { colors, radius, spacing, typography } from '@/constants/theme';
import { Person, Site } from '@/types/domain';

interface GeofenceRadiusEditorProps {
  site: Site;
  peopleInsideFence: Person[];
  isRadiusDriftRisky: boolean;
  minRadiusMeters: number;
  maxRadiusMeters: number;
  stepMeters: number;
  onChangeRadius: (radius: number) => void;
}

export default function GeofenceRadiusEditor({
  site,
  peopleInsideFence,
  isRadiusDriftRisky,
  minRadiusMeters,
  maxRadiusMeters,
  stepMeters,
  onChangeRadius,
}: GeofenceRadiusEditorProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.siteName}>{site.name}</Text>
      <Text style={styles.coords}>
        {site.lat.toFixed(4)}° N, {site.lng.toFixed(4)}° E
      </Text>

      <Text style={styles.label}>GEOFENCE RADIUS · {site.radius} m</Text>
      <Slider
        minimumValue={minRadiusMeters}
        maximumValue={maxRadiusMeters}
        step={stepMeters}
        value={site.radius}
        onValueChange={onChangeRadius}
        minimumTrackTintColor={colors.primary}
      />
      <Text style={styles.hint}>
        {isRadiusDriftRisky
          ? 'Below 80 m, GPS drift causes false arrive/leave events.'
          : 'Wide enough to survive normal GPS drift.'}
      </Text>

      <Text style={styles.label}>INSIDE THE FENCE NOW · {peopleInsideFence.length}</Text>
      <View style={styles.chipRow}>
        {peopleInsideFence.map(person => (
          <InitialsAvatar key={person.id} name={person.name} color={person.color} size={34} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    margin: spacing.lg,
    padding: spacing.xl - 2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  siteName: { ...typography.heading, color: colors.text },
  coords: { fontSize: 11, color: colors.textMuted, fontFamily: 'monospace', marginBottom: spacing.lg },
  label: {
    ...typography.label,
    color: colors.textFaint,
    marginBottom: spacing.sm - 2,
    marginTop: spacing.md - 2,
  },
  hint: { fontSize: 11, color: colors.textFaint },
  chipRow: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap', marginTop: spacing.xs },
});
