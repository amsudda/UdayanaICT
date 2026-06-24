-- ============================================================
--  Paper marks — per-student entries (marks only, no files).
--  Students track their improvement; admin enters marks one by one.
--  Run once in the Supabase SQL Editor.
-- ============================================================

create table if not exists public.paper_marks (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,            -- e.g. "Week Paper 05"
  paper_no int,                   -- e.g. 73
  type text not null default 'full' check (type in ('full','timing')),
  marks numeric(6,2) not null default 0,
  max_marks numeric(6,2) not null default 100,
  exam_date date,
  created_at timestamptz not null default now()
);

alter table public.paper_marks enable row level security;
grant all on public.paper_marks to anon, authenticated, service_role;

drop policy if exists marks_read on public.paper_marks;
create policy marks_read on public.paper_marks for select
  using (student_id = auth.uid() or public.is_admin());

drop policy if exists marks_admin on public.paper_marks;
create policy marks_admin on public.paper_marks for all
  using (public.is_admin()) with check (public.is_admin());
