import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { PermissionAccess } from '@/types/domain';

/**
 * Local + foreground push plumbing via expo-notifications. Registers a
 * device push token and shows notifications while the app is open.
 *
 * This does NOT deliver notifications when the app is fully closed —
 * that needs something server-side (e.g. a Firebase Cloud Function
 * triggered on new `events` docs) to actually call Expo's push API.
 * Cloud Functions require Firebase's pay-as-you-go Blaze plan; usage at
 * this app's scale stays within the perpetual free quota, but Blaze still
 * needs a card on file, so that piece is deliberately not wired up here —
 * ask before enabling it.
 */

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    // shouldShowAlert was split in two: the heads-up banner and the entry in
    // the notification shade are now controlled separately.
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export async function registerForPushNotifications(): Promise<string | null> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let status = existingStatus;
  if (status !== 'granted') {
    ({ status } = await Notifications.requestPermissionsAsync());
  }
  if (status !== 'granted') return null;

  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  const token = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
  return token.data;
}

/** Checks (never prompts) the notification permission. */
export async function getNotificationAccess(): Promise<PermissionAccess> {
  const { status, canAskAgain } = await Notifications.getPermissionsAsync();
  if (status === 'granted') return 'granted';
  return canAskAgain ? 'ask' : 'blocked';
}

const NOTIFICATIONS_KEY = 'settings:notificationsEnabled';

/** The Settings switch, per phone. On unless the person switched it off. */
export async function loadNotificationsEnabled(): Promise<boolean> {
  return (await AsyncStorage.getItem(NOTIFICATIONS_KEY).catch(() => null)) !== 'false';
}

export async function saveNotificationsEnabled(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(NOTIFICATIONS_KEY, String(enabled));
}
