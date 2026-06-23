-- ============================================================
--  Structured student IDs:  <AL|OL><YY>-<NNN>   e.g. AL26-001
--  Sequential per cohort (program + exam year), collision-free.
--  Run once in the Supabase SQL Editor.
-- ============================================================

-- 1) per-cohort counter
create table if not exists public.student_code_counters (
  cohort text primary key,
  last_no int not null default 0
);
alter table public.student_code_counters enable row level security;  -- only the trigger (definer) touches it

-- 2) new-signup trigger that builds the structured code
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

  v_code := v_prefix || '-' || lpad(v_no::text, 3, '0');

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

-- 3) (OPTIONAL) renumber existing students into the new scheme, by signup order
with ranked as (
  select id,
         (case when program='A/L' then 'AL' when program='O/L' then 'OL' else 'UI' end
          || coalesce(right(exam_year::text,2),'')) as prefix,
         row_number() over (
           partition by (case when program='A/L' then 'AL' when program='O/L' then 'OL' else 'UI' end
                         || coalesce(right(exam_year::text,2),''))
           order by created_at) as rn
  from public.profiles
  where role = 'student'
)
update public.profiles p
set student_code = r.prefix || '-' || lpad(r.rn::text, 3, '0')
from ranked r where p.id = r.id;

-- 4) keep counters in sync so future signups continue correctly
insert into public.student_code_counters (cohort, last_no)
select prefix, max(rn) from (
  select (case when program='A/L' then 'AL' when program='O/L' then 'OL' else 'UI' end
          || coalesce(right(exam_year::text,2),'')) as prefix,
         row_number() over (
           partition by (case when program='A/L' then 'AL' when program='O/L' then 'OL' else 'UI' end
                         || coalesce(right(exam_year::text,2),''))
           order by created_at) as rn
  from public.profiles where role='student'
) s group by prefix
on conflict (cohort) do update set last_no = greatest(public.student_code_counters.last_no, excluded.last_no);
