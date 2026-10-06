import { useEffect, useRef } from 'react';

import { logEvent } from '@/api/eventsApi';
import { reportPosition } from '@/api/peopleApi';
import { BATTERY } from '@/constants/config';
import { setLocationUpdateHandler } from '@/services/locationService';
import { useAuthStore } from '@/store/useAuthStore';
import { useCrewStore } from '@/store/useCrewStore';
import { useShiftStore } from '@/store/useShiftStore';

/**
 * Worker Home screen: wires each background-tracking fix into the crew store
 * and reports it upstream (with the phone's battery level and the site the
 * person is checked in at). Whether tracking runs at all is the shift
 * controller's job — it starts on check-in and stops on pause or check-out.
 */
export function useLocationSharingController() {
  const workerId = useAuthStore(state => state.profile?.id);
  const workerName = useAuthStore(state => state.profile?.name);
  const siteId = useShiftStore(state => state.active?.siteId);
  const updatePersonPosition = useCrewStore(state => state.updatePersonPosition);
  /** So a low battery is reported once per drop, not on every fix while it stays low. */
  const batteryLowRef = useRef(false);

  useEffect(() => {
    if (!workerId) return;
    setLocationUpdateHandler(fix => {
      updatePersonPosition(workerId, fix);
      reportPosition(workerId, fix, siteId).catch(error => console.warn('[sharing] position report failed —', error));

      if (fix.battery == null) return;
      const isLow = fix.battery <= BATTERY.lowLevel;
      if (isLow && !batteryLowRef.current) {
        logEvent(
          `${workerName ?? 'A worker'}'s phone battery is low (${Math.round(fix.battery * 100)}%)`,
          'warn',
          { type: 'battery', personId: workerId, siteId }
        ).catch(error => console.warn('[sharing] low-battery event failed —', error));
      }
      batteryLowRef.current = isLow;
    });
    return () => setLocationUpdateHandler(null);
  }, [workerId, workerName, siteId, updatePersonPosition]);
}
