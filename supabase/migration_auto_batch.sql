-- ============================================================
--  Auto-assign students to a cohort batch
--  When a student picks their program + exam year, the matching
--  batch (e.g. "A/L 2027") is created if it doesn't exist yet and
--  the student is added to it — no manual admin step needed.
--  Paste into Supabase → SQL Editor → Run. Safe to re-run.
-- ============================================================

create or replace function public.sync_student_batch()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_batch_id uuid;
begin
  -- only students who have chosen both a program and an exam year
  if coalesce(new.role, 'student') = 'student'
     and new.program is not null
     and new.exam_year is not null then

    -- serialize concurrent signups for the same cohort so two students
    -- registering at once can never create two batches for the same year
    perform pg_advisory_xact_lock(hashtext(new.program || ':' || new.exam_year::text));

    -- reuse an existing batch for this program + year if there is one
    select id into v_batch_id
      from public.batches
     where program = new.program and exam_year = new.exam_year
     order by created_at
     limit 1;

    -- otherwise create it (named like "A/L 2027")
    if v_batch_id is null then
      insert into public.batches (name, program, exam_year, is_active)
      values (new.program || ' ' || new.exam_year::text, new.program, new.exam_year, true)
      returning id into v_batch_id;
    end if;

    -- add the student to the batch (idempotent)
    insert into public.batch_members (batch_id, student_id)
    values (v_batch_id, new.id)
    on conflict (batch_id, student_id) do nothing;
  end if;
  return new;
end; $$;

drop trigger if exists trg_sync_student_batch on public.profiles;
create trigger trg_sync_student_batch
  after insert or update of program, exam_year on public.profiles
  for each row execute function public.sync_student_batch();

-- ============================================================
--  One-time backfill for students who already exist
-- ============================================================

-- create any missing cohort batches
insert into public.batches (name, program, exam_year, is_active)
select distinct p.program || ' ' || p.exam_year::text, p.program, p.exam_year, true
from public.profiles p
where coalesce(p.role, 'student') = 'student'
  and p.program is not null and p.exam_year is not null
  and not exists (
    select 1 from public.batches b
     where b.program = p.program and b.exam_year = p.exam_year
  );

-- assign every existing student to their cohort batch
insert into public.batch_members (batch_id, student_id)
select b.id, p.id
from public.profiles p
join public.batches b
  on b.program = p.program and b.exam_year = p.exam_year
where coalesce(p.role, 'student') = 'student'
  and p.program is not null and p.exam_year is not null
on conflict (batch_id, student_id) do nothing;

-- ============================================================
--  DONE.
-- ============================================================
