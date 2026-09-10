import { useCallback, useMemo } from 'react';

import { useCrewTrackingController } from './useCrewTrackingController';

import { updateGeofenceRadius } from '@/api/siteApi';
import { GEOFENCE, HAS_FIREBASE_CONFIG } from '@/constants/config';
import { useSiteStore } from '@/store/useSiteStore';
import { isWithinRadius } from '@/utils/geo';

/** Sites screen: geofence radius editing + who's currently inside it. */
export function useGeofenceController() {
  const { people, site } = useCrewTrackingController();
  const setGeofenceRadius = useSiteStore(state => state.setGeofenceRadius);

  const peopleInsideFence = useMemo(() => {
    if (!site) return [];
    return people.filter(person => isWithinRadius(person, site, site.radius));
  }, [people, site]);

  const isRadiusDriftRisky = site != null && site.radius < GEOFENCE.driftSafeRadiusMeters;

  const setRadius = useCallback(
    (radiusMeters: number) => {
      setGeofenceRadius(radiusMeters);
      if (HAS_FIREBASE_CONFIG) updateGeofenceRadius(radiusMeters).catch(() => {});
    },
    [setGeofenceRadius]
  );

  return { site, peopleInsideFence, isRadiusDriftRisky, setRadius, bounds: GEOFENCE };
}
