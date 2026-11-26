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
src/api/                  Backend boundary — Firebase (Firestore + Realtime DB) for
                          everything except photo files, which use Cloudflare R2
src/services/             Device integration + auth/push: location, camera EXIF,
                          local photo database, storage, permissions, authService,
                          pushService
src/controllers/          Hooks wiring api/services -> store (business logic)
src/store/                Zustand stores (state only)
src/navigation/            RootNavigator (auth-gated) + owner/worker tab navigators
src/screens/owner/         Map, Crew, Photos, Activity
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

Uses `react-native-vision-camera`, `react-native-maps` (Google Maps), `expo-sensors`, `expo-notifications` and
`expo-sqlite`, all of which need native code Expo Go can't run — this
is a custom dev-client build, not the managed Expo Go workflow.

```
cp .env.example .env   # fill in your Google Maps and Firebase config
npm install
npx expo prebuild -p android
npm run android
```

On first launch, grant "Allow all the time" location and camera permission
for the worker flows to work. Captures are not added to the phone's gallery:
the only copy on the phone is inside the app (private storage + a SQLite list),
so a photo an admin deletes from the dashboard is removed from the phone too.
A capture that hasn't synced yet is lost if the app is uninstalled or its data
is cleared, so keep the phone online until the photo shows as uploaded.

```
npm run typecheck   # tsc --noEmit
npm run lint        # eslint
npm test            # jest
```

## Backend setup (Firebase and Cloudflare R2)

Identity, roster, photo metadata, events, and live positions are all Firebase.
New photo files live in Cloudflare R2. Existing photo links from either R2 or Supabase continue to work.

### Firebase

1. Create a project at [console.firebase.google.com](https://console.firebase.google.com).
2. Add a **Web app** to it (yes, even though this is mobile — the JS SDK config is the same
   one) and copy the config values into `.env` (see `.env.example`).
3. Enable **Authentication -> Email/Password**, **Firestore**, and **Realtime Database**
   from the left nav (each has a "get started" button — production/locked mode is fine,
   the rules already in this repo cover it). The app stores files separately in R2.
4. Deploy the security rules and indexes (requires `npm install -g firebase-tools` then
   `firebase login` once): `firebase deploy --only firestore:rules,firestore:indexes,database`.
   **Do this before anyone signs in or signs up** — the rules in this repo are what stop a
   stranger with your API keys from reading or writing everyone's data, and until they're
   deployed the *old* (or default-deny) rules are what's actually live, not whatever is
   sitting in `firestore.rules` locally. Self-signup and the composite index it needs
   (`firestore.indexes.json`) both depend on this step; without it, sign-up creates a real
   Firebase Auth account but then fails to write the matching profile, leaving an orphaned
   account with no way to complete sign-in.
5. Seed the roster: download a service account key (Project settings -> Service accounts ->
   Generate new private key), then:
   ```
   cd scripts
   npm install
   node seedFirebase.js /path/to/serviceAccountKey.json
   ```
   This creates one owner + 5 seed workers (from `src/constants/mockData.ts`) as real
   Firebase Auth accounts, prints their generated passwords once, and writes their
   `people/{uid}` profile docs. Keep the service account key out of
   git — it's a permanent admin credential, already covered by `.gitignore`.

### Cloudflare R2 photo uploads

Configure the R2 credentials and Firebase Admin credentials on the Next.js dashboard and deploy its `/api/photos/upload` route before releasing this app build. The phone verifies its session with the dashboard API, then uploads the original and thumbnail directly to R2. The dashboard verifies the files and saves the Firestore record.

The phone defaults to `https://site-tracker-admin-web.vercel.app`. Set `EXPO_PUBLIC_PHOTO_UPLOAD_API_URL` in `.env` only if using another HTTPS dashboard origin. Keep storage keys on the server. If the dashboard is unavailable, captures stay on the phone and retry when the connection returns.

## Building a real install (EAS)

`eas.json` has `development`/`preview`/`production` profiles. Requires an Expo account
(`npm install -g eas-cli`, `eas login`), which is separate from the Firebase account above.

```
eas build --profile preview --platform android   # installable APK, no store needed
eas build --profile production --platform android # Play Store app bundle
```

## Live map (owner)

Google Maps via `react-native-maps`. Without `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY`
in `.env` the owner map falls back to a static schematic; the key is written
into the Android manifest at build time, so adding or changing it needs a
rebuild (`npx expo prebuild -p android` then `npm run android`), not just a
Metro reload.

Getting a key: Google Cloud Console -> create/select a project -> APIs &
Services -> Library -> enable **Maps SDK for Android** -> Credentials ->
Create credentials -> API key. Restrict it to Android apps with package
`com.sitetracker.app` plus your signing SHA-1 (`cd android && ./gradlew
signingReport`). Google requires a billing account on the project, but the
Maps SDK for mobile map loads is free (no per-load charge).

What it does:
- **3D**: 60° tilted camera at zoom 17.5 with Google's 3D buildings. Google
  only extrudes buildings on the *standard* style, and only where it has
  building data; satellite/hybrid imagery is flat. "Terrain" is shaded relief,
  not 3D elevation — the Android Maps SDK has no 3D terrain or photorealistic
  3D tiles.
- **Motion mode** (compass button): the phone's compass turns the map with
  you and raising the phone tilts it into 3D (`services/motionService.ts`,
  `controllers/useMapMotionController.ts`). Readings are smoothed and
  deadbanded so the map does not jitter.
- **Live crew**: markers glide between positions, show a direction arrow while
  someone is walking/driving, and leave a fading motion trail of their last 30
  positions (tunables in `LIVE_MAP`, `src/constants/config.ts`). Tapping a
  person flies to them and keeps following as they move.

## Known gaps to close before shipping

- **Push notifications only fire in the foreground.** `services/pushService.ts` registers
  each device's Expo push token and saves it to Firestore `pushTokens/{uid}`, but nothing
  currently calls Expo's push API to deliver a notification when the app is closed — that
  needs a small server-side piece (e.g. a Cloud Function triggered on new `events` docs).
  Cloud Functions require Firebase's Blaze (pay-as-you-go) plan; usage at this scale stays
  within the free quota, but Blaze still needs a card on file, so it wasn't wired up without
  asking first.
- **Deactivating a worker doesn't delete them, and takes effect on their next app open.**
  The owner Crew screen edits job title, worker/owner access, and deactivates/reactivates
  (`people/{uid}.active`). Deleting a Firebase Auth account needs the Admin SDK, so a
  deactivated person's login still exists — the app signs them straight back out, and
  `firestore.rules` rejects their writes. A worker who is already signed in keeps running
  until they next open the app, and Realtime Database `positions/` rules can't see the
  Firestore flag, so their position writes aren't blocked server-side.
- **Activity recognition is Android-only.** Walking/driving comes from Android's activity
  recognition (local native module in `modules/activity-recognition`) when it has a fresh,
  confident reading, else from GPS speed (`utils/activity.ts`). iOS, or a worker who refuses
  the "Physical activity" permission, gets the speed fallback.
- **Photo delivery URLs are public with the current R2 setup.** Firestore still controls who can read photo records. Prior app builds can continue uploading to Supabase during rollout, so keep those records and storage accessible until the remaining uploads are reconciled.

## Admin login

`scripts/seedFirebase.js` provisions a fixed-credential owner account:

```
admin@admin.com  /  *A123456
```

Re-running the seed script resets that password, so the value above is always the one that
works. It is a known password committed to this repo — a development convenience only.
**Change it before real employees use the app**, either in the script or via the Firebase
console. Every other seeded account still gets a random password printed once on creation.
