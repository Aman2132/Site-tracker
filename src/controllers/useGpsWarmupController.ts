import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { watchPreciseFix } from '@/services/locationService';
import { hasForegroundLocationPermission } from '@/services/permissionsService';

/**
 * Keeps the phone's GPS locked while the app is on screen, so the Camera
 * screen starts with satellites already found instead of a cold start (which
 * can take a minute with no cell data, and meanwhile only gives a ~50 m
 * cell-tower guess). Stops whenever the app leaves the foreground, so the
 * cost is roughly 1-2% battery per hour of the app being open. Never prompts
 * for permission — if location isn't granted yet it just doesn't run.
 */
export function useGpsWarmupController(enabled: boolean): void {
  const [foreground, setForeground] = useState(AppState.currentState === 'active');

  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => setForeground(state === 'active'));
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (!enabled || !foreground) return;
    let stop: (() => void) | undefined;
    let cancelled = false;
    hasForegroundLocationPermission().then(granted => {
      // The fixes themselves are unused here — the running watch is what keeps GPS warm.
      if (granted && !cancelled) stop = watchPreciseFix(() => {});
    });
    return () => {
      cancelled = true;
      stop?.();
    };
  }, [enabled, foreground]);
}
