import React, { useEffect, useRef } from 'react';
import { StyleSheet } from 'react-native';
import MapView, { Circle, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';

import PersonMapMarker from '@/components/owner/PersonMapMarker';
import { colors } from '@/constants/theme';
import { GeoPoint, Person, Site } from '@/types/domain';
import { MapCameraCommand, MapCameraPosition, MapStyle } from '@/types/map';
import { trailGradient, withAlpha } from '@/utils/color';

interface LiveCrewMapProps {
  site: Site;
  people: Person[];
  trails: Record<string, GeoPoint[]>;
  headings: Record<string, number | null>;
  initialCamera: MapCameraPosition;
  /** Latest camera move to perform; applied once per new `id`. */
  camera: MapCameraCommand | null;
  mapStyle: MapStyle;
  onSelectPerson: (person: Person) => void;
}

const toLatLng = (point: GeoPoint) => ({ latitude: point.lat, longitude: point.lng });

/**
 * Google Maps live view: 3D buildings, tiltable/rotatable camera, the site
 * geofence, and every crew member with a fading motion trail behind them.
 * Pure props-in rendering — all camera decisions come from the controller as
 * `camera` commands.
 */
export default function LiveCrewMap({
  site,
  people,
  trails,
  headings,
  initialCamera,
  camera,
  mapStyle,
  onSelectPerson,
}: LiveCrewMapProps) {
  const mapRef = useRef<MapView>(null);

  useEffect(() => {
    if (!camera) return;
    const { center, zoom, pitch, heading, durationMs } = camera;
    mapRef.current?.animateCamera(
      {
        ...(center ? { center: toLatLng(center) } : {}),
        ...(zoom != null ? { zoom } : {}),
        ...(pitch != null ? { pitch } : {}),
        ...(heading != null ? { heading } : {}),
      },
      { duration: durationMs }
    );
  }, [camera]);

  return (
    <MapView
      ref={mapRef}
      provider={PROVIDER_GOOGLE}
      style={styles.map}
      initialCamera={{
        center: toLatLng(initialCamera.center),
        zoom: initialCamera.zoom,
        pitch: initialCamera.pitch,
        heading: initialCamera.heading,
      }}
      mapType={mapStyle}
      showsBuildings
      showsIndoors
      showsCompass={false}
      showsUserLocation
      showsMyLocationButton={false}
      toolbarEnabled={false}
      pitchEnabled
      rotateEnabled
      moveOnMarkerPress={false}
    >
      <Circle
        center={toLatLng(site)}
        radius={site.radius}
        fillColor={withAlpha(colors.primary, 0.12)}
        strokeColor={colors.primary}
        strokeWidth={2}
      />

      {people.map(person => {
        const trail = trails[person.id] ?? [];
        return trail.length >= 2 ? (
          <Polyline
            key={`trail-${person.id}`}
            coordinates={trail.map(toLatLng)}
            strokeColors={trailGradient(person.color, trail.length)}
            strokeColor={person.color}
            strokeWidth={5}
            lineCap="round"
            lineJoin="round"
          />
        ) : null;
      })}

      {people.map(person => (
        <PersonMapMarker
          key={person.id}
          person={person}
          headingDegrees={headings[person.id] ?? null}
          onPress={() => onSelectPerson(person)}
        />
      ))}
    </MapView>
  );
}

const styles = StyleSheet.create({
  map: { flex: 1 },
});
