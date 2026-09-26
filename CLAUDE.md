# Site Tracker — engineering guide

Crew location tracking + geotagged site camera app, built Expo / React Native
/ TypeScript. This file is the standing instruction set for anyone (human or
Claude) writing code in this repo. Read it before adding a screen, a store,
or a device integration — it exists so the codebase stays understandable to
a developer who has never seen it before.

## ⚠️ Dev machine security note — Memory Integrity is disabled

On 2026-09-02, Windows **Memory Integrity (Core Isolation / HVCI)** was
disabled on this development PC (registry:
`HKLM\SYSTEM\CurrentControlSet\Control\DeviceGuard\Scenarios\HypervisorEnforcedCodeIntegrity`,
`Enabled=0`) so the Android emulator's WHPX hypervisor could get exclusive
access — with it on, the emulator failed with
`WHPX: Failed to setup partition, hr=80070005`.

This is a real security tradeoff, not a cosmetic setting: Memory Integrity
protects against kernel-level exploits and rootkits. It should be
re-enabled as soon as Android emulator work on this machine isn't needed.

**Standing instruction (do not remove until resolved): at the start of
every session working in this repo, ask the user whether Memory Integrity
has been turned back on yet.** Keep asking every session until they
confirm — via Windows Security → Device security → Core isolation → Memory
integrity, or setting that same registry value back to `1` and rebooting —
then delete this section.

## Standing instruction — never commit or push on the user's behalf

Only the user themselves runs `git commit` and `git push` in this repo.

**Never commit.** Claude may stage files (`git add`) and must then stop and
hand control back. Do not run `git commit` unless the user asks for that
commit in the moment — a prior "you can commit" in an earlier session, or a
long autonomous task that produced a lot of work, does not count as
authorization. Leave the work in the working tree and say it's ready.

**Never push.** Never run `git push` or anything else that publishes to a
remote. If the user explicitly says to push, don't push immediately — ask
them to confirm three separate times before actually running it.

Set as a standing rule on 2026-09-14 after Claude pushed a commit
unprompted, and extended to cover commits on 2026-09-20 after Claude
committed autonomously during a `/loop` run. Do not remove or soften this
section without the user explicitly saying so.

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
   from `src/constants/theme.ts`. Tunables (tracking intervals, map camera,
   mock latency) come from `src/constants/config.ts`. If a screen is
   about to hardcode a hex color or a `paddingTop: 54`, stop and check
   whether it already exists in `theme.ts`/`config.ts` first.

## Folder structure and what belongs where

```
src/
  types/          Domain models (Person/PersonProfile, Site, Photo, Event) +
                  navigation param lists. Shared vocabulary — everything else
                  imports from here, this imports from nothing else in src/.
  constants/      theme.ts (design tokens), config.ts (behavioral tunables +
                  Firebase/Supabase/Google Maps config from env), mockData.ts
                  (seed data — no longer read by the app itself, only by
                  scripts/seedFirebase.js).
  api/            The backend boundary — real Firebase (Firestore + Realtime
                  Database) for everything except photo files, which go to
                  Supabase Storage (Firebase Storage started requiring a
                  Blaze billing account for every project, even free-tier
                  usage, as of Feb 2026 — see README "Backend setup"). One
                  file per resource (peopleApi, photosApi,
                  eventsApi) plus firebaseClient.ts and supabaseClient.ts
                  (the shared SDK instances resource files import). Static/
                  rarely-changing data lives in Firestore; live crew
                  positions live in Realtime Database, since RTDB's free
                  tier is bandwidth-based rather than per-read — a much
                  better fit for frequent small position writes. Controllers,
                  stores and screens call these functions and don't care
                  what's behind them.
  services/       Device/OS + backend-SDK integration with no app state:
                  expo-location wrapper, offline EXIF writer,
                  mediaLibraryService.ts (saves a capture to the "Site
                  Tracker" gallery album, and lists it to rebuild the Photos
                  list after a reinstall), localMediaService.ts (moves a
                  capture out of the cache into permanent app storage),
                  photoQueueStorage.ts (each person's saved captures, one
                  AsyncStorage key per person), batteryService.ts
                  (expo-battery), avatarService.ts (picks + shrinks a
                  profile photo), activityRecognitionService.ts (wraps the
                  local native module below), permission requests, AsyncStorage read/write,
                  authService.ts (Firebase Auth wrapper), pushService.ts
                  (expo-notifications). Pure, mockable, no React.
  controllers/    React hooks that orchestrate: call a service and/or an
                  api/ function, then write the result into a store. Screens
                  call exactly one (or zero) controller hooks and render
                  what comes back — they never call services or api/
                  directly. Name them `use<Thing>Controller`.
  store/          Zustand stores, one domain per file (useAuthStore,
                  useCrewStore, usePhotoStore, useEventStore).
                  A store holds state and simple setters only — no fetching,
                  no side effects. Side effects belong in controllers/.
  navigation/      RootNavigator (gated on real auth state — signed out
                  shows LoginScreen, else appRole picks the tab set) + the
                  owner/worker tab navigators.
  screens/        One screen per file, grouped by owner/ vs worker/ vs
                  common/ (LoginScreen). Screens compose components/ and
                  read one controller hook; no business logic, no direct
                  API/service calls.
  components/     Reusable presentational pieces, grouped by common/
                  (shared across both roles) vs owner/ vs worker/. Pure
                  props-in, JSX-out — no store access unless a component is
                  specifically a "smart" widget like SignOutButton, and even
                  then it should be one obvious store/service call, not
                  business logic.
  utils/          Pure functions with no side effects (formatters.ts,
                  geo.ts). If it doesn't touch React, the network, or the
                  device, it goes here, not in a component.
modules/          Local Expo native modules, autolinked from here.
                  activity-recognition/ is Android-only Kotlin (Play Services
                  activity recognition) — changing it needs a native rebuild.
scripts/          One-off Node admin scripts (Firebase seeding via
                  firebase-admin). Has its own package.json — never imported
                  by the RN app, never part of the bundle.
```

## Adding a new feature — the checklist

1. Add/extend the type in `src/types/domain.ts` if new data is involved.
2. Add the fetch/mutate function to the relevant `src/api/*.ts` file,
   talking to Firestore/Realtime Database (or Supabase Storage, for photo
   files) directly. If it's a new Firestore collection, add a matching rule
   block to `firestore.rules` (default-deny — nothing is readable/writable
   until a rule allows it) and redeploy with `firebase deploy --only firestore:rules`.
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

Backed by a real Firebase project (Auth + Firestore + Realtime Database) plus
a real Supabase project (Storage, for photo files only — see the Feb 2026
Firebase Storage billing note above) — see "Backend setup (Firebase +
Supabase)" in `README.md` to point it at your own projects, and `README.md`
"Known gaps to close before shipping" for what's still stubbed (push
delivery when the app is closed, employee self-management, activity
classification, battery reading, per-user write restriction on the Supabase
bucket).
