# 🚨🚨🚨 STOP — READ THIS BEFORE BUILDING "DELETE PHOTO" 🚨🚨🚨

> [!CAUTION]
> # ❗❗❗ DELETE THE FIRESTORE PATH TOO ❗❗❗
>
> ## 🔴 A photo lives in TWO places. Deleting only one leaves garbage behind. 🔴
>
> **I (the project owner) wrote this note myself, to remind myself.**
> When I work on the photo deletion feature, I must not forget this.

---

## ❗ The rule

When a photo is deleted, **BOTH** of these must be deleted, every time:

| # | What | Where | If I forget it |
|---|---|---|---|
| 1 | **The picture file(s)** | Cloudflare R2 (today: Supabase `Photos` bucket) | The file stays forever and keeps using paid/free storage |
| 2 | **The Firestore record**, which holds the **path / URL** | Firestore `photos/{id}` | The dashboard and app show a **broken image** pointing at a file that no longer exists |

## 🔴 ONE PHOTO = TWO FILES + ONE RECORD

- The **original** picture: `<personId>/<photoId>.jpg` (`.mp4` for a video)
- The **thumbnail**: `<personId>/<photoId>_thumb.jpg` (photos only; videos have none)
- The **Firestore record**: `photos/<photoId>` (it stores the full URL of both)

**Delete the thumbnail too.** It is easy to forget because the dashboard shows
the thumbnail first.

## ❗ Other things that will bite me

- 🔒 **Owner delete is allowed in the rules (since 2026-10-08)** — `allow delete:
  if isOwner()` on `photos`. The admin dashboard deletes through
  `deletePhotos` in its `src/lib/admin.ts`, files first, record last. Anything
  else that deletes photo records must do the same.
- 🔑 **Deleting files needs a server or Worker with delete rights** to the file
  store. Phones and the dashboard browser must **not** hold delete keys.
- 📋 **Delete the file first, then the record.** If the file delete fails, keep
  the record so I can retry. If I delete the record first and the file delete
  fails, the file is orphaned and nothing points to it any more.
- 🧹 **A "delete photos older than N days" job needs the same two steps** for
  every photo, or storage fills with files nobody can see.
- 💾 **Dashboards keep a saved copy of Firestore data in the browser**, so a
  deleted photo can still show for a moment on a computer that already loaded
  it, until it syncs.
- 📱 **A worker's phone may still hold the local copy** (the app's `captures`
  folder and the gallery album). Deleting from the server does not remove that.

## ✅ Checklist for when I build it

- [x] Rules updated so only an owner can delete a photo record (dashboard, 2026-10-08)
- [ ] Server / Worker deletes the **original** file
- [ ] Server / Worker deletes the **thumbnail** file
- [ ] Server / Worker deletes the **Firestore record**
- [ ] Order: file(s) first, record last; a failed file delete keeps the record
- [ ] Any scheduled "delete old photos" job does the same steps
- [ ] Tested: no broken images left, no orphan files left in the bucket

---

*Kept on 2026-10-07. Related: `cost-and-limits.md` (section 7 explains why
photo records are the biggest part of Firestore storage growth).*
