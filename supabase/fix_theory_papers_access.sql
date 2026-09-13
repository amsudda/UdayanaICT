-- ════════════════════════════════════════════════════════════════════
--  Fix: students could not see paper class papers
-- ════════════════════════════════════════════════════════════════════
--
-- Cause: theory_papers' read policy required has_paid_month(), which only
-- counts an approved monthly-fee PAYMENT. The student app also unlocks a
-- month when the admin grants it for free (an enrollments row with a
-- theory_month_id — see src/data/library.ts). A comped student could open
-- the month but its papers were filtered out by row-level security.
--
-- This aligns papers with the app's own access rule:
--   admin, OR (month is published AND targeted at the student
--              AND (paid for OR granted for free))
--
-- Run in the Supabase SQL editor. Safe to run repeatedly.

create or replace function public.can_access_month(p_month_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_admin() or exists (
    select 1 from public.theory_months t
     where t.id = p_month_id
       and t.is_published
       and public.can_view(t.audience_scope, t.batch_ids, t.audience_program)
       and (
         public.has_paid_month(t.month, t.year)
         or exists (
           select 1 from public.enrollments e
            where e.student_id = auth.uid()
              and e.theory_month_id = t.id
         )
       )
  );
$$;

grant execute on function public.can_access_month(uuid) to authenticated;

drop policy if exists theorypapers_read on public.theory_papers;
create policy theorypapers_read on public.theory_papers for select
  using (public.can_access_month(theory_month_id));

notify pgrst, 'reload schema';

-- ── Diagnostic ──────────────────────────────────────────────────────
-- The repo's migrations disagree about how theory_videos is protected,
-- and theory_homework was created without any SQL in the repo. This shows
-- the rules that are ACTUALLY live, so papers can be matched to them.
-- Please send a screenshot of this result.
select c.relname         as table_name,
       c.relrowsecurity  as rls_enabled,
       p.policyname,
       p.cmd,
       p.qual            as who_can_read
  from pg_class c
  left join pg_policies p
         on p.tablename = c.relname and p.schemaname = 'public'
 where c.relnamespace = 'public'::regnamespace
   and c.relname in ('theory_videos', 'theory_homework', 'theory_live_links', 'theory_papers')
 order by c.relname, p.policyname;
