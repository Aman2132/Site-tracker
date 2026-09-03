import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { LayoutChangeEvent, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import InitialsAvatar from '@/components/common/InitialsAvatar';
import { colors, fontFamily, glow, radius, shadow, spacing } from '@/constants/theme';
import { Person, Site } from '@/types/domain';
import { offsetMeters } from '@/utils/geo';

const GRID_COLUMNS = 7;
const GRID_ROWS = 13;
const GEOFENCE_DISPLAY_RADIUS = 108;
const MARKER_MAX_RADIUS = 150;

interface StaticSiteMapProps {
  site: Site;
  people: Person[];
  onSelectPerson: (person: Person) => void;
}

/**
 * Schematic stand-in for the live Mapbox view, used until a real access
 * token is configured (see .env.example). Draws the geofence and crew
 * positions to relative scale rather than trying to fake map tiles.
 */
export default function StaticSiteMap({ site, people, onSelectPerson }: StaticSiteMapProps) {
  const [size, setSize] = React.useState({ width: 0, height: 0 });
  const metersPerPixel = site.radius / GEOFENCE_DISPLAY_RADIUS;

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
          <LinearGradient
            colors={['rgba(28,79,240,0.22)', 'rgba(28,79,240,0.05)']}
            pointerEvents="none"
            style={[
              styles.geofence,
              {
                width: GEOFENCE_DISPLAY_RADIUS * 2,
                height: GEOFENCE_DISPLAY_RADIUS * 2,
                borderRadius: GEOFENCE_DISPLAY_RADIUS,
                left: centerX - GEOFENCE_DISPLAY_RADIUS,
                top: centerY - GEOFENCE_DISPLAY_RADIUS,
              },
            ]}
          />
          <View
            pointerEvents="none"
            style={[styles.siteMarker, glow(colors.primary, 0.5), { left: centerX - 6, top: centerY - 6 }]}
          />

          {people.map(person => {
            const { east, north } = offsetMeters(person, site);
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
        <Text style={styles.previewText}>Static preview · connect Mapbox for live tiles</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.blueprint, overflow: 'hidden' },
  gridLineV: { position: 'absolute', top: 0, bottom: 0, width: 1, backgroundColor: colors.blueprintLine },
  gridLineH: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: colors.blueprintLine },
  geofence: {
    position: 'absolute',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.primary,
  },
  siteMarker: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: colors.white,
  },
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
