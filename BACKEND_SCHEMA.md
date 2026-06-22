# Udayana ICT LMS — Backend Blueprint (Supabase)

Detailed design of the database, file storage, security, and how each app
screen connects. Still a plan — no code yet. Pairs with `BACKEND_PLAN.md`.

Legend for column types (plain language):
- **text** = words · **number** = a number · **money** = amount (LKR)
- **date / datetime** = a date (and time) · **yes/no** = true/false
- **image** = a link to a file in storage · **link → X** = points to a row in table X

---

## A. How the pieces fit

```
Supabase Auth (email + password)
        │  one login = one
        ▼
   profiles ──belongs to──► batches  (e.g. "A/L 2026", "O/L 2027")
        │                      ▲
        │ owns                 │ content is targeted to a batch / program
        ▼                      │
   payments ──approved──► enrollments ──unlocks──► packs / theory_months
        │                                              │   (each tagged to a batch)
        │                                              ├─ pack_videos
   (slip image)                                        └─ theory_videos
        │
   progress (which videos watched)

   live_classes · promotions · notifications · settings  (also batch-targeted)
```

**The golden rule of visibility:** a student only ever sees content whose
**audience** matches a batch they belong to (or content marked for everyone).
This is what keeps O/L students from seeing A/L material, and 2026 students
from seeing 2027 content.

---

## A2. Batches & audience targeting (the multi-grade logic)

The tutor teaches different **programs** (O/L, A/L) and different **exam-year
cohorts**. We model each cohort as a **batch**.

- A **batch** = one group of students, e.g. "A/L 2026 (Sinhala)", "O/L 2027".
  It has a program (O/L / A/L), a grade, an exam year, and a medium.
- A **student belongs to one or more batches** (usually one). This decides what
  they see.
- **Every piece of content has an audience:**
  - a **specific batch** ("A/L 2026") — most common, or
  - a whole **program** ("all A/L"), or
  - **everyone** (public — e.g. landing-page promos).

**What a student sees** = content whose audience is *everyone*, OR *their program*,
OR *a batch they're in*. Everything else is hidden — store packs, theory months,
live classes, even notifications and promos all respect this.

**Who sets the batch?** At signup the student picks program + grade + exam year +
medium; the system auto-puts them in the matching active batch (and the tutor can
reassign anyone from the admin panel). The tutor creates the batches.

> This one concept is what makes the LMS work for O/L *and* A/L across years
> without students seeing the wrong content.

---

## B. The tables

### 1. `profiles` — students & the tutor
One row per account (linked 1-to-1 to a Supabase login).

| Column | Type | Notes |
|---|---|---|
| id | link → auth user | same id as the login |
| role | text | `student` or `admin` (the tutor) |
| student_code | text | the `STU-xxxxx` ID |
| full_name | text | |
| email | text | |
| phone | text | WhatsApp |
| nic | text | National ID number |
| gender | text | |
| birth_date | date | |
| school | text | |
| district | text | |
| medium | text | Sinhala / English / Tamil |
| program | text | `O/L` or `A/L` |
| grade | number | e.g. 11 (O/L) or 13 (A/L) |
| exam_year | number | their exam year/cohort |
| guardian_name | text | |
| guardian_phone | text | |
| address | text | |
| avatar_url | image | profile photo |
| created_at | datetime | auto |

> Signup already collects most of this; we add program/grade/exam-year so the
> right batch can be assigned.

### 1b. `batches` — student cohorts (O/L 2026, A/L 2027, …)
| Column | Type | Notes |
|---|---|---|
| id | id | |
| name | text | e.g. "A/L 2026 (Sinhala)" |
| program | text | `O/L` or `A/L` |
| grade | number | |
| exam_year | number | |
| medium | text | optional |
| is_active | yes/no | accepting students? |
| created_at | datetime | |

### 1c. `batch_members` — which students are in which batch
| Column | Type | Notes |
|---|---|---|
| id | id | |
| batch_id | link → batches | |
| student_id | link → profiles | |
| joined_at | datetime | |

> Usually one batch per student, but this allows more (e.g. a student in both a
> main batch and a special revision group).

### 2. `packs` — store video packs
| Column | Type | Notes |
|---|---|---|
| id | id | |
| title | text | |
| type | text | Paper Classes / Theory / Revision |
| price | money | |
| thumbnail_url | image | |
| duration_label | text | e.g. "5 Hours" |
| description | text | |
| **audience_scope** | text | `batch` / `program` / `public` |
| **batch_id** | link → batches | set when scope = batch |
| **audience_program** | text | `O/L`/`A/L`, set when scope = program |
| is_published | yes/no | hide drafts from students |
| created_at | datetime | |

> Those three "audience" columns appear on **every content table below** too
> (theory_months, live_classes, promotions) — same meaning everywhere. A student
> sees the item only if its audience matches their batch/program (or is public).

### 3. `pack_videos` — the videos inside a pack
| Column | Type | Notes |
|---|---|---|
| id | id | |
| pack_id | link → packs | |
| title | text | |
| youtube_id | text | unlisted YouTube video id |
| duration_label | text | |
| sort_order | number | playlist order |
| description | text | |

### 4. `theory_months` — monthly theory recording sets
| Column | Type | Notes |
|---|---|---|
| id | id | |
| month | text | e.g. "March" |
| year | number | |
| session_count | number | |
| topics | text list | covered topics |
| thumbnail_url | image | |
| price | money | |
| audience_scope / batch_id / audience_program | — | same as packs |
| is_published | yes/no | |

### 5. `theory_videos` — sessions inside a month
Same shape as `pack_videos` but `theory_month_id → theory_months`.

### 6. `live_classes` — scheduled live sessions
| Column | Type | Notes |
|---|---|---|
| id | id | |
| title | text | |
| scheduled_at | datetime | date + time in one field |
| zoom_link | text | |
| instructor | text | |
| course_label | text | which course it belongs to |
| audience_scope / batch_id / audience_program | — | same as packs |
| created_at | datetime | |

> "Live now" is worked out from `scheduled_at` (no manual flag needed).

### 7. `payments` — ⭐ the heart of the manual-payment model
One table covers **pack purchases, theory-month purchases, and monthly fees.**

| Column | Type | Notes |
|---|---|---|
| id | id | |
| student_id | link → profiles | who paid |
| kind | text | `pack` / `theory` / `monthly_fee` |
| pack_id | link → packs | set when kind = pack |
| theory_month_id | link → theory_months | set when kind = theory |
| period_month | text | for monthly_fee (e.g. "March") |
| period_year | number | for monthly_fee |
| amount | money | |
| reference | text | bank reference / note |
| slip_url | image | the deposit slip photo |
| status | text | `pending` / `approved` / `rejected` |
| reject_reason | text | optional, shown to student |
| reviewed_by | link → profiles | which admin acted |
| reviewed_at | datetime | |
| created_at | datetime | submitted at |

### 8. `enrollments` — what a student is allowed to watch
Created automatically when a payment is **approved**.

| Column | Type | Notes |
|---|---|---|
| id | id | |
| student_id | link → profiles | |
| pack_id | link → packs | (or…) |
| theory_month_id | link → theory_months | one of the two is set |
| source_payment_id | link → payments | audit trail |
| granted_at | datetime | |

> Access rule = "a student can watch a pack/month if they have an enrollment for it."

### 9. `progress` — real watch progress
| Column | Type | Notes |
|---|---|---|
| id | id | |
| student_id | link → profiles | |
| video_id | link → pack_videos/theory_videos | |
| is_watched | yes/no | |
| watched_seconds | number | for resume + accurate % |
| updated_at | datetime | |

> This finally makes the progress bars real and the same everywhere.

### 10. `promotions` — landing-page slider & in-app promos
id · tag · title · description · image_url · cta_text · cta_link · sort_order · is_active
· audience_scope / batch_id / audience_program (public promos show on the landing page)

### 11. `notifications` — bell + announcements
id · student_id (empty = everyone) · message · type (video/live/announcement) · is_read · created_at

### 12. `settings` — one editable row the tutor controls
bank_name · account_name · account_number · branch · whatsapp_number · al_exam_date · term_start_date

> Replaces the hardcoded `paymentConfig.ts` and the exam countdown date.

---

## C. File storage (3 buckets)

| Bucket | Holds | Who can see |
|---|---|---|
| `thumbnails` | pack/theory/promo images | public (anyone) |
| `avatars` | profile photos | the owner + admin |
| `slips` | **deposit slip + NIC images** | **private** — only the owner + admin |

> Slips are sensitive, so that bucket is locked down. Videos are **not** stored
> here — they stay on YouTube (unlisted); we only keep the `youtube_id`.

---

## D. Security (who can do what)

Supabase enforces rules per table ("Row Level Security"). In plain terms:

- **Students** can: read their own profile, read published content **that is targeted to
  their batch/program (or public)**, insert & read **their own** payments, read **their own**
  enrollments, read/write **their own** progress, read their notifications.
- **Students cannot:** see other batches' content, other students' data, create packs, or
  change a payment's status.
- **Admin (tutor)** can: do everything — read all students/payments, create/edit packs,
  videos, live classes, promotions, and approve/reject payments.

This is what makes it safe to put the admin panel on the same backend.

---

## E. The payment → access flow (the important mechanic)

```
1. Student submits a payment  → row in `payments`            [status: pending]
                                  + slip image in `slips`
2. Tutor opens Admin → "Payments to verify"
3. Tutor clicks Approve        → status becomes `approved`
4. The moment it's approved    → an `enrollments` row is auto-created
5. Student's "My Classes"      → the pack/month is now unlocked & playable ✅
   (Reject instead → student sees the reason, nothing unlocks)
```

> Step 4 is done automatically by the database (a "trigger") so access can never
> be granted without an approved payment — secure by design.

---

## F. How current screens connect (nothing UI changes, just the data source)

| Screen (already built) | Reads from | Writes to |
|---|---|---|
| Signup / Login | Supabase Auth + `profiles` | `profiles` |
| Profile | `profiles` | `profiles`, `avatars` |
| Store (Extra Classes) | `packs` (filtered to my batch) | `payments`, `slips` (on Buy) |
| My Classes | `enrollments` + `packs`/`theory_months` + `progress` | `progress` |
| Watch page | `pack_videos`/`theory_videos` + `progress` | `progress` |
| Payments | `payments` + `settings` | `payments`, `slips` |
| Live Classes | `live_classes` (filtered to my batch) | — |
| Dashboard | mix of the above (all batch-filtered) | — |
| Landing page | `packs` + `promotions` (public ones) | — |
| Notification bell | `notifications` | marks read |

---

## G. The admin panel (built last, on the same backend)

Screens, in priority order:
1. **Payments to verify** ⭐ — approve/reject slips (drives everything).
2. **Batches** — create cohorts (O/L 2027, A/L 2026…); assign/move students.
3. **Packs & Videos** — create packs, add YouTube videos, set prices, pick **audience**, publish.
4. **Theory recordings** — add each month + sessions, pick audience.
5. **Live classes** — schedule + Zoom links, pick audience.
6. **Students** — search, view, see their batch & what they own.
7. **Promotions & notifications** — edit slider + send announcements (per batch or public).
8. **Settings** — bank details, WhatsApp, exam date.

> When creating any content, the tutor picks its **audience** (a batch, a whole
> program, or everyone) — that's the single control that targets the right students.

---

## H. Build sequence (phases)

> Each phase ends with something working; we never break the app mid-way.

- **Phase 0 — Setup:** create Supabase project, create the tables above (incl. `batches`),
  create the 3 storage buckets, turn on security rules. *(I prepare it; you click a few things.)*
- **Phase 1 — Auth & batches:** real signup/login writes to `profiles`; signup captures
  program/grade/year and auto-assigns a batch. Profile page reads/saves real data.
- **Phase 2 — Read content (batch-filtered):** Store, Live Classes, Landing pull from
  `packs`/`live_classes`/`promotions`, showing only what matches the student's batch.
- **Phase 3 — Payments:** Buy + Pay create real `payments` with slip uploads (status pending).
- **Phase 4 — Admin panel:** start with "Payments to verify"; approving unlocks access.
- **Phase 5 — My Classes & Watch:** driven by `enrollments` + real `progress`.
- **Phase 6 — Extras:** notifications, promotions management, settings, polish.

---

## I. What I'll need from you (when we build, not now)

- A free **Supabase account** (you create it; I tell you exactly what to click).
- 2 keys to paste into Netlify env vars (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`).
- The list of **batches** you run right now (e.g. "A/L 2026", "A/L 2027", "O/L 2027") —
  program, grade, exam year, medium.
- Real content: **bank account details**, **exam date(s)**, and your real **packs/videos**
  (YouTube links) when ready.
- Which email should be the **admin (tutor)** account.

---

*Ready when you are — say "start Phase 0" and we set up Supabase together.*
