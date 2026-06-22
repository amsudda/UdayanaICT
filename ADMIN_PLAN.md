# Udayana ICT LMS — Admin Panel Plan

The tutor's control center. Built into the **same app** at `/admin`, gated to
`role = admin`, on the **same Supabase** as the student app. Pairs with
`BACKEND_SCHEMA.md`.

---

## 1. How it's structured

- **One app, two areas.** Students use `/dashboard/*`; the tutor uses `/admin/*`.
- **Access gate:** `/admin` is wrapped in an `AdminRoute` — if you're not logged in
  → `/login`; if logged in but not `role = admin` → bounced to `/dashboard`.
  (We already track `isAdmin` in the auth context.)
- **Its own layout:** a distinct admin sidebar/topbar (different look from the student
  side) so the tutor always knows which mode they're in.
- **Same Supabase client + RLS:** admin policies already allow full read/write; nothing
  new to secure.

```
/admin                 → overview
/admin/payments        → verify slips        ⭐
/admin/batches         → cohorts + members
/admin/packs           → store packs + videos
/admin/theory          → monthly recordings
/admin/live            → live classes
/admin/students        → student directory
/admin/promotions      → landing slider + notices
/admin/settings        → bank details, exam dates
```

---

## 2. The screens

### Overview  `/admin`
At-a-glance cards: **pending payments** (count, the urgent one), total students,
active batches, published packs, upcoming live classes. Each links to its section.

### Payments to verify  `/admin/payments` ⭐ most important
The heart of the manual-payment model.
- A list of `payments`, default filter **Pending**, newest first.
- Each row: student name + code, what it's for (pack / theory / monthly fee), amount,
  date, and a **thumbnail of the deposit slip** (click → full image).
- Actions: **Approve** (→ trigger auto-creates the enrollment → unlocks for the student)
  or **Reject** (with a reason the student sees).
- Filters: Pending / Approved / Rejected / All; search by student.

### Batches  `/admin/batches`
- List batches (name, program, exam year, member count, active toggle).
- **Create / edit** a batch (name, program O/L|A/L, grade, exam year, medium).
- Open a batch → **manage members**: see students in it, add/remove, move a student
  to another batch. (Search the student directory to add.)

### Packs & videos  `/admin/packs`
- List packs (title, type, price, audience, published toggle).
- **Create / edit** a pack: title, type, price, thumbnail upload, description, and
  **audience** (a batch / a whole program / everyone), publish on/off.
- Open a pack → **manage its videos**: add/edit/reorder rows (title, YouTube ID,
  duration, description). Drag-to-reorder or up/down.

### Theory recordings  `/admin/theory`
Same idea as packs: each monthly set (month, year, sessions, topics, price, audience,
publish) and its session videos.

### Live classes  `/admin/live`
- List upcoming + past sessions.
- **Create / edit**: title, date+time, Zoom link, instructor, course label, audience.

### Students  `/admin/students`
- Searchable directory (name, code, email, phone, program, batch).
- Open a student → full profile, their batch, payments, and what they own (enrollments).
- Edit batch assignment from here too.

### Promotions & notifications  `/admin/promotions`
- **Promotions:** the landing-page / in-app slider items (tag, title, description,
  image, CTA, order, active, audience).
- **Send a notification:** message + type, to everyone or a chosen batch/student.

### Settings  `/admin/settings`
One form for the editable `settings` row: bank name, account name, account number,
branch, WhatsApp number, A/L exam date, O/L exam date, term start date.
(Feeds the student Payments page + the Store exam countdown.)

---

## 3. Shared admin building blocks (build once, reuse)

- **AdminLayout** — sidebar nav + topbar (tutor name, "back to student view", logout).
- **DataTable** — list with search + status filter + row actions (used by most screens).
- **Drawer/Modal form** — slide-over create/edit form (used by every "add/edit").
- **ImageUpload** — upload to Supabase Storage (`thumbnails`), returns the URL.
- **AudiencePicker** — the batch / program / everyone selector (used on packs, theory,
  live, promotions).
- **ConfirmDialog** — for delete / reject actions.

Reusing these means each new admin screen is mostly wiring, not new UI.

---

## 4. Build order (each step = something usable)

> Recommended first slice proves the whole loop: create content → target a batch →
> student sees it.

1. **Admin shell + gate** — `AdminRoute`, `AdminLayout`, nav, empty Overview.
2. **Batches** — create batches, assign your test student to one.
3. **Packs & videos** — create a pack, add videos, set audience = that batch, publish.
4. **Wire the student Store to real data** ← first "it's real" moment 🎉
   (student sees the pack, batch-filtered).
5. **Payments to verify** — approve a slip → pack unlocks in student's My Classes.
6. **Wire My Classes + Watch** to enrollments + real videos.
7. **Live classes** (admin + student wire).
8. **Theory recordings** (admin + student wire).
9. **Students directory, Promotions, Settings.**
10. **Dashboard** reads real aggregates last.

---

## 5. What I need from you along the way

- Confirm the **admin lives at `/admin` inside this app** (recommended) — not a separate site.
- Your real **batches** (e.g. "A/L 2026", "O/L 2027") when we build step 2.
- Real **bank details + exam dates** for Settings.
- Real **packs + YouTube links** when you want real content (test data is fine to start).

---

*Decision to start: build steps 1–4 (shell → Batches → Packs → wire Store) as the
first milestone.*
