import React from 'react';

import LoadingView from '@/components/common/LoadingView';
import ScreenContainer from '@/components/common/ScreenContainer';
import ScreenTitle from '@/components/common/ScreenTitle';
import GeofenceRadiusEditor from '@/components/owner/GeofenceRadiusEditor';
import { useGeofenceController } from '@/controllers/useGeofenceController';

export default function SitesScreen() {
  const { site, peopleInsideFence, isRadiusDriftRisky, setRadius, bounds } = useGeofenceController();

  if (!site) return <LoadingView />;

  return (
    <ScreenContainer padded={false}>
      <ScreenTitle>Sites</ScreenTitle>
      <GeofenceRadiusEditor
        site={site}
        peopleInsideFence={peopleInsideFence}
        isRadiusDriftRisky={isRadiusDriftRisky}
        minRadiusMeters={bounds.minRadiusMeters}
        maxRadiusMeters={bounds.maxRadiusMeters}
        stepMeters={bounds.stepMeters}
        onChangeRadius={setRadius}
      />
    </ScreenContainer>
  );
}
