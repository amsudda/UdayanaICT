-- ════════════════════════════════════════════════════════════════════
--  Gamification — Achievements ("Achievement Journey")
-- ════════════════════════════════════════════════════════════════════
--
-- Requires migration_gamification_v1.sql (xp_transactions, award_xp).
--
-- Achievements are DATA, not code: each row names a metric and a
-- threshold, so new ones can be added by inserting a row — no migration
-- and no redeploy. Grouped into the same 8 tiers as the rank ladder.
--
-- Only metrics that cannot be faked are used: quiz attempts (scored
-- server-side) and paper marks (admin-entered), plus total XP which is
-- derived from those. Live-class attendance, recordings watched and
-- study hours are deliberately absent — there is no trustworthy data
-- for them yet.
--
-- Run in the Supabase SQL editor. Safe to run repeatedly.

-- ── 1. Catalogue ────────────────────────────────────────────────────
create table if not exists public.achievements (
  key         text primary key,
  name        text not null,
  description text not null,
  tier        text not null,      -- matches a rank key in src/data/ranks.ts
  metric      text not null,      -- see evaluate_achievements below
  threshold   numeric not null,
  xp          int  not null default 50,
  sort_order  int  not null default 0
);

create table if not exists public.student_achievements (
  student_id      uuid not null references public.profiles(id) on delete cascade,
  achievement_key text not null references public.achievements(key) on delete cascade,
  unlocked_at     timestamptz not null default now(),
  primary key (student_id, achievement_key)
);

create index if not exists student_achievements_student_idx
  on public.student_achievements (student_id, unlocked_at desc);

-- ── 2. The catalogue itself ─────────────────────────────────────────
-- Flat 50 XP each, as in the reference design: the achievement is the
-- reward, and equal value keeps them comparable.
insert into public.achievements (key, name, description, tier, metric, threshold, sort_order) values
  -- Novice
  ('quiz_rookie',    'Quiz Rookie',    'Complete your first quiz',          'novice',     'quiz_count',         1,   10),
  ('paper_pioneer',  'Paper Pioneer',  'Get your first paper marked',       'novice',     'paper_count',        1,   20),
  ('first_points',   'First Points',   'Earn your first 50 XP',             'novice',     'total_xp',           50,  30),
  -- Cadet
  ('quiz_five',      'Quiz Five',      'Complete 5 quizzes',                'cadet',      'quiz_count',         5,   10),
  ('halfway_there',  'Halfway There',  'Score 50%+ on any paper',           'cadet',      'paper_best_pct',     50,  20),
  ('rising_scholar', 'Rising Scholar', 'Earn 250 XP',                       'cadet',      'total_xp',           250, 30),
  -- Apprentice
  ('quiz_ten',       'Quiz Ten',       'Complete 10 quizzes',               'apprentice', 'quiz_count',         10,  10),
  ('perfect_quiz',   'Perfect Quiz',   'Score 100% on any quiz',            'apprentice', 'quiz_best_pct',      100, 20),
  ('solid_scorer',   'Solid Scorer',   'Score 65%+ on any paper',           'apprentice', 'paper_best_pct',     65,  30),
  -- Explorer
  ('quiz_fifteen',   'Quiz Fifteen',   'Complete 15 quizzes',               'explorer',   'quiz_count',         15,  10),
  ('strong_scorer',  'Strong Scorer',  'Score 75%+ on any paper',           'explorer',   'paper_best_pct',     75,  20),
  ('triple_perfect', 'Triple Perfect', 'Score 100% on 3 quizzes',           'explorer',   'quiz_perfect_count', 3,   30),
  -- Expert
  ('quiz_master',    'Quiz Master',    'Complete 25 quizzes',               'expert',     'quiz_count',         25,  10),
  ('high_scorer',    'High Scorer',    'Score 90%+ on any paper',           'expert',     'paper_best_pct',     90,  20),
  ('paper_ten',      'Paper Ten',      'Have 10 papers marked',             'expert',     'paper_count',        10,  30),
  -- Elite
  ('perfect_ten',    'Perfect Ten',    'Score 100% on 10 quizzes',          'elite',      'quiz_perfect_count', 10,  10),
  ('consistent_ace', 'Consistent Ace', 'Score 90%+ on 3 papers',            'elite',      'paper_high_count',   3,   20),
  ('xp_2000',        'Scholar',        'Earn 2,000 XP',                     'elite',      'total_xp',           2000, 30),
  -- Master
  ('quiz_fifty',     'Quiz Fifty',     'Complete 50 quizzes',               'master',     'quiz_count',         50,  10),
  ('ace_collection', 'Ace Collection', 'Score 90%+ on 10 papers',           'master',     'paper_high_count',   10,  20),
  ('paper_machine',  'Paper Machine',  'Have 25 papers marked',             'master',     'paper_count',        25,  30),
  -- Champion
  ('quiz_century',   'Quiz Century',   'Complete 100 quizzes',              'champion',   'quiz_count',         100, 10),
  ('perfect_paper',  'Perfect Paper',  'Score 100% on any paper',           'champion',   'paper_best_pct',     100, 20),
  ('legend',         'Legend',         'Reach 7,500 XP and Champion rank',  'champion',   'total_xp',           7500, 30)
on conflict (key) do update
  set name = excluded.name,
      description = excluded.description,
      tier = excluded.tier,
      metric = excluded.metric,
      threshold = excluded.threshold,
      sort_order = excluded.sort_order;

-- ── 3. Evaluation ───────────────────────────────────────────────────
create or replace function public.evaluate_achievements(p_student uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  m_quiz_count   int;
  m_quiz_perfect int;
  m_quiz_best    numeric;
  m_paper_count  int;
  m_paper_best   numeric;
  m_paper_high   int;
  m_total_xp     int;
  r              record;
  v              numeric;
begin
  if p_student is null then return; end if;

  select count(*) filter (where status = 'submitted'),
         count(*) filter (where status = 'submitted' and percentage >= 100),
         coalesce(max(percentage) filter (where status = 'submitted'), 0)
    into m_quiz_count, m_quiz_perfect, m_quiz_best
    from public.quiz_attempts
   where student_id = p_student;

  select count(*),
         coalesce(max(case when max_marks > 0 then (marks / max_marks) * 100 end), 0),
         count(*) filter (where max_marks > 0 and (marks / max_marks) * 100 >= 90)
    into m_paper_count, m_paper_best, m_paper_high
    from public.paper_marks
   where student_id = p_student and marks is not null;

  select coalesce(sum(amount), 0) into m_total_xp
    from public.xp_transactions where student_id = p_student;

  for r in select * from public.achievements loop
    v := case r.metric
      when 'quiz_count'         then m_quiz_count
      when 'quiz_perfect_count' then m_quiz_perfect
      when 'quiz_best_pct'      then m_quiz_best
      when 'paper_count'        then m_paper_count
      when 'paper_best_pct'     then m_paper_best
      when 'paper_high_count'   then m_paper_high
      when 'total_xp'           then m_total_xp
      else null
    end;

    if v is not null and v >= r.threshold then
      insert into public.student_achievements (student_id, achievement_key)
      values (p_student, r.key)
      on conflict do nothing;

      perform public.award_xp(
        p_student, r.xp, 'achievement', null,
        'Achievement unlocked — ' || r.name,
        'achievement:' || p_student || ':' || r.key);
    end if;
  end loop;
end $$;

-- ── 4. Automatic unlocking ──────────────────────────────────────────
-- Hooking onto the XP ledger instead of the quiz/paper triggers means
-- any future XP source unlocks achievements for free. The source_type
-- guard stops an achievement's own XP from re-triggering evaluation.
create or replace function public.xp_eval_achievements()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.source_type is distinct from 'achievement' then
    perform public.evaluate_achievements(new.student_id);
  end if;
  return null;
end $$;

drop trigger if exists xp_eval_achievements_trg on public.xp_transactions;
create trigger xp_eval_achievements_trg
  after insert on public.xp_transactions
  for each row execute function public.xp_eval_achievements();

-- ── 5. Security ─────────────────────────────────────────────────────
alter table public.achievements         enable row level security;
alter table public.student_achievements enable row level security;
grant all on public.achievements         to anon, authenticated, service_role;
grant all on public.student_achievements to anon, authenticated, service_role;

-- The catalogue is public to signed-in users: locked achievements must
-- be visible, that is the point of the journey.
drop policy if exists achievements_read on public.achievements;
create policy achievements_read on public.achievements for select
  using (auth.uid() is not null);

drop policy if exists achievements_admin on public.achievements;
create policy achievements_admin on public.achievements for all
  using (public.is_admin()) with check (public.is_admin());

-- Unlocks are readable only by their owner. No student write path.
drop policy if exists student_achievements_read on public.student_achievements;
create policy student_achievements_read on public.student_achievements for select
  using (student_id = auth.uid() or public.is_admin());

drop policy if exists student_achievements_admin on public.student_achievements;
create policy student_achievements_admin on public.student_achievements for all
  using (public.is_admin()) with check (public.is_admin());

-- ── 6. Backfill ─────────────────────────────────────────────────────
-- Unlock anything already earned. Idempotent.
do $$
declare s record;
begin
  for s in select id from public.profiles where role = 'student' loop
    perform public.evaluate_achievements(s.id);
  end loop;
end $$;

notify pgrst, 'reload schema';

-- ── 7. Verify ───────────────────────────────────────────────────────
select (select count(*) from public.achievements)         as catalogue_size,
       (select count(*) from public.student_achievements) as unlocks_so_far;
