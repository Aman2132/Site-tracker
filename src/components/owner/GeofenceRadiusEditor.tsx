import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import InitialsAvatar from '@/components/common/InitialsAvatar';
import { colors, fontFamily, radius, shadow, spacing, typography } from '@/constants/theme';
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

const DIAGRAM_SIZE = 100;
const DIAGRAM_MIN_DIAMETER = 30;

export default function GeofenceRadiusEditor({
  site,
  peopleInsideFence,
  isRadiusDriftRisky,
  minRadiusMeters,
  maxRadiusMeters,
  stepMeters,
  onChangeRadius,
}: GeofenceRadiusEditorProps) {
  const fraction = (site.radius - minRadiusMeters) / (maxRadiusMeters - minRadiusMeters);
  const diagramDiameter = DIAGRAM_MIN_DIAMETER + fraction * (DIAGRAM_SIZE - DIAGRAM_MIN_DIAMETER);

  return (
    <View style={[styles.card, shadow.md]}>
      <View style={styles.headRow}>
        <View style={styles.headText}>
          <Text style={styles.siteName}>{site.name}</Text>
          <Text style={styles.coords}>
            {site.lat.toFixed(4)}° N, {site.lng.toFixed(4)}° E
          </Text>
        </View>
        <LinearGradient colors={['#eef2fb', '#e4ebfb']} style={styles.diagram}>
          <LinearGradient
            colors={['rgba(28,79,240,0.24)', 'rgba(28,79,240,0.06)']}
            style={[
              styles.diagramCircle,
              { width: diagramDiameter, height: diagramDiameter, borderRadius: diagramDiameter / 2 },
            ]}
          />
          <View style={styles.diagramDot} />
        </LinearGradient>
      </View>

      <View style={styles.labelRow}>
        <Ionicons name="resize-outline" size={13} color={colors.textFaint} />
        <Text style={styles.label}>GEOFENCE RADIUS · {site.radius} m</Text>
      </View>
      <Slider
        minimumValue={minRadiusMeters}
        maximumValue={maxRadiusMeters}
        step={stepMeters}
        value={site.radius}
        onValueChange={onChangeRadius}
        minimumTrackTintColor={colors.primary}
        thumbTintColor={colors.primary}
      />
      <View style={styles.hintRow}>
        <Ionicons
          name={isRadiusDriftRisky ? 'warning-outline' : 'shield-checkmark-outline'}
          size={13}
          color={isRadiusDriftRisky ? colors.warningText : colors.textFaint}
        />
        <Text style={[styles.hint, isRadiusDriftRisky && styles.hintWarn]}>
          {isRadiusDriftRisky
            ? 'Below 80 m, GPS drift causes false arrive/leave events.'
            : 'Wide enough to survive normal GPS drift.'}
        </Text>
      </View>

      <View style={styles.labelRow}>
        <Ionicons name="people-outline" size={13} color={colors.textFaint} />
        <Text style={styles.label}>INSIDE THE FENCE NOW · {peopleInsideFence.length}</Text>
      </View>
      <View style={styles.chipRow}>
        {peopleInsideFence.length === 0 ? (
          <Text style={styles.emptyChip}>Nobody's inside the fence right now.</Text>
        ) : (
          peopleInsideFence.map(person => (
            <InitialsAvatar key={person.id} name={person.name} color={person.color} size={34} ringed />
          ))
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    margin: spacing.lg,
    padding: spacing.xl - 2,
  },
  headRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.lg },
  headText: { flex: 1 },
  siteName: { ...typography.heading, color: colors.text },
  coords: { fontSize: 11, color: colors.textMuted, fontFamily: 'monospace', marginTop: 2 },
  diagram: {
    width: DIAGRAM_SIZE,
    height: DIAGRAM_SIZE,
    borderRadius: DIAGRAM_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  diagramCircle: {
    position: 'absolute',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.primary,
  },
  diagramDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.primary },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.md - 2,
    marginBottom: spacing.sm - 2,
  },
  label: { ...typography.label, color: colors.textFaint },
  hintRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  hint: { fontFamily: fontFamily.regular, fontSize: 11, color: colors.textFaint, flex: 1 },
  hintWarn: { color: colors.warningText, fontFamily: fontFamily.medium },
  chipRow: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap', marginTop: spacing.xs },
  emptyChip: { fontFamily: fontFamily.regular, fontSize: 12, color: colors.textFaint, fontStyle: 'italic' },
});
