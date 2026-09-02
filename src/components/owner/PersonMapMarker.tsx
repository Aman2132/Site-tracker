import React from 'react';
import { Marker } from 'react-native-maps';

import InitialsAvatar from '@/components/common/InitialsAvatar';
import { Person } from '@/types/domain';

export default function PersonMapMarker({ person, onPress }: { person: Person; onPress: () => void }) {
  return (
    <Marker coordinate={{ latitude: person.lat, longitude: person.lng }} onPress={onPress}>
      <InitialsAvatar name={person.name} color={person.color} faded={person.kind === 'stale'} />
    </Marker>
  );
}
