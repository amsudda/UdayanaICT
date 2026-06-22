-- ============================================================
--  Udayana ICT LMS — full database setup
--  Paste this whole file into Supabase → SQL Editor → Run.
--  Safe to re-run (uses "if not exists" / "or replace").
-- ============================================================

-- ---------- helper: updated_at ----------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

-- ============================================================
--  1. PROFILES (students + tutor)
-- ============================================================
create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  role          text not null default 'student' check (role in ('student','admin')),
  student_code  text unique,
  full_name     text,
  email         text,
  phone         text,
  nic           text,
  gender        text,
  birth_date    date,
  school        text,
  district      text,
  medium        text,
  program       text check (program in ('O/L','A/L')),
  grade         int,
  exam_year     int,
  guardian_name text,
  guardian_phone text,
  address       text,
  avatar_url    text,
  created_at    timestamptz not null default now()
);

-- ============================================================
--  2. BATCHES (cohorts: O/L 2027, A/L 2026, ...)
-- ============================================================
create table if not exists public.batches (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  program    text not null check (program in ('O/L','A/L')),
  grade      int,
  exam_year  int,
  medium     text,
  is_active  boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.batch_members (
  id         uuid primary key default gen_random_uuid(),
  batch_id   uuid not null references public.batches(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  joined_at  timestamptz not null default now(),
  unique (batch_id, student_id)
);

-- ============================================================
--  3. CONTENT: packs + videos, theory months + videos
--     audience_scope: 'public' | 'program' | 'batch'
-- ============================================================
create table if not exists public.packs (
  id              uuid primary key default gen_random_uuid(),
  title           text not null,
  type            text,
  price           numeric(10,2) not null default 0,
  thumbnail_url   text,
  duration_label  text,
  description     text,
  audience_scope  text not null default 'batch' check (audience_scope in ('public','program','batch')),
  batch_id        uuid references public.batches(id) on delete set null,
  audience_program text check (audience_program in ('O/L','A/L')),
  is_published    boolean not null default false,
  created_at      timestamptz not null default now()
);

create table if not exists public.pack_videos (
  id             uuid primary key default gen_random_uuid(),
  pack_id        uuid not null references public.packs(id) on delete cascade,
  title          text not null,
  youtube_id     text not null,
  duration_label text,
  sort_order     int not null default 0,
  description    text
);

create table if not exists public.theory_months (
  id              uuid primary key default gen_random_uuid(),
  month           text not null,
  year            int not null,
  session_count   int not null default 0,
  topics          text[] default '{}',
  thumbnail_url   text,
  price           numeric(10,2) not null default 0,
  audience_scope  text not null default 'batch' check (audience_scope in ('public','program','batch')),
  batch_id        uuid references public.batches(id) on delete set null,
  audience_program text check (audience_program in ('O/L','A/L')),
  is_published    boolean not null default false,
  created_at      timestamptz not null default now()
);

create table if not exists public.theory_videos (
  id              uuid primary key default gen_random_uuid(),
  theory_month_id uuid not null references public.theory_months(id) on delete cascade,
  title           text not null,
  youtube_id      text not null,
  duration_label  text,
  sort_order      int not null default 0,
  description     text
);

-- ============================================================
--  4. LIVE CLASSES
-- ============================================================
create table if not exists public.live_classes (
  id              uuid primary key default gen_random_uuid(),
  title           text not null,
  scheduled_at    timestamptz not null,
  zoom_link       text,
  instructor      text,
  course_label    text,
  audience_scope  text not null default 'batch' check (audience_scope in ('public','program','batch')),
  batch_id        uuid references public.batches(id) on delete set null,
  audience_program text check (audience_program in ('O/L','A/L')),
  created_at      timestamptz not null default now()
);

-- ============================================================
--  5. PAYMENTS (manual bank transfer + slip)
-- ============================================================
create table if not exists public.payments (
  id              uuid primary key default gen_random_uuid(),
  student_id      uuid not null references public.profiles(id) on delete cascade,
  kind            text not null check (kind in ('pack','theory','monthly_fee')),
  pack_id         uuid references public.packs(id) on delete set null,
  theory_month_id uuid references public.theory_months(id) on delete set null,
  period_month    text,
  period_year     int,
  amount          numeric(10,2) not null default 0,
  reference       text,
  slip_url        text,
  status          text not null default 'pending' check (status in ('pending','approved','rejected')),
  reject_reason   text,
  reviewed_by     uuid references public.profiles(id) on delete set null,
  reviewed_at     timestamptz,
  created_at      timestamptz not null default now()
);

-- ============================================================
--  6. ENROLLMENTS (what a student may watch)
-- ============================================================
create table if not exists public.enrollments (
  id                uuid primary key default gen_random_uuid(),
  student_id        uuid not null references public.profiles(id) on delete cascade,
  pack_id           uuid references public.packs(id) on delete cascade,
  theory_month_id   uuid references public.theory_months(id) on delete cascade,
  source_payment_id uuid references public.payments(id) on delete set null,
  granted_at        timestamptz not null default now()
);
-- one enrollment per student per item
create unique index if not exists enroll_pack_uniq
  on public.enrollments(student_id, pack_id) where pack_id is not null;
create unique index if not exists enroll_theory_uniq
  on public.enrollments(student_id, theory_month_id) where theory_month_id is not null;

-- ============================================================
--  7. PROGRESS (watched state)
-- ============================================================
create table if not exists public.progress (
  id              uuid primary key default gen_random_uuid(),
  student_id      uuid not null references public.profiles(id) on delete cascade,
  video_id        uuid not null,
  is_watched      boolean not null default false,
  watched_seconds int not null default 0,
  updated_at      timestamptz not null default now(),
  unique (student_id, video_id)
);

-- ============================================================
--  8. PROMOTIONS + NOTIFICATIONS + SETTINGS
-- ============================================================
create table if not exists public.promotions (
  id              uuid primary key default gen_random_uuid(),
  tag             text,
  title           text not null,
  description     text,
  image_url       text,
  cta_text        text,
  cta_link        text,
  sort_order      int not null default 0,
  is_active       boolean not null default true,
  audience_scope  text not null default 'public' check (audience_scope in ('public','program','batch')),
  batch_id        uuid references public.batches(id) on delete set null,
  audience_program text check (audience_program in ('O/L','A/L')),
  created_at      timestamptz not null default now()
);

create table if not exists public.notifications (
  id          uuid primary key default gen_random_uuid(),
  student_id  uuid references public.profiles(id) on delete cascade, -- null = everyone
  message     text not null,
  type        text default 'announcement' check (type in ('video','live','announcement')),
  is_read     boolean not null default false,
  created_at  timestamptz not null default now()
);

create table if not exists public.settings (
  id             int primary key default 1 check (id = 1),
  bank_name      text,
  account_name   text,
  account_number text,
  branch         text,
  whatsapp_number text,
  al_exam_date   date,
  ol_exam_date   date,
  term_start_date date
);
insert into public.settings (id) values (1) on conflict (id) do nothing;

-- ============================================================
--  9. HELPER FUNCTIONS (admin check + audience visibility)
-- ============================================================
create or replace function public.is_admin()
returns boolean language sql security definer stable set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

create or replace function public.can_view(p_scope text, p_batch uuid, p_program text)
returns boolean language sql security definer stable set search_path = public as $$
  select
    public.is_admin()
    or p_scope = 'public'
    or (p_scope = 'program' and exists (
          select 1 from public.profiles pr
          where pr.id = auth.uid() and pr.program = p_program))
    or (p_scope = 'batch' and exists (
          select 1 from public.batch_members bm
          where bm.student_id = auth.uid() and bm.batch_id = p_batch));
$$;

-- ============================================================
--  10. AUTO-ENROLL on payment approval
-- ============================================================
create or replace function public.grant_enrollment_on_approval()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'approved' and (old.status is distinct from 'approved') then
    new.reviewed_at := now();
    if new.kind = 'pack' and new.pack_id is not null then
      insert into public.enrollments(student_id, pack_id, source_payment_id)
      values (new.student_id, new.pack_id, new.id)
      on conflict do nothing;
    elsif new.kind = 'theory' and new.theory_month_id is not null then
      insert into public.enrollments(student_id, theory_month_id, source_payment_id)
      values (new.student_id, new.theory_month_id, new.id)
      on conflict do nothing;
    end if;
  end if;
  return new;
end; $$;

drop trigger if exists trg_payment_approved on public.payments;
create trigger trg_payment_approved
  before update on public.payments
  for each row execute function public.grant_enrollment_on_approval();

-- ============================================================
--  11. AUTO-CREATE profile when a user signs up
--      (reads optional metadata passed at signup)
-- ============================================================
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    'student'
  )
  on conflict (id) do nothing;
  return new;
end; $$;

drop trigger if exists trg_new_user on auth.users;
create trigger trg_new_user
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
--  12. ROW LEVEL SECURITY
-- ============================================================
alter table public.profiles      enable row level security;
alter table public.batches       enable row level security;
alter table public.batch_members enable row level security;
alter table public.packs         enable row level security;
alter table public.pack_videos   enable row level security;
alter table public.theory_months enable row level security;
alter table public.theory_videos enable row level security;
alter table public.live_classes  enable row level security;
alter table public.payments      enable row level security;
alter table public.enrollments   enable row level security;
alter table public.progress      enable row level security;
alter table public.promotions    enable row level security;
alter table public.notifications enable row level security;
alter table public.settings      enable row level security;

-- ---- profiles ----
drop policy if exists profiles_self_read on public.profiles;
create policy profiles_self_read on public.profiles for select
  using (id = auth.uid() or public.is_admin());
drop policy if exists profiles_self_upsert on public.profiles;
create policy profiles_self_insert on public.profiles for insert
  with check (id = auth.uid());
drop policy if exists profiles_self_update on public.profiles;
create policy profiles_self_update on public.profiles for update
  using (id = auth.uid() or public.is_admin());

-- ---- batches (read for all logged-in; write admin) ----
drop policy if exists batches_read on public.batches;
create policy batches_read on public.batches for select using (auth.uid() is not null);
drop policy if exists batches_admin on public.batches;
create policy batches_admin on public.batches for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists bm_read on public.batch_members;
create policy bm_read on public.batch_members for select
  using (student_id = auth.uid() or public.is_admin());
drop policy if exists bm_admin on public.batch_members;
create policy bm_admin on public.batch_members for all using (public.is_admin()) with check (public.is_admin());

-- ---- packs (students see published + matching audience) ----
drop policy if exists packs_read on public.packs;
create policy packs_read on public.packs for select
  using (public.is_admin() or (is_published and public.can_view(audience_scope, batch_id, audience_program)));
drop policy if exists packs_admin on public.packs;
create policy packs_admin on public.packs for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists packvids_read on public.pack_videos;
create policy packvids_read on public.pack_videos for select using (
  public.is_admin() or exists (
    select 1 from public.packs p
    where p.id = pack_videos.pack_id and p.is_published
      and public.can_view(p.audience_scope, p.batch_id, p.audience_program)));
drop policy if exists packvids_admin on public.pack_videos;
create policy packvids_admin on public.pack_videos for all using (public.is_admin()) with check (public.is_admin());

-- ---- theory months + videos ----
drop policy if exists theory_read on public.theory_months;
create policy theory_read on public.theory_months for select
  using (public.is_admin() or (is_published and public.can_view(audience_scope, batch_id, audience_program)));
drop policy if exists theory_admin on public.theory_months;
create policy theory_admin on public.theory_months for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists theoryvids_read on public.theory_videos;
create policy theoryvids_read on public.theory_videos for select using (
  public.is_admin() or exists (
    select 1 from public.theory_months t
    where t.id = theory_videos.theory_month_id and t.is_published
      and public.can_view(t.audience_scope, t.batch_id, t.audience_program)));
drop policy if exists theoryvids_admin on public.theory_videos;
create policy theoryvids_admin on public.theory_videos for all using (public.is_admin()) with check (public.is_admin());

-- ---- live classes ----
drop policy if exists live_read on public.live_classes;
create policy live_read on public.live_classes for select
  using (public.is_admin() or public.can_view(audience_scope, batch_id, audience_program));
drop policy if exists live_admin on public.live_classes;
create policy live_admin on public.live_classes for all using (public.is_admin()) with check (public.is_admin());

-- ---- payments (student: own; admin: all) ----
drop policy if exists pay_read on public.payments;
create policy pay_read on public.payments for select
  using (student_id = auth.uid() or public.is_admin());
drop policy if exists pay_insert on public.payments;
create policy pay_insert on public.payments for insert
  with check (student_id = auth.uid());
drop policy if exists pay_admin_update on public.payments;
create policy pay_admin_update on public.payments for update
  using (public.is_admin()) with check (public.is_admin());

-- ---- enrollments (student reads own; only system/admin writes) ----
drop policy if exists enroll_read on public.enrollments;
create policy enroll_read on public.enrollments for select
  using (student_id = auth.uid() or public.is_admin());
drop policy if exists enroll_admin on public.enrollments;
create policy enroll_admin on public.enrollments for all using (public.is_admin()) with check (public.is_admin());

-- ---- progress (student owns) ----
drop policy if exists progress_rw on public.progress;
create policy progress_rw on public.progress for all
  using (student_id = auth.uid() or public.is_admin())
  with check (student_id = auth.uid());

-- ---- promotions (audience-aware read; admin write) ----
drop policy if exists promo_read on public.promotions;
create policy promo_read on public.promotions for select
  using (is_active and (audience_scope = 'public' or public.can_view(audience_scope, batch_id, audience_program)) or public.is_admin());
drop policy if exists promo_admin on public.promotions;
create policy promo_admin on public.promotions for all using (public.is_admin()) with check (public.is_admin());

-- ---- notifications ----
drop policy if exists notif_read on public.notifications;
create policy notif_read on public.notifications for select
  using (student_id is null or student_id = auth.uid() or public.is_admin());
drop policy if exists notif_update on public.notifications;
create policy notif_update on public.notifications for update
  using (student_id = auth.uid() or public.is_admin());
drop policy if exists notif_admin on public.notifications;
create policy notif_admin on public.notifications for insert with check (public.is_admin());

-- ---- settings (everyone reads bank details; admin writes) ----
drop policy if exists settings_read on public.settings;
create policy settings_read on public.settings for select using (true);
drop policy if exists settings_admin on public.settings;
create policy settings_admin on public.settings for update using (public.is_admin()) with check (public.is_admin());

-- ============================================================
--  13. STORAGE BUCKETS
-- ============================================================
insert into storage.buckets (id, name, public) values ('thumbnails','thumbnails', true)
  on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('avatars','avatars', false)
  on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('slips','slips', false)
  on conflict (id) do nothing;

-- thumbnails: public read, admin write
drop policy if exists thumb_read on storage.objects;
create policy thumb_read on storage.objects for select using (bucket_id = 'thumbnails');
drop policy if exists thumb_write on storage.objects;
create policy thumb_write on storage.objects for insert
  with check (bucket_id = 'thumbnails' and public.is_admin());

-- avatars: a user manages their own folder (path starts with their uid)
drop policy if exists avatar_read on storage.objects;
create policy avatar_read on storage.objects for select
  using (bucket_id = 'avatars' and (owner = auth.uid() or public.is_admin()));
drop policy if exists avatar_write on storage.objects;
create policy avatar_write on storage.objects for insert
  with check (bucket_id = 'avatars' and owner = auth.uid());

-- slips: private — only owner + admin
drop policy if exists slip_read on storage.objects;
create policy slip_read on storage.objects for select
  using (bucket_id = 'slips' and (owner = auth.uid() or public.is_admin()));
drop policy if exists slip_write on storage.objects;
create policy slip_write on storage.objects for insert
  with check (bucket_id = 'slips' and owner = auth.uid());

-- ============================================================
--  DONE. Next: create your admin user, then run seed (optional).
-- ============================================================
