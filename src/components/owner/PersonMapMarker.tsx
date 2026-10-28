import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { MapMarker, Marker } from 'react-native-maps';

import InitialsAvatar from '@/components/common/InitialsAvatar';
import { LIVE_MAP } from '@/constants/config';
import { colors, shadow } from '@/constants/theme';
import { Person } from '@/types/domain';

/** Android renders a custom marker view to a bitmap; it must be allowed to redraw briefly after a change. */
const REDRAW_WINDOW_MS = 600;

/**
 * One crew member on the live map: their avatar plus, while they are moving,
 * an arrow showing which way they are heading. New positions glide into place
 * instead of jumping.
 */
export default function PersonMapMarker({
  person,
  headingDegrees,
  onPress,
}: {
  person: Person;
  /** Direction of travel, or null when they are not moving. */
  headingDegrees: number | null;
  onPress: () => void;
}) {
  const markerRef = useRef<MapMarker>(null);
  // The marker is placed once at its first position; later moves are animated
  // natively, so the coordinate prop must not change underneath the animation.
  const [initialCoordinate] = useState({ latitude: person.lat, longitude: person.lng });
  const [tracksViewChanges, setTracksViewChanges] = useState(true);

  // Glide only on a real move. Animating on mount crashes on Android: the
  // native marker has no position until the map has placed it, and the
  // animator's interpolation reads that null position (NullPointerException
  // in MapMarker.interpolate).
  const lastPosition = useRef(initialCoordinate);
  useEffect(() => {
    const last = lastPosition.current;
    if (last.latitude === person.lat && last.longitude === person.lng) return;
    lastPosition.current = { latitude: person.lat, longitude: person.lng };
    markerRef.current?.animateMarkerToCoordinate(lastPosition.current, LIVE_MAP.markerGlideMs);
  }, [person.lat, person.lng]);

  const moving = headingDegrees != null;
  const faded = person.kind === 'stale';
  useEffect(() => {
    setTracksViewChanges(true);
    const timer = setTimeout(() => setTracksViewChanges(false), REDRAW_WINDOW_MS);
    return () => clearTimeout(timer);
  }, [moving, faded, headingDegrees, person.avatar]);

  return (
    <Marker
      ref={markerRef}
      identifier={person.id}
      coordinate={initialCoordinate}
      anchor={{ x: 0.5, y: 0.5 }}
      onPress={onPress}
      tracksViewChanges={tracksViewChanges}
      title={person.name}
    >
      <View style={styles.wrap}>
        {moving && (
          <View style={[styles.arrowRing, { transform: [{ rotate: `${headingDegrees}deg` }] }]}>
            <Ionicons name="caret-up" size={16} color={person.color} style={styles.arrow} />
          </View>
        )}
        <View style={[styles.avatar, shadow.md]}>
          <InitialsAvatar
            name={person.name}
            color={person.color}
            imageUri={person.avatar}
            size={38}
            faded={faded}
            ringed
          />
        </View>
      </View>
    </Marker>
  );
}

const SIZE = 64;

const styles = StyleSheet.create({
  wrap: { width: SIZE, height: SIZE, alignItems: 'center', justifyContent: 'center' },
  arrowRing: {
    position: 'absolute',
    width: SIZE,
    height: SIZE,
    alignItems: 'center',
  },
  arrow: { marginTop: -1 },
  avatar: { borderRadius: 19, backgroundColor: colors.white },
});
