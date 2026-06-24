-- ============================================================
--  Study-time tracking — students log their daily study hours.
--  Student-only; one entry per day (upsert).
--  Run once in the Supabase SQL Editor.
-- ============================================================

create table if not exists public.study_logs (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  log_date date not null,
  hours numeric(4,1) not null default 0,
  created_at timestamptz not null default now(),
  unique (student_id, log_date)
);

alter table public.study_logs enable row level security;
grant all on public.study_logs to anon, authenticated, service_role;

drop policy if exists study_rw on public.study_logs;
create policy study_rw on public.study_logs for all
  using (student_id = auth.uid() or public.is_admin())
  with check (student_id = auth.uid());
