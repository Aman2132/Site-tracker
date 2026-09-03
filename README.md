# Site Tracker (Expo / React Native / TypeScript)

Crew location tracking + geotagged site camera, built for construction site
owners and their workers.

## Architecture

See [CLAUDE.md](CLAUDE.md) for the full engineering guide (folder-by-folder
responsibilities, the checklist for adding a feature, state management and
styling conventions). Short version:

```
App.tsx                  Navigation root
src/types/                Domain models + navigation param lists
src/constants/            theme.ts, config.ts, mockData.ts, session.ts
src/api/                  Mock backend boundary (swap for real HTTP later)
src/services/             Device integration: location, camera EXIF, storage, permissions
src/controllers/          Hooks wiring api/services -> store (business logic)
src/store/                Zustand stores (state only)
src/navigation/            Owner/worker tab navigators + role-based root
src/screens/owner/         Map, Crew, Photos, Sites, Activity
src/screens/worker/        Home, Camera, MyPhotos
src/components/            Presentational pieces, grouped by common/owner/worker
src/utils/                 Pure formatting/geo helpers
```

Screens stay thin: they call one controller hook and render components.
Controllers own orchestration; stores own state; services own device I/O;
api/ owns the (currently mocked) backend boundary — swapping in a real
backend means editing `src/api/*.ts` only.

## Run it

Uses `react-native-vision-camera` and `@rnmapbox/maps`, both of which need
native code Expo Go can't run — this is a custom dev-client build, not the
managed Expo Go workflow.

```
cp .env.example .env   # fill in your Mapbox tokens, see .env.example
npm install
npx expo prebuild -p android
npm run android
```

On first launch, grant "Allow all the time" location and camera permission
for the worker flows to work.

```
npm run typecheck   # tsc --noEmit
npm run lint        # eslint
```

## Known gaps to close before shipping

- No backend — `src/api/*.ts` resolves from `src/constants/mockData.ts`.
  Point each function at real HTTP calls; nothing in `store/`,
  `controllers/`, or `screens/` needs to change.
- Activity classification (`services/locationService.ts:classifyActivity`)
  is a speed threshold — for a real "walking vs vehicle" signal, use
  Android's ActivityRecognition API or a motion library.
- No auth — role is a manual toggle (`DevRoleSwitchButton`), and the signed-
  in worker id is hardcoded in `src/constants/session.ts`.
- Push notifications for alerts (GPS off, left site, low battery) aren't
  wired — `useEventStore.addEvent` is where they'd originate.
