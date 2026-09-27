-- ════════════════════════════════════════════════════════════════════
--  Gamification V4 — "you ranked up" and "you unlocked an achievement"
-- ════════════════════════════════════════════════════════════════════
--
-- Reaching a new rank was invisible: the number on the dashboard simply
-- changed. This sends the student a notification the moment it happens,
-- through the bell they already have.
--
-- Where the rank is decided: the ladder now lives in the database
-- (rank_levels) as well as in src/data/ranks.ts. The app keeps its copy
-- for rendering, but the notification must be written the instant XP
-- lands — a student who is not online when their mark is entered still
-- has the news waiting for them. KEEP THE TWO IN SYNC if you retune
-- them; rank_levels is the one that decides when the message is sent.
--
-- Run in the Supabase SQL editor. Safe to run repeatedly. Requires
-- migration_gamification_v1.sql and migration_gamification_achievements.sql.

-- ── 1. Let notifications carry these two kinds ──────────────────────
alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications add constraint notifications_type_check
  check (type in ('video','live','announcement','rank','achievement'));

-- ── 2. The ladder ───────────────────────────────────────────────────
create table if not exists public.rank_levels (
  key        text primary key,
  name       text not null,
  min_xp     int  not null,
  sort_order int  not null
);

insert into public.rank_levels (key, name, min_xp, sort_order) values
  ('novice',     'Novice',        0, 1),
  ('cadet',      'Cadet',       400, 2),
  ('apprentice', 'Apprentice',  900, 3),
  ('explorer',   'Explorer',   1600, 4),
  ('expert',     'Expert',     2600, 5),
  ('elite',      'Elite',      3900, 6),
  ('master',     'Master',     5500, 7),
  ('champion',   'Champion',   7500, 8)
on conflict (key) do update set name = excluded.name,
                                min_xp = excluded.min_xp,
                                sort_order = excluded.sort_order;

create or replace function public.rank_at_xp(p_xp int)
returns public.rank_levels language sql stable security definer set search_path = public as $$
  select * from public.rank_levels
   where min_xp <= greatest(coalesce(p_xp, 0), 0)
   order by min_xp desc
   limit 1;
$$;

-- ── 3. Where each student currently stands ──────────────────────────
-- Without this there is nothing to compare against, and every XP award
-- would look like a rank-up.
create table if not exists public.student_ranks (
  student_id uuid primary key references public.profiles(id) on delete cascade,
  rank_key   text not null references public.rank_levels(key),
  reached_at timestamptz not null default now()
);

alter table public.student_ranks enable row level security;
grant all on public.student_ranks to anon, authenticated, service_role;

drop policy if exists student_ranks_read on public.student_ranks;
create policy student_ranks_read on public.student_ranks for select
  using (student_id = auth.uid() or public.is_admin());

drop policy if exists student_ranks_admin on public.student_ranks;
create policy student_ranks_admin on public.student_ranks for all
  using (public.is_admin()) with check (public.is_admin());

-- ── 4. Rank-up detection ────────────────────────────────────────────
create or replace function public.xp_check_rank_up()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_total int;
  v_new   public.rank_levels;
  v_old   public.rank_levels;
  v_old_key text;
begin
  select coalesce(sum(amount), 0)::int into v_total
    from public.xp_transactions where student_id = new.student_id;

  v_new := public.rank_at_xp(v_total);
  if v_new is null then
    return null;
  end if;

  select rank_key into v_old_key
    from public.student_ranks where student_id = new.student_id;

  -- First sighting: record where they stand, and stay quiet. A student
  -- who already has XP when this migration runs should not be told they
  -- just reached a rank they earned months ago.
  if v_old_key is null then
    insert into public.student_ranks (student_id, rank_key)
    values (new.student_id, v_new.key)
    on conflict (student_id) do nothing;
    return null;
  end if;

  if v_old_key = v_new.key then
    return null;
  end if;

  select * into v_old from public.rank_levels where key = v_old_key;

  update public.student_ranks
     set rank_key = v_new.key, reached_at = now()
   where student_id = new.student_id;

  -- Only a climb is worth announcing. A drop can only come from an
  -- admin correcting a mark, and there is no kind way to say that.
  if v_old is not null and v_new.sort_order <= v_old.sort_order then
    return null;
  end if;

  insert into public.notifications (student_id, message, type)
  values (
    new.student_id,
    'Rank up! You reached ' || v_new.name || ' with ' || v_total || ' XP.',
    'rank');

  return null;
end $$;

drop trigger if exists xp_rank_up on public.xp_transactions;
create trigger xp_rank_up
  after insert on public.xp_transactions
  for each row execute function public.xp_check_rank_up();

-- ── 5. Achievement unlocks ──────────────────────────────────────────
create or replace function public.notify_achievement_unlocked()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_name text;
begin
  select name into v_name from public.achievements where key = new.achievement_key;
  insert into public.notifications (student_id, message, type)
  values (
    new.student_id,
    'Achievement unlocked: ' || coalesce(v_name, new.achievement_key) || '.',
    'achievement');
  return null;
end $$;

drop trigger if exists notify_achievement on public.student_achievements;
create trigger notify_achievement
  after insert on public.student_achievements
  for each row execute function public.notify_achievement_unlocked();

-- ── 6. Seed the current standings ───────────────────────────────────
-- Everyone with XP today is recorded at the rank they already hold, so
-- the first notification any of them gets is a real promotion.
insert into public.student_ranks (student_id, rank_key)
select t.student_id, (public.rank_at_xp(sum(t.amount)::int)).key
  from public.xp_transactions t
 group by t.student_id
on conflict (student_id) do nothing;
