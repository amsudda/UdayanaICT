-- ════════════════════════════════════════════════════════════════════
--  Notices — the teacher can post an announcement to students
-- ════════════════════════════════════════════════════════════════════
--
-- public.notifications already carried per-student rows (rank ups,
-- achievements) and supported a row aimed at everyone, but there was no
-- way to write one except by hand in SQL, and no way to aim one at a
-- single batch.
--
-- This adds a title, batch targeting, and the policies an admin needs to
-- manage what they have posted. Audience is read as:
--
--   student_id set              -> that one student
--   student_id null, batch set  -> everyone in that batch
--   both null                   -> every student
--
-- Run in the Supabase SQL editor. Safe to run repeatedly.

alter table public.notifications
  add column if not exists title text,
  add column if not exists batch_id uuid references public.batches(id) on delete cascade;

create index if not exists notifications_batch_idx
  on public.notifications (batch_id, created_at desc);

-- ── Visibility ──────────────────────────────────────────────────────
-- The old policy let any row with a null student_id through, which would
-- have shown a batch notice to the whole school.
drop policy if exists notif_read on public.notifications;
create policy notif_read on public.notifications for select
  using (
    public.is_admin()
    or student_id = auth.uid()
    or (
      student_id is null
      and (
        batch_id is null
        or batch_id in (
          select batch_id from public.batch_members where student_id = auth.uid()
        )
      )
    )
  );

-- ── Admin management ────────────────────────────────────────────────
-- Insert already existed; an admin also needs to correct and withdraw a
-- notice they have posted.
drop policy if exists notif_admin_update on public.notifications;
create policy notif_admin_update on public.notifications for update
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists notif_admin_delete on public.notifications;
create policy notif_admin_delete on public.notifications for delete
  using (public.is_admin());
