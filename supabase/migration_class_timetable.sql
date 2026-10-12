-- Admin-managed weekly timetable displayed on the public landing page.
-- Safe to run more than once in Supabase SQL Editor.

create table if not exists public.class_timetable (
  id uuid primary key default gen_random_uuid(),
  exam_year int not null check (exam_year between 2020 and 2100),
  venue_name text not null,
  location text,
  day_of_week smallint not null check (day_of_week between 0 and 6),
  start_time time not null,
  end_time time not null,
  class_mode text not null default 'online' check (class_mode in ('physical', 'online')),
  note text,
  registration_url text,
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint class_timetable_time_order check (end_time > start_time)
);

create index if not exists class_timetable_public_order_idx
  on public.class_timetable (exam_year desc, day_of_week, start_time, sort_order);

alter table public.class_timetable enable row level security;

drop policy if exists class_timetable_read on public.class_timetable;
create policy class_timetable_read on public.class_timetable
  for select using (is_active or public.is_admin());

drop policy if exists class_timetable_admin on public.class_timetable;
create policy class_timetable_admin on public.class_timetable
  for all using (public.is_admin()) with check (public.is_admin());

grant select on public.class_timetable to anon;
grant all on public.class_timetable to authenticated, service_role;

create or replace function public.touch_class_timetable_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at = now();
  return new;
end; $$;

drop trigger if exists trg_class_timetable_updated_at on public.class_timetable;
create trigger trg_class_timetable_updated_at
  before update on public.class_timetable
  for each row execute function public.touch_class_timetable_updated_at();

notify pgrst, 'reload schema';
