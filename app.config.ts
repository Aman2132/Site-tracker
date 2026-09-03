import { ExpoConfig } from 'expo/config';

// Build-time only — never bundled into the JS app. Required to download the
// Mapbox Android SDK during `expo prebuild` / the native build.
const MAPBOX_DOWNLOADS_TOKEN = process.env.MAPBOX_DOWNLOADS_TOKEN ?? '';

const config: ExpoConfig = {
  name: 'Site Tracker',
  slug: 'site-tracker',
  version: '1.0.0',
  orientation: 'portrait',
  userInterfaceStyle: 'automatic',
  splash: {
    backgroundColor: '#fbf8f2',
    resizeMode: 'contain',
  },
  android: {
    package: 'com.sitetracker.app',
    permissions: [
      'ACCESS_FINE_LOCATION',
      'ACCESS_COARSE_LOCATION',
      'ACCESS_BACKGROUND_LOCATION',
      'CAMERA',
      'FOREGROUND_SERVICE',
    ],
  },
  plugins: [
    'expo-splash-screen',
    [
      'expo-location',
      {
        locationAlwaysAndWhenInUsePermission:
          'Site Tracker uses your location to record hours on site and tag photos, even when the app is closed.',
        isAndroidBackgroundLocationEnabled: true,
        isAndroidForegroundServiceEnabled: true,
      },
    ],
    [
      'react-native-vision-camera',
      {
        cameraPermissionText: 'Site Tracker needs the camera to take geotagged site photos.',
        enableCodeScanner: false,
      },
    ],
    [
      '@rnmapbox/maps',
      {
        RNMapboxMapsDownloadToken: MAPBOX_DOWNLOADS_TOKEN,
      },
    ],
    [
      'expo-build-properties',
      {
        android: {
          minSdkVersion: 26,
        },
      },
    ],
  ],
};

export default config;
