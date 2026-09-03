import { Ionicons } from '@expo/vector-icons';
import Mapbox from '@rnmapbox/maps';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import DevRoleSwitchButton from '@/components/common/DevRoleSwitchButton';
import LoadingView from '@/components/common/LoadingView';
import PersonDetailSheet from '@/components/owner/PersonDetailSheet';
import PersonMapMarker from '@/components/owner/PersonMapMarker';
import StaticSiteMap from '@/components/owner/StaticSiteMap';
import { MAPBOX_PUBLIC_TOKEN } from '@/constants/config';
import { colors, fontFamily, gradients, radius, shadow, spacing } from '@/constants/theme';
import { useCrewTrackingController } from '@/controllers/useCrewTrackingController';
import { Person } from '@/types/domain';
import { geoCirclePolygon } from '@/utils/geo';

const HAS_MAPBOX_TOKEN = MAPBOX_PUBLIC_TOKEN.length > 0;

export default function MapScreen() {
  const { people, site, loaded } = useCrewTrackingController();
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const insets = useSafeAreaInsets();

  const geofenceShape = useMemo(
    () => (site ? geoCirclePolygon({ lat: site.lat, lng: site.lng }, site.radius) : null),
    [site]
  );

  if (!loaded || !site) return <LoadingView />;

  return (
    <View style={styles.flex}>
      {HAS_MAPBOX_TOKEN ? (
        <Mapbox.MapView style={styles.flex}>
          <Mapbox.Camera centerCoordinate={[site.lng, site.lat]} zoomLevel={15} />

          {geofenceShape && (
            <Mapbox.ShapeSource id="geofence" shape={geofenceShape}>
              <Mapbox.FillLayer
                id="geofence-fill"
                style={{ fillColor: colors.primarySoft, fillOpacity: 0.4 }}
              />
              <Mapbox.LineLayer id="geofence-line" style={{ lineColor: colors.primary, lineWidth: 2 }} />
            </Mapbox.ShapeSource>
          )}

          {people.map(person => (
            <PersonMapMarker key={person.id} person={person} onPress={() => setSelectedPerson(person)} />
          ))}
        </Mapbox.MapView>
      ) : (
        <StaticSiteMap site={site} people={people} onSelectPerson={setSelectedPerson} />
      )}

      <View style={[styles.headerCard, shadow.lg, { top: insets.top + spacing.sm }]}>
        <LinearGradient colors={gradients.primaryRadiant} style={styles.headerIconWrap}>
          <Ionicons name="business" size={17} color={colors.white} />
        </LinearGradient>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>{site.name}</Text>
          <Text style={styles.headerSub}>{people.length} tracked · tap a bubble for details</Text>
        </View>
      </View>

      <DevRoleSwitchButton
        targetRole="worker"
        label="View as worker"
        style={[styles.roleSwitch, { bottom: spacing.xl }]}
      />

      {selectedPerson && (
        <PersonDetailSheet person={selectedPerson} onClose={() => setSelectedPerson(null)} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  headerCard: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.md,
  },
  headerIconWrap: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: { flex: 1 },
  headerTitle: { fontFamily: fontFamily.bold, fontSize: 15, color: colors.text },
  headerSub: { fontFamily: fontFamily.regular, fontSize: 12, color: colors.textMuted, marginTop: 2 },
  roleSwitch: { position: 'absolute', right: spacing.md },
});
