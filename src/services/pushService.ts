import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

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
    shouldShowAlert: true,
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

/** Immediate local notification — used for events that happen while the app is foregrounded. */
export async function notifyLocally(title: string, body: string): Promise<void> {
  await Notifications.scheduleNotificationAsync({ content: { title, body }, trigger: null });
}
