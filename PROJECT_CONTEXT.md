# Project context — Site Tracker (Android app)

Read this first (it is short). Full detail: [DOCUMENTATION.md](DOCUMENTATION.md). Engineering rules: [CLAUDE.md](CLAUDE.md) (at `origin/main`).
Sibling repo: the admin web dashboard, `C:\Projects\Perso\site-tracker-admin` (Next.js). Same Firebase project.

## What this is, in five lines

- Expo SDK 57 / React Native 0.86 / TypeScript strict, Android custom dev client, New Architecture only.
- Two roles from `people/{uid}.appRole`: **worker** (check in, share location, geotagged photos, log items) and **owner/superadmin** (live crew map, all photos, crew management, activity).
- Backend: Firebase Auth + Firestore + Realtime DB (live positions) + **Supabase Storage** (photo files). Sites/projects/assignments are created in the dashboard.
- Layering: screens → one controller hook → api / services / store; no inline magic values (`theme.ts`, `config.ts`).
- **Offline-first photos**: the only copy is in app storage until it syncs.

## ⚠️ This folder is not the latest code

The checked-out `develop` (@ `f668702`) is an old Mapbox/mock build with committed merge-conflict markers. The current app is **`origin/main` @ `c01a356`**
(Firebase + Supabase + Google Maps). Documentation describes `origin/main`. Back up anything uncommitted, then fetch and check out `main` before coding.
Details: DOCUMENTATION.md §1. (`git status` also errors here: "must be run in a work tree".)

## Commands (at `origin/main`)

`npm install` · `npx expo prebuild -p android` · `npm run android` · `npm start` · `npm run typecheck` · `npm run lint` · `npm test` (Jest) ·
`firebase deploy --only firestore:rules,firestore:indexes,database` after any rules/index change · `.env` (gitignored) from `.env.example`.

## Rules for working here

1. Follow `CLAUDE.md`: TypeScript only under `src/`, one job per file, constants from `theme.ts`/`config.ts`, controllers are the only place that mixes service + api + store.
2. **Photo deletion = file + `_thumb.jpg` + Firestore record** (see `docs/READ-BEFORE-BUILDING-PHOTO-DELETION.md`). A synced photo's record is never edited, which is why notes must be added before upload.
3. `firestore.rules` / `database.rules.json` / indexes live **here** and govern the dashboard too: a schema change is a two-repo change (update both `DOCUMENTATION.md` files) and needs a deploy.
4. Never print, log or commit secrets (`.env`, service-account keys, the Supabase service-role key). `EXPO_PUBLIC_*` values are public by definition.
5. `CLAUDE.md` standing instructions still apply: **never `git commit` / `git push` on the user's behalf**, keep replies short and information-only, and ask whether Memory Integrity is back on (confirm it is still relevant).

## Current state (2026-11-04)

- 🚨 `firestore.rules` has **no rules** for `projects`, `projectInventory`, `siteInventory`, `inventoryUsage` — the dashboard's new Projects feature needs them.
- App still uses the old per-entry `inventory` model; the dashboard has a newer Project → site allocation → usage model.
- Open from before: public Supabase bucket (no per-user isolation), push never sent when the app is closed, fixed-credential seed admin in `scripts/seedFirebase.js`.
- In-repo docs (`PROJECT_OVERVIEW.md`, parts of `README.md`/`CLAUDE.md`) are out of date (DOCUMENTATION.md §14).

## Codebase Knowledge Graph (Graphify)

- Structural graph & dependency report: [graphify-out/GRAPH_REPORT.md](graphify-out/GRAPH_REPORT.md).
- Interactive visualizer: `graphify-out/graph.html` (open in browser).
- Raw graph data: `graphify-out/graph.json`.
- To refresh the graph after major code changes: `graphify . --code-only; graphify cluster-only .`.

## 📌 Documentation protocol (standing instruction for the AI assistant)

**Keep reminding the user to update the documentation.** After any task that changes code, config, rules, schema, env vars or user-visible behaviour,
finish the reply with one line (short, to respect the short-reply rule), e.g.:

> 📝 Docs: update DOCUMENTATION.md §<n> (<what>) + changelog in PROJECT_CONTEXT.md — do it?

- Offer to make the edit (or make it if the user already said to keep docs in sync). Use the table in DOCUMENTATION.md §15.
- If shared Firebase data or rules changed, also remind about the dashboard repo's `DOCUMENTATION.md`.
- Don't nag on pure questions or no-op tasks.

## Changelog (newest first)

| Date | Change | Docs updated |
|---|---|---|
| 2026-11-04 | Added Graphify codebase knowledge graph integration (`graphify-out/GRAPH_REPORT.md`) to `AGENTS.md` and `PROJECT_CONTEXT.md`. | yes |
| 2026-11-04 | Created `DOCUMENTATION.md`, `PROJECT_CONTEXT.md`, `AGENTS.md` from a full review of `origin/main` @ `c01a356`. No code changed. | yes (initial) |

