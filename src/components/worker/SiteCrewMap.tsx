import React, { useMemo, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';

import { SITE_CREW } from '@/constants/config';
import { colors, fontFamily, radius, shadow, spacing } from '@/constants/theme';
import { timeAgo } from '@/utils/formatters';
import { SiteCrewMember } from '@/utils/siteCrew';

interface SiteCrewMapProps {
  crew: SiteCrewMember[];
  /** My own last shared position, to centre on when nobody else is placed. */
  me?: { lat: number; lng: number };
  now: number;
  /** Fill the screen (Map tab) instead of a fixed-height card. */
  fill?: boolean;
}

const toLatLng = (point: { lat: number; lng: number }) => ({ latitude: point.lat, longitude: point.lng });

/**
 * Where my site-mates are right now (and me, as the blue dot). Only people
 * checked in at this site and not on a break have a pin; someone whose phone
 * went quiet shows where they were last seen. Presentational: the controller
 * decides who is placed.
 */
export default function SiteCrewMap({ crew, me, now, fill }: SiteCrewMapProps) {
  const mapRef = useRef<MapView>(null);
  const placed = useMemo(() => crew.filter(member => member.position), [crew]);
  const points = useMemo(
    () => [...placed.map(member => member.position!), ...(me ? [me] : [])].map(toLatLng),
    [placed, me]
  );

  if (points.length === 0) return null;

  const fit = () => {
    if (points.length > 1) {
      mapRef.current?.fitToCoordinates(points, {
        edgePadding: { top: 48, right: 48, bottom: 48, left: 48 },
        animated: false,
      });
    }
  };

  return (
    <View style={[styles.card, fill ? styles.fill : shadow.sm]}>
      <View style={styles.header}>
        <Text style={styles.title}>Site map</Text>
        <Text style={styles.subtitle}>
          {placed.length === 0 ? 'Only you are sharing here' : `${placed.length} of your crew on the map`}
        </Text>
      </View>
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={fill ? styles.flex : styles.map}
        initialRegion={{
          ...points[0],
          latitudeDelta: SITE_CREW.mapSpanDeg,
          longitudeDelta: SITE_CREW.mapSpanDeg,
        }}
        onMapReady={fit}
        showsUserLocation
        showsMyLocationButton={false}
        toolbarEnabled={false}
        pitchEnabled={false}
        rotateEnabled={false}
      >
        {placed.map(member => (
          <Marker
            key={member.id}
            coordinate={toLatLng(member.position!)}
            pinColor={member.color}
            title={member.name}
            description={
              member.status === 'here'
                ? `Here now · ${member.role}`
                : `No signal · last seen ${member.position?.lastFixAt ? timeAgo(now - member.position.lastFixAt) : 'a while ago'}`
            }
            opacity={member.status === 'here' ? 1 : 0.55}
          />
        ))}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    marginTop: spacing.md,
    overflow: 'hidden',
  },
  header: { paddingHorizontal: spacing.md, paddingTop: spacing.md, paddingBottom: spacing.sm },
  title: { fontFamily: fontFamily.extrabold, fontSize: 15.5, color: colors.text },
  subtitle: { fontFamily: fontFamily.regular, fontSize: 12, color: colors.textMuted },
  map: { height: SITE_CREW.mapHeight },
  fill: { flex: 1, marginTop: 0, borderRadius: 0 },
  flex: { flex: 1 },
});
