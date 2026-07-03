-- Student reviews shown on the landing page, managed from the admin panel.
-- Run this in the Supabase SQL editor.

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  school text,
  grade text,                                   -- badge text, e.g. "A සාමාර්ථය" / "9A"
  stars int not null default 5 check (stars between 1 and 5),
  quote text not null,
  exam_year text,                               -- e.g. "2024 A/L"
  avatar_url text,
  is_visible boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.reviews enable row level security;

drop policy if exists reviews_read on public.reviews;
create policy reviews_read on public.reviews
  for select using (is_visible or public.is_admin());

drop policy if exists reviews_admin on public.reviews;
create policy reviews_admin on public.reviews
  for all using (public.is_admin()) with check (public.is_admin());

grant select on public.reviews to anon;
grant all on public.reviews to authenticated, service_role;

-- How many reviews the landing page shows (admin-controlled).
alter table public.settings add column if not exists landing_review_count int not null default 6;
