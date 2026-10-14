import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { deletePushToken, savePushToken } from '@/api/peopleApi';
import { HAS_FIREBASE_CONFIG } from '@/constants/config';
import { appVersion } from '@/services/appInfoService';
import {
  getLocationAccess,
  openAppSettings,
  requestLocationPermissions,
} from '@/services/permissionsService';
import {
  getNotificationAccess,
  loadNotificationsEnabled,
  registerForPushNotifications,
  saveNotificationsEnabled,
} from '@/services/pushService';
import { useAuthStore } from '@/store/useAuthStore';
import { LocationAccess, PermissionAccess } from '@/types/domain';

const warn = (what: string) => (error: unknown) => console.warn(`[settings] ${what} —`, error);

/**
 * Profile tab's Settings card: app version, location permission, and the
 * notifications switch. Permissions are re-read whenever the app comes back
 * to the foreground, so a change made in Android Settings shows at once.
 */
export function useSettingsController() {
  const personId = useAuthStore(state => state.profile?.id);
  const [location, setLocation] = useState<LocationAccess | null>(null);
  const [notificationAccess, setNotificationAccess] = useState<PermissionAccess | null>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    const [nextLocation, nextNotifications, enabled] = await Promise.all([
      getLocationAccess().catch(() => null),
      getNotificationAccess().catch(() => null),
      loadNotificationsEnabled(),
    ]);
    setLocation(nextLocation);
    setNotificationAccess(nextNotifications);
    setNotificationsEnabled(enabled);
  }, []);

  useEffect(() => {
    refresh();
    const subscription = AppState.addEventListener('change', state => state === 'active' && refresh());
    return () => subscription.remove();
  }, [refresh]);

  /** Asks while Android still shows the prompt; once it won't (or to upgrade to "always"), opens Settings. */
  const onLocationAction = useCallback(async () => {
    if (location !== 'ask') return openAppSettings();
    setBusy(true);
    await requestLocationPermissions().catch(warn('location request failed'));
    await refresh();
    setBusy(false);
  }, [location, refresh]);

  const setNotifications = useCallback(
    async (on: boolean) => {
      setBusy(true);
      setNotificationsEnabled(on);
      try {
        await saveNotificationsEnabled(on);
        if (!on) {
          if (HAS_FIREBASE_CONFIG && personId) await deletePushToken(personId);
        } else if (notificationAccess === 'blocked') {
          await openAppSettings();
        } else {
          // Prompts if needed; null when refused.
          const token = await registerForPushNotifications();
          if (token && HAS_FIREBASE_CONFIG && personId) await savePushToken(personId, token);
        }
      } catch (error) {
        warn('notification change failed')(error);
      }
      await refresh();
      setBusy(false);
    },
    [notificationAccess, personId, refresh]
  );

  return {
    version: appVersion(),
    location,
    onLocationAction,
    notificationAccess,
    /** On only when the person wants them AND the phone allows them. */
    notificationsOn: notificationsEnabled && notificationAccess === 'granted',
    setNotifications,
    busy,
  };
}
