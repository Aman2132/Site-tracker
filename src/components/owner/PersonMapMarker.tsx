import Mapbox from '@rnmapbox/maps';
import React from 'react';

import InitialsAvatar from '@/components/common/InitialsAvatar';
import { Person } from '@/types/domain';

export default function PersonMapMarker({ person, onPress }: { person: Person; onPress: () => void }) {
  return (
    <Mapbox.PointAnnotation id={person.id} coordinate={[person.lng, person.lat]} onSelected={onPress}>
      <InitialsAvatar name={person.name} color={person.color} faded={person.kind === 'stale'} ringed />
    </Mapbox.PointAnnotation>
  );
}
