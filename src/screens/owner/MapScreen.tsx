import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import MapView, { Circle } from 'react-native-maps';

import DevRoleSwitchButton from '@/components/common/DevRoleSwitchButton';
import LoadingView from '@/components/common/LoadingView';
import PersonDetailSheet from '@/components/owner/PersonDetailSheet';
import PersonMapMarker from '@/components/owner/PersonMapMarker';
import { colors, radius, spacing } from '@/constants/theme';
import { useCrewTrackingController } from '@/controllers/useCrewTrackingController';
import { Person } from '@/types/domain';

export default function MapScreen() {
  const { people, site, loaded } = useCrewTrackingController();
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);

  if (!loaded || !site) return <LoadingView />;

  return (
    <View style={styles.flex}>
      <MapView
        style={styles.flex}
        initialRegion={{ latitude: site.lat, longitude: site.lng, latitudeDelta: 0.01, longitudeDelta: 0.01 }}
      >
        <Circle
          center={{ latitude: site.lat, longitude: site.lng }}
          radius={site.radius}
          strokeColor={colors.primary}
          fillColor={colors.primarySoft}
        />
        {people.map(person => (
          <PersonMapMarker key={person.id} person={person} onPress={() => setSelectedPerson(person)} />
        ))}
      </MapView>

      <View style={styles.headerCard}>
        <Text style={styles.headerTitle}>{site.name}</Text>
        <Text style={styles.headerSub}>{people.length} tracked · tap a bubble for details</Text>
      </View>

      <DevRoleSwitchButton targetRole="worker" label="View as worker" style={styles.roleSwitch} />

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
    top: 50,
    left: spacing.md,
    right: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg - 2,
    elevation: 4,
  },
  headerTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  headerSub: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  roleSwitch: { position: 'absolute', bottom: 20, right: spacing.md },
});
