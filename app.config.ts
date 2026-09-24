import { ExpoConfig } from 'expo/config';

// Build-time only — never bundled into the JS app. Required to download the
// Mapbox Android SDK during `expo prebuild` / the native build.
const MAPBOX_DOWNLOADS_TOKEN = process.env.MAPBOX_DOWNLOADS_TOKEN ?? '';

const config: ExpoConfig = {
  name: 'Site Tracker',
  slug: 'site-tracker',
  // Deep-link scheme expo-dev-client's launcher uses to hand a chosen dev
  // server URL back to the app (sitetracker://expo-development-client/?url=...).
  scheme: 'sitetracker',
  version: '1.0.0',
  orientation: 'portrait',
  userInterfaceStyle: 'automatic',
  icon: './assets/icon.png',
  splash: {
    image: './assets/splash-icon.png',
    backgroundColor: '#fbf8f2',
    resizeMode: 'contain',
  },
  android: {
    package: 'com.sitetracker.app',
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#1c4ff0',
    },
    permissions: [
      'ACCESS_FINE_LOCATION',
      'ACCESS_COARSE_LOCATION',
      'ACCESS_BACKGROUND_LOCATION',
      'CAMERA',
      'FOREGROUND_SERVICE',
      // Writing a capture into the device gallery. WRITE_EXTERNAL_STORAGE is
      // only consulted on API <= 28; scoped storage covers it above that.
      'WRITE_EXTERNAL_STORAGE',
      // Without this, Android 10+ redacts GPS EXIF out of MediaStore reads,
      // so the gallery copy would show no location.
      'ACCESS_MEDIA_LOCATION',
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
      'expo-notifications',
      {
        color: '#1c4ff0',
      },
    ],
    [
      'expo-media-library',
      {
        savePhotosPermission: 'Site Tracker saves your geotagged site photos to your gallery.',
        photosPermission: 'Site Tracker saves your geotagged site photos to your gallery.',
        isAccessMediaLocationEnabled: true,
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
