# Handoff: R2 photo storage and future notifications

Prepared 2026-11-18 for continuing on another laptop. This is a discussion and planning handoff, not an implementation or deployment record. No Cloudflare account, R2 bucket, Worker, migration, or notification sender was created as part of this discussion. Verify current repository state, deployed settings, pricing and Cloudflare/Expo documentation before implementation; project context files contain historical status that may be stale.

## Goals and decisions still open

- The user wants to move site photos from Supabase Storage to Cloudflare R2 and keep photo references and metadata in Firebase Firestore, including migration of existing photos.
- The user is considering a Cloudflare Worker, written in TypeScript, as a small API for photo storage and possibly future services. A Worker is preferred in discussion for independence from the Vercel dashboard, but no implementation choice or account setup has been finalized.
- A private R2 bucket with authenticated access and stable object keys in Firestore was recommended. The user has not explicitly decided public versus private access. Presigned URLs expire and should not be persisted as permanent references.
- Later, the user would like admins to send custom notifications to workers and configure hourly photo reminders, potentially for around 30 active workers. This is a future feature, not yet implemented or fully specified.
- The user prefers straightforward, beginner-friendly setup instructions and wants to work from multiple laptops. Never request or paste secrets into chat or commit them to Git. No commit or push unless explicitly requested.

## Current architecture

- Android app: Expo/React Native with Firebase Auth, Firestore, Realtime Database, and Supabase Storage. Captures are stored locally first, including an original and stamped derivative; queued photos must survive connectivity failures. `src/controllers/usePhotoCaptureController.ts`, `src/controllers/usePhotoQueueController.ts`, `src/services/photoStampService.ts`, and `src/api/photosApi.ts` are starting points.
- Uploads currently go from the phone directly to Supabase bucket `Photos`: full JPEG or legacy video plus an optional `_thumb.jpg`, followed by a Firestore `photos` document with `uri`, `thumbUrl`, `takenAt`, location, note and other metadata. Firestore rules are in this repo. Check current cloud policies separately; public URLs do not prove the live upload policies are secure.
- Dashboard: sibling `site-tracker-admin`, Next.js hosted on Vercel. Browser reads Firebase data directly, while Next.js API routes perform privileged server operations. Photo storage/deletion is Supabase-specific in `src/lib/storage.ts`, `photoFiles.ts`, `photoServer.ts`, and storage/cleanup/reset routes; `next.config.ts` also constrains image hosts.
- Invariant: deletion removes the full file and thumbnail, writes the deletion tombstone for phones, then removes the Firestore record. Failed file deletion must not cause orphaned files or a missing record. See `docs/READ-BEFORE-BUILDING-PHOTO-DELETION.md` and inspect the actual code before changes. Firestore documents for synced photos are normally immutable to clients.
- Existing `pushTokens/{uid}` stores one Expo token per user. `src/services/pushService.ts` registers tokens and configures foreground notifications, but no backend currently sends push notifications. Multiple devices per worker would require a different token model.

## Candidate design

1. Phone saves captures locally as today. When online, it sends a Firebase ID token to the Worker.
2. Worker verifies the token signature, issuer, audience and expiry, and verifies current user permissions, ownership and requested object path. It issues short-lived, appropriately scoped upload permission for the original and thumbnail.
3. Phone uploads directly to R2, then records stable object keys plus metadata in Firestore. Handle retries and partial failures safely; preserve the existing offline queue.
4. For private reads, the authenticated service checks the caller's entitlement before issuing short-lived GET URLs or serving the file. Ensure worker/admin roles, Firestore rules and actual R2 access are consistent. A signed URL is a bearer credential until expiry; avoid logging or persisting it as a permanent URL.
5. Update the dashboard's display, image host configuration, downloads/ZIP, usage reporting, cleanup, orphan handling and complete deletion. During rollout it must handle both Supabase and R2 records and both full images and thumbnails.

Alternative: implement the authorization endpoint as an existing Next.js API route deployed to Vercel instead of a Worker. The phone still uploads directly to R2, so the image does not pass through the function. This avoids a separate Worker but makes uploads depend on the dashboard deployment. Either service is real server-side code; do not embed a permanent R2 secret in the phone or browser.

R2 Worker bindings can access the bucket directly, but generating S3 presigned URLs needs signing credentials and an S3 signing implementation; binding alone does not generate them. If browser uploads are added, configure and test CORS. Verify access controls, URL expiry, upload sizes/content types, cleanup, idempotency and Firebase authorization in an actual test environment.

## Existing photo migration: proposed safe sequence

1. Inventory all Firestore photo records and all Supabase originals, thumbnails and legacy videos, including files missing from records and records missing files. Back up Firestore references and ensure a recoverable photo backup.
2. Implement and test mixed Supabase/R2 reads and deletes before changing references. Avoid disrupting existing releases. Inventory live Firestore rules and design an authorized migration mechanism rather than assuming clients can edit immutable records.
3. Copy—not move—files to R2, preserving object paths where possible. Supabase offers an S3-compatible endpoint, usable with a suitable S3 migration tool. Test compatibility and exact configuration first. Preserve content type and validate file sizes/checksums where practical.
4. Verify every record's original and optional thumbnail before updating its Firestore reference. Make updates restartable, idempotent, auditable and conditional on the source record still matching; account for concurrent deletion and uploads.
5. Release the new Android app; old clients and offline queues can continue writing Supabase after the first copy. Keep both stores supported and repeatedly reconcile until a deliberate old-client cutoff. Cached remote photo records may also retain old URLs until refreshed.
6. Test viewer, thumbnails, downloads, ZIP, usage, complete deletion, tombstones, offline capture and retry. Keep Supabase and backups for rollback until verified and explicitly approved for retirement. R2 alone is not a backup. Do not delete data during migration without separate authorization.

## Later notification design

- Admin sends a custom message from the dashboard; Worker checks the sender's current admin role, finds authorized target tokens and calls Expo Push Service or FCM. Do not expose token lists or privileged credentials to workers.
- A scheduled Worker can check eligible, currently checked-in workers and send a reminder. Decide whether this means every clock hour, one hour after each check-in, or only when no recent photo exists; handle pauses, checkouts, time zones, missed schedules, retries and duplicate suppression. Cron schedules use UTC; Nepal is UTC+05:45.
- Example: 30 workers x 8 reminders = 240 notifications/day. This is an illustration, not a delivery guarantee or proof the free CPU limit is sufficient. Batch sends where supported, handle Expo tickets/receipts and invalid tokens, and test closed app, permissions, multiple devices and release credentials. Push delivery is best effort and does not prove a message was read.
- Android needs notification permissions, a working Expo project ID and correctly configured FCM credentials. Local Android builds can use Expo push; verify the actual project configuration and release device behavior. Never log service account keys.

## Analytics issue discussed

The dashboard has worker profile statistics and CSV timesheet export. It currently hardcodes late after 09:15 Nepal time (`site-tracker-admin/src/lib/insights.ts`) and calculates it in the browser from sessions. The user confirmed there is no defined worker start time, so calling someone late is not reliable. Do not rely on or silently assume that cutoff. No change to that behavior was requested or implemented in this discussion.

The worker CSV says 30 days, but the dashboard store currently loads only 15 days of sessions (`src/lib/store.tsx`); older results can be incomplete. Dashboard photo/event lists also have limits. Treat historical reports and photo counts accordingly; fixing these requires a separate task.

## Limits researched on 2026-11-18 (recheck before committing to costs)

- R2 Standard free allowance: 10 GB-month stored, 1 million Class A operations/month, 10 million Class B operations/month, free internet egress. Both originals and thumbnails count. Infrequent Access is excluded; excess use is billed. R2 activation requires the subscription checkout. [R2 pricing](https://developers.cloudflare.com/r2/pricing/) and [getting started](https://developers.cloudflare.com/r2/get-started/).
- Workers Free: 100,000 requests/day, 10 ms CPU per HTTP request, 128 MB per isolate, and 5 Cron Triggers/account. CPU excludes waiting for network I/O. Limits and actual cost/availability depend on configuration and usage. [Worker limits](https://developers.cloudflare.com/workers/platform/limits/).
- A Worker receiving a request on a Free-plan domain has a documented 100 MB request-body limit. Vercel Functions have a 4.5 MB request/response limit. With presigned direct-to-R2 uploads, neither authorization endpoint carries the image itself. R2 single PUT supports up to 5 GiB, but enforce a much smaller application-specific photo limit. [R2 upload methods](https://developers.cloudflare.com/r2/objects/upload-objects/) and [Vercel limits](https://vercel.com/docs/functions/limitations).
- Do not use `r2.dev` as a production photo endpoint: Cloudflare says it is for development and rate-limited. Public bucket URLs expose photos to anyone possessing them. [R2 public buckets](https://developers.cloudflare.com/r2/buckets/public-buckets/).

## Next steps on the home laptop

1. Pull the committed changes in both repositories and inspect `git status`, `PROJECT_CONTEXT.md`, project instructions and the current source; the handoff file itself must be committed by the user to travel through Git.
2. Confirm whether the user has created an R2 account/bucket and whether private authenticated photos are desired. Obtain only non-secret account details in chat. Confirm whether the Worker or existing Vercel functions should authorize uploads.
3. Agree on rollout and migration permissions, old app compatibility, storage schema, access rules, backup and testing before making changes. Create a small end-to-end prototype or implementation plan scoped to those decisions.
4. Configure secrets securely in Cloudflare/Vercel only when authorized. Implement, test and deploy separately from migration. Never assume account access, deploy or delete existing photos without an explicit request.

References: [R2 presigned URLs](https://developers.cloudflare.com/r2/api/s3/presigned-urls/), [R2 Worker bindings](https://developers.cloudflare.com/r2/api/workers/workers-api-usage/), [Supabase S3 compatibility](https://supabase.com/docs/guides/storage/s3/compatibility), [Firebase token verification](https://firebase.google.com/docs/auth/admin/verify-id-tokens), [Expo push sending](https://docs.expo.dev/push-notifications/sending-notifications/), [Cloudflare Cron Triggers](https://developers.cloudflare.com/workers/configuration/cron-triggers/).
