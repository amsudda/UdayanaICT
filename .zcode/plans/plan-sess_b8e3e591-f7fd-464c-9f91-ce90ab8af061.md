## Goal
Surface **ID-card verification notifications** on the admin Dashboard (the first page the admin sees on login) — more prominent than the existing sign-up/payment notifications. Right now nothing tells the admin a student uploaded an ID, so approvals stall and students stay locked out of lessons.

No new database tables, no new routes, no schema changes. Everything reuses the existing `profiles.verification_status = 'pending'` data and the polished notification patterns already in the codebase.

**Per your follow-up: every notification message includes the student's name** (toast, banner, queue rows, activity feed).

## Changes

### 1. `src/admin/AdminLayout.tsx` — realtime toast + nav badge + banner, parallel to payments
Today this file tracks `pending` (pending *payments*) via a count query + a `payments` Realtime channel, and shows a toast on INSERT. Extend it to **also** track pending ID verifications:

- New state `pendingIds: number | null` + `fetchPendingIds()` running `supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('verification_status', 'pending')`.
- New Realtime channel `admin-id-alerts` on table `profiles`. On any event → `fetchPendingIds()`. When a row's `verification_status` becomes `'pending'` (INSERT, or UPDATE into pending) → **fetch that student's name** (`profiles.select('full_name').eq('id', payload.new.id)`) and fire a **rose/red toast** (higher importance than the amber payment toast): `🆔 {studentName} uploaded an ID — verification needed`. Clicking the toast navigates to `/admin/students`.
- Add `badge: true` to the **Students** nav item (line 33) and extend the badge rendering (lines 113–121) so the **Students** chip shows the pending-ID count and the **Payments** chip still shows the pending-payment count.
- Add a **second banner above the existing payment banner** — rose/red: `🆔 {N} student(s) uploaded an ID awaiting verification → Verify now`. Shows on every admin page except `/admin/students`. Rendered **above** the payment banner to signal higher importance. (The detailed per-student names live in the dashboard queue card and the Students page section.)

### 2. `src/admin/pages/AdminOverviewPage.tsx` — prominent verification block on the dashboard
This is the page the admin lands on. Make ID verification unmissable:

- **Fetch verification fields.** Extend the existing `profiles` select in `load()` (line 102) to also pull `verification_status, id_front_path, id_back_path, verification_submitted_at, phone`. Same query, no extra round-trip → names are already available from `full_name`.
- **Top-of-page alert banner** (above the "Welcome back" header): when `pendingIds > 0`, a full-width rose/red card with bell icon, the count, a CTA → `/admin/students`, and a subtle pulse. The single most prominent element on the dashboard.
- **Inline verification queue card at the TOP of the left column** (before "Revenue Overview"), styled like the existing "Pending Payments" card with a red/rose accent. Each pending-student row shows: avatar/initials, **name**, student code, "submitted Xm ago" (existing `timeAgo()` helper), a **View ID** button (opens signed `id-cards` URLs in a new tab — reusing the exact `createSignedUrl` pattern from `AdminStudentDetailPage.tsx:200-212`), and **Approve ✓ / Reject ✗** buttons. Approve uses the same update shape as `AdminStudentDetailPage.decideVerification` (lines 240-250); reject opens the existing `ConfirmDialog` (reuse the one already in this file at line 530). Admin clears verifications **without leaving the dashboard**.
- **New stat card as the FIRST item** in `stats[]` (line 300): `Pending ID Verifications`, red/rose tone (`bg-red-100 text-red-600` when > 0, `bg-slate-100 text-slate-500` when 0), trend `"awaiting approval"` / `"all caught up"`, links to `/admin/students`.
- **Activity feed entries (line 236):** map pending-verification students into the "Recent Activity" feed with an `IdCardIcon` (lucide) + rose tone, each line naming the student: `"{name} submitted an ID for verification"`, merged + sorted alongside sign-ups and payments.
- **Realtime on the dashboard:** add a `profiles` Realtime channel in this page (mirrors the payments channel in AdminLayout) so the queue/stat/count refresh the instant a student submits. Calls `load()` on change.

### 3. `src/admin/pages/AdminStudentsPage.tsx` — surface pending IDs at the top
Since the notifications link here, make pending IDs easy to find:

- Add a **"Needs ID verification"** section pinned to the **top** of the page (before "Needs a batch"), listing only `verification_status = 'pending'` students, each row keeping the existing "ID pending" amber chip. Reuses the existing `Folder`/`StudentRow` components already in the file (lines 50-91) — zero new patterns.

## What is NOT changing
- No DB migration, no new tables, no schema changes. The `profiles.verification_status` column and `guard_verification()` trigger already do all the work.
- No new routes — admin stays on the dashboard with links to the existing Students page.
- Student-side upload flow (`IdVerification.tsx`, `AuthContext.submitIdVerification`) untouched.
- Existing payments notifications preserved exactly as-is.

## Verification after implementing
- TypeScript build passes (`npm run build` / `tsc`).
- Manual flow test (I can drive via the browser-use skill if you want): log in as a student → upload an ID → confirm the admin dashboard shows the red top banner, the named queue row with View ID / Approve / Reject, the new stat card, the named activity-feed line, and the **named** AdminLayout toast fires in realtime. Approve from the dashboard → confirm the row disappears and counts drop to 0.