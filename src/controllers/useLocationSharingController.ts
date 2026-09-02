import { useCallback, useEffect, useState } from 'react';

import { reportPosition } from '@/api/peopleApi';
import { CURRENT_WORKER_ID } from '@/constants/session';
import {
  setLocationUpdateHandler,
  startBackgroundTracking,
  stopBackgroundTracking,
} from '@/services/locationService';
import { requestLocationPermissions } from '@/services/permissionsService';
import { useCrewStore } from '@/store/useCrewStore';
import { useEventStore } from '@/store/useEventStore';
import { LocationPermissionState } from '@/types/domain';

/**
 * Worker Home screen: requests permission, starts/stops the background
 * tracking task, and wires each fix into the crew store (+ reports it
 * upstream). Pause/resume is local UI state layered on top of the same task.
 */
export function useLocationSharingController() {
  const [paused, setPaused] = useState(false);
  const [permission, setPermission] = useState<LocationPermissionState | null>(null);
  const updatePersonPosition = useCrewStore(state => state.updatePersonPosition);
  const addEvent = useEventStore(state => state.addEvent);

  useEffect(() => {
    setLocationUpdateHandler(fix => {
      updatePersonPosition(CURRENT_WORKER_ID, fix);
      reportPosition(CURRENT_WORKER_ID, fix).catch(() => {});
    });
    return () => setLocationUpdateHandler(null);
  }, [updatePersonPosition]);

  useEffect(() => {
    (async () => {
      const result = await requestLocationPermissions();
      setPermission(result);
      if (result.granted) await startBackgroundTracking();
    })();
  }, []);

  const togglePause = useCallback(() => {
    setPaused(wasPaused => {
      const nextPaused = !wasPaused;
      if (nextPaused) {
        stopBackgroundTracking();
        addEvent('You paused sharing', 'warn');
      } else {
        startBackgroundTracking();
        addEvent('You resumed sharing', 'info');
      }
      return nextPaused;
    });
  }, [addEvent]);

  return { paused, togglePause, permission };
}
