-- ============================================================
--  Auto-assign structured student code when profile is completed
--  (covers Google sign-ups where program/exam_year are set later).
--  Paste into Supabase → SQL Editor → Run. Safe to re-run.
-- ============================================================

-- 1) Ensure the cohort counter table exists
create table if not exists public.student_code_counters (
  cohort text primary key,
  last_no int not null default 0
);
alter table public.student_code_counters enable row level security;

-- 2) Function: assign or re-assign the student code when program + exam_year
--    are both present and the current code is missing or uses a fallback prefix.
create or replace function public.assign_student_code_on_profile()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_prefix text;
  v_no     int;
  v_code   text;
begin
  -- Only act on students who now have both program and exam_year
  if coalesce(new.role, 'student') <> 'student' or new.program is null or new.exam_year is null then
    return new;
  end if;

  -- Only assign if the current code is missing or was a fallback
  if new.student_code is not null and new.student_code <> '' and new.student_code not like 'STU-%' and new.student_code not like 'UI-%' and new.student_code <> 'UI' then
    return new;  -- already has a proper cohort code
  end if;

  -- Build the cohort prefix: AL27, OL28, etc.
  v_prefix := case
    when new.program = 'A/L' then 'AL'
    when new.program = 'O/L' then 'OL'
    else 'UI'
  end || right(new.exam_year::text, 2);

  -- Serialize concurrent updates for the same cohort
  perform pg_advisory_xact_lock(hashtext('student_code:' || v_prefix));

  -- Increment the counter
  insert into public.student_code_counters (cohort, last_no)
  values (v_prefix, 1)
  on conflict (cohort) do update set last_no = public.student_code_counters.last_no + 1
  returning last_no into v_no;

  v_code := v_prefix || '-' || lpad(v_no::text, 3, '0');

  -- Set the code on the row being updated
  new.student_code := v_code;
  return new;
end; $$;

-- 3) Create the trigger (BEFORE UPDATE so we can modify `new`)
drop trigger if exists trg_assign_student_code on public.profiles;
create trigger trg_assign_student_code
  before update of program, exam_year on public.profiles
  for each row execute function public.assign_student_code_on_profile();

-- Also fire on INSERT so that email/password signups that include
-- program + exam_year in metadata get a code even if handle_new_user
-- doesn't generate one.
drop trigger if exists trg_assign_student_code_insert on public.profiles;
create trigger trg_assign_student_code_insert
  before insert on public.profiles
  for each row execute function public.assign_student_code_on_profile();

-- ============================================================
--  4) Update handle_new_user() — skip student_code for Google
--     signups (where program is absent). The profile-update
--     trigger above will handle it when the student completes
--     their profile.
-- ============================================================
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  m jsonb := new.raw_user_meta_data;
  v_program text := nullif(m->>'program','');
  v_year int := nullif(m->>'exam_year','')::int;
begin
  -- student_code is left NULL here — the trg_assign_student_code_insert
  -- trigger (which fires BEFORE INSERT on profiles) will fill it in
  -- automatically when program + exam_year are present.
  insert into public.profiles (
    id, email, role, full_name, avatar_url,
    phone, nic, gender, birth_date, school, district, medium,
    program, exam_year, guardian_name, guardian_phone, address
  ) values (
    new.id, new.email, 'student',
    coalesce(nullif(m->>'full_name',''), nullif(m->>'name',''), ''),
    coalesce(m->>'avatar_url', m->>'picture'),
    nullif(m->>'phone',''), nullif(m->>'nic',''),
    nullif(m->>'gender',''), nullif(m->>'birth_date','')::date,
    nullif(m->>'school',''), nullif(m->>'district',''),
    nullif(m->>'medium',''), v_program,
    v_year, nullif(m->>'guardian_name',''),
    nullif(m->>'guardian_phone',''), nullif(m->>'address','')
  ) on conflict (id) do nothing;
  return new;
end; $$;

-- ============================================================
--  5) Sync counters with existing proper student codes so new
--     codes don't collide (e.g. if AL26 already has 50 students,
--     the counter must be at least 50).
-- ============================================================
insert into public.student_code_counters (cohort, last_no)
select prefix, max(num) from (
  select substring(student_code from '^([A-Z]+[0-9]+)-') as prefix,
         substring(student_code from '-([0-9]+)$')::int as num
  from public.profiles
  where student_code ~ '^[A-Z]+[0-9]+-[0-9]+$'
) s where prefix is not null group by prefix
on conflict (cohort) do update set last_no = greatest(public.student_code_counters.last_no, excluded.last_no);

-- ============================================================
--  6) One-time backfill: fix existing students who have a
--     missing or fallback student code but DO have program +
--     exam_year set.
-- ============================================================
do $$
declare
  r record;
  v_prefix text;
  v_no int;
  v_code text;
begin
  for r in
    select id, program, exam_year
    from public.profiles
    where role = 'student' and program is not null and exam_year is not null
      and (student_code is null or student_code = '' or student_code like 'STU-%' or student_code like 'UI-%' or student_code = 'UI')
    order by created_at
  loop
    v_prefix := case
      when r.program = 'A/L' then 'AL'
      when r.program = 'O/L' then 'OL'
      else 'UI'
    end || right(r.exam_year::text, 2);

    insert into public.student_code_counters (cohort, last_no)
    values (v_prefix, 1)
    on conflict (cohort) do update set last_no = public.student_code_counters.last_no + 1
    returning last_no into v_no;

    v_code := v_prefix || '-' || lpad(v_no::text, 3, '0');

    update public.profiles set student_code = v_code where id = r.id;
  end loop;
end $$;

-- ============================================================
--  DONE.
-- ============================================================
