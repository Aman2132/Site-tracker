# Session handoff — 2026-10-05

Written for a Claude Code session on another machine, so it can pick up where
this one stopped. Read `CLAUDE.md` first (it has standing rules), then this.

---

## 0. Standing rules and open items carried over

- **Memory Integrity check (CLAUDE.md):** asked at the start of this session;
  the user **did not answer**. Ask again at the start of the next session.
  (That rule is about the original dev PC; on a different PC, ask whether it
  still applies there.)
- **Never commit or push on the user's behalf** (CLAUDE.md). Nothing was
  committed today, in either repo.
- **Nightly / scheduled reports are deferred** — the user said they are not
  important right now. Leave them out of plans unless the user brings them up.

---

## 1. State of the Site Tracker repo (findings from the review)

Expo SDK 57 / RN 0.86 / TS strict, layered architecture (screens → controllers
→ api / services / store). Backend today: Firebase Auth + Firestore (roster,
photo metadata, events, push tokens) + Realtime DB (live positions) +
Supabase Storage (photo files, public bucket).

Docs are out of date vs the code (not fixed yet — the user said "don't do
anything"):

- `PROJECT_OVERVIEW.md` still describes `siteApi`, `useGeofenceController`,
  `useSiteStore`, a Sites tab and the geofence slider — none exist in `src/` now.
  It lists 7 controllers; there are 12.
- `README.md` / `CLAUDE.md` describe `api/` as mocked and the app as static —
  it is live Firebase now.
- `firestore.rules` still has a `sites/{siteId}` block nothing reads.
- Known gaps still open: public Supabase bucket (no per-user isolation),
  push only in foreground (nothing sends), manual-only photo sync, fixed admin
  seed password in the repo.

---

## 2. New client requirements

1. **Admin dashboard** where the admin can create site projects, assign crew to
   sites, and create crew accounts for people who haven't signed up yet.
2. **All data visible per crew member and per site:** when people were online
   and offline, photos tagged by site, and who took each photo. A full admin
   dashboard.

Data the backend does **not** have yet, needed for this:
- **Multi-site:** `sites/{id}`, a crew↔site assignment (`siteIds[]` on the
  person), and `siteId` stamped on every photo/event.
- **Presence sessions:** `{personId, siteId, start, end, endReason}` written by
  the worker app on start / pause / resume / sign-off; a dead phone's session
  is closed by timeout. RTDB only holds the latest fix today.
- Optionally sampled breadcrumbs (every 1–5 min) for route replay — not every fix.

---

## 3. Decisions and conclusions reached

### Backend direction
- **Keep Firebase** for auth, live positions and the app's existing flows. No
  full migration to Docker + Postgres now: it would mean rewriting the api
  layer, auth and realtime, for reporting benefits the dashboard doesn't need
  yet at ~30 users. (Discussed in detail; the user's co-developer had suggested it.)
- If a migration happens later, **Supabase (managed Postgres + Auth + Realtime)**
  was preferred over self-hosted Postgres in Docker. A middle path is copying
  sessions/photo metadata into Postgres just for reporting.
- **Photos move to Cloudflare R2** (user's decision). Free egress, 10 GB free.
  Uploads go through a **Cloudflare Worker signer**: verifies the Firebase ID
  token, returns a short-lived presigned URL scoped to `photos/{uid}/…`. This
  also closes the open-bucket security gap.
- **Thumbnails are generated on the phone** at capture (`expo-image-manipulator`,
  ~320–400 px) and uploaded alongside the original. The dashboard loads
  thumbnails first and the full-res file only when a photo is opened. No server
  or server-side cache needed for that; long-lived cache headers + CDN.

### Node server
- **Not needed right now** (user: "don't take node into account for now").
- Things that genuinely need server-side code: closed-app push alerts (e.g. "no
  update for 1 hour" — a scheduled check), real account deletion / admin
  password reset, upload signing. These can run in a **Cloudflare Worker**
  (`fetch` handler for signing + `scheduled` cron handler for alerts) or
  **Firebase Cloud Functions** — not necessarily Node.
- Recommended first Worker: **the R2 upload signer** (unblocks R2, fixes
  security). The alert job comes after sessions exist.
- Caveats noted: Workers free plan = 10 ms CPU per invocation (paid $5/mo,
  30M CPU-ms included); Admin SDK doesn't run in Workers → use Firebase REST +
  WebCrypto-signed service-account token (believed workable, not verified).

### Creating crew from the admin side (no server)
- **Chosen approach:** dashboard (web, Firebase JS SDK) uses a **second Firebase
  app instance** to `createUserWithEmailAndPassword` with a random password,
  writes `people/{uid}` as that new user (existing self-create rule allows it),
  signs the secondary instance out, then the admin's session sets `siteIds` /
  role (rules need `siteIds` added to the owner-update allow-list), then calls
  **`sendPasswordResetEmail`** so the worker gets a "set your password" email.
- Firebase does **not** send any email automatically on account creation — the
  reset email must be sent explicitly. Rewrite the reset template in the
  console to read as an invite. Default sender often lands in spam.
- Reset links: reported as **valid ~1 hour, single-use** (from community
  sources, not an official Firebase page — test it). So the dashboard needs a
  **Resend invite** action and "Invited → Active" status.
- Limits: can only deactivate (not delete/disable) Auth accounts without the
  Admin SDK; partial failure (account created, profile not) needs a retry path.
- Open question for the client: do all workers have email addresses?

### Push notifications
- Tokens are already saved to `pushTokens/{uid}`; nothing sends. Push to a
  closed app always needs an outside sender calling Expo's push API.
- Options without Node: Cloudflare Worker cron (preferred, cheapest), GitHub
  Actions scheduled workflow, or Cloud Functions (Blaze). Plus a local
  self-reminder on the worker's phone as a second layer.
- Decide with the client: what counts as "idle", shift hours (to avoid night
  false alarms), who receives alerts.

### Firebase Blaze plan (researched on firebase.google.com)
- Needs a card; upgrading charges nothing; Spark's no-cost quotas are kept;
  possible $300 credit. Free quotas: Firestore 1 GB + 50K reads/day, RTDB 1 GB +
  10 GB/month download, Functions 2M invocations/month, Auth 50K MAU.
- Spend-cap budgets exist only for AI Logic, App Hosting, **Cloud Functions**,
  Extensions; Firestore/RTDB have alerts only.
- Small possible charges: Cloud Scheduler beyond 3 free jobs ($0.10/job/mo),
  Artifact Registry beyond 500 MB (~$0.026/GB/mo). Set a low budget alert.

### Hosting (if a Node server is ever added)
- Verified prices: Fly.io shared-cpu-1x 512 MB **$3.69/mo** (1 GB $6.70);
  DigitalOcean droplet $4 (512 MiB) / $6 (1 GiB); Railway Hobby $5/mo incl. $5
  usage. Hetzner and Render paid tiers not verified.
- **Render free tier:** sleeps after 15 min idle (~1 min wake), 750 h/month,
  ephemeral disk, free Postgres 1 GB that **expires after 30 days**, SMTP ports
  blocked → fine for demos, not for alerts/heartbeats.
- Sizing: a small Node service (signing, alerts, light caching) ≈ 150–250 MB;
  512 MB is enough. Heavy work (sharp thumbnails, Puppeteer PDFs) would need
  1 GB or a separate job.
- Load at 30 users is trivial (positions go straight to RTDB, ~0.8 GB/month
  download, well under quota). The real cost to watch is **photo storage
  growth** — agree a retention policy with the client.

---

## 4. Admin dashboard prototype (built today)

- **Location:** `C:\Projects\Perso\site-tracker-admin` — a **separate project**,
  sibling of `Site-tracker`. `create-next-app` ran `git init` there but nothing
  is committed and there is **no remote**, so it won't be on another PC unless
  the user copies or pushes it.
- **Static, mock data only.** Data frozen at Mon 5 Oct 2026, 15:40 IST,
  seeded so server/client renders match.
- **Stack:** Next.js 16.3 (App Router, Turbopack — read
  `node_modules/next/dist/docs/` before changing Next APIs; `params` are
  Promises), TypeScript strict, Tailwind v4, shadcn/ui on **Base UI** (triggers
  use `render={<Button/>}`, not `asChild`), Motion 14 (`motion/react`),
  Recharts 3, lucide-react, next-themes, sonner, cmdk. shadcn also installed
  the `cn` npm package (checked: same publisher as shadcn).
- **Pages:** Overview, Sites (+ detail), Crew (+ profile), Photos (lightbox,
  thumbnail-first), Attendance (heat grid + day timeline, CSV), Activity,
  Settings. Global Add-crew 4-step flow, Create-site with live geofence
  preview, Ctrl/⌘K palette, light/dark/system, collapsible sidebar, responsive.
- **Key files:** `src/types/domain.ts`, `src/lib/mock/data.ts` (the dataset —
  what gets replaced), `src/lib/insights.ts` (derivations), `src/lib/store.tsx`
  (in-memory state + actions), `src/lib/format.ts` (hand-rolled IST formatting
  for hydration safety), `src/components/{views,domain,charts,layout,ui}`.
  The project README documents structure and the mock-to-real path.
- **Verified:** `npm run build`, `tsc`, `eslint` clean; headless-Chrome pass
  over every page, add-crew/create-site/lightbox/palette flows, dark mode and
  390 px width, with no console or hydration errors.
- **Known prototype limits:** picsum placeholder photos (not construction),
  schematic site map instead of real tiles, created items reset on reload.

---

## 5. Suggested next steps (none started)

1. Ask the Memory Integrity question; ask whether the user wants the stale
   docs (PROJECT_OVERVIEW, README, CLAUDE.md, the `sites` rule) updated.
2. Get client feedback on the dashboard prototype.
3. Data model work in the app: `sites`, `siteIds`, `siteId` on photos,
   presence `sessions` written by `useLocationSharingController`.
4. R2 bucket + Cloudflare Worker upload signer; switch `photosApi.ts` upload;
   phone-side thumbnails.
5. Wire the dashboard to Firebase (replace `mock/data.ts` + `store.tsx`), add
   the secondary-app crew-creation flow and rules changes.
6. Later: scheduled alert sender (Worker cron), retention policy.

Open questions for the client: workers without email? who receives alerts and
during which hours? photo retention period? can one person be on several sites
at once (assumed yes in the prototype)?
