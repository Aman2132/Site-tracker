# Graph Report - Site-tracker  (2026-11-04)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 263 nodes · 877 edges · 20 communities (15 shown, 5 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 3 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `f6687025`
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
- GPSIFD

## God Nodes (most connected - your core abstractions)
1. `colors` - 28 edges
2. `spacing` - 25 edges
3. `radius` - 22 edges
4. `fontFamily` - 21 edges
5. `Person` - 16 edges
6. `glow()` - 14 edges
7. `withNetworkDelay()` - 13 edges
8. `LoadingView()` - 13 edges
9. `usePhotoQueueController()` - 13 edges
10. `shadow` - 13 edges

## Surprising Connections (you probably didn't know these)
- `SiteState` --references--> `Site`  [EXTRACTED]
  src/store/useSiteStore.ts → src/types/domain.ts
- `App()` --calls--> `RootNavigator()`  [EXTRACTED]
  App.tsx → src/navigation/RootNavigator.tsx
- `GeofenceRadiusEditorProps` --references--> `radius`  [EXTRACTED]
  src/components/owner/GeofenceRadiusEditor.tsx → src/constants/theme.ts
- `PersonDetailSheetProps` --references--> `Person`  [EXTRACTED]
  src/components/owner/PersonDetailSheet.tsx → src/types/domain.ts
- `CrewState` --references--> `Person`  [EXTRACTED]
  src/store/useCrewStore.ts → src/types/domain.ts

## Import Cycles
- None detected.

## Communities (20 total, 5 thin omitted)

### Community 0 - "theme.ts"
Cohesion: 0.12
Nodes (32): AppTabBar(), AppTabBarProps, IconName, styles, EmptyStateProps, IconName, StatRow(), StatRowProps (+24 more)

### Community 1 - "MapScreen.tsx"
Cohesion: 0.09
Nodes (32): InitialsAvatar(), InitialsAvatarProps, styles, ActivityFeedItem(), styles, CrewListItem(), STATUS_COLOR, styles (+24 more)

### Community 2 - "ref_react"
Cohesion: 0.21
Nodes (14): LoadingView(), styles, ScreenContainer(), ScreenContainerProps, styles, ScreenTitle(), styles, GeofenceRadiusEditor() (+6 more)

### Community 3 - "PhotosScreen.tsx"
Cohesion: 0.25
Nodes (12): PhotoGridCell(), usePhotoQueueController(), wirePersistenceOnce(), PhotosScreen(), styles, QueueScreen(), loadQueuedPhotos(), saveQueuedPhotos() (+4 more)

### Community 4 - "locationService.ts"
Cohesion: 0.18
Nodes (10): ACTIVITY_THRESHOLDS, DEFAULT_COORDS, GEOFENCE, LOCATION_TASK_NAME, LOCATION_TRACKING, MAPBOX_PUBLIC_TOKEN, MOCK_NETWORK_DELAY_MS, getCurrentFix() (+2 more)

### Community 5 - "domain.ts"
Cohesion: 0.24
Nodes (8): SEED_EVENTS, SEED_SITE, CrewState, EventState, SiteState, AppEvent, EventKind, GeoFix

### Community 6 - "DevRoleSwitchButton.tsx"
Cohesion: 0.22
Nodes (8): App(), DevRoleSwitchButton(), DevRoleSwitchButtonProps, styles, RootNavigator(), RoleState, useRoleStore, Role

### Community 7 - "expo"
Cohesion: 0.14
Nodes (13): package, permissions, expo, android, name, orientation, plugins, slug (+5 more)

### Community 8 - "useCrewTrackingController.ts"
Cohesion: 0.38
Nodes (8): fetchCrew(), fetchSite(), updateGeofenceRadius(), useCrewTrackingController(), useGeofenceController(), useSiteStore, distanceMeters(), isWithinRadius()

### Community 9 - "useLocationSharingController.ts"
Cohesion: 0.33
Nodes (8): reportPosition(), useLocationSharingController(), setLocationUpdateHandler(), startBackgroundTracking(), stopBackgroundTracking(), requestLocationPermissions(), useCrewStore, LocationPermissionState

### Community 10 - "tsconfig.json"
Cohesion: 0.25
Nodes (7): expo/tsconfig.base, compilerOptions, baseUrl, paths, strict, extends, include

### Community 11 - "peopleApi.ts"
Cohesion: 0.43
Nodes (4): fetchPerson(), SEED_PEOPLE, CURRENT_WORKER_ID, useCurrentPersonController()

### Community 12 - "exifService.ts"
Cohesion: 0.40
Nodes (3): GeotagOptions, writeGeotag(), GeoPoint

### Community 13 - "withNetworkDelay"
Cohesion: 0.60
Nodes (4): withNetworkDelay(), fetchPhotos(), uploadPhotos(), SEED_PHOTOS

### Community 14 - "useActivityFeedController.ts"
Cohesion: 0.83
Nodes (3): fetchEvents(), useActivityFeedController(), useEventStore

## Knowledge Gaps
- **2 isolated node(s):** `expo/tsconfig.base`, `GPSIFD`
  These have ≤1 connection - possible missing edges. (Counts symbols only; 73 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `colors` connect `theme.ts` to `MapScreen.tsx`, `ref_react`, `PhotosScreen.tsx`, `DevRoleSwitchButton.tsx`?**
  _High betweenness centrality (0.020) - this node is a cross-community bridge._
- **What connects `expo/tsconfig.base`, `GPSIFD` to the rest of the system?**
  _2 weakly-connected nodes found - possible missing edges._
- **Should `theme.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.1222921034241789 - nodes in this community are weakly interconnected._
- **Why does `Person` connect `MapScreen.tsx` to `ref_react`, `peopleApi.ts`, `domain.ts`?**
  _High betweenness centrality (0.018) - this node is a cross-community bridge._
- **Should `MapScreen.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.09090909090909091 - nodes in this community are weakly interconnected._
- **Why does `spacing` connect `theme.ts` to `MapScreen.tsx`, `ref_react`, `PhotosScreen.tsx`, `DevRoleSwitchButton.tsx`?**
  _High betweenness centrality (0.014) - this node is a cross-community bridge._
- **Should `expo` be split into smaller, more focused modules?**
  _Cohesion score 0.14285714285714285 - nodes in this community are weakly interconnected._