import { ExpoConfig } from 'expo/config';

// Build-time only — never bundled into the JS app. @rnmapbox/maps reads its
// Android SDK download token from RNMAPBOX_MAPS_DOWNLOAD_TOKEN (the old
// RNMapboxMapsDownloadToken plugin prop is deprecated and wrote the secret
// into gradle.properties). Our .env has always called it MAPBOX_DOWNLOADS_TOKEN,
// so honour that name too rather than forcing a rename.
process.env.RNMAPBOX_MAPS_DOWNLOAD_TOKEN ??= process.env.MAPBOX_DOWNLOADS_TOKEN ?? '';

// EAS sets this on its build servers; locally it is undefined.
const isProductionBuild = process.env.EAS_BUILD_PROFILE === 'production';

const config: ExpoConfig = {
  name: 'Site Tracker',
  slug: 'site-tracker',
  // Deep-link scheme expo-dev-client's launcher uses to hand a chosen dev
  // server URL back to the app (sitetracker://expo-development-client/?url=...).
  scheme: 'sitetracker',
  version: '1.0.0',
  orientation: 'portrait',
  // The UI is a fixed light design with no dark palette, so pin it. 'automatic'
  // would flip native dialogs/keyboards dark on a dark-mode phone under light screens.
  userInterfaceStyle: 'light',
  icon: './assets/icon.png',
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
    [
      // The top-level `splash` key no longer exists; the splash is configured
      // through this plugin only.
      'expo-splash-screen',
      {
        image: './assets/splash-icon.png',
        backgroundColor: '#fbf8f2',
        resizeMode: 'contain',
        imageWidth: 200,
      },
    ],
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
        enableMicrophonePermission: true,
        microphonePermissionText: 'Site Tracker uses the microphone to record sound with site videos.',
        enableCodeScanner: false,
      },
    ],
    '@rnmapbox/maps',
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
        // We only save photos and videos; never read audio files.
        granularPermissions: ['photo', 'video'],
      },
    ],
    [
      'expo-build-properties',
      {
        android: {
          minSdkVersion: 26,
          // The New Architecture compiles a lot of C++ per chip type, and all
          // four at once can exhaust RAM on a dev laptop (Windows error 1455,
          // "paging file too small"). Day-to-day builds only need the phone
          // (arm64-v8a) and the emulator (x86_64). Production keeps the full
          // default set so older 32-bit Android devices are still supported.
          buildArchs: isProductionBuild ? undefined : ['arm64-v8a', 'x86_64'],
        },
      },
    ],
  ],
};

export default config;
