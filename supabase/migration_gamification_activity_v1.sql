-- ════════════════════════════════════════════════════════════════════
--  Gamification V3 — XP for watching lessons and taking homework sheets
-- ════════════════════════════════════════════════════════════════════
--
-- V1 deliberately left these out because watch state lived only in
-- localStorage, where a student could fake it. This migration moves the
-- record into the database (public.progress, which already existed and
-- was never written to) and adds a download log, so both become real
-- rows that XP can be paid against.
--
-- These are still CLIENT-reported: the browser says "this lesson
-- finished" or "this sheet was opened". Nothing server-side can prove
-- it, unlike a quiz score or a paper mark. So the design is:
--
--   * small amounts — effort XP, not achievement XP. A single marked
--     paper is worth more than a whole day of watching.
--   * paid once per lesson and once per sheet, ever. Re-watching pays
--     nothing, so there is no loop to farm.
--   * a daily ceiling on each, so clicking through 40 lessons in one
--     evening cannot out-earn a student who actually sits papers.
--
-- Run in the Supabase SQL editor. Safe to run repeatedly. Requires
-- migration_gamification_v1.sql.

-- ── 1. Amounts and caps ─────────────────────────────────────────────
insert into public.xp_rules (key, amount, description) values
  ('lesson_watched',        8, 'Finished watching a class video'),
  ('lesson_daily_cap',     40, 'Most lesson XP one student can earn in a day'),
  ('homework_download',     5, 'Downloaded a homework sheet for the first time'),
  ('download_daily_cap',   20, 'Most download XP one student can earn in a day')
on conflict (key) do update set amount = excluded.amount,
                                description = excluded.description;

-- ── 2. How much of today's allowance is left ────────────────────────
-- Counts what this student has already been paid today from one source,
-- so the trigger can trim or skip the next award.
create or replace function public.xp_earned_today(p_student uuid, p_source text)
returns int language sql stable security definer set search_path = public as $$
  select coalesce(sum(amount), 0)::int
    from public.xp_transactions
   where student_id = p_student
     and source_type = p_source
     and created_at >= date_trunc('day', now());
$$;

-- ── 3. Lesson XP ────────────────────────────────────────────────────
-- public.progress is the server-side watch record: one row per student
-- per video, flipped to is_watched when the player reports the video
-- finished. XP is paid the first time that flip happens.
create or replace function public.xp_on_lesson_watched()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_amount int;
  v_left   int;
begin
  if not new.is_watched then
    return new;
  end if;
  -- only the transition into watched pays; un-watching and re-watching
  -- the same lesson does nothing.
  if tg_op = 'UPDATE' and old.is_watched then
    return new;
  end if;

  v_amount := public.xp_rule('lesson_watched');
  v_left   := public.xp_rule('lesson_daily_cap')
              - public.xp_earned_today(new.student_id, 'lesson');

  if v_left <= 0 then
    return new;
  end if;
  v_amount := least(v_amount, v_left);

  perform public.award_xp(
    new.student_id, v_amount, 'lesson', new.video_id,
    'Watched a class video',
    'lesson_watched:' || new.student_id || ':' || new.video_id);

  return new;
end $$;

drop trigger if exists xp_lesson_watched on public.progress;
create trigger xp_lesson_watched
  after insert or update of is_watched on public.progress
  for each row execute function public.xp_on_lesson_watched();

-- ── 4. Downloads ────────────────────────────────────────────────────
-- One row the first time a student opens a sheet. resource_id is not a
-- foreign key on purpose: homework, tutes and papers live in different
-- tables, and a deleted sheet should not erase the student's history.
create table if not exists public.resource_downloads (
  id            uuid primary key default gen_random_uuid(),
  student_id    uuid not null references public.profiles(id) on delete cascade,
  resource_type text not null check (resource_type in ('homework','tute','paper')),
  resource_id   uuid not null,
  title         text,
  created_at    timestamptz not null default now(),
  unique (student_id, resource_type, resource_id)
);

create index if not exists resource_downloads_student_idx
  on public.resource_downloads (student_id, created_at desc);

alter table public.resource_downloads enable row level security;
grant all on public.resource_downloads to anon, authenticated, service_role;

-- A student may log their own downloads and read them back. They cannot
-- edit or delete one, so the log cannot be replayed for more XP.
drop policy if exists downloads_read on public.resource_downloads;
create policy downloads_read on public.resource_downloads for select
  using (student_id = auth.uid() or public.is_admin());

drop policy if exists downloads_insert on public.resource_downloads;
create policy downloads_insert on public.resource_downloads for insert
  with check (student_id = auth.uid());

drop policy if exists downloads_admin on public.resource_downloads;
create policy downloads_admin on public.resource_downloads for all
  using (public.is_admin()) with check (public.is_admin());

create or replace function public.xp_on_resource_download()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_amount int;
  v_left   int;
begin
  -- Homework sheets are the only ones that pay. A tute or a paper PDF
  -- is part of watching or sitting, both of which are already paid.
  if new.resource_type <> 'homework' then
    return new;
  end if;

  v_amount := public.xp_rule('homework_download');
  v_left   := public.xp_rule('download_daily_cap')
              - public.xp_earned_today(new.student_id, 'download');

  if v_left <= 0 then
    return new;
  end if;
  v_amount := least(v_amount, v_left);

  perform public.award_xp(
    new.student_id, v_amount, 'download', new.resource_id,
    'Downloaded ' || coalesce(new.title, 'a homework sheet'),
    'download:' || new.student_id || ':' || new.resource_id);

  return new;
end $$;

drop trigger if exists xp_resource_download on public.resource_downloads;
create trigger xp_resource_download
  after insert on public.resource_downloads
  for each row execute function public.xp_on_resource_download();
