# Udayana ICT LMS — Backend & Admin Plan

A plain-language roadmap for turning this prototype into a real LMS.
Written for a non-expert. No code here — just the plan.

---

## 1. Where we are now

- The student app is a **frontend-only prototype** (React + Vite).
- **Login is fake**, and all data (courses, payments, packs) is **hardcoded** or saved
  only in the browser's `localStorage`. Nothing is shared between devices or with the tutor.
- This is normal and fine for a prototype — but to be a real LMS, the data has to live
  in one shared place online.

## 2. The big idea (how it becomes real)

We add **one managed online service** that stores all the data and handles login + files.
Recommendation: **Supabase** (free to start, has a visual table editor, easy for non-coders).

Once it exists, three things connect to the *same* data:

```
                ┌─────────────────────┐
                │      SUPABASE       │
                │  (the shared brain) │
                │  • database tables  │
                │  • login / accounts │
                │  • file storage     │
                └─────────┬───────────┘
                          │
        ┌─────────────────┼──────────────────┐
        │                 │                  │
  Student app         Admin panel        (future:
  (already built)     (tutor's area)      email/SMS)
```

- **No separate server to write or host.** The apps talk to Supabase directly.
- You'll create a free account and paste 2 keys when asked. That's the only "ops" work.

## 3. What the database holds (the tables)

Think of each table as a spreadsheet. These mirror data the app already uses.

| Table | What it stores | Who creates rows |
|-------|----------------|------------------|
| `students` | name, email, phone, NIC, school, district, A/L year, guardian, avatar, **Student ID** | student signs up |
| `packs` | video pack title, type, price, thumbnail, description | tutor (admin) |
| `pack_videos` | each video in a pack: title, YouTube ID, duration, order | tutor (admin) |
| `theory_months` | monthly theory recording sets (month, year, sessions) | tutor (admin) |
| `purchase_requests` | a student's request to buy a pack + **deposit slip image** + status (pending/approved/rejected) | student requests, **tutor approves** |
| `monthly_payments` | monthly class fee records + slip + status | student submits, **tutor verifies** |
| `live_classes` | scheduled live sessions (title, date, time, Zoom link) | tutor (admin) |
| `enrollments` | which student owns which pack / month (created when tutor approves a payment) | system, on approval |
| `progress` | which videos a student has watched (for real progress %) | student app |
| `notifications` / `promotions` | announcements + landing-page promos | tutor (admin) |

## 4. How payments work (your model, made real)

No payment gateway. Manual bank transfer + tutor verification.

```
Student taps "Buy" or "Pay"
   → transfers money to the bank account shown
   → uploads the deposit slip photo
   → a row is created in purchase_requests / monthly_payments  [status: PENDING]
        │
        ▼
Tutor opens Admin Panel → "Payments to verify"
   → sees the slip + student + amount
   → clicks APPROVE  (or REJECT with a reason)
        │
        ▼
On APPROVE → an enrollment row is created
   → the pack/month unlocks in the student's "My Classes"  ✅
```

The bank details are already in one editable file (`src/data/paymentConfig.ts`) — those
will move into the database so you can change them from the admin panel.

## 5. What the Admin Panel is (the tutor's area)

A separate, password-protected section (only the tutor logs in). Screens:

1. **Dashboard** — counts: pending payments, new students, active packs.
2. **Payments to verify** ⭐ most important — list of slips → Approve / Reject. This is the
   heart of the manual-payment model.
3. **Packs & Videos** — create/edit video packs, add YouTube videos to them, set prices.
4. **Theory recordings** — add each month's recordings.
5. **Live classes** — schedule sessions, paste Zoom links.
6. **Students** — view/search students, see who owns what.
7. **Promotions / announcements** — edit the landing-page promo slider + notifications.

The admin panel is built on the **same Supabase**, so a tutor's approval instantly
affects what students see.

## 6. The build order (recommended)

> Each step is usable on its own; we go one screen at a time so nothing breaks.

1. **Foundation** — create Supabase, set up the tables above, file storage for slips/photos.
2. **Real accounts** — replace fake login with Supabase auth (signup already collects all
   the profile data, so the student profile auto-fills — that part's done).
3. **Read real data** — point the student app's lists (packs, live classes, payments) at
   Supabase instead of the mock files, one page at a time.
4. **Student writes** — purchases, payment slips, and watch-progress save for real.
5. **Admin panel** — build the tutor's screens, starting with **Payments to verify**.
6. **Polish** — notifications, promotions, dark mode, anything left.

## 7. What this costs / needs from you

- **Money:** Supabase free tier covers a small tuition class. Videos stay on **YouTube**
  (unlisted), so we don't pay for video hosting. Likely **Rs. 0** to start.
- **Hosting the apps:** free on Cloudflare Pages / Netlify / Vercel (static build).
- **Your part:** create a free Supabase account, paste 2 keys when asked, and provide real
  content (bank details, exam date, real packs/videos). I do the building.

## 8. Honest notes

- This is the step where it stops being pure "vibe coding" — but it's very doable, and
  I'll guide every click.
- A custom domain (e.g. `udayanaict.lk`) is optional and cheap (~Rs. 3,000–5,000/year).
- We can stop at any step and still have a working, demoable product.

---

*Next decision when you're ready: say the word and we start at **Step 1 (set up Supabase)**.*
