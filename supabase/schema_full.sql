-- ============================================================
--  Udayana ICT LMS — COMPLETE schema (single source of truth)
--  Run this ONCE on a clean database. See recovery steps in chat.
-- ============================================================

-- ---------- TABLES ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'student' check (role in ('student','admin')),
  student_code text unique,
  full_name text, email text, phone text, nic text, gender text,
  birth_date date, school text, district text, medium text,
  program text check (program in ('O/L','A/L')),
  grade int, exam_year int,
  guardian_name text, guardian_phone text, address text, avatar_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.batches (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  program text not null check (program in ('O/L','A/L')),
  grade int, exam_year int, medium text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.batch_members (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.batches(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  unique (batch_id, student_id)
);

create table if not exists public.packs (
  id uuid primary key default gen_random_uuid(),
  title text not null, type text, price numeric(10,2) not null default 0,
  thumbnail_url text, duration_label text, description text,
  audience_scope text not null default 'batches' check (audience_scope in ('public','program','batches')),
  batch_ids uuid[] not null default '{}',
  audience_program text check (audience_program in ('O/L','A/L')),
  is_published boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.pack_videos (
  id uuid primary key default gen_random_uuid(),
  pack_id uuid not null references public.packs(id) on delete cascade,
  title text not null, youtube_id text not null,
  duration_label text, sort_order int not null default 0, description text
);

create table if not exists public.theory_months (
  id uuid primary key default gen_random_uuid(),
  month text not null, year int not null, session_count int not null default 0,
  topics text[] default '{}', thumbnail_url text, price numeric(10,2) not null default 0,
  audience_scope text not null default 'batches' check (audience_scope in ('public','program','batches')),
  batch_ids uuid[] not null default '{}',
  audience_program text check (audience_program in ('O/L','A/L')),
  is_published boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.theory_videos (
  id uuid primary key default gen_random_uuid(),
  theory_month_id uuid not null references public.theory_months(id) on delete cascade,
  title text not null, youtube_id text not null,
  duration_label text, sort_order int not null default 0, description text
);

create table if not exists public.live_classes (
  id uuid primary key default gen_random_uuid(),
  title text not null, scheduled_at timestamptz not null,
  zoom_link text, instructor text, course_label text,
  audience_scope text not null default 'batches' check (audience_scope in ('public','program','batches')),
  batch_ids uuid[] not null default '{}',
  audience_program text check (audience_program in ('O/L','A/L')),
  kind text not null default 'monthly' check (kind in ('monthly','special')),
  period_month text, period_year int,
  platform text default 'zoom', meeting_id text, passcode text, backup_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('pack','theory','monthly_fee','tute','other')),
  pack_id uuid references public.packs(id) on delete set null,
  theory_month_id uuid references public.theory_months(id) on delete set null,
  period_month text, period_year int,
  amount numeric(10,2) not null default 0,
  reference text, slip_url text,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  reject_reason text,
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.enrollments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  pack_id uuid references public.packs(id) on delete cascade,
  theory_month_id uuid references public.theory_months(id) on delete cascade,
  source_payment_id uuid references public.payments(id) on delete set null,
  granted_at timestamptz not null default now()
);
create unique index if not exists enroll_pack_uniq on public.enrollments(student_id, pack_id) where pack_id is not null;
create unique index if not exists enroll_theory_uniq on public.enrollments(student_id, theory_month_id) where theory_month_id is not null;

create table if not exists public.progress (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  video_id uuid not null,
  is_watched boolean not null default false,
  watched_seconds int not null default 0,
  updated_at timestamptz not null default now(),
  unique (student_id, video_id)
);

create table if not exists public.promotions (
  id uuid primary key default gen_random_uuid(),
  tag text, title text not null, description text, image_url text,
  cta_text text, cta_link text, sort_order int not null default 0,
  is_active boolean not null default true,
  audience_scope text not null default 'public' check (audience_scope in ('public','program','batches')),
  batch_ids uuid[] not null default '{}',
  audience_program text check (audience_program in ('O/L','A/L')),
  created_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references public.profiles(id) on delete cascade,
  message text not null,
  type text default 'announcement' check (type in ('video','live','announcement')),
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.settings (
  id int primary key default 1 check (id = 1),
  bank_name text, account_name text, account_number text, branch text,
  whatsapp_number text, al_exam_date date, ol_exam_date date, term_start_date date
);
insert into public.settings (id) values (1) on conflict (id) do nothing;

-- ---------- FUNCTIONS ----------
create or replace function public.is_admin()
returns boolean language sql security definer stable set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

create or replace function public.can_view(p_scope text, p_batch_ids uuid[], p_program text)
returns boolean language sql security definer stable set search_path = public as $$
  select public.is_admin()
    or p_scope = 'public'
    or (p_scope = 'program' and exists (select 1 from public.profiles pr where pr.id = auth.uid() and pr.program = p_program))
    or (p_scope = 'batches' and exists (select 1 from public.batch_members bm where bm.student_id = auth.uid() and bm.batch_id = any(p_batch_ids)));
$$;

create or replace function public.has_paid_month(p_month text, p_year int)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (select 1 from public.payments
    where student_id = auth.uid() and kind = 'monthly_fee'
      and period_month = p_month and period_year = p_year and status = 'approved');
$$;

create or replace function public.grant_enrollment_on_approval()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'approved' and (old.status is distinct from 'approved') then
    new.reviewed_at := now();
    if new.kind = 'pack' and new.pack_id is not null then
      insert into public.enrollments(student_id, pack_id, source_payment_id)
      values (new.student_id, new.pack_id, new.id) on conflict do nothing;
    elsif new.kind = 'theory' and new.theory_month_id is not null then
      insert into public.enrollments(student_id, theory_month_id, source_payment_id)
      values (new.student_id, new.theory_month_id, new.id) on conflict do nothing;
    end if;
  end if;
  return new;
end; $$;

-- structured student-code counter (per cohort: AL26, OL27, …)
create table if not exists public.student_code_counters (
  cohort text primary key,
  last_no int not null default 0
);
alter table public.student_code_counters enable row level security;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  m jsonb := new.raw_user_meta_data;
  v_program text := nullif(m->>'program','');
  v_year int := nullif(m->>'exam_year','')::int;
  v_prefix text;
  v_no int;
  v_code text;
begin
  v_prefix := case when v_program = 'A/L' then 'AL' when v_program = 'O/L' then 'OL' else 'UI' end;
  if v_year is not null then v_prefix := v_prefix || right(v_year::text, 2); end if;

  insert into public.student_code_counters (cohort, last_no)
  values (v_prefix, 1)
  on conflict (cohort) do update set last_no = public.student_code_counters.last_no + 1
  returning last_no into v_no;

  v_code := v_prefix || '-' || lpad(v_no::text, 3, '0');  -- e.g. AL26-001

  insert into public.profiles (
    id, email, role, student_code, full_name, phone, nic, gender, birth_date,
    school, district, medium, program, exam_year, guardian_name, guardian_phone, address
  ) values (
    new.id, new.email, 'student', v_code,
    nullif(m->>'full_name',''), nullif(m->>'phone',''), nullif(m->>'nic',''),
    nullif(m->>'gender',''), nullif(m->>'birth_date','')::date, nullif(m->>'school',''),
    nullif(m->>'district',''), nullif(m->>'medium',''), v_program,
    v_year, nullif(m->>'guardian_name',''),
    nullif(m->>'guardian_phone',''), nullif(m->>'address','')
  ) on conflict (id) do nothing;
  return new;
end; $$;

-- ---------- TRIGGERS ----------
drop trigger if exists trg_payment_approved on public.payments;
create trigger trg_payment_approved before update on public.payments
  for each row execute function public.grant_enrollment_on_approval();

drop trigger if exists trg_new_user on auth.users;
create trigger trg_new_user after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- RLS ----------
alter table public.profiles enable row level security;
alter table public.batches enable row level security;
alter table public.batch_members enable row level security;
alter table public.packs enable row level security;
alter table public.pack_videos enable row level security;
alter table public.theory_months enable row level security;
alter table public.theory_videos enable row level security;
alter table public.live_classes enable row level security;
alter table public.payments enable row level security;
alter table public.enrollments enable row level security;
alter table public.progress enable row level security;
alter table public.promotions enable row level security;
alter table public.notifications enable row level security;
alter table public.settings enable row level security;

drop policy if exists profiles_self_read on public.profiles;
create policy profiles_self_read on public.profiles for select using (id = auth.uid() or public.is_admin());
drop policy if exists profiles_self_insert on public.profiles;
create policy profiles_self_insert on public.profiles for insert with check (id = auth.uid());
drop policy if exists profiles_self_update on public.profiles;
create policy profiles_self_update on public.profiles for update using (id = auth.uid() or public.is_admin());

drop policy if exists batches_read on public.batches;
create policy batches_read on public.batches for select using (auth.uid() is not null);
drop policy if exists batches_admin on public.batches;
create policy batches_admin on public.batches for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists bm_read on public.batch_members;
create policy bm_read on public.batch_members for select using (student_id = auth.uid() or public.is_admin());
drop policy if exists bm_admin on public.batch_members;
create policy bm_admin on public.batch_members for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists packs_read on public.packs;
create policy packs_read on public.packs for select using (public.is_admin() or (is_published and public.can_view(audience_scope, batch_ids, audience_program)));
drop policy if exists packs_admin on public.packs;
create policy packs_admin on public.packs for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists packvids_read on public.pack_videos;
create policy packvids_read on public.pack_videos for select using (
  public.is_admin() or exists (select 1 from public.packs p where p.id = pack_videos.pack_id and p.is_published and public.can_view(p.audience_scope, p.batch_ids, p.audience_program)));
drop policy if exists packvids_admin on public.pack_videos;
create policy packvids_admin on public.pack_videos for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists theory_read on public.theory_months;
create policy theory_read on public.theory_months for select using (public.is_admin() or (is_published and public.can_view(audience_scope, batch_ids, audience_program)));
drop policy if exists theory_admin on public.theory_months;
create policy theory_admin on public.theory_months for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists theoryvids_read on public.theory_videos;
create policy theoryvids_read on public.theory_videos for select using (
  public.is_admin() or exists (select 1 from public.theory_months t
    where t.id = theory_videos.theory_month_id and t.is_published
      and public.can_view(t.audience_scope, t.batch_ids, t.audience_program)
      and public.has_paid_month(t.month, t.year)));
drop policy if exists theoryvids_admin on public.theory_videos;
create policy theoryvids_admin on public.theory_videos for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists live_read on public.live_classes;
create policy live_read on public.live_classes for select using (
  public.is_admin() or (public.can_view(audience_scope, batch_ids, audience_program)
    and (kind = 'special' or public.has_paid_month(period_month, period_year))));
drop policy if exists live_admin on public.live_classes;
create policy live_admin on public.live_classes for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists pay_read on public.payments;
create policy pay_read on public.payments for select using (student_id = auth.uid() or public.is_admin());
drop policy if exists pay_insert on public.payments;
create policy pay_insert on public.payments for insert with check (student_id = auth.uid());
drop policy if exists pay_admin_update on public.payments;
create policy pay_admin_update on public.payments for update using (public.is_admin()) with check (public.is_admin());

drop policy if exists enroll_read on public.enrollments;
create policy enroll_read on public.enrollments for select using (student_id = auth.uid() or public.is_admin());
drop policy if exists enroll_admin on public.enrollments;
create policy enroll_admin on public.enrollments for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists progress_rw on public.progress;
create policy progress_rw on public.progress for all using (student_id = auth.uid() or public.is_admin()) with check (student_id = auth.uid());

drop policy if exists promo_read on public.promotions;
create policy promo_read on public.promotions for select using ((is_active and (audience_scope = 'public' or public.can_view(audience_scope, batch_ids, audience_program))) or public.is_admin());
drop policy if exists promo_admin on public.promotions;
create policy promo_admin on public.promotions for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists notif_read on public.notifications;
create policy notif_read on public.notifications for select using (student_id is null or student_id = auth.uid() or public.is_admin());
drop policy if exists notif_update on public.notifications;
create policy notif_update on public.notifications for update using (student_id = auth.uid() or public.is_admin());
drop policy if exists notif_admin on public.notifications;
create policy notif_admin on public.notifications for insert with check (public.is_admin());

drop policy if exists settings_read on public.settings;
create policy settings_read on public.settings for select using (true);
drop policy if exists settings_admin on public.settings;
create policy settings_admin on public.settings for update using (public.is_admin()) with check (public.is_admin());

-- ---------- GRANTS ----------
grant usage on schema public to anon, authenticated, service_role;
grant all on all tables in schema public to anon, authenticated, service_role;
grant all on all sequences in schema public to anon, authenticated, service_role;
grant execute on all functions in schema public to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public grant execute on functions to anon, authenticated, service_role;

-- ---------- STORAGE ----------
insert into storage.buckets (id, name, public) values ('thumbnails','thumbnails', true) on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('avatars','avatars', false) on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('slips','slips', false) on conflict (id) do nothing;

drop policy if exists thumb_read on storage.objects;
create policy thumb_read on storage.objects for select using (bucket_id = 'thumbnails');
drop policy if exists thumb_write on storage.objects;
create policy thumb_write on storage.objects for insert with check (bucket_id = 'thumbnails' and public.is_admin());
drop policy if exists thumb_update on storage.objects;
create policy thumb_update on storage.objects for update using (bucket_id = 'thumbnails' and public.is_admin());

drop policy if exists avatar_read on storage.objects;
create policy avatar_read on storage.objects for select using (bucket_id = 'avatars' and (owner = auth.uid() or public.is_admin()));
drop policy if exists avatar_write on storage.objects;
create policy avatar_write on storage.objects for insert with check (bucket_id = 'avatars' and owner = auth.uid());

drop policy if exists slip_read on storage.objects;
create policy slip_read on storage.objects for select using (bucket_id = 'slips' and (owner = auth.uid() or public.is_admin()));
drop policy if exists slip_write on storage.objects;
create policy slip_write on storage.objects for insert with check (bucket_id = 'slips' and owner = auth.uid());

-- ---------- REALTIME ----------
do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='payments') then
    alter publication supabase_realtime add table public.payments;
  end if;
end $$;
