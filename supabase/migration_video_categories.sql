-- Three categories for monthly-recording videos:
--   lesson · question_book · paper
--
-- Existing 'lesson' and 'paper' rows are untouched. Safe to run repeatedly.
--
-- Run this in the Supabase SQL editor BEFORE tagging any video as
-- "Question Book" in the admin panel — until then the old check constraint
-- rejects the new value and the save fails.

-- 1) drop whatever check currently guards `kind`, whatever it is named
do $$
declare c text;
begin
  for c in
    select conname from pg_constraint
     where conrelid = 'public.theory_videos'::regclass
       and contype = 'c'
       and pg_get_constraintdef(oid) ilike '%kind%'
  loop
    execute format('alter table public.theory_videos drop constraint %I', c);
  end loop;
end $$;

-- 2) re-add it with the third value
alter table public.theory_videos
  add constraint theory_videos_kind_check
  check (kind in ('lesson', 'question_book', 'paper'));

-- 3) make the API notice immediately
notify pgrst, 'reload schema';

-- 4) verify — should list all three values
select pg_get_constraintdef(oid) as kind_check
  from pg_constraint
 where conrelid = 'public.theory_videos'::regclass
   and conname = 'theory_videos_kind_check';
