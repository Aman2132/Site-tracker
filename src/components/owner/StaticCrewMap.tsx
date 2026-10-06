import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { LayoutChangeEvent, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import InitialsAvatar from '@/components/common/InitialsAvatar';
import { DEFAULT_COORDS } from '@/constants/config';
import { colors, fontFamily, radius, shadow, spacing } from '@/constants/theme';
import { Person } from '@/types/domain';
import { crewCenter, offsetMeters } from '@/utils/geo';

const GRID_COLUMNS = 7;
const GRID_ROWS = 13;
/** How far from the centre (px) the farthest crew member is drawn. */
const MARKER_MAX_RADIUS = 150;
/** Never zoom in closer than this, so two people a few metres apart don't look far apart. */
const MIN_METERS_PER_PIXEL = 0.5;

interface StaticCrewMapProps {
  people: Person[];
  onSelectPerson: (person: Person) => void;
}

/**
 * Schematic stand-in for the live Google map, used until a Maps API key
 * is configured (see .env.example). Centres on the crew and draws everyone
 * to relative scale, sized so the farthest person still fits, rather than
 * trying to fake map tiles.
 */
export default function StaticCrewMap({ people, onSelectPerson }: StaticCrewMapProps) {
  const [size, setSize] = React.useState({ width: 0, height: 0 });
  const center = crewCenter(people, DEFAULT_COORDS);
  const farthest = Math.max(
    0,
    ...people.map(person => {
      const { east, north } = offsetMeters(person, center);
      return Math.hypot(east, north);
    })
  );
  const metersPerPixel = Math.max(MIN_METERS_PER_PIXEL, farthest / MARKER_MAX_RADIUS);

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSize({ width, height });
  };

  const centerX = size.width / 2;
  const centerY = size.height / 2;

  return (
    <View style={styles.flex} onLayout={onLayout}>
      <LinearGradient colors={['#e4ebfb', '#eef2fb', '#f6f8fd']} style={StyleSheet.absoluteFill} />
      <View style={StyleSheet.absoluteFill}>
        {Array.from({ length: GRID_COLUMNS + 1 }).map((_, i) => (
          <View key={`v${i}`} style={[styles.gridLineV, { left: `${(i / GRID_COLUMNS) * 100}%` }]} />
        ))}
        {Array.from({ length: GRID_ROWS + 1 }).map((_, i) => (
          <View key={`h${i}`} style={[styles.gridLineH, { top: `${(i / GRID_ROWS) * 100}%` }]} />
        ))}
      </View>

      {size.width > 0 && (
        <>
          {people.map(person => {
            const { east, north } = offsetMeters(person, center);
            const rawX = east / metersPerPixel;
            const rawY = -north / metersPerPixel;
            const dist = Math.hypot(rawX, rawY) || 1;
            const clampScale = Math.min(1, MARKER_MAX_RADIUS / dist);
            const x = centerX + rawX * clampScale;
            const y = centerY + rawY * clampScale;

            return (
              <TouchableOpacity
                key={person.id}
                onPress={() => onSelectPerson(person)}
                activeOpacity={0.8}
                style={[styles.markerWrap, shadow.md, { left: x - 18, top: y - 18 }]}
              >
                <InitialsAvatar
                  name={person.name}
                  color={person.color}
                  imageUri={person.avatar}
                  size={36}
                  faded={person.kind === 'stale'}
                  ringed
                />
              </TouchableOpacity>
            );
          })}
        </>
      )}

      <View style={[styles.compass, shadow.sm]}>
        <Ionicons name="navigate" size={12} color={colors.textMuted} />
        <Text style={styles.compassText}>N</Text>
      </View>

      <View style={[styles.previewBadge, shadow.sm]}>
        <Ionicons name="construct-outline" size={12} color={colors.textMuted} />
        <Text style={styles.previewText}>Static preview · add a Google Maps key for the live map</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.blueprint, overflow: 'hidden' },
  gridLineV: { position: 'absolute', top: 0, bottom: 0, width: 1, backgroundColor: colors.blueprintLine },
  gridLineH: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: colors.blueprintLine },
  markerWrap: { position: 'absolute', borderRadius: radius.pill },
  compass: {
    position: 'absolute',
    top: spacing.xl + 44,
    right: spacing.md,
    width: 30,
    height: 30,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compassText: { fontFamily: fontFamily.bold, fontSize: 8, color: colors.textMuted, marginTop: -1 },
  previewBadge: {
    position: 'absolute',
    bottom: spacing.xl,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm - 2,
  },
  previewText: { fontFamily: fontFamily.medium, fontSize: 11, color: colors.textMuted },
});
