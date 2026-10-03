# Photo/video storage backend comparison (deep dive)

Site Tracker currently uses **Supabase Storage** for photo/video files
(everything else — auth, the crew roster, live positions, photo
metadata, activity feed — stays on Firebase). This is a detailed,
sourced comparison of the realistic storage backends, with exact
current pricing pulled from each provider's own pricing page — not
estimates. Prices are what each provider publishes as of early 2026;
check their pages before budgeting, since cloud pricing changes.

## The incident that prompted this

On 2026-09-30, every worker's photo upload was silently stuck at
"QUEUED." The cause: **Supabase auto-pauses free-tier projects after 7
days of inactivity**, and this project's subdomain had stopped
resolving. Resuming it from the dashboard fixed it in a couple of
minutes. `uploadPhotos()` in `src/api/photosApi.ts` was never broken —
this was a plan/billing issue, not a code or scale issue.

---

## 1. Supabase Storage (current backend)

**Free tier:**
- Storage: **1 GB** included
- Egress (downloads/views): **5 GB/month** included
- Max file upload size: **50 MB**
- CDN: "Basic CDN"
- ⚠️ **Free projects pause after 7 days of inactivity** — the exact bug we hit

**Pro plan — $25/month base:**
- Storage included: **100 GB**
- Egress included: **250 GB/month** (cached)
- Max file upload size: **500 GB**
- CDN: "Smart CDN" (upgraded over free tier)
- No auto-pause
- **Overage once you exceed the included amounts:**
  - Extra storage: **$0.0213/GB/month**
  - Extra egress: **$0.03/GB**
- **Extra feature — Image Transformations** (on-the-fly resize/optimize, useful for thumbnails): 100 images included, then **$5 per 1,000 images processed**. Not available at all on the free tier.

**If you run out of storage:** nothing breaks automatically — Supabase bills you the overage rate ($0.0213/GB/month) on top of the Pro plan. There's no hard cap; it's pay-as-you-go once you're past the included 100 GB.

**Team plan ($599/month)** has identical storage/egress terms and overage pricing to Pro — the extra cost buys more seats/SSO/support, not more storage allowance.

Source: [supabase.com/pricing](https://supabase.com/pricing)

---

## 2. Cloudflare R2

**Free tier (no credit card, no plan needed):**
- Storage: **10 GB/month**
- Class A operations (writes/uploads/lists): **1,000,000/month**
- Class B operations (reads/downloads): **10,000,000/month**
- Egress: **free**, no limit, at every tier

**Pay-as-you-go beyond free tier (Standard storage class):**
- Storage: **$0.015/GB/month**
- Class A operations: **$4.50 per million requests**
- Class B operations: **$0.36 per million requests**
- Egress: **still free** — this is R2's entire selling point, it charges $0 for bandwidth out at any volume
- No minimum monthly fee, no base subscription — pure usage billing

**Infrequent Access class** (cheaper storage for rarely-viewed old photos, e.g. archiving jobs completed months ago):
- Storage: **$0.01/GB/month**
- Data retrieval fee: **$0.01/GB** when you do read it
- 30-day minimum retention (deleting earlier still bills the 30 days)
- Operations cost more ($9.00/million Class A, $0.90/million Class B) — only worth it for data you rarely touch

**If you run out of storage:** there's no "running out" — it's metered. You just get billed $0.015/GB/month for whatever you're storing above 10 GB. No plan upgrade, no card required until you actually exceed the free quota.

Source: [developers.cloudflare.com/r2/pricing](https://developers.cloudflare.com/r2/pricing/)

---

## 3. Firebase Storage (Blaze plan — Google Cloud Storage)

**Spark (free) plan, modern `*.firebasestorage.app` buckets, US regions:**
- Storage: **5 GB-months**
- Downloads: **100 GB/month**
- Upload operations: **5,000/month** free
- Download operations: **50,000/month** free

**Blaze (pay-as-you-go) plan — requires a billing account/card on file, even though the free quota above still applies before anything is charged:**
- Storage and downloads beyond the free quota follow **standard Google Cloud Storage pricing** (varies by region, roughly **$0.026/GB/month** storage, **$0.12/GB** for downloads on the legacy pricing model)
- Upload/download operations billed per 10,000 calls at Google Cloud Storage rates

**Extra features:** since this is really Google Cloud Storage underneath, you get GCS's full feature set if you ever need it — signed URLs, lifecycle rules (auto-delete/auto-archive old files), multi-region replication, IAM-level access control. None of that is exposed by Supabase's simpler Storage product.

**If you run out of storage:** same as the others — billed automatically at the per-GB rate once you're on Blaze. The friction here is upfront: Blaze requires putting a real card on file, which is exactly why this project originally chose Supabase instead (see `README.md` "Backend setup").

Source: [firebase.google.com/pricing](https://firebase.google.com/pricing)

---

## 4. AWS S3 (Standard storage class, us-east-1)

**Free tier:** AWS's general free-tier credits apply to new accounts (currently $200 in credits for new sign-ups), not a permanent free storage allowance the way the others have.

**Standard pay-as-you-go pricing:**
- Storage: **$0.023/GB/month** for the first 50 TB, $0.022/GB for the next 450 TB, $0.021/GB above 500 TB
- PUT/COPY/POST/LIST requests: **$0.005 per 1,000 requests**
- GET/SELECT requests: **$0.0004 per 1,000 requests**
- **Data transfer OUT to the internet** (this is the one that matters for a photo-viewing app):
  - First 100 GB/month: **free** (shared across all AWS services/regions on the account)
  - Next up to 10 TB/month: **$0.09/GB**
  - Next 40 TB/month: **$0.085/GB**
  - Next 100 TB/month: **$0.07/GB**
  - Above 150 TB/month: **$0.05/GB**

**Extra features:** the deepest ecosystem of any option here — lifecycle policies, fine-grained IAM, versioning, cross-region replication, direct integration with CloudFront (AWS's CDN) to reduce those egress costs at scale. Also the most ops overhead to configure correctly.

**If you run out of storage:** purely metered, no hard limit — billed automatically. The real cost risk with S3 is egress once you're serving a lot of photo views, since that's billed per GB with no free allowance beyond the 100 GB/month baseline.

Sources: [aws.amazon.com/s3/pricing](https://aws.amazon.com/s3/pricing/), egress tier figures corroborated via [CloudZero's 2026 S3 pricing guide](https://www.cloudzero.com/blog/s3-pricing/)

---

## 5. Backblaze B2 (bonus option — cheapest raw storage)

**Free tier:**
- Storage: **first 10 GB always free**, permanently (not a trial)
- Egress: **free egress up to 3x your average monthly storage** (e.g. if you store 50 GB, you get ~150 GB of free downloads that month)

**Pay-as-you-go beyond that:**
- Storage: **$6.95/TB/month** = **$0.00695/GB/month** — the cheapest of every option here
- Egress beyond the 3x allowance: **$0.01/GB**
- **Unlimited free egress** if served through a partner CDN (Cloudflare, Fastly, bunny.net, and others) — the "Bandwidth Alliance." This would mean pairing B2 with Cloudflare's free CDN in front of it.
- API calls: Class A/B/C calls are **free**; only Class D calls cost anything (**$0.004 per 10,000**, with the first 2,500/day free)
- No minimum file size fees, no minimum storage duration fees

**If you run out of storage:** billed at $0.00695/GB/month automatically — the cheapest per-GB rate of any option on this list, by a wide margin.

**The catch:** B2 has no built-in image API or app-friendly SDK the way Supabase does — you'd be writing more integration code, and to get the "free unlimited egress" benefit you need to actually front it with a CDN like Cloudflare rather than serving straight from B2.

Source: [backblaze.com/b2/cloud-storage-pricing.html](https://www.backblaze.com/b2/cloud-storage-pricing.html)

---

## Side-by-side summary

| | Free storage | Free egress | Storage $/GB/mo (paid) | Egress $/GB (paid) | Needs a card to go beyond free tier? | Auto-pause risk |
|---|---|---|---|---|---|---|
| **Supabase** | 1 GB (Free) / 100 GB (Pro, $25/mo base) | 5 GB/mo (Free) / 250 GB/mo (Pro) | $0.0213 | $0.03 | Yes, to reach Pro | **Yes, on Free tier** |
| **Cloudflare R2** | 10 GB/mo | Unlimited, always | $0.015 | **$0** | No — pure metered billing | No |
| **Firebase Storage** | 5 GB | 100 GB/mo | ~$0.026 | ~$0.12 | Yes (Blaze requires billing account) | No |
| **AWS S3** | None (only general new-account credits) | 100 GB/mo | $0.023 | $0.09 (first 10 TB) | Yes | No |
| **Backblaze B2** | 10 GB, permanent | 3x your storage/mo | $0.00695 | $0.01 (or $0 via CDN partner) | Yes, beyond free tier | No |

## What this means for Site Tracker

- The bug we just fixed was **Supabase's free-tier auto-pause** — the only provider on this list with that behavior. Upgrading to **Supabase Pro ($25/mo)** removes it entirely and is the immediate fix regardless of anything else on this page.
- If photo/video volume and viewing traffic grow large enough that egress becomes a real cost, **Cloudflare R2** is the cheapest option specifically because it never charges for egress, at any volume, on any plan. **Backblaze B2** has the cheapest raw storage, but only matches R2's free-egress benefit if paired with a CDN in front of it — otherwise its 3x-storage egress allowance is generous but not unlimited.
- Firebase Storage and AWS S3 are both solid, widely-used options, but neither is cheaper than R2/B2 for this app's shape (lots of photos, repeatedly viewed by owners) — their advantage is ecosystem depth (IAM, lifecycle rules, CDN integration) rather than raw cost.
