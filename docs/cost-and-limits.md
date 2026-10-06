# Site Tracker — costs, free tiers and limits

Researched 2026-10-07 from the official pricing pages (sources at the end).
Prices and quotas change, so re-check a page before a money decision.
**Photo storage is not covered** — it is moving to Cloudflare R2 and is handled
separately (see `storage-backend-comparison.md`).

Estimates marked *(estimate)* are mine, not measured. Everything else is quoted
from a page.

---

## 1. What the system uses

| Part | Service | Free allowance |
|---|---|---|
| Logins | Firebase Auth | 50,000 monthly active users |
| Live crew positions | Firebase Realtime Database | 1 GB stored, 10 GB downloaded / month, 100 simultaneous connections |
| Crew, sites, check-in sessions, photo records, events | Cloud Firestore | 1 GiB stored, 50K reads / day, 20K writes / day, 20K deletes / day |
| Dashboard map | Google Maps JavaScript API | 10,000 map loads / month |
| Android app map | Google Maps SDK (Android) | Unlimited, no charge (pricing page lists "Maps SDK" as unlimited) |
| Dashboard hosting | Not decided | see section 5 |
| Push notifications | Firebase Cloud Messaging via Expo push | Free; **not working yet** (section 5) |
| Fallback map | OpenStreetMap tiles | Free, best-effort |

---

## 2. Prices after the free tier (Blaze / pay-as-you-go)

| Service | Price |
|---|---|
| Realtime Database | $1 per GB downloaded; $5 per GB per month stored. Free allowance is shown as 360 MB / day (about 10 GB / month). Protocol and SSL overhead (about 3.5 KB per new connection) counts as download. |
| Firestore | us-central1: reads $0.03, writes $0.09, deletes $0.01 per 100,000. US multi-region: $0.06, $0.18, $0.02 per 100,000. **From search summaries — Google's own page was cut off when fetched.** Check the database location in the Firebase console. |
| Firestore listeners | A listener's first query is billed as reads; afterwards **one read each time a document in the result is added or changed**. |
| Google Maps JavaScript API | Free to 10,000 loads, then $7.00 per 1,000 for 10,001–100,000; $5.60 for 100,001–500,000; $4.20 for 500,001–1M; $2.10 for 1M–5M; $0.53 above. |
| Cloud Functions (if added) | 2M calls / month free, then $0.40 per million. Needs Blaze. |
| Cloudflare Workers (planned alert job) | Free: 100,000 requests / day, 10 ms CPU per call (cron too). Paid: $5 / month minimum, 10M requests and 30M CPU-ms included, then $0.30 per million requests and $0.02 per million CPU-ms. |
| Vercel (dashboard hosting) | Hobby free: 100 GB transfer, 1M function calls, 1M CDN requests — **personal, non-commercial use only**. Pro $20 / month: 1 TB transfer (then $0.15 / GB). |
| Expo EAS (cloud builds / OTA only) | Free: 15 Android + 15 iOS builds / month, low-priority queue, 1K update users. Starter $19 / month. Production $199 / month. We build locally, so $0. |
| Google Play | $25 one-time registration. |

### What happens at the free limit (Spark plan, no card)

- You cannot be billed on Spark.
- **Firestore:** reads fail until the quota resets (midnight Pacific time).
- **Realtime Database:** the app/database is turned off for the rest of the month.
- The 100-connection cap on Spark cannot be raised. Blaze allows 200,000.
- Upgrading to Blaze keeps the free allowances and bills only the excess.

---

## 3. The math at 50 workers, every day *(estimate)*

Assumptions: 50 workers, 30 days a month, 8-hour shifts, a position update at
most every 15 s (1,920 a day per worker; stationary phones send far fewer),
about 250 bytes downloaded per update, 3 viewers (dashboards + owner phones)
connected all day. Per worker per day: about 4 check-in writes, 5 events and
10 photo records = 19 Firestore writes.

### Live positions (Realtime Database)

| Item | Math | Result | Free limit |
|---|---|---|---|
| Updates per day | 50 × 1,920 | 96,000 | — |
| Download per viewer per day | 96,000 × 250 B | 24 MB | — |
| Download per viewer per month | 24 MB × 30 | 0.72 GB | — |
| 3 viewers, worst case | 0.72 × 3 | **2.2 GB** | 10 GB |
| 3 viewers, typical (half the updates) | | about 1.1 GB | 10 GB |
| Connections | 50 workers + 3 viewers | about 53 | 100 |
| Stored | about 50 × 0.3 KB | about 15 KB | 1 GB |

Rule of thumb: downloads per month = workers × viewers × 14.4 MB. That reaches
10 GB at workers × viewers = 694, so 50 workers allow about 13 viewers.

### Firestore writes

50 workers × 19 = **about 950 a day** (about 28,500 a month) against 20,000 a day.
About 5% of the limit; even 50 photos per worker per day is about 3,000.

### Firestore reads — the first Firebase limit you would reach

| Item | Math | Result |
|---|---|---|
| One full dashboard load | 50 people + 5 sites + 2,250 sessions (15 days × 50 × 3) + 300 photos + 300 events | about 2,900 reads |
| Live updates per day | 950 changes × 3 viewers | about 2,850 |
| Owner phones | 3 launches × about 210 | about 630 |
| Baseline per day | | about 3,500 |
| Full loads allowed per day | (50,000 − 3,500) ÷ 2,900 | **about 16** |

Moving between pages inside the dashboard does **not** re-read anything. Only a
hard refresh, a new tab or a fresh sign-in is a "load".

If you go over on Blaze: 40 loads a day is about 120,000 reads, 70,000 over.
At $0.06 per 100,000 that is about $1.25 a month ($0.63 at us-central1 prices).

### Google Maps (dashboard)

| Item | Math | Result |
|---|---|---|
| Realistic use | 3 admins × 30 map views × 30 days | about 2,700 loads (free to 10,000) |
| Break-even | 10,000 ÷ 30 | about 333 loads a day |
| If it reached 25,000 loads | 15,000 × $7 ÷ 1,000 | **$105 a month** |

Set a daily quota cap on the key so a leak cannot run up a bill.

### Smaller items

- **Invites:** crew invites use password-reset emails. Spark allows 150 a day;
  50 workers fits. Account creation is limited to 100 an hour per IP.
- **Auth:** 50 users against 50,000.
- **Future alert job (Cloudflare cron):** a check every 5 minutes is 288 calls a
  day, far under 100,000. The 10 ms CPU limit per call may be tight when it
  reads 50 workers, so budget the $5 / month paid plan.

### Monthly total at 50 workers

| Item | Cost |
|---|---|
| Firebase (Auth, Realtime DB, Firestore) | $0 |
| Google Maps | $0 |
| Dashboard hosting | $0 on Vercel Hobby (non-commercial only) or $20 on Pro |
| Alert job (later) | $0–5 |
| Google Play | $25 once |
| **Realistic total** | **$0–25 a month, plus $25 once** |

### Where each limit bites

| Limit | Reached at |
|---|---|
| Realtime DB 100 connections (Spark) | about 95 workers online at once |
| Realtime DB 10 GB downloads | workers × viewers ≈ 694 (about 14 all-day viewers at 50 workers) |
| Firestore 50K reads / day | about 16 dashboard reloads a day at 50 workers; about 10 at 100 workers |
| Firestore 20K writes / day | not a concern |
| Maps 10,000 loads / month | about 333 map-page loads a day |
| Spark password-reset emails | 150 a day |

---

## 4. Same math at 30 workers (26 working days) *(estimate)*

| Limit | Estimate | Verdict |
|---|---|---|
| Realtime DB downloads | about 0.4 GB / month per all-day viewer; about 1.1 GB for 3 | Safe (10 GB) |
| Realtime DB connections | about 35 of 100 | Safe |
| Firestore writes | about 900 / day | Safe |
| Firestore reads | one load about 2,000 reads; about 24 reloads a day uses 50K | Watch |

---

## 5. Other limits and rules

- **Push notifications do not work today.** The app has no `google-services.json`,
  so Expo cannot get an FCM token ("push registration failed" in the logs), and
  nothing server-side sends alerts. FCM is free. Expo's push service: 600
  notifications / second / project, 100 per request, receipts kept 24 hours. The
  Expo page does not state a price.
- **Dashboard hosting.** Vercel's free plan is non-commercial. A client's
  business dashboard belongs on Pro ($20 / month) or another host. Other hosts
  were not researched.
- **Google Play.**
  - $25 one-time.
  - Background location needs a permission declaration form, a prominent in-app
    disclosure and a short demo video; apps are rejected without them.
  - A personal developer account created after 13 Nov 2023 must run a closed
    test with at least 12 testers opted in for 14 days before production.
    Organisation accounts and older accounts are exempt.
  - Installing the APK directly (no Play Store) avoids all of this but makes
    updates manual.
- **OpenStreetMap fallback.** Commercial use is allowed but best-effort: they can
  block heavy use without notice, tiles must be attributed, and bulk or offline
  prefetching is forbidden. Fine as a fallback only.
- **Android background tracking.** The app runs a visible foreground service.
  Some phone makers' battery savers can still kill it. *Not researched — test on
  the crew's real phones.*
- **Design limits of our own code.**
  - Check-in needs the network (no offline check-in).
  - The dashboard needs the internet.
  - It loads only the newest 300 photos and 300 events, and 15 days of sessions.
  - Hours for a session nobody checked out of are estimated (ended at the last
    position, or capped at 12 h).
  - Deleting a person needs a server with the Firebase Admin SDK.
  - Alerts such as "idle for 1 hour" need a scheduled job.
  - Times are fixed to Nepal Time (UTC+5:45).
- **Leftover config.** `.env` still has Mapbox keys that nothing uses.

---

## 6. Not confirmed

- Google's official Firestore price table (page truncated; used search summaries).
- Expo push pricing (not stated on the page read).
- Whether a Maps SDK for Android key needs a billing account (the pricing page
  groups Android and iOS under one "Maps SDK" row).
- Apple App Store costs (the app is Android-only).
- Per-update download size and document counts above are estimates.

---

## Sources

- Firebase pricing: https://firebase.google.com/pricing
- Firestore billing: https://firebase.google.com/docs/firestore/pricing
- Firestore quotas: https://firebase.google.com/docs/firestore/quotas
- Realtime Database limits: https://firebase.google.com/docs/database/usage/limits
- Realtime Database billing: https://firebase.google.com/docs/database/usage/billing
- Firebase Auth limits: https://firebase.google.com/docs/auth/limits
- Google Maps Platform pricing: https://developers.google.com/maps/billing-and-pricing/pricing
- Expo pricing: https://expo.dev/pricing
- Expo push notifications: https://docs.expo.dev/push-notifications/sending-notifications/
- Vercel pricing: https://vercel.com/pricing
- Cloudflare Workers pricing: https://developers.cloudflare.com/workers/platform/pricing/
- OpenStreetMap tile policy: https://operations.osmfoundation.org/policies/tiles/
- Google Play registration fee: https://support.google.com/googleplay/android-developer/answer/6112435
- Play background location: https://support.google.com/googleplay/android-developer/answer/9799150
- Play testing requirements for new personal accounts: https://support.google.com/googleplay/android-developer/answer/14151465
- Firestore pricing (search summaries): https://cloud.google.com/firestore/pricing

---

## 7. How long until Firestore storage fills (50 workers) *(estimate)*

Realtime Database storage cannot fill: each worker's position is **overwritten**
in one fixed node (about 250–300 bytes), so 50 workers stay near 15 KB.

Firestore (free: 1 GiB stored) is the one that grows. Photo **files** are out of
scope here, but each photo leaves a record document. Scenarios, per worker per
day:

| Use | What it means | Writes / day (50 workers) | MB / day | MB / month | Time to 1 GiB |
|---|---|---|---|---|---|
| **Light** | 1 session (check in + check out), 2 events, 3 photos | 350 | 0.78 | 23 | about 3.8 years |
| **Medium** ("normal") | 2 sessions (one pause / resume), 5 events, 10 photos | 950 | 2.4 | 72 | about 1.2 years |
| **Heavy** | 4 sessions (three pause / resume cycles), 15 events, 50 photos | 3,650 | 10.9 | 327 | about 3.3 months (98 days) |

- A session counts as 2 writes (create + close).
- Document sizes (Firestore rules + index entries): session about 1.2 KB, event
  about 1.5 KB, **photo record about 3.8 KB**. Photo records are about 85–88% of
  the growth.
- Storage fills before the 20,000-writes-a-day limit does (heavy use is 18% of it).
- Main uncertainty: indexes are about 75% of the size, and counting two index
  entries per field is my assumption. Without indexes, heavy use would take
  about 660 days instead of 98.
- The app's own events (check-in, check-out, pause, resume, one per upload
  batch) are not in these counts; they add roughly 5–10%.
- Retention fix: deleting photo records older than 60–90 days keeps even heavy
  use under the limit.

---

## 8. Dashboard local cache (added 2026-10-07)

The dashboard keeps a saved copy of its Firestore data in the browser
(IndexedDB) and wipes it on sign-out. A reload then shows the saved data at once
and asks Firestore only for what changed since, which is billed as a few reads.
Firestore remembers a listener's position for about 30 minutes; after that a
reload is a full download again.

Measured on live data (documents Firestore sent to the page):

| Load | Documents |
|---|---|
| First load | 59 (people 15, photos 10, events 28, sites 3, sessions 3) |
| Reload 1 | 0 |
| Reload 2 and 3 | 19 (events 14, photos 5) |

- People, sites and sessions are no longer re-read on reload. The sessions query
  cutoff is rounded to the start of the day so the saved copy can resume it.
- The two "newest 300" queries (photos and events) still re-download on some
  reloads: at most about 600 documents instead of about 2,900 at 50 workers.
- Reloads within 30 minutes are cheap; the first load of the day, and any
  load after more than 30 idle minutes, are still full downloads.
