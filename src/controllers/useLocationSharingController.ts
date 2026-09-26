import { useCallback, useEffect, useRef, useState } from 'react';

import { logEvent } from '@/api/eventsApi';
import { reportPauseState, reportPosition } from '@/api/peopleApi';
import { ACTIVITY_RECOGNITION, BATTERY } from '@/constants/config';
import {
  requestActivityRecognitionPermission,
  startActivityRecognition,
  stopActivityRecognition,
} from '@/services/activityRecognitionService';
import {
  setLocationUpdateHandler,
  startBackgroundTracking,
  stopBackgroundTracking,
} from '@/services/locationService';
import { requestLocationPermissions } from '@/services/permissionsService';
import { useAuthStore } from '@/store/useAuthStore';
import { useCrewStore } from '@/store/useCrewStore';
import { LocationPermissionState } from '@/types/domain';

/** Location updates and the activity recognizer always run together. */
async function startSharing(): Promise<void> {
  await startBackgroundTracking();
  await startActivityRecognition(ACTIVITY_RECOGNITION.updateIntervalMs);
}

async function stopSharing(): Promise<void> {
  await stopBackgroundTracking();
  await stopActivityRecognition();
}

/**
 * Worker Home screen: requests permission, starts/stops the background
 * tracking task (plus Android activity recognition, which sharpens the
 * walking/driving signal), and wires each fix into the crew store (+ reports
 * it upstream, with the phone's battery level). Pause/resume is local UI
 * state layered on top of the same task.
 */
export function useLocationSharingController() {
  const [paused, setPaused] = useState(false);
  const [permission, setPermission] = useState<LocationPermissionState | null>(null);
  const workerId = useAuthStore(state => state.profile?.id);
  const workerName = useAuthStore(state => state.profile?.name);
  const updatePersonPosition = useCrewStore(state => state.updatePersonPosition);
  /** So a low battery is reported once per drop, not on every fix while it stays low. */
  const batteryLowRef = useRef(false);

  useEffect(() => {
    if (!workerId) return;
    setLocationUpdateHandler(fix => {
      updatePersonPosition(workerId, fix);
      reportPosition(workerId, fix).catch(() => {});

      if (fix.battery == null) return;
      const isLow = fix.battery <= BATTERY.lowLevel;
      if (isLow && !batteryLowRef.current) {
        logEvent(
          `${workerName ?? 'A worker'}'s phone battery is low (${Math.round(fix.battery * 100)}%)`,
          'warn'
        ).catch(() => {});
      }
      batteryLowRef.current = isLow;
    });
    return () => setLocationUpdateHandler(null);
  }, [workerId, workerName, updatePersonPosition]);

  useEffect(() => {
    (async () => {
      const result = await requestLocationPermissions();
      setPermission(result);
      if (!result.granted) return;
      // Optional: refused just means walking/driving comes from GPS speed alone.
      await requestActivityRecognitionPermission();
      await startSharing();
    })();
  }, []);

  const togglePause = useCallback(() => {
    setPaused(wasPaused => {
      const nextPaused = !wasPaused;
      if (workerId) reportPauseState(workerId, nextPaused).catch(() => {});
      if (nextPaused) {
        stopSharing();
        logEvent(`${workerName ?? 'A worker'} paused sharing`, 'warn').catch(() => {});
      } else {
        startSharing();
        logEvent(`${workerName ?? 'A worker'} resumed sharing`, 'info').catch(() => {});
      }
      return nextPaused;
    });
  }, [workerId, workerName]);

  return { paused, togglePause, permission };
}
