import { useCallback, useEffect, useState } from 'react';

import { logEvent } from '@/api/eventsApi';
import { reportPauseState, reportPosition } from '@/api/peopleApi';
import {
  setLocationUpdateHandler,
  startBackgroundTracking,
  stopBackgroundTracking,
} from '@/services/locationService';
import { requestLocationPermissions } from '@/services/permissionsService';
import { useAuthStore } from '@/store/useAuthStore';
import { useCrewStore } from '@/store/useCrewStore';
import { LocationPermissionState } from '@/types/domain';

/**
 * Worker Home screen: requests permission, starts/stops the background
 * tracking task, and wires each fix into the crew store (+ reports it
 * upstream). Pause/resume is local UI state layered on top of the same task.
 */
export function useLocationSharingController() {
  const [paused, setPaused] = useState(false);
  const [permission, setPermission] = useState<LocationPermissionState | null>(null);
  const workerId = useAuthStore(state => state.profile?.id);
  const workerName = useAuthStore(state => state.profile?.name);
  const updatePersonPosition = useCrewStore(state => state.updatePersonPosition);

  useEffect(() => {
    if (!workerId) return;
    setLocationUpdateHandler(fix => {
      updatePersonPosition(workerId, fix);
      reportPosition(workerId, fix).catch(() => {});
    });
    return () => setLocationUpdateHandler(null);
  }, [workerId, updatePersonPosition]);

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
      if (workerId) reportPauseState(workerId, nextPaused).catch(() => {});
      if (nextPaused) {
        stopBackgroundTracking();
        logEvent(`${workerName ?? 'A worker'} paused sharing`, 'warn').catch(() => {});
      } else {
        startBackgroundTracking();
        logEvent(`${workerName ?? 'A worker'} resumed sharing`, 'info').catch(() => {});
      }
      return nextPaused;
    });
  }, [workerId, workerName]);

  return { paused, togglePause, permission };
}
