import { Linking, Platform } from 'react-native';

/**
 * Opens a point in the phone's maps app (Google Maps on Android), falling
 * back to Google Maps in the browser when no app takes the link.
 */
export async function openInMaps(lat: number, lng: number, label?: string): Promise<void> {
  const query = `${lat},${lng}`;
  const native =
    Platform.OS === 'android'
      ? `geo:${query}?q=${query}${label ? `(${encodeURIComponent(label)})` : ''}`
      : `maps:?q=${encodeURIComponent(label ?? query)}&ll=${query}`;
  try {
    await Linking.openURL(native);
  } catch {
    await Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${query}`).catch(error =>
      console.warn('[maps] could not open maps —', error)
    );
  }
}

/** Hands a web link (e.g. an uploaded video) to the phone's browser or player. */
export async function openUrl(url: string): Promise<void> {
  await Linking.openURL(url).catch(error => console.warn('[linking] could not open link —', error));
}
