-- Paper class papers for monthly recordings.
--
-- Mirrors theory_homework: one row per paper, holding the paper PDF and an
-- optional marking scheme, scoped to a single theory month.
--
-- Run in the Supabase SQL editor. Safe to run repeatedly.

create table if not exists public.theory_papers (
  id uuid primary key default gen_random_uuid(),
  theory_month_id uuid not null references public.theory_months(id) on delete cascade,
  title text not null,
  paper_url text,
  scheme_url text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists theory_papers_month_idx
  on public.theory_papers (theory_month_id, sort_order);

alter table public.theory_papers enable row level security;
grant all on public.theory_papers to anon, authenticated, service_role;

-- A student sees a month's papers on exactly the same terms as its videos:
-- the month is published, targeted at their batch/program, and paid for.
drop policy if exists theorypapers_read on public.theory_papers;
create policy theorypapers_read on public.theory_papers for select using (
  public.is_admin() or exists (
    select 1 from public.theory_months t
     where t.id = theory_papers.theory_month_id
       and t.is_published
       and public.can_view(t.audience_scope, t.batch_ids, t.audience_program)
       and public.has_paid_month(t.month, t.year)));

drop policy if exists theorypapers_admin on public.theory_papers;
create policy theorypapers_admin on public.theory_papers for all
  using (public.is_admin()) with check (public.is_admin());

-- make the API notice the new table immediately
notify pgrst, 'reload schema';

-- verify — should return 0 with no error
select count(*) as theory_papers_rows from public.theory_papers;
