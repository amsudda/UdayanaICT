-- ════════════════════════════════════════════════════════════════════
--  Gamification V2 — paper marks become the backbone of XP
-- ════════════════════════════════════════════════════════════════════
--
-- Why: paper_marks (admin → /admin/marks) is the real record of a
-- student's progress. V1 already awarded XP for it, but treated it as a
-- lesser sibling of quizzes and had three holes:
--
--   1. A corrected mark never corrected the XP. The performance award
--      was keyed on the row id alone, so re-entering 20 as 85 left the
--      original, wrong award standing.
--   2. A deleted mark left its XP behind forever.
--   3. A timing paper (a 30-minute drill) paid exactly as much as a
--      full three-hour paper.
--
-- This migration re-tunes the amounts, recomputes a paper's XP whenever
-- its marks change, clears XP when a mark is deleted, and adds two
-- bonuses that reward improvement rather than raw ability:
--
--   * personal best  — this paper beats every earlier paper of theirs
--   * improving      — this paper beats their average of the last 3
--
-- Both are judged against the student's OWN history, so a student
-- sitting at 45% who climbs to 55% is paid for the climb, which is the
-- point of tracking papers in the first place.
--
-- Run in the Supabase SQL editor. Safe to run repeatedly. Requires
-- migration_gamification_v1.sql and migration_paper_marks.sql first.

-- ── 1. Amounts ──────────────────────────────────────────────────────
-- Papers now outrank quizzes: a marked paper is worth more than any
-- quiz, because it costs a student three hours and cannot be farmed.
-- Timing papers earn the same bands scaled by paper_timing_factor_pct.
insert into public.xp_rules (key, amount, description) values
  ('paper_completion',        25, 'A paper mark was recorded'),
  ('paper_perf_100',          70, 'Paper score 100%'),
  ('paper_perf_90',           55, 'Paper score 90-99%'),
  ('paper_perf_80',           40, 'Paper score 80-89%'),
  ('paper_perf_70',           28, 'Paper score 70-79%'),
  ('paper_perf_60',           18, 'Paper score 60-69%'),
  ('paper_perf_below',         8, 'Paper score below 60%'),
  ('paper_personal_best',     30, 'Beat every earlier paper of their own'),
  ('paper_improving',         15, 'Beat their own average of the last 3 papers'),
  ('paper_timing_factor_pct', 60, 'Timing papers pay this %% of a full paper')
on conflict (key) do update set amount = excluded.amount,
                                description = excluded.description;

-- ── 2. Recompute helper ─────────────────────────────────────────────
-- Every award for one paper is wiped and rebuilt, so an edited mark
-- always ends up with exactly the XP the current mark deserves.
create or replace function public.xp_clear_paper(p_mark uuid)
returns void language sql security definer set search_path = public as $$
  delete from public.xp_transactions
   where source_type = 'paper' and source_id = p_mark;
$$;

-- ── 3. Paper XP ─────────────────────────────────────────────────────
create or replace function public.xp_on_paper_mark()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_pct     numeric;
  v_factor  numeric;
  v_band    int;
  v_best    numeric;   -- best % of their earlier papers
  v_recent  numeric;   -- average % of their last 3 earlier papers
  v_bonus   int;
begin
  -- A rewrite always starts from a clean slate.
  perform public.xp_clear_paper(new.id);

  if new.max_marks is null or new.max_marks <= 0 or new.marks is null then
    return new;
  end if;

  v_pct := (new.marks / new.max_marks) * 100;

  -- A timing paper is a shorter exercise, so it pays a fraction.
  v_factor := case when new.type = 'timing'
                   then coalesce(public.xp_rule('paper_timing_factor_pct'), 60) / 100.0
                   else 1 end;

  -- Completion.
  perform public.award_xp(
    new.student_id,
    round(public.xp_rule('paper_completion') * v_factor)::int,
    'paper', new.id,
    'Completed ' || case when new.type = 'timing' then 'timing paper' else 'paper' end
      || ' — ' || coalesce(new.title, 'Paper'),
    'paper_mark:' || new.id || ':completion');

  -- Performance band.
  v_band := case
    when v_pct >= 100 then public.xp_rule('paper_perf_100')
    when v_pct >=  90 then public.xp_rule('paper_perf_90')
    when v_pct >=  80 then public.xp_rule('paper_perf_80')
    when v_pct >=  70 then public.xp_rule('paper_perf_70')
    when v_pct >=  60 then public.xp_rule('paper_perf_60')
    else                   public.xp_rule('paper_perf_below')
  end;

  perform public.award_xp(
    new.student_id, round(v_band * v_factor)::int, 'paper', new.id,
    'Scored ' || round(v_pct) || '% on ' || coalesce(new.title, 'Paper'),
    'paper_mark:' || new.id || ':performance');

  -- ── Progress bonuses, judged against their own earlier papers ──
  -- "Earlier" is by exam_date, falling back to entry order, so marks
  -- entered out of sequence still compare against the right history.
  with history as (
    select (m.marks / m.max_marks) * 100 as pct,
           row_number() over (
             order by coalesce(m.exam_date, m.created_at::date) desc, m.created_at desc
           ) as recency
      from public.paper_marks m
     where m.student_id = new.student_id
       and m.id <> new.id
       and m.max_marks > 0
       and m.marks is not null
       and (coalesce(m.exam_date, m.created_at::date), m.created_at)
         < (coalesce(new.exam_date, new.created_at::date), new.created_at)
  )
  select (select max(pct) from history),
         (select avg(pct) from history where recency <= 3)
    into v_best, v_recent;

  if v_best is not null and v_pct > v_best then
    v_bonus := round(public.xp_rule('paper_personal_best') * v_factor)::int;
    perform public.award_xp(
      new.student_id, v_bonus, 'paper', new.id,
      'Personal best — beat your previous best of ' || round(v_best) || '%',
      'paper_mark:' || new.id || ':personal_best');
  end if;

  -- Paid on its own too, so a student climbing from 40% to 50% is
  -- rewarded even while their all-time best sits far above.
  if v_recent is not null and v_pct > v_recent then
    v_bonus := round(public.xp_rule('paper_improving') * v_factor)::int;
    perform public.award_xp(
      new.student_id, v_bonus, 'paper', new.id,
      'Improving — above your recent average of ' || round(v_recent) || '%',
      'paper_mark:' || new.id || ':improving');
  end if;

  return new;
end $$;

-- Fires on any change to the mark itself, its type, or its date, since
-- all three move the result.
drop trigger if exists xp_paper_mark on public.paper_marks;
create trigger xp_paper_mark
  after insert or update of marks, max_marks, type, exam_date, title
  on public.paper_marks
  for each row execute function public.xp_on_paper_mark();

-- A deleted mark takes its XP with it.
create or replace function public.xp_on_paper_mark_delete()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.xp_clear_paper(old.id);
  return old;
end $$;

drop trigger if exists xp_paper_mark_delete on public.paper_marks;
create trigger xp_paper_mark_delete
  after delete on public.paper_marks
  for each row execute function public.xp_on_paper_mark_delete();

-- ── 4. Rebuild every existing paper under the new rules ─────────────
-- Touching the rows re-fires the trigger, which clears and re-awards.
-- Oldest first, so each paper's bonuses see the correct history.
do $$
declare r record;
begin
  for r in select id from public.paper_marks
            order by coalesce(exam_date, created_at::date), created_at
  loop
    update public.paper_marks set title = title where id = r.id;
  end loop;
end $$;
