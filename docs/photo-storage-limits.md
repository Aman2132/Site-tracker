# Photo storage — free-tier limits (Supabase today, Cloudflare R2 later)

Researched 2026-10-07 from the official pages (sources at the end). Kept for
when photo files move to Cloudflare R2. Figures marked *(estimate)* are not
quoted from a page.

## Official free-tier numbers (quoted)

| | Supabase Free (today) | Cloudflare R2 Free (planned) |
|---|---|---|
| File storage | 1 GB | 10 GB-month / month |
| Bandwidth | 5 GB egress + 5 GB cached egress | Egress is free ("does not incur data transfer (egress) charges") |
| Largest upload | 50 MB on Free projects | Not checked |
| Class A (PUT, POST, LIST) | n/a | 1 million / month |
| Class B (GET, HEAD) | n/a | 10 million / month |
| Paid price | not read | $0.015 per GB-month, $4.50 per million Class A, $0.36 per million Class B |
| Over the limit | Notified first; if you keep exceeding, "service restrictions will apply" (pausing projects, read-only databases, a 402 response to all API requests). The docs do not say whether uploads alone are blocked. | Not stated on the page read |
| Inactivity | "Free projects are paused after 1 week of inactivity" | n/a |
| Payment method | n/a | Not stated on the pricing page; not verified |
| Public links | n/a | `r2.dev` links are "rate-limited and should only be used for development purposes", "intended for non-production traffic". Production should use a custom domain on Cloudflare. |

## File-size assumptions *(estimate)*

- 12 MP phone JPEG original: about 2.5–6 MB (working figure 4 MB)
- 400 px-wide thumbnail, quality 0.7: about 20–60 KB (working figure 40 KB)
- 30 s 1080p video: about 15–60 MB (working figure 30 MB); a high-bitrate clip can exceed Supabase's 50 MB limit
- Per photo (original + thumbnail): about 4.04 MB. Decimal units (1 GB = 1000 MB).

## How long the free storage lasts *(estimate, 30-day month)*

| Scenario | MB / day | GB / month | Supabase 1 GB full after | R2 10 GB full after |
|---|---|---|---|---|
| 10 workers × 30 photos (300 / day) | 1,212 | 36 | 0.8 day (about 250 photos) | 8.3 days (about 2,500) |
| **10 workers × 35 photos (350 / day)** | 1,414 | 42 | **0.7 day (about 17 h)** | **7.1 days** |
| 10 workers × 40 photos (400 / day) | 1,616 | 48 | 0.6 day | 6.2 days |
| 50 workers × 10 photos (500 / day) | 2,020 | 61 | 0.5 day | 5 days |
| 350 / day with 5% videos (18 × 30 MB) | 1,868 | 56 | 0.5 day | 5.4 days |

## Bandwidth and operations *(estimate)*

- One dashboard user per day: 300 thumbnails × 40 KB = 12 MB, plus 20 originals × 4 MB = 80 MB, so about 92 MB.
- 4 users over 30 days is about **11 GB a month** (thumbnails only about 1.4 GB). That is over Supabase's 5 GB egress, partly offset by 5 GB cached egress if the CDN serves repeat views (not verified).
- R2 Class A: 350 photos × 2 uploads × 30 days = 21,000 a month against 1,000,000 free (2%).
- R2 Class B: 4 users × 320 reads × 30 days = about 38,400 a month against 10,000,000 free (0.4%).
- R2 egress: free.

## Conclusions

1. Supabase: storage fills in under a day at 350 photos a day; bandwidth (5 GB) is the next limit.
2. R2: storage (10 GB) is the only limit that matters, full in about 5–8 days. Operations stay under 3% of their allowances and egress is free.
3. A "delete originals after 60 or 90 days" rule does not help on the free tier: 60 days of originals is about 85 GB at 350 a day. Even 7 days of originals fills 10 GB.
4. Thumbnails alone are about 14 MB a day: about 700 days fit in 10 GB. Keeping only thumbnails long-term is feasible.
5. Expect to pay for R2 (about $0.015 per GB-month). About 42 GB a month is added at 350 photos a day: roughly $0.65 for the first month, and about $7.50 a month after a year if nothing is deleted (storage accumulates). Serve from a custom domain, and delete originals after a few days if staying free.

## Not confirmed

- Whether R2's free tier needs a card on file.
- What happens to uploads alone when Supabase's limit is passed.
- Real file sizes (the figures above are estimates).

## Sources

- https://supabase.com/pricing
- https://supabase.com/docs/guides/storage/uploads/file-limits
- https://supabase.com/docs/guides/platform/billing-faq
- https://developers.cloudflare.com/r2/pricing/
- https://developers.cloudflare.com/r2/buckets/public-buckets/
