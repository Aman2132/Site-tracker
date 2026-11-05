# Graph Report - Site-tracker  (2026-11-05)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 1002 nodes · 3390 edges · 49 communities (41 shown, 8 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 56 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `896a1c65`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- theme.ts
- MapScreen.tsx
- ref_react
- PhotosScreen.tsx
- locationService.ts
- domain.ts
- DevRoleSwitchButton.tsx
- expo
- useCrewTrackingController.ts
- useLocationSharingController.ts
- tsconfig.json
- peopleApi.ts
- exifService.ts
- withNetworkDelay
- useActivityFeedController.ts
- app.config.ts
- piexifjs.d.ts
- babel.config.js
- .eslintrc.js
- GPSIFD
- HomeScreen.tsx
- useOwnerPhotosController.ts
- siteCrew.ts
- seedFirebase.js
- useLiveMapController.ts
- metro.config.js
- App.tsx
- spacing
- useCrewManagementController.ts
- peopleApi.ts
- Photo
- localMediaService.ts
- scripts
- photosApi.ts
- fontFamily
- SiteCrewMap.tsx
- exifService.test.ts
- expo-battery
- tsconfig.json
- OpenLocationCode
- expo
- jest
- piexifjs.d.ts
- expo-image-manipulator
- expo-system-ui@~57.0.4
- GPSIFD
- ImageIFD

## God Nodes (most connected - your core abstractions)
1. `react` - 89 edges
2. `react-native` - 75 edges
3. `colors` - 60 edges
4. `spacing` - 50 edges
5. `fontFamily` - 47 edges
6. `radius` - 44 edges
7. `@expo/vector-icons` - 40 edges
8. `useAuthStore` - 39 edges
9. `usePhotoQueueController()` - 33 edges
10. `Photo` - 30 edges

## Surprising Connections (you probably didn't know these)
- `App()` --calls--> `RootNavigator()`  [EXTRACTED]
  App.tsx → src/navigation/RootNavigator.tsx
- `App()` --calls--> `ErrorBoundary`  [EXTRACTED]
  App.tsx → src/components/common/ErrorBoundary.tsx
- `CheckInCardProps` --references--> `Site`  [EXTRACTED]
  src/components/worker/CheckInCard.tsx → src/types/domain.ts
- `InventoryEntrySheetProps` --references--> `Site`  [EXTRACTED]
  src/components/worker/InventoryEntrySheet.tsx → src/types/domain.ts
- `CrewMemberActionsProps` --references--> `Person`  [EXTRACTED]
  src/components/owner/CrewMemberActions.tsx → src/types/domain.ts

## Import Cycles
- None detected.

## Communities (49 total, 8 thin omitted)

### Community 0 - "theme.ts"
Cohesion: 0.06
Nodes (67): expo-constants, colorForNewWorker(), createPersonProfile(), deletePushToken(), fetchPersonProfile(), savePushToken(), updateOwnProfile(), AppTabBar() (+59 more)

### Community 1 - "MapScreen.tsx"
Cohesion: 0.06
Nodes (58): expo-task-manager, firebase, AdminAuditDetails, EventDetails, logEvent(), auth, firestore, rtdb (+50 more)

### Community 2 - "ref_react"
Cohesion: 0.07
Nodes (51): react-native-vision-camera@4.7.3, @react-navigation/native@^7.4.1, react-native-vision-camera, @react-navigation/native, @testing-library/react-native, setup(), touch(), NO_ZOOM (+43 more)

### Community 3 - "PhotosScreen.tsx"
Cohesion: 0.10
Nodes (49): createInventoryEntry(), inventoryEntryExists(), logInventoryUsage(), newInventoryId(), subscribeToSiteInventory(), toEntry(), Chip(), InventoryEntrySheet() (+41 more)

### Community 4 - "locationService.ts"
Cohesion: 0.10
Nodes (33): @react-navigation/bottom-tabs, EmptyState(), IconName, styles, FilterChips(), FilterSheet(), LoadingView(), styles (+25 more)

### Community 5 - "domain.ts"
Cohesion: 0.05
Nodes (37): dependencies, expo-build-properties@~57.0.22, expo-constants@~57.0.19, expo-dev-client@~57.0.19, expo-font@~57.0.4, expo-image-picker@~57.0.20, expo-linear-gradient@~57.0.2, expo-location@~57.0.20 (+29 more)

### Community 6 - "DevRoleSwitchButton.tsx"
Cohesion: 0.11
Nodes (26): @expo/vector-icons, react-native-keyboard-controller, CameraRoundButton(), styles, CameraZoomControl(), styles, CaptureToast(), styles (+18 more)

### Community 7 - "expo"
Cohesion: 0.09
Nodes (32): devDependencies, babel-plugin-module-resolver@^5.0.2, babel-preset-expo@~57.0.13, eslint@^8.57.0, eslint-config-universe@^13.0.0, jest-expo@~57.0.5, patch-package@^8.0.1, prettier@^3.3.3 (+24 more)

### Community 8 - "useCrewTrackingController.ts"
Cohesion: 0.12
Nodes (24): react, InitialsAvatar(), InitialsAvatarProps, styles, ProfileAvatarEditorProps, styles, CrewListItem(), STATUS_COLOR (+16 more)

### Community 9 - "useLocationSharingController.ts"
Cohesion: 0.11
Nodes (23): ACTIVITY_RECOGNITION, ACTIVITY_THRESHOLDS, AUTO_SYNC, BATTERY, CAPTURE_TASK, DEFAULT_COORDS, GOOGLE_MAPS_API_KEY, HAS_SUPABASE_CONFIG (+15 more)

### Community 10 - "tsconfig.json"
Cohesion: 0.16
Nodes (20): @react-native-async-storage/async-storage, PHOTO_DATABASE, getPhotoDatabase(), PhotoRow, photosFromRows(), addLocalPhoto(), deleteLocalPhotos(), insertLocal() (+12 more)

### Community 11 - "peopleApi.ts"
Cohesion: 0.16
Nodes (19): LIVE_MAP, SEED_EVENTS, SEED_PEOPLE, SEED_PHOTOS, receiveCrew(), useCrewTrackingController(), wireCrewSubscriptionOnce(), useLiveMapController() (+11 more)

### Community 12 - "exifService.ts"
Cohesion: 0.21
Nodes (19): fetchDeletedPhotos(), THUMBNAIL_CACHE, cacheThumbnails(), dropDeleted(), inFlight, makeThumbnails(), removeDeletedPhotos(), usePhotoQueueController() (+11 more)

### Community 13 - "withNetworkDelay"
Cohesion: 0.18
Nodes (16): expo-linear-gradient, styles, CameraPermissionGate(), CameraPermissionGateProps, styles, CameraProblemOverlay(), styles, CameraShutterButton() (+8 more)

### Community 14 - "useActivityFeedController.ts"
Cohesion: 0.17
Nodes (17): subscribeToEvents(), emitEvents(), ActivityFeedItem(), ACTIVITY_FEED, HAS_FIREBASE_CONFIG, ANY, CATEGORY_OPTIONS, useActivityFeedController() (+9 more)

### Community 15 - "app.config.ts"
Cohesion: 0.20
Nodes (18): camera, attachThumbnail(), currentSite(), errText(), keepFileLogged(), usePhotoCaptureController(), buildExifBytes(), writeGeotag() (+10 more)

### Community 16 - "piexifjs.d.ts"
Cohesion: 0.21
Nodes (13): expo-location, expo-sensors, stopHeading, stopTilt, MapMotion, useMapMotionController(), watchCompassHeading(), watchTilt() (+5 more)

### Community 17 - "babel.config.js"
Cohesion: 0.17
Nodes (15): zustand, CrewMemberActionsProps, PersonDetailSheetProps, StaticCrewMapProps, AuthState, CrewState, EventState, useEventStore (+7 more)

### Community 18 - ".eslintrc.js"
Cohesion: 0.13
Nodes (14): react-native, LOCATION_COPY, styles, Skeleton(), styles, CATEGORY_STYLE, IconName, styles (+6 more)

### Community 19 - "GPSIFD"
Cohesion: 0.15
Nodes (11): owner, queuedPhoto(), remotePhoto(), worker, deleteCachedRemotePhotos(), loadCachedRemotePhotos(), replaceCachedRemotePhotos(), setCachedRemoteThumbs() (+3 more)

### Community 20 - "HomeScreen.tsx"
Cohesion: 0.14
Nodes (15): IconName, StatRow(), StatRowProps, styles, CheckInCard(), styles, PauseToggleRow(), PauseToggleRowProps (+7 more)

### Community 21 - "useOwnerPhotosController.ts"
Cohesion: 0.25
Nodes (15): EVERYONE, usePhotoFilterController(), ALL_SITES, DATE_RANGES, dateOptions(), DateRange, DAYS_BACK, filterPhotos() (+7 more)

### Community 22 - "siteCrew.ts"
Cohesion: 0.21
Nodes (14): fetchSiteCrew(), subscribeToSitePresence(), HAS_GOOGLE_MAPS_KEY, SITE_CREW, useSiteCrewController(), useSiteMapController(), buildSiteCrew(), CrewPresence (+6 more)

### Community 23 - "seedFirebase.js"
Cohesion: 0.12
Nodes (14): firebase-admin, admin, db, dependencies, firebase-admin@^12.6.0, description, name, private (+6 more)

### Community 24 - "useLiveMapController.ts"
Cohesion: 0.24
Nodes (13): LiveCrewMap(), LiveCrewMapProps, styles, toLatLng(), PersonMapMarker(), GeotagOptions, GeoPoint, MAP_STYLES (+5 more)

### Community 25 - "metro.config.js"
Cohesion: 0.15
Nodes (9): config, crypto, escapeRegExp(), fs, { getDefaultConfig }, lockFile, NOT_BUNDLED, path (+1 more)

### Community 26 - "App.tsx"
Cohesion: 0.17
Nodes (8): App(), @expo-google-fonts/plus-jakarta-sans@^0.4.2, expo-splash-screen@~57.0.9, expo-status-bar@~57.0.1, @expo-google-fonts/plus-jakarta-sans, expo-splash-screen, expo-status-bar, ErrorBoundary

### Community 27 - "spacing"
Cohesion: 0.21
Nodes (9): react-native-safe-area-context, AppTabBarProps, IconName, styles, styles, CrewMemberActions(), styles, spacing (+1 more)

### Community 28 - "useCrewManagementController.ts"
Cohesion: 0.27
Nodes (9): logAdminAction(), updatePersonProfile(), admin, arjun, pooja, ramesh, byActiveThenName(), useCrewManagementController() (+1 more)

### Community 29 - "peopleApi.ts"
Cohesion: 0.23
Nodes (10): LivePosition, mergePersonProfile(), SELF_SIGNUP_COLORS, SitePresence, subscribeToCrew(), emitCrew(), profileDoc, ActivityKind (+2 more)

### Community 30 - "Photo"
Cohesion: 0.29
Nodes (9): PhotoNoteSheetProps, PhotoQueueRowProps, useCaptureTrayController(), capture, PhotoState, PhotoSyncStatus, selectPendingPhotos(), usePhotoStore (+1 more)

### Community 31 - "localMediaService.ts"
Cohesion: 0.27
Nodes (7): expo-file-system@~57.0.7, expo-file-system, LOCAL_MEDIA, deleteLocalFiles(), delete(), mockDelete, mockFiles

### Community 32 - "scripts"
Cohesion: 0.20
Nodes (10): scripts, android, format, ios, lint, lint:fix, postinstall, start (+2 more)

### Community 33 - "photosApi.ts"
Cohesion: 0.33
Nodes (6): fetchPhotos(), uploadPhotos(), uploadThumbnail(), supabase, pending, SUPABASE_CONFIG

### Community 34 - "fontFamily"
Cohesion: 0.27
Nodes (7): ErrorBoundaryState, styles, FilterChipOption, styles, FilterSection, styles, fontFamily

### Community 35 - "SiteCrewMap.tsx"
Cohesion: 0.27
Nodes (8): SiteCrewCardProps, STATUS, styles, SiteCrewMap(), SiteCrewMapProps, styles, toLatLng(), SiteCrewMember

### Community 36 - "exifService.test.ts"
Cohesion: 0.22
Nodes (6): piexifjs@^1.0.6, piexifjs, mockBase64, mockConstructed, mockCreate, mockWrite

### Community 37 - "expo-battery"
Cohesion: 0.14
Nodes (8): expo-battery@~57.0.3, expo-notifications@~57.0.21, react-native-url-polyfill@^4.0.0, react-native-worklets@0.10.1, expo-battery, expo-notifications, react-native-url-polyfill, react-native-worklets

### Community 38 - "tsconfig.json"
Cohesion: 0.25
Nodes (7): expo/tsconfig.base, compilerOptions, paths, strict, types, extends, include

### Community 40 - "expo"
Cohesion: 0.50
Nodes (3): config, expo@^57.0.25, expo

### Community 41 - "jest"
Cohesion: 0.50
Nodes (4): jest, moduleNameMapper, preset, transformIgnorePatterns

## Knowledge Gaps
- **3 isolated node(s):** `expo/tsconfig.base`, `GPSIFD`, `ImageIFD`
  These have ≤1 connection - possible missing edges. (Counts symbols only; 253 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **8 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `useCrewTrackingController.ts` to `theme.ts`, `MapScreen.tsx`, `ref_react`, `PhotosScreen.tsx`, `locationService.ts`, `domain.ts`, `DevRoleSwitchButton.tsx`, `expo`, `useLocationSharingController.ts`, `peopleApi.ts`, `exifService.ts`, `withNetworkDelay`, `useActivityFeedController.ts`, `app.config.ts`, `piexifjs.d.ts`, `.eslintrc.js`, `HomeScreen.tsx`, `useOwnerPhotosController.ts`, `siteCrew.ts`, `useLiveMapController.ts`, `App.tsx`, `spacing`, `useCrewManagementController.ts`, `Photo`, `fontFamily`, `SiteCrewMap.tsx`?**
  _High betweenness centrality (0.166) - this node is a cross-community bridge._
- **What connects `expo/tsconfig.base`, `GPSIFD`, `ImageIFD` to the rest of the system?**
  _3 weakly-connected nodes found - possible missing edges._
- **Should `theme.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06292749658002736 - nodes in this community are weakly interconnected._
- **Why does `react-native` connect `.eslintrc.js` to `theme.ts`, `fontFamily`, `ref_react`, `locationService.ts`, `domain.ts`, `DevRoleSwitchButton.tsx`, `expo`, `useCrewTrackingController.ts`, `PhotosScreen.tsx`, `SiteCrewMap.tsx`, `exifService.ts`, `withNetworkDelay`, `HomeScreen.tsx`, `useLiveMapController.ts`, `spacing`?**
  _High betweenness centrality (0.080) - this node is a cross-community bridge._
- **Should `MapScreen.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.06265432098765432 - nodes in this community are weakly interconnected._
- **Why does `dependencies` connect `domain.ts` to `ref_react`, `exifService.test.ts`, `expo-battery`, `expo`, `expo`, `expo-image-manipulator`, `expo-system-ui@~57.0.4`, `App.tsx`, `localMediaService.ts`?**
  _High betweenness centrality (0.032) - this node is a cross-community bridge._
- **Should `ref_react` be split into smaller, more focused modules?**
  _Cohesion score 0.06610259122157588 - nodes in this community are weakly interconnected._