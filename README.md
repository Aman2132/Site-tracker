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
src/constants/            theme.ts, config.ts, mockData.ts (seed script source)
src/api/                  Backend boundary — Firebase (Firestore + Realtime DB + Storage)
src/services/             Device integration + auth/push: location, camera EXIF,
                          storage, permissions, authService, pushService
src/controllers/          Hooks wiring api/services -> store (business logic)
src/store/                Zustand stores (state only)
src/navigation/            RootNavigator (auth-gated) + owner/worker tab navigators
src/screens/owner/         Map, Crew, Photos, Sites, Activity
src/screens/worker/        Home, Camera, MyPhotos
src/screens/common/        LoginScreen
src/components/            Presentational pieces, grouped by common/owner/worker
src/utils/                 Pure formatting/geo helpers
scripts/                  One-off admin scripts (Firebase seeding) — not part of the app
```

Screens stay thin: they call one controller hook and render components.
Controllers own orchestration; stores own state; services own device I/O;
api/ owns the backend boundary (Firebase).

## Run it

Uses `react-native-vision-camera`, `@rnmapbox/maps`, and `expo-notifications`,
all of which need native code Expo Go can't run — this is a custom dev-client
build, not the managed Expo Go workflow.

```
cp .env.example .env   # fill in your Mapbox + Firebase config, see .env.example
npm install
npx expo prebuild -p android
npm run android
```

On first launch, grant "Allow all the time" location and camera permission
for the worker flows to work.

```
npm run typecheck   # tsc --noEmit
npm run lint        # eslint
npm test            # jest
```

## Backend setup (Firebase)

1. Create a project at [console.firebase.google.com](https://console.firebase.google.com).
2. Add a **Web app** to it (yes, even though this is mobile — the JS SDK config is the same
   one) and copy the config values into `.env` (see `.env.example`).
3. Enable **Authentication -> Email/Password**, **Firestore**, **Realtime Database**, and
   **Storage** from the left nav (each has a "get started" button — defaults are fine).
4. Deploy the security rules (requires `npm install -g firebase-tools` then `firebase login`
   once): `firebase deploy --only firestore:rules,database` — do this before real employees
   use the app, since the rules are what stop a stranger with your API keys from reading or
   writing everyone's data.
5. Seed the roster: download a service account key (Project settings -> Service accounts ->
   Generate new private key), then:
   ```
   cd scripts
   npm install
   node seedFirebase.js /path/to/serviceAccountKey.json
   ```
   This creates one owner + 5 seed workers (from `src/constants/mockData.ts`) as real
   Firebase Auth accounts, prints their generated passwords once, and writes their
   `people/{uid}` profile docs plus `sites/default`. Keep the service account key out of
   git — it's a permanent admin credential, already covered by `.gitignore`.

## Building a real install (EAS)

`eas.json` has `development`/`preview`/`production` profiles. Requires an Expo account
(`npm install -g eas-cli`, `eas login`), which is separate from the Firebase account above.

```
eas build --profile preview --platform android   # installable APK, no store needed
eas build --profile production --platform android # Play Store app bundle
```

## Known gaps to close before shipping

- **Push notifications only fire in the foreground.** `services/pushService.ts` registers
  each device's Expo push token and saves it to Firestore `pushTokens/{uid}`, but nothing
  currently calls Expo's push API to deliver a notification when the app is closed — that
  needs a small server-side piece (e.g. a Cloud Function triggered on new `events` docs).
  Cloud Functions require Firebase's Blaze (pay-as-you-go) plan; usage at this scale stays
  within the free quota, but Blaze still needs a card on file, so it wasn't wired up without
  asking first.
- **No employee self-management UI.** Adding/removing workers or changing someone's role
  today means re-running `scripts/seedFirebase.js` or editing Firestore by hand — there's no
  in-app "invite a worker" flow yet.
- **Activity classification** (`services/locationService.ts:classifyActivity`) is a speed
  threshold — reasonable, but a real "walking vs vehicle" signal would use Android's
  ActivityRecognition API or a motion library.
- **Battery level isn't read from the device.** `Person.battery` is only ever updated to
  its default (100%) since nothing calls a battery API yet — wiring up `expo-battery` would
  close this.
