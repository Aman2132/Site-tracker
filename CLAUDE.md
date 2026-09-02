# Site Tracker — engineering guide

Crew location tracking + geotagged site camera app, built Expo / React Native
/ TypeScript. This file is the standing instruction set for anyone (human or
Claude) writing code in this repo. Read it before adding a screen, a store,
or a device integration — it exists so the codebase stays understandable to
a developer who has never seen it before.

## Non-negotiables

1. **TypeScript everywhere.** No new `.js`/`.jsx` files under `src/` or at
   the root. `strict` mode is on in `tsconfig.json` — don't weaken it, don't
   sprinkle `any` to silence the compiler. If a type is genuinely unknown
   (e.g. a third-party module with no types), declare it narrowly in
   `src/types/*.d.ts` the way `src/types/piexifjs.d.ts` does.
2. **Every file has one job.** A screen renders. A component renders one
   piece of UI and takes props — it does not fetch data or own business
   logic. A controller hook orchestrates. A service talks to the OS/device.
   An api/ function talks to the backend (mocked for now). A store holds
   state and nothing else. If a file is doing two of these, split it.
3. **No inline magic values.** Colors, spacing, radii and type sizes come
   from `src/constants/theme.ts`. Tunables (tracking intervals, geofence
   bounds, mock latency) come from `src/constants/config.ts`. If a screen is
   about to hardcode a hex color or a `paddingTop: 54`, stop and check
   whether it already exists in `theme.ts`/`config.ts` first.

## Folder structure and what belongs where

```
src/
  types/          Domain models (Person, Site, Photo, Event) + navigation
                  param lists. Shared vocabulary — everything else imports
                  from here, this imports from nothing else in src/.
  constants/      theme.ts (design tokens), config.ts (behavioral tunables),
                  mockData.ts (static seed dataset), session.ts (stand-in
                  for the signed-in user until auth exists).
  api/            The backend boundary. One file per resource (peopleApi,
                  siteApi, photosApi, eventsApi), each exporting async
                  functions that currently resolve from mockData.ts with a
                  simulated delay. THIS is the only layer that should change
                  when a real backend is wired in — controllers, stores and
                  screens call these functions and don't care what's behind
                  them.
  services/       Device/OS integration with no app state: expo-location
                  wrapper, expo-camera EXIF writer, permission requests,
                  AsyncStorage read/write. Pure, mockable, no React.
  controllers/    React hooks that orchestrate: call a service and/or an
                  api/ function, then write the result into a store. Screens
                  call exactly one (or zero) controller hooks and render
                  what comes back — they never call services or api/
                  directly. Name them `use<Thing>Controller`.
  store/          Zustand stores, one domain per file (useRoleStore,
                  useCrewStore, useSiteStore, usePhotoStore, useEventStore).
                  A store holds state and simple setters only — no fetching,
                  no side effects. Side effects belong in controllers/.
  navigation/      Tab navigators + the role-based RootNavigator.
  screens/        One screen per file, grouped by owner/ vs worker/.
                  Screens compose components/ and read one controller hook;
                  no business logic, no direct API/service calls.
  components/     Reusable presentational pieces, grouped by common/
                  (shared across both roles) vs owner/ vs worker/. Pure
                  props-in, JSX-out — no store access unless a component is
                  specifically a "smart" widget like DevRoleSwitchButton,
                  and even then it should be one obvious store call, not
                  business logic.
  utils/          Pure functions with no side effects (formatters.ts,
                  geo.ts). If it doesn't touch React, the network, or the
                  device, it goes here, not in a component.
```

## Adding a new feature — the checklist

1. Add/extend the type in `src/types/domain.ts` if new data is involved.
2. Add the fetch/mutate function to the relevant `src/api/*.ts` file (mock
   it against `mockData.ts` for now).
3. Add or extend a Zustand store slice in `src/store/` to hold the state.
4. Write a controller hook in `src/controllers/` that wires api → store
   (and a service, if device hardware is involved).
5. Build any new presentational pieces in `src/components/<owner|worker|common>/`.
6. Wire it into a screen in `src/screens/`, which should stay thin: call the
   controller, pass results to components.

If you're tempted to `fetch`/`AsyncStorage.getItem`/`Location.*` directly
inside a screen or component, stop — that logic belongs in a service or
api/ function, called from a controller.

## State management

Zustand, not Context/Redux. Each store is a small `create<...>()` — see
`src/store/useCrewStore.ts` for the pattern. Components subscribe with a
selector (`useCrewStore(state => state.people)`), not the whole store, so
unrelated state changes don't cause re-renders. Side effects (fetching on
mount, persisting to disk) live in controllers/, not in the store itself —
keep stores boring.

## Styling

`StyleSheet.create` at the bottom of each component/screen file, values
sourced from `src/constants/theme.ts` (`colors`, `spacing`, `radius`,
`typography`). No inline style objects with hardcoded numbers/hex strings
in JSX.

## Current status

This is a runnable, fully static/mock-data build — no real backend, no
auth. See `README.md` "Known gaps to close before shipping" for what's
still stubbed. The architecture above is deliberately already shaped for
those gaps to be filled by swapping `src/api/*` implementations, without
touching `screens/`, `components/`, or `store/`.
