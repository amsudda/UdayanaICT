-- ════════════════════════════════════════════════════════════════════
--  Gamification V1 — XP ledger, rules, triggers, leaderboard
-- ════════════════════════════════════════════════════════════════════
--
-- Scope: XP comes only from the two sources that cannot be faked —
-- quiz attempts (scored server-side) and paper marks (admin-entered).
-- Recording/attendance/streak XP is deliberately NOT here; there is no
-- trustworthy data for it yet (watch progress lives in localStorage and
-- study hours are self-reported).
--
-- Design rules:
--   * Students can never write XP. Every row is inserted by a
--     SECURITY DEFINER trigger, the same pattern as payments ->
--     enrollments. RLS gives students SELECT on their own rows only.
--   * Every award carries an idempotency key, so re-running a trigger
--     or the backfill can never double-pay.
--   * XP amounts live in a table, not in the trigger body, so they can
--     be retuned later without a migration.
--
-- Run in the Supabase SQL editor. Safe to run repeatedly.

-- ── 1. Rules ────────────────────────────────────────────────────────
create table if not exists public.xp_rules (
  key         text primary key,
  amount      int  not null,
  description text
);

insert into public.xp_rules (key, amount, description) values
  ('quiz_completion',   10, 'Completing any quiz'),
  ('quiz_perf_100',     40, 'Quiz score 100%'),
  ('quiz_perf_90',      35, 'Quiz score 90-99%'),
  ('quiz_perf_80',      30, 'Quiz score 80-89%'),
  ('quiz_perf_70',      20, 'Quiz score 70-79%'),
  ('quiz_perf_60',      10, 'Quiz score 60-69%'),
  ('quiz_perf_below',    5, 'Quiz score below 60%'),
  ('paper_completion',  15, 'A paper mark was recorded'),
  ('paper_perf_90',     40, 'Paper score 90%+'),
  ('paper_perf_80',     30, 'Paper score 80-89%'),
  ('paper_perf_70',     20, 'Paper score 70-79%'),
  ('paper_perf_60',     10, 'Paper score 60-69%'),
  ('paper_perf_below',   5, 'Paper score below 60%')
on conflict (key) do nothing;

create or replace function public.xp_rule(p_key text)
returns int language sql stable security definer set search_path = public as $$
  select coalesce((select amount from public.xp_rules where key = p_key), 0);
$$;

-- ── 2. Ledger ───────────────────────────────────────────────────────
create table if not exists public.xp_transactions (
  id              uuid primary key default gen_random_uuid(),
  student_id      uuid not null references public.profiles(id) on delete cascade,
  amount          int  not null,
  source_type     text not null,            -- 'quiz' | 'paper'
  source_id       uuid,
  reason          text not null,            -- shown in the XP activity feed
  idempotency_key text not null unique,
  created_at      timestamptz not null default now()
);

create index if not exists xp_tx_student_idx
  on public.xp_transactions (student_id, created_at desc);
create index if not exists xp_tx_created_idx
  on public.xp_transactions (created_at desc);

-- ── 3. The only way XP is ever created ──────────────────────────────
create or replace function public.award_xp(
  p_student uuid, p_amount int, p_source_type text,
  p_source_id uuid, p_reason text, p_key text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_student is null or p_amount is null or p_amount = 0 then
    return;
  end if;
  insert into public.xp_transactions
    (student_id, amount, source_type, source_id, reason, idempotency_key)
  values (p_student, p_amount, p_source_type, p_source_id, p_reason, p_key)
  on conflict (idempotency_key) do nothing;   -- never double-pay
end $$;

-- ── 4. Quiz XP ──────────────────────────────────────────────────────
create or replace function public.xp_on_quiz_attempt()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_pct   numeric;
  v_band  int;
  v_title text;
begin
  if new.status is distinct from 'submitted' or new.percentage is null then
    return new;
  end if;

  select title into v_title from public.quizzes where id = new.quiz_id;
  v_title := coalesce(v_title, 'Quiz');
  v_pct   := new.percentage;

  perform public.award_xp(
    new.student_id, public.xp_rule('quiz_completion'), 'quiz', new.id,
    'Completed quiz — ' || v_title,
    'quiz_attempt:' || new.id || ':completion');

  v_band := case
    when v_pct >= 100 then public.xp_rule('quiz_perf_100')
    when v_pct >=  90 then public.xp_rule('quiz_perf_90')
    when v_pct >=  80 then public.xp_rule('quiz_perf_80')
    when v_pct >=  70 then public.xp_rule('quiz_perf_70')
    when v_pct >=  60 then public.xp_rule('quiz_perf_60')
    else                   public.xp_rule('quiz_perf_below')
  end;

  perform public.award_xp(
    new.student_id, v_band, 'quiz', new.id,
    'Scored ' || round(v_pct) || '% on ' || v_title,
    'quiz_attempt:' || new.id || ':performance');

  return new;
end $$;

drop trigger if exists xp_quiz_attempt on public.quiz_attempts;
create trigger xp_quiz_attempt
  after insert or update of status, percentage on public.quiz_attempts
  for each row execute function public.xp_on_quiz_attempt();

-- ── 5. Paper XP ─────────────────────────────────────────────────────
create or replace function public.xp_on_paper_mark()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_pct  numeric;
  v_band int;
begin
  if new.max_marks is null or new.max_marks <= 0 or new.marks is null then
    return new;
  end if;

  v_pct := (new.marks / new.max_marks) * 100;

  perform public.award_xp(
    new.student_id, public.xp_rule('paper_completion'), 'paper', new.id,
    'Completed paper — ' || coalesce(new.title, 'Paper'),
    'paper_mark:' || new.id || ':completion');

  v_band := case
    when v_pct >= 90 then public.xp_rule('paper_perf_90')
    when v_pct >= 80 then public.xp_rule('paper_perf_80')
    when v_pct >= 70 then public.xp_rule('paper_perf_70')
    when v_pct >= 60 then public.xp_rule('paper_perf_60')
    else                  public.xp_rule('paper_perf_below')
  end;

  perform public.award_xp(
    new.student_id, v_band, 'paper', new.id,
    'Scored ' || round(v_pct) || '% on ' || coalesce(new.title, 'Paper'),
    'paper_mark:' || new.id || ':performance');

  return new;
end $$;

drop trigger if exists xp_paper_mark on public.paper_marks;
create trigger xp_paper_mark
  after insert or update of marks, max_marks on public.paper_marks
  for each row execute function public.xp_on_paper_mark();

-- ── 6. Security ─────────────────────────────────────────────────────
alter table public.xp_transactions enable row level security;
alter table public.xp_rules        enable row level security;
grant all on public.xp_transactions to anon, authenticated, service_role;
grant all on public.xp_rules        to anon, authenticated, service_role;

-- A student may READ their own XP and nothing else. There is deliberately
-- no insert/update/delete policy for students, so RLS denies all writes;
-- the triggers above are SECURITY DEFINER and bypass this.
drop policy if exists xp_tx_read on public.xp_transactions;
create policy xp_tx_read on public.xp_transactions for select
  using (student_id = auth.uid() or public.is_admin());

drop policy if exists xp_tx_admin on public.xp_transactions;
create policy xp_tx_admin on public.xp_transactions for all
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists xp_rules_read on public.xp_rules;
create policy xp_rules_read on public.xp_rules for select
  using (auth.uid() is not null);

drop policy if exists xp_rules_admin on public.xp_rules;
create policy xp_rules_admin on public.xp_rules for all
  using (public.is_admin()) with check (public.is_admin());

-- ── 7. Totals + leaderboard ─────────────────────────────────────────
-- A student's own total.
create or replace function public.my_xp()
returns int language sql stable security definer set search_path = public as $$
  select coalesce(sum(amount), 0)::int
    from public.xp_transactions where student_id = auth.uid();
$$;

-- Leaderboard, scoped to the batches the caller belongs to. This is a
-- SECURITY DEFINER function rather than a view on profiles on purpose:
-- profiles_self_read is own-row-only and must stay that way (it holds
-- NIC, phone and address). This exposes only name, avatar and XP.
create or replace function public.xp_leaderboard(
  p_scope text default 'all_time', p_limit int default 50)
returns table (
  student_id   uuid,
  display_name text,
  avatar_url   text,
  total_xp     int,
  rank_position int
) language sql stable security definer set search_path = public as $$
  with peers as (
    select distinct bm.student_id
      from public.batch_members bm
     where bm.batch_id in (
       select batch_id from public.batch_members where student_id = auth.uid()
     )
  ),
  scoped as (
    select t.student_id, sum(t.amount)::int as total_xp
      from public.xp_transactions t
     where t.student_id in (select student_id from peers)
       and (p_scope <> 'weekly' or t.created_at >= date_trunc('week', now()))
     group by t.student_id
  )
  select s.student_id,
         coalesce(p.full_name, 'Student'),
         p.avatar_url,
         s.total_xp,
         rank() over (order by s.total_xp desc)::int as rank_position
    from scoped s
    join public.profiles p on p.id = s.student_id
   order by s.total_xp desc
   limit greatest(p_limit, 1);
$$;

grant execute on function public.my_xp() to authenticated;
grant execute on function public.xp_leaderboard(text, int) to authenticated;

-- ── 8. Backfill (optional but recommended) ──────────────────────────
-- Awards XP for quizzes and papers that already exist, so students who
-- have been working all term don't start at zero. Idempotent: the keys
-- match the triggers above, so running it twice changes nothing.
create or replace function public.xp_backfill()
returns text language plpgsql security definer set search_path = public as $$
declare
  r      record;
  v_pct  numeric;
  v_band int;
  n_quiz int := 0;
  n_pap  int := 0;
begin
  for r in
    select a.id, a.student_id, a.percentage, coalesce(q.title, 'Quiz') as title
      from public.quiz_attempts a
      left join public.quizzes q on q.id = a.quiz_id
     where a.status = 'submitted' and a.percentage is not null
  loop
    perform public.award_xp(r.student_id, public.xp_rule('quiz_completion'),
      'quiz', r.id, 'Completed quiz — ' || r.title,
      'quiz_attempt:' || r.id || ':completion');
    v_band := case
      when r.percentage >= 100 then public.xp_rule('quiz_perf_100')
      when r.percentage >=  90 then public.xp_rule('quiz_perf_90')
      when r.percentage >=  80 then public.xp_rule('quiz_perf_80')
      when r.percentage >=  70 then public.xp_rule('quiz_perf_70')
      when r.percentage >=  60 then public.xp_rule('quiz_perf_60')
      else                          public.xp_rule('quiz_perf_below')
    end;
    perform public.award_xp(r.student_id, v_band, 'quiz', r.id,
      'Scored ' || round(r.percentage) || '% on ' || r.title,
      'quiz_attempt:' || r.id || ':performance');
    n_quiz := n_quiz + 1;
  end loop;

  for r in
    select id, student_id, marks, max_marks, coalesce(title, 'Paper') as title
      from public.paper_marks
     where marks is not null and max_marks > 0
  loop
    v_pct := (r.marks / r.max_marks) * 100;
    perform public.award_xp(r.student_id, public.xp_rule('paper_completion'),
      'paper', r.id, 'Completed paper — ' || r.title,
      'paper_mark:' || r.id || ':completion');
    v_band := case
      when v_pct >= 90 then public.xp_rule('paper_perf_90')
      when v_pct >= 80 then public.xp_rule('paper_perf_80')
      when v_pct >= 70 then public.xp_rule('paper_perf_70')
      when v_pct >= 60 then public.xp_rule('paper_perf_60')
      else                  public.xp_rule('paper_perf_below')
    end;
    perform public.award_xp(r.student_id, v_band, 'paper', r.id,
      'Scored ' || round(v_pct) || '% on ' || r.title,
      'paper_mark:' || r.id || ':performance');
    n_pap := n_pap + 1;
  end loop;

  return format('backfilled %s quiz attempts and %s paper marks', n_quiz, n_pap);
end $$;

-- Run the backfill now. Comment this line out if you want every student
-- to start from zero instead.
select public.xp_backfill();

notify pgrst, 'reload schema';

-- ── 9. Verify ───────────────────────────────────────────────────────
select count(*) as xp_rows, coalesce(sum(amount), 0) as xp_awarded
  from public.xp_transactions;
